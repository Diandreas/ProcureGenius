"""
Vues HTML Django pour le module Contrats
"""
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse, FileResponse
from django.views.decorators.http import require_http_methods, require_POST
from django.core.paginator import Paginator
from django.db.models import Q
from django.utils import timezone
from django.conf import settings
import json
import logging

from .models import Contract, ContractDocument, ContractTemplate, ContractClause, ContractItem
from apps.suppliers.models import Supplier
from apps.accounts.models import Client
from apps.invoicing.models import Product

logger = logging.getLogger(__name__)

User = __import__('django.contrib.auth', fromlist=['get_user_model']).get_user_model()


# =============================================
# LISTE DES CONTRATS
# =============================================

@login_required
def contract_list(request):
    """Liste des contrats avec recherche et filtres"""
    contracts = Contract.objects.select_related('supplier', 'client', 'created_by').order_by('-created_at')

    search = request.GET.get('search', '')
    status_filter = request.GET.get('status', '')
    contract_type = request.GET.get('type', '')

    if search:
        contracts = contracts.filter(
            Q(contract_number__icontains=search) |
            Q(title__icontains=search) |
            Q(supplier__name__icontains=search) |
            Q(client__name__icontains=search) |
            Q(counterpart_name__icontains=search)
        )
    if status_filter:
        contracts = contracts.filter(status=status_filter)
    if contract_type:
        contracts = contracts.filter(contract_type=contract_type)

    # Stats
    total = contracts.count()
    active = contracts.filter(status='active').count()
    expiring = contracts.filter(status='expiring_soon').count()
    draft = contracts.filter(status='draft').count()

    paginator = Paginator(contracts, 20)
    page_obj = paginator.get_page(request.GET.get('page'))

    context = {
        'page_obj': page_obj,
        'search': search,
        'status_filter': status_filter,
        'contract_type': contract_type,
        'total': total,
        'active': active,
        'expiring': expiring,
        'draft': draft,
        'status_choices': Contract.STATUS_CHOICES,
        'type_choices': Contract.CONTRACT_TYPE_CHOICES,
    }
    return render(request, 'contracts/contract_list.html', context)


# =============================================
# CRÉATION WIZARD (IA + Formulaire)
# =============================================

@login_required
def contract_create(request):
    """Création d'un contrat - Step 1: Choisir approche (IA ou modèle)"""
    templates = ContractTemplate.objects.filter(is_active=True).order_by('template_type', 'name')
    suppliers = Supplier.objects.filter(is_active=True).order_by('name')

    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        clients = Client.objects.filter(is_active=True).order_by('name')
    except Exception:
        clients = []

    context = {
        'templates': templates,
        'suppliers': suppliers,
        'clients': clients,
        'contract_types': Contract.CONTRACT_TYPE_CHOICES,
    }
    return render(request, 'contracts/contract_form.html', context)


@login_required
@require_POST
def contract_ai_generate(request):
    """API: génère les champs du contrat via IA à partir d'une description"""
    try:
        data = json.loads(request.body)
        description = data.get('description', '').strip()
        if not description:
            return JsonResponse({'error': 'Description requise'}, status=400)

        # Support mistralai v2.0+, v1.0+ and older versions
        try:
            from mistralai.client import Mistral
        except ImportError:
            try:
                from mistralai import Mistral
            except ImportError:
                from mistralai.client import MistralClient as Mistral
        client = Mistral(api_key=settings.MISTRAL_API_KEY)
        model = getattr(settings, 'MISTRAL_MODEL', 'mistral-small-latest')

        system_prompt = """Tu es un assistant juridique expert en rédaction de contrats commerciaux pour entrepreneurs québécois/canadiens.
Ton rôle est d'analyser une description de contrat et de générer les informations structurées nécessaires.
Réponds TOUJOURS en JSON valide avec exactement ces clés:
{
  "title": "Titre du contrat",
  "contract_type": "purchase|service|maintenance|lease|nda|partnership|other",
  "description": "Description complète en 2-3 phrases",
  "terms_and_conditions": "Termes et conditions généraux en paragraphes",
  "contract_body": "Corps complet du contrat en texte structuré avec sections numérotées",
  "payment_terms": "Conditions de paiement",
  "suggested_duration_months": 12,
  "total_value_estimate": 0,
  "currency": "CAD",
  "key_clauses": ["Clause 1", "Clause 2"],
  "risks": ["Risque potentiel 1"]
}"""

        response = client.chat.complete(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Génère les informations pour ce contrat:\n\n{description}"}
            ],
            temperature=0.4,
            max_tokens=3000
        )

        content = response.choices[0].message.content.strip()
        # Extraire le JSON de la réponse
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()

        result = json.loads(content)
        return JsonResponse({'success': True, 'data': result})

    except json.JSONDecodeError as e:
        logger.error(f"Erreur JSON IA contrat: {e}")
        return JsonResponse({'error': 'Réponse IA non parseable', 'raw': str(e)}, status=500)
    except Exception as e:
        logger.error(f"Erreur IA contrat: {e}")
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def contract_template_prefill(request, template_pk):
    """API: retourne le contenu d'un modèle pour pré-remplissage"""
    template = get_object_or_404(ContractTemplate, pk=template_pk, is_active=True)
    return JsonResponse({
        'name': template.name,
        'template_type': template.template_type,
        'description': template.description,
        'content': template.content,
        'ai_instructions': template.ai_prompt_instructions,
    })


@login_required
@require_POST
def contract_save(request):
    """Sauvegarde un contrat (création ou modification)"""
    contract_id = request.POST.get('contract_id')
    is_edit = bool(contract_id)

    try:
        if is_edit:
            contract = get_object_or_404(Contract, pk=contract_id)
        else:
            contract = Contract()
            contract.created_by = request.user

        contract.title = request.POST.get('title', '').strip()
        contract.contract_type = request.POST.get('contract_type', 'other')
        contract.description = request.POST.get('description', '').strip()
        contract.terms_and_conditions = request.POST.get('terms_and_conditions', '').strip()
        contract.payment_terms = request.POST.get('payment_terms', '').strip()
        contract.contract_body = request.POST.get('contract_body', '').strip()
        contract.internal_notes = request.POST.get('internal_notes', '').strip()
        contract.start_date = request.POST.get('start_date') or None
        contract.end_date = request.POST.get('end_date') or None
        contract.total_value = request.POST.get('total_value') or 0
        contract.currency = request.POST.get('currency', 'CAD')
        contract.auto_renewal = request.POST.get('auto_renewal') == 'on'
        contract.renewal_notice_days = int(request.POST.get('renewal_notice_days', 30))
        contract.alert_days_before_expiry = int(request.POST.get('alert_days_before_expiry', 30))
        contract.counterpart_name = request.POST.get('counterpart_name', '').strip()

        # Liens parties
        supplier_id = request.POST.get('supplier_id')
        if supplier_id:
            try:
                contract.supplier = Supplier.objects.get(pk=supplier_id)
            except Supplier.DoesNotExist:
                contract.supplier = None
        else:
            contract.supplier = None

        client_id = request.POST.get('client_id')
        if client_id:
            try:
                contract.client = Client.objects.get(pk=client_id)
            except Client.DoesNotExist:
                contract.client = None
        else:
            contract.client = None

        template_id = request.POST.get('template_id')
        if template_id:
            try:
                contract.template = ContractTemplate.objects.get(pk=template_id)
            except ContractTemplate.DoesNotExist:
                pass

        if not contract.title:
            messages.error(request, 'Le titre du contrat est requis.')
            return redirect('contracts:contract_create')

        contract.save()

        action = request.POST.get('action', 'draft')
        if action == 'submit_review' and not is_edit:
            contract.status = 'pending_review'
            contract.save(update_fields=['status'])

        verb = 'modifié' if is_edit else 'créé'
        messages.success(request, f'Contrat "{contract.contract_number}" {verb} avec succès.')
        return redirect('contracts:contract_detail', pk=contract.pk)

    except Exception as e:
        logger.error(f"Erreur sauvegarde contrat: {e}")
        messages.error(request, f'Erreur: {str(e)}')
        return redirect('contracts:contract_create')


# =============================================
# DÉTAIL / ÉDITION / SUPPRESSION
# =============================================

@login_required
def contract_detail(request, pk):
    """Détail d'un contrat"""
    contract = get_object_or_404(
        Contract.objects.select_related('supplier', 'client', 'created_by', 'approved_by', 'template'),
        pk=pk
    )
    documents = contract.documents.all().order_by('-uploaded_at')
    items = contract.items.select_related('product').all() if hasattr(contract, 'items') else []

    context = {
        'contract': contract,
        'documents': documents,
        'items': items,
        'document_types': ContractDocument.DOCUMENT_TYPE_CHOICES,
    }
    return render(request, 'contracts/contract_detail.html', context)


@login_required
def contract_edit(request, pk):
    """Modifier un contrat"""
    contract = get_object_or_404(Contract, pk=pk)

    if contract.status not in ['draft', 'pending_review']:
        messages.warning(request, f'Le contrat "{contract.contract_number}" ne peut être modifié dans son état actuel ({contract.get_status_display()}).')
        return redirect('contracts:contract_detail', pk=pk)

    suppliers = Supplier.objects.filter(is_active=True).order_by('name')
    try:
        clients = Client.objects.filter(is_active=True).order_by('name')
    except Exception:
        clients = []
    templates = ContractTemplate.objects.filter(is_active=True)

    context = {
        'contract': contract,
        'suppliers': suppliers,
        'clients': clients,
        'templates': templates,
        'contract_types': Contract.CONTRACT_TYPE_CHOICES,
        'is_edit': True,
    }
    return render(request, 'contracts/contract_form.html', context)


@login_required
def contract_delete(request, pk):
    """Supprimer un contrat"""
    contract = get_object_or_404(Contract, pk=pk)
    if request.method == 'POST':
        num = contract.contract_number
        contract.delete()
        messages.success(request, f'Contrat {num} supprimé.')
        return redirect('contracts:contract_list')
    return render(request, 'contracts/contract_confirm_delete.html', {'contract': contract})


# =============================================
# ACTIONS DE STATUT
# =============================================

@login_required
@require_POST
def contract_status_change(request, pk):
    """Changer le statut d'un contrat"""
    contract = get_object_or_404(Contract, pk=pk)
    action = request.POST.get('action')

    if action == 'approve':
        if contract.approve(request.user):
            messages.success(request, f'Contrat {contract.contract_number} approuvé.')
        else:
            messages.warning(request, 'Ce contrat ne peut pas être approuvé dans son état actuel.')
    elif action == 'activate':
        if contract.activate():
            messages.success(request, f'Contrat {contract.contract_number} activé.')
        else:
            messages.warning(request, 'Ce contrat doit être approuvé avant d\'être activé.')
    elif action == 'terminate':
        if contract.terminate():
            messages.success(request, f'Contrat {contract.contract_number} résilié.')
        else:
            messages.warning(request, 'Ce contrat ne peut pas être résilié dans son état actuel.')

    return redirect('contracts:contract_detail', pk=pk)


# =============================================
# SIGNATURES
# =============================================

@login_required
@require_POST
def contract_sign(request, pk):
    """Marquer une signature"""
    contract = get_object_or_404(Contract, pk=pk)
    party = request.POST.get('party')  # 'us' or 'counterpart'

    if party == 'us':
        contract.signed_by_us = True
        contract.signed_by_us_at = timezone.now()
        contract.signed_by_us_name = request.POST.get('signer_name', request.user.get_full_name() or request.user.username)
        contract.save(update_fields=['signed_by_us', 'signed_by_us_at', 'signed_by_us_name'])
        messages.success(request, 'Signature de notre côté enregistrée.')
    elif party == 'counterpart':
        contract.signed_by_counterpart = True
        contract.signed_by_counterpart_at = timezone.now()
        contract.signed_by_counterpart_name = request.POST.get('signer_name', '')
        contract.save(update_fields=['signed_by_counterpart', 'signed_by_counterpart_at', 'signed_by_counterpart_name'])
        messages.success(request, 'Signature de la contrepartie enregistrée.')

    return redirect('contracts:contract_detail', pk=pk)


# =============================================
# DOCUMENTS (UPLOAD)
# =============================================

@login_required
@require_POST
def contract_upload_document(request, pk):
    """Uploader un document à un contrat"""
    contract = get_object_or_404(Contract, pk=pk)

    file = request.FILES.get('file')
    doc_type = request.POST.get('document_type', 'other')
    title = request.POST.get('title', '').strip()

    if not file:
        messages.error(request, 'Aucun fichier sélectionné.')
        return redirect('contracts:contract_detail', pk=pk)

    if not title:
        title = file.name

    doc = ContractDocument.objects.create(
        contract=contract,
        document_type=doc_type,
        title=title,
        description=request.POST.get('description', ''),
        file=file,
        uploaded_by=request.user,
        mime_type=file.content_type,
        file_size=file.size,
    )

    # Si c'est un PDF signé, mettre à jour le champ signed_pdf
    if doc_type == 'signed_contract':
        contract.signed_pdf = file
        contract.save(update_fields=['signed_pdf'])

    messages.success(request, f'Document "{title}" ajouté avec succès.')
    return redirect('contracts:contract_detail', pk=pk)


# =============================================
# EXPORT PDF
# =============================================

@login_required
def contract_export_pdf(request, pk):
    """Exporter le contrat en PDF via WeasyPrint avec en-tête entreprise"""
    contract = get_object_or_404(
        Contract.objects.select_related('supplier', 'client', 'created_by', 'approved_by').prefetch_related('sections'),
        pk=pk
    )

    # Récupérer l'organisation et le logo
    organization = getattr(request.user, 'organization', None)
    logo_base64 = None
    if organization and hasattr(organization, 'logo') and organization.logo:
        try:
            import base64
            with organization.logo.open('rb') as f:
                logo_data = f.read()
                mime = getattr(organization.logo, 'content_type', 'image/png')
                logo_base64 = f"data:{mime};base64,{base64.b64encode(logo_data).decode()}"
        except Exception:
            pass

    context = {
        'contract': contract,
        'organization': organization,
        'logo_base64': logo_base64,
    }

    try:
        from weasyprint import HTML, CSS
        from django.template.loader import render_to_string

        html_content = render_to_string('reports/pdf/contract_report.html', context, request=request)
        pdf = HTML(string=html_content, base_url=request.build_absolute_uri('/')).write_pdf()

        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="contrat-{contract.contract_number}.pdf"'
        return response
    except Exception as e:
        messages.error(request, f'Erreur génération PDF: {str(e)}')
        return redirect('contracts:contract_detail', pk=pk)


# =============================================
# BIBLIOTHÈQUE DE MODÈLES
# =============================================

@login_required
def contract_template_library(request):
    """Bibliothèque des modèles de contrats"""
    templates = ContractTemplate.objects.filter(is_active=True).order_by('template_type', 'name')

    # Grouper par type
    grouped = {}
    for t in templates:
        ttype = t.get_template_type_display()
        if ttype not in grouped:
            grouped[ttype] = []
        grouped[ttype].append(t)

    context = {
        'templates': templates,
        'grouped_templates': grouped,
    }
    return render(request, 'contracts/contract_template_library.html', context)
