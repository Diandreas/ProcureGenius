"""
Script pour corriger les permissions de l'admin
Usage: python manage.py shell < fix_admin.py
"""
from django.contrib.auth import get_user_model

User = get_user_model()

print('🔧 Correction des permissions admin...')

# Chercher l'admin
admin = User.objects.filter(username='julianna_admin').first()
if not admin:
    admin = User.objects.filter(email='admin@csj.cm').first()
if not admin:
    admin = User.objects.filter(role='admin').first()

if not admin:
    print('❌ Admin non trouvé')
    print('\nUtilisateurs disponibles:')
    for u in User.objects.all():
        print(f'  - {u.username} ({u.email}) - {u.role}')
else:
    print(f'✅ Admin trouvé: {admin.username}')
    print(f'\nAvant:')
    print(f'  is_staff: {admin.is_staff}')
    print(f'  is_superuser: {admin.is_superuser}')
    print(f'  role: {admin.role}')

    # Corriger
    admin.is_staff = True
    admin.is_superuser = True
    admin.role = 'admin'
    admin.is_active = True
    admin.save()

    print(f'\n✅ Après correction:')
    print(f'  is_staff: {admin.is_staff}')
    print(f'  is_superuser: {admin.is_superuser}')
    print(f'  role: {admin.role}')
    print('\n🎉 Admin corrigé! Il a maintenant tous les accès.')
