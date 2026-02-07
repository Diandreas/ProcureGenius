"""
Script pour mettre à jour les données du Centre Julianna
Usage: python manage.py shell < update_julianna.py
OU: python manage.py update_julianna_data
"""
from apps.accounts.models import Organization
from apps.core.models import OrganizationSettings

print('🔍 Recherche du Centre Julianna...')

# Chercher l'organisation
org = None
search_names = ['Centre Julianna', 'centre julianna', 'CENTRE JULIANNA', 'Julianna']

for name in search_names:
    orgs = Organization.objects.filter(name__icontains=name)
    if orgs.exists():
        org = orgs.first()
        break

if not org:
    print('⚠️  Organisation non trouvée. Organisations disponibles:')
    for o in Organization.objects.all():
        print(f'  - {o.name} (ID: {o.id})')
else:
    print(f'✅ Organisation trouvée: {org.name}')

    # Créer ou récupérer les settings
    settings, created = OrganizationSettings.objects.get_or_create(
        organization=org,
        defaults={'company_name': 'Centre Médical Julianna'}
    )

    if created:
        print('✅ Settings créés')
    else:
        print('📝 Settings existants - Mise à jour...')

    # Afficher anciennes valeurs
    print('\n📋 Anciennes valeurs:')
    print(f'  Téléphone: {settings.company_phone or "Non défini"}')
    print(f'  Adresse: {settings.company_address or "Non défini"}')

    # Mettre à jour
    settings.company_phone = '655244149 / 679145198'
    settings.company_address = (
        'Entrée Marie Lumière à côté du Consulat Honoraire d\'Indonésie\n'
        'Makepe Saint-Tropez - Douala'
    )

    if not settings.company_name:
        settings.company_name = 'Centre Médical Julianna'

    settings.save()

    # Afficher nouvelles valeurs
    print('\n✅ Nouvelles valeurs:')
    print(f'  Nom: {settings.company_name}')
    print(f'  Téléphone: {settings.company_phone}')
    print(f'  Adresse: {settings.company_address}')

    print('\n🎉 Mise à jour réussie!')
