"""
Vue de diagnostic temporaire pour vérifier les données d'organisation
"""
from django.http import JsonResponse, HttpResponse
from django.contrib.auth.decorators import login_required
from apps.core.models import OrganizationSettings
from .models import Invoice, PrintTemplate

@login_required
def debug_organization_data(request):
    """
    Endpoint de debug pour vérifier les données d'organisation
    Accès: /invoicing/debug/organization/
    """
    # Si format=html est demandé, retourner une page HTML
    if request.GET.get('format') == 'html':
        return debug_organization_html(request)

    data = {
        'user': {
            'username': request.user.username,
            'email': request.user.email,
            'has_organization_attr': hasattr(request.user, 'organization'),
        }
    }

    # Vérifier si l'utilisateur a une organisation
    if hasattr(request.user, 'organization') and request.user.organization:
        org = request.user.organization
        data['organization'] = {
            'id': str(org.id),
            'name': org.name,
        }

        # Chercher OrganizationSettings
        org_settings = OrganizationSettings.objects.filter(organization=org).first()

        if org_settings:
            data['organization_settings'] = {
                'exists': True,
                'company_name': org_settings.company_name,
                'company_name_empty': not bool(org_settings.company_name),
                'company_address': org_settings.company_address,
                'company_phone': org_settings.company_phone,
                'company_email': org_settings.company_email,
                'paper_size': org_settings.paper_size,
                'paper_orientation': org_settings.paper_orientation,
            }
        else:
            data['organization_settings'] = {
                'exists': False,
                'message': 'OrganizationSettings not found for this organization'
            }

        # Vérifier les PrintTemplates
        print_templates = PrintTemplate.objects.filter(organization=org, template_type='invoice')
        data['print_templates'] = []
        for template in print_templates:
            data['print_templates'].append({
                'name': template.name,
                'is_default': template.is_default,
                'header_company_name': template.header_company_name,
                'has_procuregenius': 'procuregenius' in (template.header_company_name or '').lower(),
            })
    else:
        data['organization'] = None
        data['message'] = 'User has no organization'

    # Vérifier la première facture
    first_invoice = Invoice.objects.filter(created_by=request.user).first()
    if first_invoice:
        data['first_invoice'] = {
            'invoice_number': first_invoice.invoice_number,
            'created_by_username': first_invoice.created_by.username,
            'created_by_has_org': hasattr(first_invoice.created_by, 'organization'),
        }

        if hasattr(first_invoice.created_by, 'organization') and first_invoice.created_by.organization:
            data['first_invoice']['organization_name'] = first_invoice.created_by.organization.name

    return JsonResponse(data, json_dumps_params={'indent': 2, 'ensure_ascii': False})


@login_required
def debug_organization_html(request):
    """Version HTML du diagnostic"""
    from apps.core.models import OrganizationSettings
    from .models import PrintTemplate

    org_settings = None
    print_templates = []
    organization = None

    if hasattr(request.user, 'organization') and request.user.organization:
        organization = request.user.organization
        org_settings = OrganizationSettings.objects.filter(organization=organization).first()
        print_templates = PrintTemplate.objects.filter(organization=organization, template_type='invoice')

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Diagnostic Organisation</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
            .container {{ max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
            h1 {{ color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }}
            h2 {{ color: #1e40af; margin-top: 30px; }}
            .section {{ background: #f9fafb; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #2563eb; }}
            .field {{ margin: 10px 0; }}
            .label {{ font-weight: bold; color: #4b5563; display: inline-block; width: 200px; }}
            .value {{ color: #111827; }}
            .empty {{ color: #ef4444; font-style: italic; }}
            .ok {{ color: #10b981; font-weight: bold; }}
            .warning {{ color: #f59e0b; font-weight: bold; }}
            .error {{ color: #ef4444; font-weight: bold; }}
            table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
            th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }}
            th {{ background: #f3f4f6; font-weight: 600; }}
            .procuregenius {{ background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 3px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔍 Diagnostic des Données d'Organisation</h1>

            <div class="section">
                <h2>👤 Utilisateur</h2>
                <div class="field">
                    <span class="label">Username:</span>
                    <span class="value">{request.user.username}</span>
                </div>
                <div class="field">
                    <span class="label">Email:</span>
                    <span class="value">{request.user.email}</span>
                </div>
                <div class="field">
                    <span class="label">A une organisation:</span>
                    <span class="{'ok' if organization else 'error'}">
                        {'✓ OUI' if organization else '✗ NON'}
                    </span>
                </div>
            </div>

            {'<div class="section"><h2>🏢 Organisation</h2>' if organization else ''}
            {f'<div class="field"><span class="label">Nom:</span><span class="value">{organization.name}</span></div>' if organization else ''}
            {f'<div class="field"><span class="label">ID:</span><span class="value">{organization.id}</span></div>' if organization else ''}
            {'</div>' if organization else ''}

            <div class="section">
                <h2>⚙️ OrganizationSettings</h2>
                {f'''
                <div class="field">
                    <span class="label">Existe:</span>
                    <span class="{'ok' if org_settings else 'error'}">
                        {'✓ OUI' if org_settings else '✗ NON - PROBLÈME!'}
                    </span>
                </div>
                ''' if organization else '<span class="error">Pas d\'organisation</span>'}

                {f'''
                <div class="field">
                    <span class="label">company_name:</span>
                    <span class="{'value' if org_settings.company_name else 'empty'}">
                        {'<strong>' + org_settings.company_name + '</strong>' if org_settings.company_name else '⚠️ VIDE - C\'EST LE PROBLÈME!'}
                    </span>
                </div>
                <div class="field">
                    <span class="label">company_address:</span>
                    <span class="value">{org_settings.company_address or '(vide)'}</span>
                </div>
                <div class="field">
                    <span class="label">company_phone:</span>
                    <span class="value">{org_settings.company_phone or '(vide)'}</span>
                </div>
                <div class="field">
                    <span class="label">company_email:</span>
                    <span class="value">{org_settings.company_email or '(vide)'}</span>
                </div>
                <div class="field">
                    <span class="label">paper_size:</span>
                    <span class="value">{org_settings.paper_size or '(vide)'}</span>
                </div>
                ''' if org_settings else ''}
            </div>

            <div class="section">
                <h2>📄 PrintTemplates (Invoice)</h2>
                {f'<p>Nombre de templates: <strong>{len(print_templates)}</strong></p>' if organization else '<span class="error">Pas d\'organisation</span>'}

                {f'''
                <table>
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Par défaut</th>
                            <th>header_company_name</th>
                            <th>Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        {''.join([f"""
                        <tr>
                            <td>{t.name}</td>
                            <td>{'✓' if t.is_default else ''}</td>
                            <td>{t.header_company_name or '(vide)'}</td>
                            <td>
                                {'<span class="procuregenius">⚠️ CONTIENT "ProcureGenius"</span>' if 'procuregenius' in (t.header_company_name or '').lower() else '<span class="ok">✓ OK</span>'}
                            </td>
                        </tr>
                        """ for t in print_templates])}
                    </tbody>
                </table>
                ''' if print_templates else '<p class="warning">Aucun PrintTemplate trouvé</p>'}
            </div>

            <div class="section">
                <h2>🔧 Actions recommandées</h2>
                {'''
                <ol>
                    <li><strong>Problème trouvé:</strong> OrganizationSettings.company_name est vide!</li>
                    <li>Allez dans <strong>Paramètres → Général</strong></li>
                    <li>Remplissez le champ <strong>"Nom de l'entreprise"</strong></li>
                    <li>Cliquez sur <strong>Enregistrer</strong></li>
                    <li>Exécutez la commande: <code>py manage.py fix_procuregenius_templates</code></li>
                </ol>
                ''' if org_settings and not org_settings.company_name else
                '''
                <ol>
                    <li>Exécutez la commande: <code>py manage.py fix_procuregenius_templates</code></li>
                    <li>Régénérez vos PDFs</li>
                </ol>
                ''' if any('procuregenius' in (t.header_company_name or '').lower() for t in print_templates) else
                '<p class="ok">✓ Tout semble correct!</p>'}
            </div>

            <div style="margin-top: 30px; padding: 15px; background: #eff6ff; border-radius: 5px;">
                <p><strong>💡 Astuce:</strong> Pour voir les données en JSON, accédez à <a href="?format=json">?format=json</a></p>
            </div>
        </div>
    </body>
    </html>
    """

    return HttpResponse(html)
