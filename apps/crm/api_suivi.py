"""Relances, motifs de contact, campagnes, réglages, infos de facture, statistiques.

Qui peut quoi :
- poser ou lire une relance, une info de facture, la liste des motifs et des campagnes
  actives : toute personne qui a l'un des écrans concernés (CRM, patients, factures),
  dans une organisation où le module Suivi patients est activé ;
- créer ou modifier une campagne : administrateurs ou droit « create/edit » du CRM ;
- régler les motifs et les provenances : administrateurs ;
- statistiques : droit de lecture du CRM ; les montants seulement pour les administrateurs.
"""
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.modules import Modules, user_can
from apps.invoicing.models import Invoice

from . import services, stats
from .api import _ProvenanceView
from .models import (CRMCampaign, ContactLog, ContactReason, InvoiceCRMInfo,
                     PatientCRMProfile, PatientOrigin)

def _refus():
    return Response({'error': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)


def _introuvable():
    return Response({'error': 'Introuvable.'}, status=status.HTTP_404_NOT_FOUND)


def _invalide(message):
    return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)


def _admin(user):
    return services.peut_voir_montants(user)


def _nom_agent(u):
    return (u.get_full_name() or u.username) if u else ''


# ── Dictionnaires de sortie ────────────────────────────────────────────────

def _motif_dict(m, avec_reglages=False):
    d = {'id': str(m.id), 'label': m.label, 'template': services.modele_message(m)}
    if avec_reglages:
        d.update({'keywords': m.keywords, 'is_active': m.is_active, 'position': m.position,
                  'usage': getattr(m, 'n', None), 'message_template': m.message_template})
    return d


def _relance_dict(log, etat=None):
    etat = etat or {}
    facture = etat.get('invoice')
    return {
        'id': str(log.id),
        'patient_id': str(log.patient_id),
        'channel': log.channel, 'channel_label': log.get_channel_display(),
        'outcome': log.outcome, 'outcome_label': log.get_outcome_display(),
        'reason': _motif_dict(log.reason) if log.reason_id else None,
        'campaign': {'id': str(log.campaign_id), 'name': log.campaign.name} if log.campaign_id else None,
        'note': log.note,
        'follow_up_date': log.follow_up_date,
        'contacted_at': log.contacted_at,
        'days': (timezone.now() - log.contacted_at).days,
        'created_by': _nom_agent(log.created_by) if log.created_by_id else '',
        'status': etat.get('status', 'none'),
        'came_source': etat.get('source'),
        'invoice': ({'id': str(facture.id), 'number': facture.invoice_number, 'date': facture.created_at,
                     'amount': float(facture.total_amount or 0)} if facture else None),
        'window_end': etat.get('window_end'),
    }


def _decimal(valeur):
    if valeur in (None, ''):
        return None
    try:
        return Decimal(str(valeur)).quantize(Decimal('1'))
    except (InvalidOperation, ValueError):
        raise ValueError('Montant invalide.')


def _date(valeur):
    if not valeur:
        return None
    try:
        return datetime.strptime(str(valeur)[:10], '%Y-%m-%d').date()
    except ValueError:
        raise ValueError('Date invalide (AAAA-MM-JJ).')


# ── Motifs de contact ──────────────────────────────────────────────────────

class CrmReasonListView(_ProvenanceView):
    """Motifs actifs, les plus utilisés d'abord (pastilles de la fenêtre de relance)."""

    def get(self, request):
        if not self._autorise(request):
            return _refus()
        return Response({'results': [_motif_dict(m) for m in services.motifs_de(request.user.organization)]})


class CrmReasonSettingsView(_ProvenanceView):
    """Réglage des motifs (administrateurs)."""

    def get(self, request):
        if not _admin(request.user) or not self._autorise(request):
            return _refus()
        from django.db.models import Count
        services.motifs_de(request.user.organization)
        liste = ContactReason.objects.filter(organization=request.user.organization).annotate(n=Count('contacts'))
        return Response({'results': [_motif_dict(m, True) for m in liste]})

    def post(self, request):
        if not _admin(request.user) or not self._autorise(request):
            return _refus()
        label = str(request.data.get('label') or '').strip()[:80]
        if not label:
            return _invalide('Le nom du motif est obligatoire.')
        org = request.user.organization
        if ContactReason.objects.filter(organization=org, label__iexact=label).exists():
            return _invalide('Ce motif existe déjà.')
        position = ContactReason.objects.filter(organization=org).count()
        m = ContactReason.objects.create(organization=org, label=label, position=position,
                                         keywords=str(request.data.get('keywords') or '')[:300],
                                         message_template=str(request.data.get('message_template') or '')[:1000])
        return Response(_motif_dict(m, True), status=status.HTTP_201_CREATED)


class CrmReasonSettingsDetailView(_ProvenanceView):
    def _motif(self, request, pk):
        return ContactReason.objects.filter(organization=request.user.organization, pk=pk).first()

    def patch(self, request, pk):
        if not _admin(request.user) or not self._autorise(request):
            return _refus()
        m = self._motif(request, pk)
        if not m:
            return _introuvable()
        d = request.data
        if 'label' in d:
            label = str(d['label'] or '').strip()[:80]
            if not label:
                return _invalide('Le nom du motif est obligatoire.')
            m.label = label
        if 'keywords' in d:
            m.keywords = str(d['keywords'] or '')[:300]
        if 'message_template' in d:
            m.message_template = str(d['message_template'] or '')[:1000]
        if 'is_active' in d:
            m.is_active = bool(d['is_active'])
        if 'position' in d:
            m.position = max(int(d['position']), 0)
        m.save()
        return Response(_motif_dict(m, True))

    def delete(self, request, pk):
        if not _admin(request.user) or not self._autorise(request):
            return _refus()
        m = self._motif(request, pk)
        if not m:
            return _introuvable()
        if m.contacts.exists() or m.campaigns.exists():
            # Déjà utilisé : on le masque au lieu de le supprimer, pour garder l'historique.
            m.is_active = False
            m.save(update_fields=['is_active'])
            return Response({'archived': True})
        m.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Provenances : réglage ─────────────────────────────────────────────────

def _origine_dict(o):
    return {'id': str(o.id), 'code': o.code, 'label': o.label, 'is_active': o.is_active,
            'position': o.position, 'usage': getattr(o, 'n', None)}


class CrmOriginSettingsView(_ProvenanceView):
    def get(self, request):
        if not _admin(request.user) or not self._autorise(request):
            return _refus()
        from django.db.models import Count
        services.origines_de(request.user.organization)
        liste = PatientOrigin.objects.filter(organization=request.user.organization).annotate(n=Count('profiles'))
        return Response({'results': [_origine_dict(o) for o in liste]})

    def post(self, request):
        if not _admin(request.user) or not self._autorise(request):
            return _refus()
        label = str(request.data.get('label') or '').strip()[:80]
        if not label:
            return _invalide('Le nom est obligatoire.')
        org = request.user.organization
        if PatientOrigin.objects.filter(organization=org, label__iexact=label).exists():
            return _invalide('Cette provenance existe déjà.')
        o = PatientOrigin.objects.create(organization=org, label=label,
                                         position=PatientOrigin.objects.filter(organization=org).count())
        return Response(_origine_dict(o), status=status.HTTP_201_CREATED)


class CrmOriginSettingsDetailView(_ProvenanceView):
    def patch(self, request, pk):
        if not _admin(request.user) or not self._autorise(request):
            return _refus()
        o = PatientOrigin.objects.filter(organization=request.user.organization, pk=pk).first()
        if not o:
            return _introuvable()
        d = request.data
        if 'label' in d:
            label = str(d['label'] or '').strip()[:80]
            if not label:
                return _invalide('Le nom est obligatoire.')
            o.label = label
        if 'is_active' in d:
            o.is_active = bool(d['is_active'])
        o.save()
        return Response(_origine_dict(o))

    def delete(self, request, pk):
        if not _admin(request.user) or not self._autorise(request):
            return _refus()
        o = PatientOrigin.objects.filter(organization=request.user.organization, pk=pk).first()
        if not o:
            return _introuvable()
        if o.code or o.profiles.exists():
            o.is_active = False
            o.save(update_fields=['is_active'])
            return Response({'archived': True})
        o.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Campagnes ─────────────────────────────────────────────────────────────

def _campagne_dict(c, comptes=None, admin=False):
    d = {
        'id': str(c.id), 'name': c.name, 'kind': c.kind, 'kind_label': c.get_kind_display(),
        'reason': _motif_dict(c.reason) if c.reason_id else None,
        'zone': c.zone, 'start_date': c.start_date, 'end_date': c.end_date, 'notes': c.notes,
        'is_active': c.is_active,
        'budget': float(c.budget) if (admin and c.budget is not None) else None,
    }
    if comptes is not None:
        d.update(comptes)
    return d


def _peut_gerer_campagnes(user, action):
    return _admin(user) or user_can(user, Modules.CRM, action)


class CrmCampaignListView(_ProvenanceView):
    """GET : campagnes (pastilles et écran) ; POST : en créer une."""

    def get(self, request):
        if not self._autorise(request):
            return _refus()
        org = request.user.organization
        qs = CRMCampaign.objects.filter(organization=org).select_related('reason')
        seulement_actives = str(request.query_params.get('active', '')).lower() in ('1', 'true')
        if seulement_actives:
            today = date.today()
            qs = qs.filter(is_active=True).exclude(end_date__lt=today - timedelta(days=30))
            return Response({'results': [_campagne_dict(c) for c in qs]})

        logs = list(ContactLog.objects.filter(organization=org, campaign__isnull=False).select_related('reason', 'campaign'))
        etats = services.calculer_venues(logs)
        agreg = {}
        for l in logs:
            g = agreg.setdefault(l.campaign_id, {'contacts': 0, 'agreed': 0, 'came': 0, 'missed': 0, 'waiting': 0})
            g['contacts'] += 1
            g['agreed'] += 1 if l.outcome == 'agreed' else 0
            s = etats[l.id]['status']
            if s in ('came', 'missed', 'waiting'):
                g[s] += 1
        profils = {}
        for r in PatientCRMProfile.objects.filter(organization=org, campaign__isnull=False).values_list('campaign_id', flat=True):
            profils[r] = profils.get(r, 0) + 1
        admin = _admin(request.user)
        sortie = []
        for c in qs:
            g = agreg.get(c.id, {'contacts': 0, 'agreed': 0, 'came': 0, 'missed': 0, 'waiting': 0})
            sortie.append(_campagne_dict(c, {'patients': profils.get(c.id, 0), **g}, admin))
        return Response({'results': sortie, 'can_manage': _peut_gerer_campagnes(request.user, 'create')})

    def post(self, request):
        if not self._autorise(request, ecriture=True) or not _peut_gerer_campagnes(request.user, 'create'):
            return _refus()
        d = request.data
        nom = str(d.get('name') or '').strip()[:120]
        if not nom:
            return _invalide('Le nom de la campagne est obligatoire.')
        org = request.user.organization
        if CRMCampaign.objects.filter(organization=org, name__iexact=nom).exists():
            return _invalide('Une campagne porte déjà ce nom.')
        try:
            c = CRMCampaign(organization=org, name=nom, created_by=request.user)
            erreur = self._remplir(c, d, org, request.user)
            if erreur:
                return erreur
        except ValueError as e:
            return _invalide(str(e))
        c.save()
        return Response(_campagne_dict(c, None, _admin(request.user)), status=status.HTTP_201_CREATED)

    @staticmethod
    def _remplir(c, d, org, user):
        kinds = {k for k, _ in CRMCampaign.KIND_CHOICES}
        if 'kind' in d:
            if d['kind'] not in kinds:
                return _invalide('Type de campagne inconnu.')
            c.kind = d['kind']
        if 'reason_id' in d:
            if d['reason_id']:
                motif = ContactReason.objects.filter(organization=org, pk=d['reason_id']).first()
                if not motif:
                    return _invalide('Motif inconnu.')
                c.reason = motif
            else:
                c.reason = None
        if 'zone' in d:
            c.zone = str(d['zone'] or '')[:120]
        if 'start_date' in d:
            c.start_date = _date(d['start_date'])
        if 'end_date' in d:
            c.end_date = _date(d['end_date'])
        if c.start_date and c.end_date and c.end_date < c.start_date:
            return _invalide('La date de fin précède la date de début.')
        if 'budget' in d and _admin(user):
            c.budget = _decimal(d['budget'])
        if 'notes' in d:
            c.notes = str(d['notes'] or '')[:2000]
        if 'is_active' in d:
            c.is_active = bool(d['is_active'])
        return None


class CrmCampaignDetailView(_ProvenanceView):
    def _campagne(self, request, pk):
        return CRMCampaign.objects.filter(organization=request.user.organization, pk=pk).select_related('reason').first()

    def patch(self, request, pk):
        if not self._autorise(request, ecriture=True) or not _peut_gerer_campagnes(request.user, 'edit'):
            return _refus()
        c = self._campagne(request, pk)
        if not c:
            return _introuvable()
        d = request.data
        try:
            if 'name' in d:
                nom = str(d['name'] or '').strip()[:120]
                if not nom:
                    return _invalide('Le nom de la campagne est obligatoire.')
                c.name = nom
            erreur = CrmCampaignListView._remplir(c, d, request.user.organization, request.user)
            if erreur:
                return erreur
        except ValueError as e:
            return _invalide(str(e))
        c.save()
        return Response(_campagne_dict(c, None, _admin(request.user)))

    def delete(self, request, pk):
        if not _admin(request.user) or not self._autorise(request):
            return _refus()
        c = self._campagne(request, pk)
        if not c:
            return _introuvable()
        if c.contacts.exists() or c.profiles.exists():
            c.is_active = False
            c.save(update_fields=['is_active'])
            return Response({'archived': True})
        c.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Relances ──────────────────────────────────────────────────────────────

class CrmRelanceListCreateView(_ProvenanceView):
    """GET ?patient=<id> [&pending=1] ; POST : noter une relance."""

    def get(self, request):
        if not self._autorise(request):
            return _refus()
        org = request.user.organization
        patient = request.query_params.get('patient')
        if not patient:
            return _invalide('Indiquez le patient.')
        logs = list(ContactLog.objects.filter(organization=org, patient_id=patient)
                    .select_related('reason', 'campaign', 'created_by').order_by('-contacted_at')[:60])
        etats = services.calculer_venues(logs)
        resultats = [_relance_dict(l, etats[l.id]) for l in logs]
        if str(request.query_params.get('pending', '')).lower() in ('1', 'true'):
            resultats = [r for r in resultats if r['status'] in ('waiting', 'missed')
                         and r['days'] <= services.FENETRE_RELANCE_JOURS + 60 and not r['invoice']]
        return Response({'results': resultats})

    def post(self, request):
        if not self._autorise(request, ecriture=True):
            return _refus()
        d = request.data
        org = request.user.organization
        patient = services.patients_du_centre(org, True).filter(pk=d.get('patient_id')).first() if d.get('patient_id') else None
        if not patient:
            return _invalide('Choisissez le patient.')
        canal = d.get('channel') or 'whatsapp'
        issue = d.get('outcome') or 'sent'
        if canal not in dict(ContactLog.CHANNEL_CHOICES):
            return _invalide('Canal inconnu.')
        if issue not in dict(ContactLog.OUTCOME_CHOICES):
            return _invalide('Issue inconnue.')
        motif = campagne = None
        if d.get('reason_id'):
            motif = ContactReason.objects.filter(organization=org, pk=d['reason_id']).first()
            if not motif:
                return _invalide('Motif inconnu.')
        if d.get('campaign_id'):
            campagne = CRMCampaign.objects.filter(organization=org, pk=d['campaign_id']).first()
            if not campagne:
                return _invalide('Campagne inconnue.')
            if not motif and campagne.reason_id:
                motif = campagne.reason
        try:
            prevue = _date(d.get('follow_up_date'))
        except ValueError as e:
            return _invalide(str(e))
        log = ContactLog.objects.create(
            organization=org, patient=patient, channel=canal, outcome=issue, reason=motif, campaign=campagne,
            note=str(d.get('note') or '').strip()[:300], follow_up_date=prevue, created_by=request.user,
        )
        if d.get('do_not_contact'):
            profil, _ = PatientCRMProfile.objects.get_or_create(patient=patient, defaults={'organization': org})
            if profil.organization_id == org.id:
                profil.do_not_contact = True
                profil.save(update_fields=['do_not_contact', 'updated_at'])
        etats = services.calculer_venues([log])
        return Response(_relance_dict(log, etats[log.id]), status=status.HTTP_201_CREATED)


class CrmRelanceDetailView(_ProvenanceView):
    def _log(self, request, pk):
        return (ContactLog.objects.filter(organization=request.user.organization, pk=pk)
                .select_related('reason', 'campaign', 'created_by').first())

    def patch(self, request, pk):
        if not self._autorise(request, ecriture=True):
            return _refus()
        log = self._log(request, pk)
        if not log:
            return _introuvable()
        d = request.data
        org = request.user.organization
        if 'outcome' in d:
            if d['outcome'] not in dict(ContactLog.OUTCOME_CHOICES):
                return _invalide('Issue inconnue.')
            log.outcome = d['outcome']
        if 'channel' in d:
            if d['channel'] not in dict(ContactLog.CHANNEL_CHOICES):
                return _invalide('Canal inconnu.')
            log.channel = d['channel']
        if 'note' in d:
            log.note = str(d['note'] or '').strip()[:300]
        if 'follow_up_date' in d:
            try:
                log.follow_up_date = _date(d['follow_up_date'])
            except ValueError as e:
                return _invalide(str(e))
        if 'reason_id' in d:
            log.reason = ContactReason.objects.filter(organization=org, pk=d['reason_id']).first() if d['reason_id'] else None
        if 'campaign_id' in d:
            log.campaign = CRMCampaign.objects.filter(organization=org, pk=d['campaign_id']).first() if d['campaign_id'] else None
        if 'came_invoice_id' in d:
            if d['came_invoice_id']:
                facture = Invoice.objects.filter(organization=org, pk=d['came_invoice_id'], client_id=log.patient_id).first()
                if not facture:
                    return _invalide('Facture inconnue pour ce patient.')
                log.came_invoice = facture
            else:
                log.came_invoice = None
        log.save()
        etats = services.calculer_venues([log])
        return Response(_relance_dict(log, etats[log.id]))

    def delete(self, request, pk):
        if not self._autorise(request, ecriture=True):
            return _refus()
        log = self._log(request, pk)
        if not log:
            return _introuvable()
        recent = timezone.now() - log.created_at < timedelta(hours=24)
        if not (_admin(request.user) or (log.created_by_id == request.user.id and recent)):
            return Response({'error': 'Seul un administrateur ou l\'auteur (dans les 24 h) peut supprimer.'},
                            status=status.HTTP_403_FORBIDDEN)
        log.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CrmPatientSummaryView(_ProvenanceView):
    """Chiffres clés et étiquettes d'un patient, pour sa fiche."""

    def get(self, request, pk):
        if not self._autorise(request):
            return _refus()
        org = request.user.organization
        patient = services.patients_du_centre(org, True).filter(pk=pk).first()
        if not patient:
            return _introuvable()
        return Response(services.resume_patient(patient, org, _admin(request.user)))


class CrmQuartierListView(_ProvenanceView):
    """Quartiers proposés en pastilles (les plus fréquents d'abord)."""

    def get(self, request):
        if not self._autorise(request):
            return _refus()
        return Response({'results': services.quartiers_suggeres(request.user.organization)})


class CrmReferrerSearchView(_ProvenanceView):
    """Recherche du patient qui en a envoyé un autre (bouche-à-oreille). Nom, numéro et téléphone seulement."""

    def get(self, request):
        if not self._autorise(request):
            return _refus()
        q = (request.query_params.get('q') or '').strip()
        if len(q) < 2:
            return Response({'results': []})
        base = services.patients_du_centre(request.user.organization)
        lot = services.appliquer_filtres(base, {'q': q}).order_by('name')[:8]
        return Response({'results': [{'id': str(c.id), 'name': c.name, 'patient_number': c.patient_number,
                                      'phone': c.phone} for c in lot]})


# ── Info de facture : montée en gamme ─────────────────────────────────────

class CrmInvoiceInfoView(_ProvenanceView):
    def _facture(self, request, pk):
        return Invoice.objects.filter(organization=request.user.organization, pk=pk).first()

    @staticmethod
    def _dict(facture, info):
        return {
            'invoice_id': str(facture.id),
            'total_amount': float(facture.total_amount or 0),
            'upsold': bool(info and info.upsold),
            'came_for': info.came_for if info else '',
            'planned_amount': float(info.planned_amount) if (info and info.planned_amount is not None) else None,
            'note': info.note if info else '',
            'revisit_date': info.revisit_date if info else None,
        }

    def get(self, request, pk):
        if not self._autorise(request):
            return _refus()
        facture = self._facture(request, pk)
        if not facture:
            return _introuvable()
        return Response(self._dict(facture, InvoiceCRMInfo.objects.filter(invoice=facture).first()))

    def put(self, request, pk):
        if not self._autorise(request, ecriture=True):
            return _refus()
        facture = self._facture(request, pk)
        if not facture:
            return _introuvable()
        d = request.data
        info, _ = InvoiceCRMInfo.objects.get_or_create(invoice=facture, defaults={'organization': request.user.organization})
        try:
            if 'upsold' in d:
                info.upsold = bool(d['upsold'])
            if 'came_for' in d:
                info.came_for = str(d['came_for'] or '').strip()[:200]
            if 'planned_amount' in d:
                info.planned_amount = _decimal(d['planned_amount'])
            if 'note' in d:
                info.note = str(d['note'] or '').strip()[:300]
            if 'revisit_date' in d:
                info.revisit_date = _date(d['revisit_date'])
        except ValueError as e:
            return _invalide(str(e))
        info.recorded_by = request.user
        info.save()
        return Response(self._dict(facture, info))


# ── Statistiques ──────────────────────────────────────────────────────────

class CrmStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if not getattr(user, 'organization_id', None) or not user_can(user, Modules.CRM, 'view'):
            return _refus()
        if Modules.CRM not in (user.organization.enabled_modules or []) and not user.is_superuser:
            return _refus()
        params = request.query_params
        try:
            fin = _date(params.get('end')) or date.today()
            debut = _date(params.get('start')) or (fin - timedelta(days=89))
        except ValueError as e:
            return _invalide(str(e))
        if debut > fin:
            return _invalide('La date de début suit la date de fin.')
        if (fin - debut).days > 800:
            return _invalide('Période trop longue.')
        return Response(stats.calculer_statistiques(user.organization, debut, fin, _admin(user)))


# ── Qualité des fiches ────────────────────────────────────────────────────

class CrmQualityView(APIView):
    """Fiches bien ou mal renseignées. « Par qui » : administrateurs seulement."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from . import qualite
        user = request.user
        if not getattr(user, 'organization_id', None) or not user_can(user, Modules.CRM, 'view'):
            return _refus()
        if Modules.CRM not in (user.organization.enabled_modules or []) and not user.is_superuser:
            return _refus()
        p = request.query_params
        try:
            jours = min(max(int(p.get('days', 90)), 0), 3650)
            page = max(int(p.get('page', 1)), 1)
        except (TypeError, ValueError):
            return _invalide('Paramètre invalide.')
        critere = p.get('criterion') or None
        if critere and critere not in qualite.LIBELLES:
            return _invalide('Information inconnue.')
        admin = _admin(user)
        return Response(qualite.analyser(user.organization, jours=jours,
                                         agent=(p.get('agent') or None) if admin else None,
                                         critere=critere, page=page, avec_auteurs=admin))
