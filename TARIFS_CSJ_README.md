# 📋 Tarifs Centre de Santé Julianna

## ✅ Script de Chargement Créé

Le script pour charger automatiquement tous les tarifs du Centre de Santé Julianna a été créé.

### 🚀 Utilisation

```bash
python manage.py load_csj_tarifs
```

**Ou avec une organisation spécifique** :
```bash
python manage.py load_csj_tarifs --org-id=<ORGANIZATION_ID>
```

---

## 📊 Tarifs Inclus

### 1. **Consultation** (2 services)
- Consultation Infirmier : 3 000 F CFA
- Consultation Médecin général : 5 000 F CFA

### 2. **Hospitalisation** (10 services)
- Pose de cathéter - Perfusion : 1 000 F CFA
- Pose de sonde urinaire : 1 000 F CFA
- Drap pour lit : 1 000 F CFA
- Forfait simple deux lits : 7 500 F CFA
- Forfait VIP deux lits : 7 500 F CFA
- Mise En Observation (MEO) - Soins : 1 500 F CFA
- Forfait concentrateur / Heure : 5 000 F CFA
- Ponction pleural : 7 500 F CFA
- Ponction d'ascite : 7 500 F CFA
- Nebulisation : 5 000 F CFA

### 3. **Petite chirurgie** (21 services)
- Ongle incarné : 15 000 F CFA
- Incision et drainage panaris : 10 000 F CFA
- Infiltration corticoïdes : 2 500 F CFA
- Kystectomie/Lipomectomie S-C : 5 000 F CFA
- Petite cheloïdectomie : 5 000 F CFA
- Pansement simple : 500 F CFA
- Suture +5 points/trois plans : 12 000 F CFA
- Suture 1 à 3 points/un plan : 3 000 F CFA
- Suture 3 à 5 points/deux plans : 4 000 F CFA
- Extraction corps étranger : 5 000 F CFA
- Incision + drainage Abcès : 15 000 F CFA
- Circonsition : 5 000 F CFA
- Ablation petite lipome : 10 000 F CFA
- Injection simple : 500 F CFA
- Lavage des oreilles : 5 000 F CFA
- Ablation d'un frein de langue : 1 500 F CFA
- Attelle plâtrée/Plâtre : 7 000 F CFA
- Incision d'Abcès complexe : 6 000 F CFA
- Pansement complexe : 2 500 F CFA
- Incision d'Abcès simple : 3 000 F CFA
- Lavage plaies : 3 000 F CFA

### 4. **ORL** (1 service)
- Lavage nasal : 500 F CFA

### 5. **Laboratoire** (1 service)
- Kit de prélèvement : 400 F CFA

---

## 🔧 Fonctionnalités

Le script :
- ✅ Crée automatiquement les catégories si elles n'existent pas
- ✅ Crée les services de type "service" (pas de stock)
- ✅ Met à jour les prix si les services existent déjà
- ✅ Génère des codes uniques pour chaque service
- ✅ Marque tous les services comme actifs
- ✅ Utilise la devise FCFA (XAF)

---

## 📍 Emplacement du Script

```
apps/invoicing/management/commands/load_csj_tarifs.py
```

---

## 💡 Notes

- Tous les services sont de type **"service"** (non stockables)
- Les catégories sont créées automatiquement
- Si un service existe déjà (même nom), son prix sera **mis à jour**
- Les services sont automatiquement marqués comme **actifs**

---

## 🎯 Prochaines Étapes

1. Exécutez le script pour charger les tarifs
2. Vérifiez dans l'interface admin ou la page Produits
3. Les tarifs seront automatiquement disponibles pour :
   - Facturation consultations
   - Facturation hospitalisation
   - Facturation petite chirurgie
   - Facturation ORL
   - Facturation laboratoire

---

**Date de création** : 2026-02-15
**Total services** : 35 services médicaux
