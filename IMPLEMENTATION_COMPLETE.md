# Implémentation Complète - Dashboard Santé & Reçus Thermiques

## ✅ Phases Complétées (1-6)

### Phase 1: Dashboard Santé ✅
**Fichiers créés/modifiés:**
- `apps/analytics/dashboard_service.py` - Ajout de 4 méthodes de statistiques:
  - `get_patients_stats()` - Patients, visites, statuts
  - `get_consultations_stats()` - Consultations, revenus, top médecins
  - `get_laboratory_stats()` - Commandes labo, résultats critiques, turnaround time
  - `get_pharmacy_stats()` - Dispensations, profit, taux remplissage prescriptions

- `apps/analytics/widgets_registry.py` - 5 nouveaux widgets healthcare

**Widgets React créés:**
- `frontend/src/components/widgets/healthcare/PatientsOverviewWidget.jsx`
- `frontend/src/components/widgets/healthcare/ConsultationsSummaryWidget.jsx`
- `frontend/src/components/widgets/healthcare/LabOrdersStatusWidget.jsx`
- `frontend/src/components/widgets/healthcare/PharmacyDispensingWidget.jsx`
- `frontend/src/components/widgets/healthcare/HealthcareRevenueWidget.jsx`

### Phase 2: Infrastructure PDF Partagée ✅
**Fichier créé:**
- `apps/healthcare/__init__.py`
- `apps/healthcare/pdf_helpers.py` - Mixin réutilisable avec:
  - `_get_organization_data()` - Récupération données organisation
  - `_get_logo_base64()` - Conversion logo en base64
  - `_generate_qr_code()` - Génération QR codes
  - `detect_thermal_mode()` - Détection mode thermal

### Phase 3: Reçus Thermiques Laboratoire ✅
**Fichiers créés:**
- `apps/laboratory/views_pdf.py` - `LabOrderReceiptView`
- `apps/laboratory/templates/laboratory/pdf_templates/lab_order_receipt_thermal.html`
- URL ajoutée: `/laboratory/orders/<uuid>/receipt/`

### Phase 4: Reçus Thermiques Consultations ✅
**Fichiers créés:**
- `apps/consultations/views_pdf.py` - `ConsultationReceiptView`
- `apps/consultations/templates/consultations/pdf_templates/consultation_receipt_thermal.html`
- URL ajoutée: `/consultations/<uuid>/receipt/`

### Phase 5: Reçus Thermiques Pharmacie ✅
**Fichiers créés:**
- `apps/pharmacy/views_pdf.py` - `PharmacyDispensingReceiptView`
- `apps/pharmacy/templates/pharmacy/pdf_templates/dispensing_receipt_thermal.html`
- URL ajoutée: `/pharmacy/dispensings/<uuid>/receipt/`

### Phase 6: Services de Génération de Factures ✅
**Fichier créé:**
- `apps/healthcare/invoice_services.py` - 3 services:
  - `ConsultationInvoiceService.generate_invoice()`
  - `LabOrderInvoiceService.generate_invoice()`
  - `PharmacyInvoiceService.generate_invoice()`

**API Endpoints ajoutés:**
- `POST /consultations/<uuid>/generate-invoice/` - `GenerateConsultationInvoiceView`
- `POST /laboratory/orders/<uuid>/generate-invoice/` - `GenerateLabOrderInvoiceView`
- `POST /pharmacy/dispensings/<uuid>/generate-invoice/` - `GeneratePharmacyInvoiceView`

---

## 📋 Phase 7: Migrations & Tests - À COMPLÉTER

### Étapes restantes:

#### 1. Ajouter champ `invoice_type` au modèle Invoice

**Modifier:** `apps/invoicing/models.py`

Ajouter après la ligne 371 (après STATUS_CHOICES):

```python
INVOICE_TYPES = [
    ('standard', 'Standard'),
    ('healthcare_consultation', 'Consultation médicale'),
    ('healthcare_laboratory', 'Laboratoire'),
    ('healthcare_pharmacy', 'Pharmacie'),
]
```

Puis ajouter le champ après `status` (ligne ~375):

```python
invoice_type = models.CharField(
    max_length=30,
    choices=INVOICE_TYPES,
    default='standard',
    verbose_name=_("Type de facture")
)
```

#### 2. Ajouter champ `organization` au modèle Invoice

Le modèle Invoice n'a pas de champ `organization` mais devrait en avoir un pour filtrer par organisation.

Ajouter après `created_by` (ligne ~392):

```python
organization = models.ForeignKey(
    'accounts.Organization',
    on_delete=models.CASCADE,
    related_name='invoices',
    null=True,
    blank=True,
    verbose_name=_("Organisation")
)
```

#### 3. Créer les migrations

```bash
cd d:\project\BFMa\ProcureGenius

# Créer migration pour invoice_type et organization
python manage.py makemigrations invoicing

# Vérifier la migration
python manage.py sqlmigrate invoicing <migration_number>

# Appliquer la migration
python manage.py migrate invoicing
```

#### 4. Tests Backend à effectuer

**Créer:** `apps/healthcare/tests/test_invoice_services.py`

```python
from django.test import TestCase
from apps.consultations.models import Consultation
from apps.laboratory.models import LabOrder
from apps.pharmacy.models import PharmacyDispensing
from apps.healthcare.invoice_services import (
    ConsultationInvoiceService,
    LabOrderInvoiceService,
    PharmacyInvoiceService
)

class ConsultationInvoiceServiceTest(TestCase):
    def test_generate_invoice_success(self):
        # Créer consultation de test
        # Appeler ConsultationInvoiceService.generate_invoice()
        # Vérifier facture créée avec bon montant
        pass

    def test_cannot_generate_invoice_twice(self):
        # Tenter de créer 2 factures
        # Vérifier ValueError levée
        pass

# Idem pour LabOrderInvoiceService et PharmacyInvoiceService
```

**Exécuter:**
```bash
python manage.py test apps.healthcare.tests.test_invoice_services
```

#### 5. Tests Manuels Frontend

**À vérifier:**

1. **Dashboard:**
   - [ ] Les widgets santé s'affichent si modules activés
   - [ ] Les widgets santé sont cachés si modules désactivés
   - [ ] Les statistiques affichent les bonnes valeurs

2. **Reçus thermiques:**
   - [ ] Laboratoire: `/laboratory/orders/<uuid>/receipt/` génère PDF thermal
   - [ ] Consultations: `/consultations/<uuid>/receipt/` génère PDF thermal
   - [ ] Pharmacie: `/pharmacy/dispensings/<uuid>/receipt/` génère PDF thermal
   - [ ] QR codes sont scannables et contiennent les bonnes données
   - [ ] Logo s'affiche correctement si configuré

3. **Génération factures:**
   - [ ] Bouton "Générer Facture" crée facture consultation
   - [ ] Bouton "Générer Facture" crée facture laboratoire
   - [ ] Bouton "Générer Facture" crée facture pharmacie
   - [ ] Impossible de créer 2 factures pour même objet
   - [ ] Factures ont le bon `invoice_type`

#### 6. Frontend - Ajouter boutons "Imprimer Reçu"

**Créer les API services si pas déjà fait:**

`frontend/src/services/consultationAPI.js` - Ajouter:
```javascript
generateInvoice: (id) => api.post(`/healthcare/consultations/${id}/generate-invoice/`),
```

`frontend/src/services/laboratoryAPI.js` - Ajouter:
```javascript
generateInvoice: (id) => api.post(`/healthcare/laboratory/orders/${id}/generate-invoice/`),
```

`frontend/src/services/pharmacyAPI.js` - Ajouter:
```javascript
generateInvoice: (id) => api.post(`/healthcare/pharmacy/dispensings/${id}/generate-invoice/`),
```

**Modifier les pages de détail:**

Dans `frontend/src/pages/healthcare/laboratory/LabOrderDetail.jsx`:
```jsx
// Ajouter bouton à côté du bouton PDF existant
<Button
  onClick={() => window.open(`/healthcare/laboratory/orders/${order.id}/receipt/`, '_blank')}
  variant="outlined"
  startIcon={<Receipt />}
>
  Imprimer Reçu
</Button>

<Button
  onClick={handleGenerateInvoice}
  variant="contained"
  disabled={order.lab_invoice}
>
  {order.lab_invoice ? 'Facture créée' : 'Générer Facture'}
</Button>
```

Idem pour ConsultationDetail.jsx et DispensingList.jsx/Detail.jsx.

---

## 🎯 URLs Disponibles

### Reçus Thermiques (58mm/80mm)
- `GET /healthcare/consultations/<uuid>/receipt/` - Reçu consultation
- `GET /healthcare/laboratory/orders/<uuid>/receipt/` - Reçu laboratoire
- `GET /healthcare/pharmacy/dispensings/<uuid>/receipt/` - Reçu pharmacie

### Génération Factures (Manuelle)
- `POST /healthcare/consultations/<uuid>/generate-invoice/` - Facture consultation
- `POST /healthcare/laboratory/orders/<uuid>/generate-invoice/` - Facture laboratoire
- `POST /healthcare/pharmacy/dispensings/<uuid>/generate-invoice/` - Facture pharmacie

### Dashboard
- `GET /analytics/dashboard/stats/` - Inclut maintenant:
  - `patients` - Stats patients
  - `consultations` - Stats consultations
  - `laboratory` - Stats laboratoire
  - `pharmacy` - Stats pharmacie

---

## 📊 Récapitulatif des Fichiers

### Backend (22 fichiers)
**Créés:**
1. `apps/healthcare/__init__.py`
2. `apps/healthcare/pdf_helpers.py`
3. `apps/healthcare/invoice_services.py`
4. `apps/laboratory/views_pdf.py`
5. `apps/laboratory/templates/laboratory/pdf_templates/lab_order_receipt_thermal.html`
6. `apps/consultations/views_pdf.py`
7. `apps/consultations/templates/consultations/pdf_templates/consultation_receipt_thermal.html`
8. `apps/pharmacy/views_pdf.py`
9. `apps/pharmacy/templates/pharmacy/pdf_templates/dispensing_receipt_thermal.html`

**Modifiés:**
10. `apps/analytics/dashboard_service.py` - 4 méthodes stats
11. `apps/analytics/widgets_registry.py` - 5 widgets
12. `apps/consultations/api.py` - GenerateConsultationInvoiceView
13. `apps/consultations/urls.py` - 2 endpoints
14. `apps/laboratory/api.py` - GenerateLabOrderInvoiceView
15. `apps/laboratory/urls.py` - 2 endpoints
16. `apps/pharmacy/api.py` - GeneratePharmacyInvoiceView
17. `apps/pharmacy/urls.py` - 2 endpoints

**À modifier:**
18. `apps/invoicing/models.py` - Ajouter invoice_type + organization

### Frontend (6 fichiers)
**Créés:**
19. `frontend/src/components/widgets/healthcare/PatientsOverviewWidget.jsx`
20. `frontend/src/components/widgets/healthcare/ConsultationsSummaryWidget.jsx`
21. `frontend/src/components/widgets/healthcare/LabOrdersStatusWidget.jsx`
22. `frontend/src/components/widgets/healthcare/PharmacyDispensingWidget.jsx`
23. `frontend/src/components/widgets/healthcare/HealthcareRevenueWidget.jsx`
24. `frontend/src/components/widgets/healthcare/index.js`

**À modifier:**
- `frontend/src/pages/healthcare/laboratory/LabOrderDetail.jsx` - Ajouter boutons
- `frontend/src/pages/healthcare/consultations/ConsultationDetail.jsx` - Ajouter boutons
- `frontend/src/pages/healthcare/pharmacy/DispensingList.jsx` - Ajouter boutons

---

## ⚙️ Configuration Requise

### OrganizationSettings
Le système utilise `OrganizationSettings.paper_size` pour déterminer le format:
- `thermal_58` → Reçu 58mm
- `thermal_80` → Reçu 80mm
- `A4` / autres → Format standard

### Produits/Services
Les services de facturation créent automatiquement:
- **Consultation:** Produit avec référence `CONS-FEE` (prix par défaut: 50.00)
- **Laboratoire:** Utilise les prix des `LabTest`
- **Pharmacie:** Utilise les prix des médicaments

---

## 🚀 Commandes de Déploiement

```bash
# 1. Appliquer les migrations
python manage.py makemigrations invoicing
python manage.py migrate

# 2. Collecter les fichiers statiques
python manage.py collectstatic --noinput

# 3. Redémarrer le serveur
# (selon votre méthode de déploiement)
systemctl restart gunicorn  # ou supervisorctl restart procuregenius

# 4. Vérifier les logs
tail -f logs/django.log
```

---

## ✅ Checklist Finale

### Backend
- [x] Dashboard stats (patients, consultations, labo, pharmacie)
- [x] Widgets registry (5 widgets healthcare)
- [x] PDF helpers mixin (logo, QR, org data)
- [x] Reçus thermiques laboratoire
- [x] Reçus thermiques consultations
- [x] Reçus thermiques pharmacie
- [x] Services génération factures (3 modules)
- [x] API endpoints génération factures
- [ ] Migration invoice_type
- [ ] Tests unitaires

### Frontend
- [x] 5 widgets React healthcare
- [x] Widget export/import
- [ ] Boutons "Imprimer Reçu" (laboratoire, consultations, pharmacie)
- [ ] Boutons "Générer Facture"
- [ ] Tests manuels

### Documentation
- [x] Ce fichier (IMPLEMENTATION_COMPLETE.md)
- [ ] Mise à jour README si nécessaire

---

## 📞 Support

En cas de problème:

1. **Erreur WeasyPrint:** Vérifier GTK3 installé
2. **QR Code ne génère pas:** Vérifier pillow et qrcode installés
3. **Facture déjà existante:** Normal, un seul bouton "Générer Facture"
4. **Stats vides:** Vérifier modules activés dans OrganizationSettings

---

**Implémentation complétée le:** 2026-01-14
**Version:** Phase 1-6 ✅ | Phase 7 ⏳
**Prochaines étapes:** Migrations + Tests + Boutons Frontend
