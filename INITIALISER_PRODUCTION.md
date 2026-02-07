# 🏥 Initialisation de la Base de Données - Centre Julianna

## 📋 Données de Production Configurées

✅ **Téléphones:** 655244149 / 679145198
✅ **Adresse:**
```
Entrée Marie Lumière à côté du Consulat Honoraire d'Indonésie
Makepe Saint-Tropez - Douala
```

## 🚀 Commande d'Initialisation

### Sur le serveur de production :

```bash
# 1. Se connecter au serveur
ssh user@serveur

# 2. Aller dans le dossier du projet
cd /path/to/ProcureGenius

# 3. Activer l'environnement virtuel
source venv/bin/activate

# 4. Lancer l'initialisation (PRODUCTION PURE - Sans simulations)
python manage.py create_julianna_production_data --reset
```

### Pour inclure des données de test (optionnel) :

```bash
# Avec patients et scénarios de test
python manage.py create_julianna_production_data --reset --with-simulations
```

## 📊 Ce Qui Sera Créé

### Mode Production Pure (Recommandé)
- ✅ Organisation : Centre de Sante JULIANNA
- ✅ Paramètres avec les vraies coordonnées
- ✅ 5 utilisateurs (admin, réception, docteur, labo, pharmacien)
- ✅ 82 tests de laboratoire avec valeurs de référence
- ✅ 145 médicaments avec gestion des stocks
- ✅ 44 services médicaux
- ✅ Catégories de produits
- ✅ Aucune donnée de test

### Mode Avec Simulations (--with-simulations)
Tout ce qui précède PLUS :
- 15 patients fictifs
- Consultations d'exemple
- Commandes de labo d'exemple
- Prescriptions d'exemple

## 🔐 Identifiants Créés

| Rôle | Username | Email | Mot de passe |
|------|----------|-------|--------------|
| Admin | julianna_admin | admin@csj.cm | julianna2025 |
| Réception | julianna_reception | reception@csj.cm | julianna2025 |
| Docteur | julianna_doctor | docteur@csj.cm | julianna2025 |
| Labo | julianna_lab | labo@csj.cm | julianna2025 |
| Pharmacien | julianna_pharmacist | pharma@csj.cm | julianna2025 |

**⚠️ IMPORTANT:** Changer ces mots de passe après la première connexion !

## ✅ Vérification

Après l'initialisation, vous verrez :

```
================================================================================
  MISE EN PRODUCTION TERMINÉE avec succes
================================================================================

STATISTIQUES FINALES:
- Organisation: Centre de Sante JULIANNA
- Utilisateurs: 5
- Tests disponibles: 82
- Produits: 189
- Patients: 0 (ou 15 si --with-simulations)

ACCÈS AU SYSTÈME:
- URL: http://localhost:8000
- Admin: julianna_admin / julianna2025
```

## 🔄 Pour Réinitialiser

Si vous devez recommencer :

```bash
python manage.py create_julianna_production_data --reset
```

Le flag `--reset` supprime toutes les données JULIANNA existantes avant de recréer.

## 📝 Notes Importantes

1. **Les coordonnées sont maintenant les vraies** :
   - Elles apparaîtront sur tous les documents (factures, reçus, étiquettes, etc.)

2. **Mode production pure** :
   - Aucune donnée de test
   - Base de données propre
   - Prête pour utilisation réelle

3. **Pas de redémarrage nécessaire** :
   - Les changements sont immédiats après l'exécution

4. **Backup recommandé** :
   - Faire un backup après l'initialisation réussie

## 🆘 En Cas de Problème

### Si la commande échoue :

1. Vérifier que Django est bien installé :
   ```bash
   python manage.py --version
   ```

2. Vérifier que la base de données est accessible :
   ```bash
   python manage.py migrate
   ```

3. Lire les logs d'erreur affichés

### Si l'organisation existe déjà :

Utiliser le flag `--reset` pour supprimer et recréer :
```bash
python manage.py create_julianna_production_data --reset
```

## 📞 Contact

Pour toute question sur l'initialisation, consulter la documentation du projet ou contacter l'équipe technique.
