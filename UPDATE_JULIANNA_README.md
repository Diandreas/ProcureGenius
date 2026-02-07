# Mise à jour des données du Centre Julianna

## 📋 Informations à mettre à jour

**Téléphones:** 655244149 / 679145198
**Adresse:**
Entrée Marie Lumière à côté du Consulat Honoraire d'Indonésie
Makepe Saint-Tropez - Douala

## 🚀 Méthodes d'exécution

### Méthode 1 : Management Command (Recommandée)

```bash
# Sur le serveur de production
cd /path/to/ProcureGenius
source venv/bin/activate  # Activer l'environnement virtuel
python manage.py update_julianna_data
```

### Méthode 2 : Script Python via Django Shell

```bash
cd /path/to/ProcureGenius
source venv/bin/activate
python manage.py shell < update_julianna.py
```

### Méthode 3 : Django Shell Interactif

```bash
cd /path/to/ProcureGenius
source venv/bin/activate
python manage.py shell
```

Puis dans le shell :
```python
from apps.accounts.models import Organization
from apps.core.models import OrganizationSettings

# Trouver l'organisation
org = Organization.objects.filter(name__icontains='julianna').first()
print(f"Organisation: {org.name}")

# Récupérer ou créer les settings
settings, created = OrganizationSettings.objects.get_or_create(
    organization=org,
    defaults={'company_name': 'Centre Médical Julianna'}
)

# Mettre à jour
settings.company_phone = '655244149 / 679145198'
settings.company_address = '''Entrée Marie Lumière à côté du Consulat Honoraire d'Indonésie
Makepe Saint-Tropez - Douala'''
settings.company_name = 'Centre Médical Julianna'
settings.save()

print("✅ Mise à jour réussie!")
```

## 📂 Fichiers créés

1. **`apps/core/management/commands/update_julianna_data.py`**
   Management command Django

2. **`update_julianna.py`**
   Script Python standalone

3. **Ce fichier README**
   Instructions d'utilisation

## ✅ Vérification

Après la mise à jour, vérifier dans l'interface admin Django ou via shell :

```python
from apps.core.models import OrganizationSettings
from apps.accounts.models import Organization

org = Organization.objects.filter(name__icontains='julianna').first()
settings = org.settings

print(f"Nom: {settings.company_name}")
print(f"Téléphone: {settings.company_phone}")
print(f"Adresse: {settings.company_address}")
```

## 📝 Notes

- Ces informations apparaîtront sur :
  - Les factures PDF
  - Les reçus thermiques
  - Les rapports de consultation
  - Les résultats de laboratoire
  - Tous les documents générés par le système

- Les modifications sont immédiates après l'exécution du script
- Aucun redémarrage du serveur n'est nécessaire
