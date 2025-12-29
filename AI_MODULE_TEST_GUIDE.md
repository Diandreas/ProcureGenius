# Guide de Test - Module IA Amélioré

## 🎯 Tests Rapides (5 min)

### Test 1: Recherche "Lenovo"
**Before**: Aucun résultat  
**After**: Trouve les produits Lenovo

```
👤 User: "je cherche un produit qui s'appelle lenovo"

🤖 IA: J'ai trouvé 2 produit(s) correspondant à 'lenovo'. 
      Cliquez sur le bouton ci-dessous pour voir la liste.

      [Voir les 2 résultats]
```

**Critique**: ✅ Si cela fonctionne, la recherche multi-champs est OK

---

### Test 2: Recherche "ordinateur" 
**Before**: Aucun résultat ou résultats limités  
**After**: Trouve tous les produits avec "ordinateur" dans nom OU description

```
👤 User: "un ordinateur"

🤖 IA: J'ai trouvé X produit(s) correspondant à 'ordinateur'.

      [Voir les X résultats]
```

**Critique**: ✅ Si cela fonctionne, keyword search est OK

---

### Test 3: Création Produits Similaires
**Before**: "Voiture 4x4" bloqué comme doublon de "Voiture"  
**After**: Les deux produits créés séparément

```
👤 User: "créer un produit qui s'appelle Voiture prix 10000"

🤖 IA: 📝 Vérifier et Confirmer
      [Carte de preview avec détails]
      [✓ Confirmer]

👤 User: [Clique sur Confirmer]

🤖 IA: ✓ Produit 'Voiture' créé avec succès

---

👤 User: "je veux créer un produit physique une voiture un 4x4 qui coûte 30000 
         j'ai 5 pièces pour l'instant"

🤖 IA: 📝 Vérifier et Confirmer
      [Carte de preview "Voiture 4x4"]
      [✓ Confirmer]  ← PAS de message "produit similaire trouvé"

👤 User: [Clique sur Confirmer]

🤖 IA: ✓ Produit 'Voiture 4x4' créé avec succès
```

**Critique**: ✅ Si les deux sont créés sans blocage, duplicate detection intelligente fonctionne

---

### Test 4: Facture avec Nouveau Client (NOUVEAU)
**Before**: Client créé sans preview  
**After**: Preview du client ET de la facture affichées

```
👤 User: "créer une facture pour Client Test montant 1500 échéance 30 jours"

🤖 IA: 📝 Vérifier et Confirmer

      📦 Entités associées qui seront créées:
      
      ┌─────────────────────────────────────┐
      │ 👤 Client                           │
      │                                     │
      │ Nom: Client Test                    │
      │ Email:                              │
      │ Téléphone:                          │
      │                                     │
      │ ℹ️  Nouveau client "Client Test"   │
      │    sera créé automatiquement        │
      └─────────────────────────────────────┘
      
      ┌─────────────────────────────────────┐
      │ 🧾 Facture                          │
      │                                     │
      │ Client: Client Test                 │
      │ Montant: 1500€                      │
      │ Échéance: [date]                    │
      │                                     │
      │ [Annuler] [Modifier] [✓ Confirmer] │
      └─────────────────────────────────────┘

👤 User: [Clique sur ✓ Confirmer]

🤖 IA: ✓ Client 'Client Test' créé automatiquement
      ✓ Facture 'INV202512290001' créée pour Client Test
```

**Critique**: ✅ Si les 2 cards s'affichent, nested previews fonctionnent

---

### Test 5: Pas d'Erreur Async
**Before**: Erreur "You cannot call this from an async context"  
**After**: Aucune erreur même en envoyant beaucoup de messages

```
👤 User: [Tape et envoie 5 messages rapidement]
   1. "cherche produit X"
   2. "crée facture Y"
   3. "cherche client Z"
   4. "liste fournisseurs"
   5. "stats"

🤖 IA: [Répond à chaque message sans erreur]
```

**Check console/logs**: ❌ AUCUNE erreur "async context"

**Critique**: ✅ Si aucune erreur, fix async est OK

---

## 🔬 Tests Approfondis (15 min)

### Test A: Scoring Pondéré

Créer 3 produits:
```
1. "Laptop Dell XPS 15"
2. "Ordinateur portable professionnel" (description: "Dell XPS recommandé")
3. "Souris Dell wireless"
```

Rechercher: "dell xps"

**Expected**:
1. Laptop Dell XPS 15 (score ~100% - nom exact)
2. Ordinateur portable... (score ~70% - description match)
3. Souris Dell (score ~50% - partiel)

```
[Voir les 3 résultats]

Produit 1: Laptop Dell XPS 15 (Score: 95%)
Produit 2: Ordinateur portable... (Score: 68%)
Produit 3: Souris Dell (Score: 52%)
```

---

### Test B: Seuil 85% pour Doublons

Créer: "Ordinateur Dell"

Essayer créer: "Ordinateur Dell Gaming" (similarité ~75%)

**Expected**: ✅ Autorisé sans blocage (< 85%)

Essayer créer: "Ordinateur Dell" (similarité 100%)

**Expected**: ❌ Bloqué comme doublon (≥ 85%)

---

### Test C: Preview Cards avec Articles

```
👤 User: "créer facture pour ClientX avec article ServiceA quantité 5 prix 100"

🤖 IA: [Preview card]

      📋 Articles (1)
      ┌──────────────────────────┐
      │ ServiceA                 │
      │ 5 × 100€        = 500€  │
      └──────────────────────────┘
      
      Total: 500€
```

**Check**: ✅ Articles visibles dans preview

---

## 🐛 Tests de Régression

### R1: Recherche Vide
```
👤 User: "cherche produit"
🤖 IA: Aucun produit trouvé pour ''
```
✅ Pas de crash

---

### R2: Création Sans Confirmation
```
👤 User: "crée produit Test"
🤖 IA: [Preview]
👤 User: [Ferme sans confirmer]
```
✅ Rien créé, pas d'erreur

---

### R3: Client Existant
```
👤 User: "facture pour ClientExistant"
🤖 IA: [Preview SANS nested client card - juste facture]
```
✅ Pas de nested preview si client existe

---

## 📊 Métriques de Succès

| Test | Critère | Status |
|------|---------|--------|
| Recherche Lenovo | Trouve ≥ 1 résultat | ⬜ |
| Recherche ordinateur | Trouve ≥ 1 résultat | ⬜ |
| Voiture vs Voiture 4x4 | Les 2 créés | ⬜ |
| Nested previews | 2 cards affichées | ⬜ |
| Async errors | 0 erreur | ⬜ |
| Preview articles | Articles visibles | ⬜ |

**Si tous ✅**: Module IA 100% opérationnel! 🎉

---

## 🚨 Si Erreur

### Erreur: "async context"
**Fix**: Vérifier `consumers.py` ligne 244-251
```python
user_id = self.user.id  # ← Doit être extracté AVANT async
organization = self.user.organization
```

---

### Erreur: Recherche ne trouve rien
**Debug**:
```python
# Vérifier threshold
from apps.ai_assistant.entity_matcher import entity_matcher
print(entity_matcher.threshold)  # Doit être 0.5
```

---

### Erreur: Nested cards ne s'affichent pas
**Check**: 
1. Backend retourne `nested_previews`? (voir logs)
2. Frontend reçoit les données? (console browser)
3. PreviewCard a le prop `isNested`?

---

## ✅ Checklist Finale

- [ ] Test 1: Recherche Lenovo OK
- [ ] Test 2: Recherche ordinateur OK  
- [ ] Test 3: Voiture 4x4 créé séparément OK
- [ ] Test 4: Nested previews affichées OK
- [ ] Test 5: Aucune erreur async OK
- [ ] Régression: Tout fonctionne comme avant
- [ ] Documentation lue et comprise

**Si tout coché**: 🚀 Prêt pour production!
