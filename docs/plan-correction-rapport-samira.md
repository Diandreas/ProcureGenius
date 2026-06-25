# Plan de correction — Rapport de test Procura (Samira, 18 juin 2026)

> Source : `Rapport_Test_Procura_SamiraF.docx`. Causes racines confirmées dans le code.
> ✅ = confirmé · 🔍 = mécanisme identifié, à confirmer en début de correction · ☑️ = corrigé

## Suivi global

| Lot | Thème | État |
|-----|-------|------|
| 1 | Produits / Facturation / Stock (#1,2,3,6,15) | ☑️ fait |
| 2 | Droits d'accès & guards (#13, #20) | ☑️ fait |
| 3 | Contrats (#9, #10, #11) | ☑️ fait |
| 4 | Utilisateurs (#7, #8) | ☑️ fait |
| 5 | Import de documents (#4, #5, #18, #19) | ⬜ à faire (repro serveur requise) |
| 6 | Dashboard & totaux mobiles (#14, #23) | ☑️ fait |
| 7 | UX / mobile (#16, #17, #21, #22, #24, #25, #26, #27) | ⬜ à faire |
| 8 | Améliorations (P3) | ⬜ à faire |

### Détail des correctifs appliqués (commit en cours)
- **#1/#2** `Product.save()` : génération de référence unique anti-collision + suppression du `full_clean()` systématique ; nettoyage `get_queryset` produits (`apps/invoicing/models.py`, `apps/api/views.py`).
- **#3** Facturation : fallback réponse non paginée + `noOptionsText` explicite (`InvoiceForm.jsx`, `ProductSelectionDialog.jsx`).
- **#6** Alerte stock : plus d'alerte à la création d'un lot (entrée de stock) (`apps/invoicing/signals.py`).
- **#15** Restockage : « Sans vente » seulement si jamais facturé (`apps/analytics/restock_view.py`).
- **#13** `ModuleRoute` : écran d'upsell au lieu de redirection muette (`ModuleRoute.jsx`).
- **#20** IA : message clair « réservé Business/Pro » + front affiche `message` (`apps/ai_assistant/views.py`, `AIChat.jsx`).
- **#9** Contrat « Renouveler » : appelle l'API `renew` (route inexistante corrigée) ; `new_end_date` optionnel côté backend (`ContractDetail.jsx`, `apps/contracts/*`).
- **#10** Dates contrat : validation `end >= start` (serializer + form + garde approve/activate).
- **#11** Extraction clauses : succès seulement si clauses > 0 (`apps/contracts/views.py`, `ContractDetail.jsx`).
- **#7** Invitation : lien set-password fonctionnel via token (`apps/core/email_utils.py`, `apps/accounts/api_views.py`).
- **#8** Utilisateurs : bouton Réactiver conditionnel + endpoint PUT is_active (+ contrôle sièges) (`UserManagement.jsx`, `apps/accounts/api_views.py`).
- **#14** Dashboard : correction code module `purchase-orders` (tiret) + carte affiche le total (`dashboard_service.py`, `DashboardEnhanced.jsx`).
- **#23** Mobile : la tuile total affiche son sous-titre (nombre de BC) sur mobile (`NeumorphicList.jsx`).

---

## 🔴 P0 — Bloquants

### 1-2. Enregistrement produit instable + liste inaccessible ✅
- `Product.save()` ([apps/invoicing/models.py](../apps/invoicing/models.py)) : génération de référence auto non scopée org + sans gestion collision → `full_clean()` lève une ValidationError d'unicité non explicite.
- Désync stock : front envoie `stock_quantity` ET crée un lot ; le signal batch écrase `stock_quantity`.
- `get_queryset` produits fait un `queryset.first()` parasite dans un try/except muet.
- **Fix** : référence atomique scopée org ; ne pas `full_clean()` systématique ; source unique de stock ; nettoyer get_queryset.

### 3. Liste vide « No options » en facturation ✅
- Conséquence de #1/#2. Fallback UI explicite dans InvoiceForm.

### 4. Import de documents « erreur inconnue » 🔍
- apps/data_migration + DocumentImport.jsx catch générique. Remonter l'erreur serveur réelle.

### 5. Erreurs à l'approbation des imports 🔍
- Remonter l'erreur de validation précise.

## 🟠 P1 — Majeurs

- **6.** Alerte rupture systématique à la création ✅ — ne déclencher que sur vrai mouvement de sortie.
- **7.** Activation compte impossible ✅ — invitation envoie temp password + /login au lieu d'un lien set-password.
- **8.** Bouton « Désactiver » ne devient pas « Réactiver » ✅ — libellé/action conditionnels à is_active.
- **9.** Bouton « Renouveler » contrat → accueil ✅ — route `/contracts/:id/renew` inexistante.
- **10.** Contrat date fin < date début accepté 🔍 — validation serializer.
- **11.** Extraction clauses : succès trompeur ✅ — succès seulement si clauses > 0.
- **12.** Comptabilité gratuite sur mobile ✅ — guard d'abonnement uniforme.
- **13.** Modules premium → redirigent vers dashboard ✅ — ModuleRoute affiche écran upgrade.
- **14.** Dashboard : 0 bon de commande 🔍 — filtre/agrégat BC.
- **15.** Statut « Sans vente » malgré ventes 🔍 — recalcul d'après invoice_items.

## 🟡 P2 — Cohérence / UX

- **16.** Champs num. mobiles bloqués 0/1 — permettre chaîne vide.
- **17.** « 100% similaire » incohérent — entity_matcher seuil.
- **18.** Import mobile : type doc changé sans avertir.
- **19.** Import accepte images non pertinentes.
- **20.** IA gratuit : « quota_exceeded » brut ✅ — message clair "réservé Business/Pro".
- **21.** IA Achats : fragments Pydantic bruts.
- **22.** Graphique compta non rafraîchi.
- **23.** Mobile : totaux commandes/BC absents.
- **24.** Hors-ligne : seule l'accueil marche.
- **25.** Mode nuit mobile partiel.
- **26.** Tutoriel texte seul.
- **27.** Onboarding « Tester l'IA » coché au clic.

## 🟢 P3 — Améliorations
- Tableau suivi ventes par produit + filtre temporel.
- Fournisseurs : listes détaillées BC/produits.
