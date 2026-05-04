"""
Script: Créer le Dr FOMETIO LONTSI Tatiane
Usage:  python manage.py shell < create_doctor_tatiane.py
   ou:  python create_doctor_tatiane.py  (si Django est déjà configuré)

Crée le médecin avec exactement les mêmes accès que le Dr Fabrice MBEZELE ESSAMA.
"""

import django
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')

# Ajouter le répertoire racine au path si nécessaire
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.contrib.auth import get_user_model
from apps.accounts.models import Organization, UserPermissions
from apps.core.modules import Modules

User = get_user_model()

# ── Configuration du nouveau médecin ────────────────────────────────────────
NEW_DOCTOR = {
    'username':   'dr.tatiane',
    'password':   'Fomet!237x',
    'email':      'tatiane.fometio@csj.cm',
    'first_name': 'Tatiane',
    'last_name':  'FOMETIO LONTSI',
    'role':       'doctor',
}

# Modules identiques au Dr Fabrice
MODULE_DOCTOR = [
    Modules.PATIENTS,
    Modules.CONSULTATIONS,
    Modules.LABORATORY,
    Modules.PHARMACY,
]

# ── Trouver l'organisation ───────────────────────────────────────────────────
try:
    org = Organization.objects.get(name='Centre de Sante JULIANNA')
    print(f"[OK] Organisation trouvée : {org.name}")
except Organization.DoesNotExist:
    orgs = Organization.objects.all()
    if orgs.count() == 1:
        org = orgs.first()
        print(f"[OK] Organisation unique utilisée : {org.name}")
    else:
        print("[ERREUR] Plusieurs organisations trouvées. Sélectionnez manuellement :")
        for o in orgs:
            print(f"  - {o.name} (id={o.id})")
        sys.exit(1)

# ── Créer l'utilisateur ───────────────────────────────────────────────────────
username = NEW_DOCTOR['username']

if User.objects.filter(username=username).exists():
    print(f"[INFO] L'utilisateur '{username}' existe déjà. Mise à jour...")
    user = User.objects.get(username=username)
    user.first_name = NEW_DOCTOR['first_name']
    user.last_name  = NEW_DOCTOR['last_name']
    user.email      = NEW_DOCTOR['email']
    user.role       = NEW_DOCTOR['role']
    user.organization = org
    user.is_active  = True
    user.set_password(NEW_DOCTOR['password'])
    user.save()
else:
    user = User.objects.create_user(
        username=username,
        password=NEW_DOCTOR['password'],
        email=NEW_DOCTOR['email'],
        first_name=NEW_DOCTOR['first_name'],
        last_name=NEW_DOCTOR['last_name'],
        role=NEW_DOCTOR['role'],
        organization=org,
    )
    user.is_active = True
    user.save()
    print(f"[OK] Utilisateur créé : {user.get_full_name()}")

# ── Configurer les permissions (identiques au Dr Fabrice) ────────────────────
perms, created = UserPermissions.objects.get_or_create(user=user)
perms.module_access     = MODULE_DOCTOR
perms.can_manage_users  = False
perms.can_manage_settings = False
perms.can_view_analytics  = False
perms.can_approve_purchases = False
perms.save()

print(f"[OK] Permissions configurées : {MODULE_DOCTOR}")

# ── Résumé ───────────────────────────────────────────────────────────────────
print()
print("=" * 55)
print("  MÉDECIN CRÉÉ AVEC SUCCÈS")
print("=" * 55)
print(f"  Nom complet : {user.get_full_name()}")
print(f"  Identifiant : {user.username}")
print(f"  Mot de passe: {NEW_DOCTOR['password']}")
print(f"  Email       : {user.email}")
print(f"  Rôle        : {user.role}")
print(f"  Organisation: {org.name}")
print(f"  Modules     : PATIENTS, CONSULTATIONS, LABORATOIRE, PHARMACIE")
print("=" * 55)
