# 🚀 Quick Start - Données de Démonstration

## Lancement Rapide

### Windows
```bash
seed_data.bat
```

### Linux/Mac
```bash
python seed_all_modules.py
```

## 🔐 Connexion

```
Username: sophie.martin
Password: password123
```

## 📦 Ce qui est créé

- ✅ **1 Organisation** : Pâtisserie Artisanale (Profil ENTERPRISE - tous les modules)
- ✅ **1 Utilisateur** : Sophie Martin (Admin)
- ✅ **5 Fournisseurs** : Avec notes, catégories, diversité
- ✅ **10 Produits** : Mix physiques/services, achetés/fabriqués, avec marges
- ✅ **5 Clients** : Particuliers et professionnels
- ✅ **3 Bons de commande** : Statuts variés (reçu, approuvé, urgent)
- ✅ **5 Factures** : États complets (payée, envoyée, brouillon, en retard)
- ✅ **9 Mouvements de stock** : Réceptions, ventes, pertes, ajustements

## 💰 Chiffres Clés

| Métrique | Valeur |
|----------|--------|
| CA facturé | 2 805€ |
| Factures payées | 78€ |
| En attente | 2 188€ |
| Achats | 258€ |
| Marge moyenne | 156% |

## 🧪 Modules Testables

Tous les modules ont des données complètes :

1. **Dashboard** - Vue d'ensemble avec KPIs
2. **Fournisseurs** - 5 fournisseurs notés et catégorisés
3. **Bons de commande** - 3 BC (brouillon → reçu)
4. **Factures** - 5 factures (brouillon → payée + en retard)
5. **Produits** - 10 produits avec calcul marges automatique
6. **Clients** - 5 clients variés (B2C + B2B)
7. **Stock** - Mouvements traçables avec alertes
8. **Analytics** - Données pour rapports complets
9. **E-Sourcing** - Module disponible (données à créer)
10. **Contrats** - Module disponible (données à créer)

## 📖 Documentation Complète

Voir **[SEED_DATA_GUIDE.md](SEED_DATA_GUIDE.md)** pour :
- Description détaillée de toutes les données
- Scénarios de test complets
- Cas d'usage par module
- Guide de réinitialisation

## 🎯 Cas d'Usage Typique

**Sophie, 32 ans, lance sa pâtisserie artisanale** :
- Fabrique gâteaux et pâtisseries sur commande
- Achète matières premières chez fournisseurs locaux
- Mix clients particuliers (anniversaires, mariages) et B2B (restaurants, événements)
- Gère stocks, marges, factures, et fournisseurs
- Profil ENTERPRISE pour accéder à tous les modules et tester la plateforme complète

## 🔄 Réinitialiser

```bash
# Supprimer DB
del db.sqlite3

# Recréer
python manage.py migrate

# Re-seed
python seed_all_modules.py
```

---

**Prêt à tester ? Lancez `seed_data.bat` et connectez-vous avec `sophie.martin` / `password123` !**
