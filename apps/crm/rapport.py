"""Rapport mensuel « patients financiers » : qui a depense quoi, a chaque passage.

Un seul constructeur, utilise par le telechargement (page Suivi patients et page
Patients | Financier) et par l'envoi mensuel par e-mail, pour que le fichier
recu soit identique a celui qu'on telecharge.

Regle financiere (voir memoire project_paiement_mode_source) : « paye » = facture
au statut `paid`. Les factures envoyees mais non reglees apparaissent quand meme
dans le detail, avec leur statut, mais ne sont pas comptees dans le total paye.
"""
import io
from collections import OrderedDict
from datetime import date, timedelta

from django.db.models import Prefetch, Q

from apps.invoicing.models import Invoice, InvoiceItem

from . import services

# Depense minimale visee par patient sur le mois : en dessous, la ligne est surlignee en rouge.
SEUIL_DEPENSE = 20000

STATUTS = {'paid': 'Payée', 'sent': 'Non réglée', 'overdue': 'En retard'}


def mois_precedent(aujourdhui=None):
    """(debut, fin) du mois civil precedent."""
    aujourdhui = aujourdhui or date.today()
    fin = aujourdhui.replace(day=1) - timedelta(days=1)
    return fin.replace(day=1), fin


def bornes_du_mois(texte):
    """'2026-09' -> (2026-09-01, 2026-09-30). Leve ValueError si invalide."""
    annee, mois = (int(x) for x in texte.split('-'))
    debut = date(annee, mois, 1)
    suivant = date(annee + (mois == 12), (mois % 12) + 1, 1)
    return debut, suivant - timedelta(days=1)


def _libelle_item(item):
    texte = (item.description or '').strip() or 'Article'
    return '%s × %s' % (texte, item.quantity) if item.quantity and item.quantity > 1 else texte


def factures_du_mois(organization, debut, fin, inclure_externes=False):
    patients = services.patients_du_centre(organization, inclure_externes)
    return (Invoice.objects
            .filter(organization=organization, client__in=patients,
                    created_at__date__gte=debut, created_at__date__lte=fin)
            .exclude(status__in=['cancelled', 'draft'])
            .exclude(invoice_type='credit_note')
            .select_related('client')
            .prefetch_related(Prefetch('items', queryset=InvoiceItem.objects.order_by('created_at')))
            .order_by('created_at'))


def construire_classeur(organization, debut, fin, inclure_externes=False):
    """Classeur Excel (BytesIO) + totaux {patients, passages, paye}."""
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter

    factures = list(factures_du_mois(organization, debut, fin, inclure_externes))

    par_patient = OrderedDict()
    for f in factures:
        fiche = par_patient.setdefault(f.client_id, {
            'client': f.client, 'passages': 0, 'paye': 0, 'non_regle': 0, 'articles': OrderedDict(),
        })
        fiche['passages'] += 1
        if f.status == 'paid':
            fiche['paye'] += f.total_amount or 0
        else:
            fiche['non_regle'] += f.total_amount or 0
        for item in f.items.all():
            fiche['articles'][_libelle_item(item)] = True

    classeur = Workbook()
    en_tete = Font(bold=True, color='FFFFFF')
    fond = PatternFill('solid', fgColor='1A5276')

    def feuille(ws, titres, lignes, largeurs):
        ws.append(titres)
        for c in ws[1]:
            c.font, c.fill = en_tete, fond
            c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        for ligne in lignes:
            ws.append(ligne)
        for i, l in enumerate(largeurs, 1):
            ws.column_dimensions[get_column_letter(i)].width = l
        for row in ws.iter_rows(min_row=2):
            for c in row:
                c.alignment = Alignment(vertical='top', wrap_text=True)
        ws.freeze_panes = 'A2'

    # 1. Resume par patient (ce que demande la direction)
    resume = []
    for fiche in sorted(par_patient.values(), key=lambda x: -x['paye']):
        c = fiche['client']
        resume.append([c.patient_number or '', c.name, c.phone or '', fiche['passages'],
                       float(fiche['paye']), float(fiche['non_regle']),
                       ' ; '.join(fiche['articles'].keys())])
    ws = classeur.active
    ws.title = 'Par patient'
    feuille(ws, ['N° patient', 'Patient', 'Téléphone', 'Passages', 'Total payé (FCFA)',
                 'Non réglé (FCFA)', 'Services / produits'],
            resume, [13, 30, 15, 10, 16, 15, 80])
    rouge = PatternFill('solid', fgColor='FFC7CE')
    for row in ws.iter_rows(min_row=2, max_row=1 + len(resume)):
        if (row[4].value or 0) < SEUIL_DEPENSE:
            for c in row:
                c.fill = rouge
            row[4].font = Font(bold=True, color='9C0006')
    total_paye = float(sum(f['paye'] for f in par_patient.values()))
    ws.append([])
    ws.append(['', 'TOTAL', '', len(factures), total_paye,
               float(sum(f['non_regle'] for f in par_patient.values())), ''])
    for c in ws[ws.max_row]:
        c.font = Font(bold=True)
    en_dessous = sum(1 for r in resume if r[4] < SEUIL_DEPENSE)
    ws.append(['', 'En rouge : moins de {:,} FCFA dépensés ({} patient(s) sur {})'.format(
        SEUIL_DEPENSE, en_dessous, len(resume)).replace(',', ' ')])

    # 2. Detail : une ligne par passage (facture)
    detail = []
    for f in factures:
        c = f.client
        detail.append([
            f.created_at.strftime('%d/%m/%Y'), f.invoice_number, c.patient_number or '', c.name,
            float(f.total_amount or 0), STATUTS.get(f.status, f.get_status_display()),
            f.get_payment_method_display() if getattr(f, 'payment_method', '') else '',
            ' ; '.join(_libelle_item(i) for i in f.items.all()),
        ])
    ws2 = classeur.create_sheet('Détail des passages')
    feuille(ws2, ['Date', 'N° facture', 'N° patient', 'Patient', 'Montant (FCFA)', 'Statut',
                  'Mode de paiement', 'Services / produits'], detail, [12, 18, 13, 30, 15, 13, 16, 80])

    tampon = io.BytesIO()
    classeur.save(tampon)
    tampon.seek(0)
    return tampon, {'patients': len(par_patient), 'passages': len(factures), 'paye': total_paye,
                    'sous_seuil': en_dessous}


def nom_fichier(organization, debut):
    return 'patients_financiers_%s_%s.xlsx' % (organization.name.replace(' ', '_'), debut.strftime('%Y-%m'))


def envoyer_rapport(organization, debut, fin, destinataires, inclure_externes=False):
    """Envoie le fichier du mois par e-mail avec le SMTP de l'organisation.

    Leve RuntimeError (message lisible) si la configuration d'envoi manque.
    """
    from django.core.mail import EmailMessage

    from apps.core.email_utils import get_organization_email_backend
    from apps.accounts.models import EmailConfiguration

    config = EmailConfiguration.objects.filter(organization=organization).first()
    connexion = get_organization_email_backend(organization)
    if not config or not connexion:
        raise RuntimeError("Aucune configuration d'envoi d'e-mails (SMTP) pour cette organisation.")
    if not destinataires:
        raise RuntimeError('Aucun destinataire.')

    tampon, totaux = construire_classeur(organization, debut, fin, inclure_externes)
    mois = debut.strftime('%m/%Y')
    corps = (
        'Bonjour,\n\nCi-joint le fichier des patients financiers de %s : pour chaque patient, '
        'le montant dépensé à chaque passage et les services ou produits achetés.\n\n'
        '%s patient(s), %s passage(s), %s FCFA payés.\n\n'
        'Envoyé automatiquement par ProcureGenius.'
    ) % (mois, totaux['patients'], totaux['passages'], '{:,.0f}'.format(totaux['paye']).replace(',', ' '))
    message = EmailMessage(
        subject='[%s] Patients financiers — %s' % (organization.name, mois),
        body=corps,
        from_email='%s <%s>' % (config.default_from_name, config.default_from_email),
        to=destinataires, connection=connexion,
    )
    message.attach(nom_fichier(organization, debut), tampon.read(),
                   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    message.send()
    return totaux
