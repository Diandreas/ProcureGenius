# Plan: Transform ProcureGenius into Complete LIMS + HMS + Pharmacy Solution

## 🔑 KEY ARCHITECTURAL DECISIONS (REVISED)

### 1. Patient = Client Model ✅
- **Extend existing Client model** with healthcare fields (date_of_birth, gender, blood_type, allergies, etc.)
- Add `client_type` field: 'b2b' (procurement) or 'patient' (healthcare)
- Reuses existing search, list, financial tracking infrastructure
- Migration: Existing clients default to 'b2b', new patients set to 'patient'

### 2. Lab Tests = Separate LIMS Structure ✅
- **Create standalone LabTest model** (NOT Product)
- Dedicated LIMS with test catalog, sample types, normal ranges, methodology
- LabOrder references LabTest directly (not Product)
- Billing: Generate Invoice items dynamically from LabTest prices
- Clean separation: Medical tests ≠ Inventory products

### 3. Medications = Product Model ✅
- Medications continue using existing Product model with category='Medications'
- Leverages 100% of inventory/stock management infrastructure
- PharmacyDispensing links to Product, creates StockMovement automatically

### 4. Consultation Fees = Service Products ✅
- Simple billing items remain as Product with type='service'
- No complex requirements, reuses invoice system

---

## Current State Analysis

### Existing System: ProcureGenius
**Type**: B2B Procurement & Billing SaaS Platform

**Technology Stack**:
- **Backend**: Django 5.1.4 + Django REST Framework
- **Frontend**: React 18.2 + Vite, Material-UI, Redux Toolkit
- **Database**: SQLite (dev), PostgreSQL-ready
- **Architecture**: Multi-tenant SaaS with module-based access control

### What Already Exists (Can Be Reused)

**Strong Foundation - 80% Reusable**:
1. **Billing System** (95% complete)
   - Invoice creation with line items
   - Multiple payment methods
   - Payment tracking and status management
   - PDF generation and printing
   - Located: `apps/invoicing/models.py`

2. **Inventory Management** (60% complete)
   - Product catalog (physical, service, digital types)
   - Stock tracking with movement history
   - Low stock alerts
   - Warehouse management
   - Located: `apps/invoicing/models.py` (Product, StockMovement)

3. **User Management & Roles** (100% complete)
   - Multi-role system (Admin, Manager, Buyer, Accountant, Viewer)
   - Organization-based multi-tenancy
   - Module-based access control
   - Located: `apps/accounts/models.py`

4. **Client Management** (Can become Patient Management)
   - Client registration with contact info
   - Activity tracking
   - Financial history
   - Located: `apps/invoicing/models.py` (Client model)

5. **Reporting & Analytics** (60% complete)
   - Dashboard with customizable widgets
   - Report templates
   - KPI tracking
   - Located: `apps/analytics/models.py`

6. **Document Generation**
   - PDF generation infrastructure
   - Print templates
   - Located: `apps/invoicing/models.py` (PrintTemplate)

### What Is Completely Missing (Must Build)

**Critical Healthcare Components - NEW DEVELOPMENT REQUIRED**:
1. ❌ **Patient Registration System**
2. ❌ **Medical Records Management**
3. ❌ **Appointment Scheduling & Calendar**
4. ❌ **Consultation Workflow**
5. ❌ **Prescription Management**
6. ❌ **Laboratory Test Order System (LIMS)**
7. ❌ **Lab Results Management**
8. ❌ **Pharmacy Dispensing Workflow**
9. ❌ **Medical History & Visit Tracking**
10. ❌ **Reception/Check-in Workflow**
11. ❌ **SMS/WhatsApp Notifications**
12. ❌ **Point-of-Sale (Cash Register/Caisse)**

---

## Requirements Analysis (Based on User Scenarios)

### Core Workflows Identified

#### Workflow 1: New Patient - Full Journey (Cas 1a, 1b, 1c, 1d)
**Patient**: Fabrice (new patient)

**Journey Steps**:
1. **Reception + Registration + Billing + Consultation**
   - Register patient (name, phone/WhatsApp, address)
   - Collect consultation fee
   - Generate receipt + consultation form for nurse
   - Print invoice with hospital stamp

2. **Laboratory Tests**
   - Patient returns for lab tests
   - Find patient in database
   - Mark visit type as "laboratory"
   - Collect test fees
   - Generate test order form for lab technician
   - Print invoice

3. **Results Collection**
   - Patient receives SMS notification
   - Reception verifies results ready
   - Lab technician releases results
   - Print lab results

4. **Pharmacy Purchase**
   - Check medication availability
   - Collect payment
   - Dispense medication
   - Generate pharmacy invoice
   - Flag out-of-stock items for center notification

#### Workflow 2: External Patient - Lab Only (Cas 2)
**Patient**: Angel (from another hospital)

**Journey Steps**:
1. **Registration + Lab Test**
   - Quick registration
   - Mark as "external patient"
   - Collect lab test fees
   - Generate test order

2. **Optional Pharmacy Purchase**
   - Same as Workflow 1d

#### Workflow 3: Medical Staff Operations

**Doctor Workflow**:
- View patient medical history
- Search and retrieve patient records
- Add consultation notes
- Prescribe medications
- Order lab tests

**Lab Technician Workflow**:
- Receive test orders
- Enter test results
- Mark results as ready
- Notify patient (SMS/WhatsApp)

**Pharmacist Workflow**:
- View prescriptions
- Check drug availability
- Dispense medications
- Update inventory

#### Workflow 4: Patient Self-Service

**Patient Requests**:
- Request medical history printout
- Pay service fee (1000 XAF)
- Receive printed history

#### Workflow 5: Administrative Operations

**Supervisor Workflow** (Boris/Tonton):
- View reports by department (pharmacy, consultation, lab)
- Generate statistics
- Review financial reports (accounting)
- Audit activity logs

---

## Gap Analysis: What's Missing vs What Exists

| Required Feature | Current Status | Can Reuse? | Must Build? | Estimated Effort |
|-----------------|----------------|------------|-------------|------------------|
| **Patient Registration** | Client model exists | ✅ 40% | ⚠️ 60% | Medium - Adapt Client model |
| **Patient Search** | Generic search exists | ✅ 80% | ⚠️ 20% | Low - Add patient-specific fields |
| **Medical History Storage** | None | ❌ 0% | ✅ 100% | High - New models needed |
| **Consultation Records** | None | ❌ 0% | ✅ 100% | High - New models + workflow |
| **Lab Test Orders** | Purchase Order exists | ✅ 30% | ⚠️ 70% | High - Adapt + build LIMS |
| **Lab Results Entry** | None | ❌ 0% | ✅ 100% | High - New interface + storage |
| **Prescription System** | None | ❌ 0% | ✅ 100% | High - New models + workflow |
| **Pharmacy Dispensing** | Product + Stock exists | ✅ 50% | ⚠️ 50% | Medium - Add dispensing logic |
| **Appointment Calendar** | None | ❌ 0% | ✅ 100% | High - New booking system |
| **SMS/WhatsApp Alerts** | None | ❌ 0% | ✅ 100% | Medium - External API integration |
| **Cash Register (Caisse)** | Payment tracking exists | ✅ 30% | ⚠️ 70% | Medium - Build POS interface |
| **Receipt Printing** | Invoice PDF exists | ✅ 90% | ⚠️ 10% | Low - Customize templates |
| **Role-Based Access** | Full system exists | ✅ 100% | ❌ 0% | Low - Add healthcare roles |
| **Financial Reports** | Framework exists | ✅ 60% | ⚠️ 40% | Medium - Add healthcare metrics |

**Summary**:
- **Can Reuse**: ~45% of existing codebase
- **Must Build New**: ~55% new healthcare-specific features
- **Total Estimated Effort**: 8-12 weeks for MVP (Medium-Large project)

---

## Migration Strategy

### Phase 1: Core Healthcare Models (Backend) - PRIORITY 1

**NEW DJANGO APPS TO CREATE**:
1. `apps/patients/` - Patient management
2. `apps/consultations/` - Medical consultations
3. `apps/laboratory/` - LIMS functionality
4. `apps/pharmacy/` - Pharmacy dispensing
5. `apps/appointments/` - Scheduling system

**ADAPTATIONS TO EXISTING APPS**:
1. `apps/invoicing/` - Add healthcare billing types
2. `apps/accounts/` - Add healthcare roles (Doctor, Nurse, Lab Tech, Pharmacist, Receptionist)

### Phase 2: Reception & Patient Flow (Frontend) - PRIORITY 1

**NEW PAGES TO CREATE**:
1. Patient Registration page
2. Patient Search/Lookup page
3. Patient Detail/History page
4. Reception Dashboard (check-in workflow)
5. Cash Register/POS interface

### Phase 3: Clinical Workflows (Backend + Frontend) - PRIORITY 2

**NEW FEATURES**:
1. Consultation recording interface
2. Lab test ordering system
3. Lab results entry interface
4. Prescription creation and management
5. Pharmacy dispensing interface

### Phase 4: Scheduling & Notifications - PRIORITY 2

**NEW FEATURES**:
1. Appointment calendar
2. SMS/WhatsApp integration
3. Automated notifications (results ready, appointment reminders)

### Phase 5: Reporting & Analytics - PRIORITY 3

**ADAPTATIONS**:
1. Healthcare-specific dashboard widgets
2. Department reports (consultation, lab, pharmacy)
3. Financial reports by service type
4. Patient visit statistics

---

## Critical Files to Modify/Create

### Backend (Django)

**NEW FILES TO CREATE**:
1. `apps/patients/models.py` - Patient, MedicalHistory, Visit
2. `apps/consultations/models.py` - Consultation, Diagnosis, VitalSigns
3. `apps/laboratory/models.py` - LabTest, TestOrder, TestResult
4. `apps/pharmacy/models.py` - Prescription, Medication, Dispensing
5. `apps/appointments/models.py` - Appointment, Schedule

**EXISTING FILES TO MODIFY**:
1. `apps/accounts/models.py` - Add healthcare roles
2. `apps/invoicing/models.py` - Add healthcare service types
3. `apps/core/modules.py` - Add healthcare modules
4. `saas_procurement/settings.py` - Register new apps

### Frontend (React)

**NEW PAGES TO CREATE**:
1. `frontend/src/pages/Patients/PatientList.jsx`
2. `frontend/src/pages/Patients/PatientRegistration.jsx`
3. `frontend/src/pages/Patients/PatientDetail.jsx`
4. `frontend/src/pages/Reception/CheckIn.jsx`
5. `frontend/src/pages/Reception/CashRegister.jsx`
6. `frontend/src/pages/Consultations/ConsultationForm.jsx`
7. `frontend/src/pages/Laboratory/TestOrder.jsx`
8. `frontend/src/pages/Laboratory/ResultEntry.jsx`
9. `frontend/src/pages/Pharmacy/Dispensing.jsx`
10. `frontend/src/pages/Appointments/Calendar.jsx`

**EXISTING FILES TO MODIFY**:
1. `frontend/src/App.jsx` - Add new routes
2. `frontend/src/store/index.js` - Add new Redux slices
3. `frontend/src/theme/index.js` - Healthcare-specific styling

---

## DETAILED IMPLEMENTATION PLAN

### Architecture Decisions (REVISED)

#### 1. Patient = Client Model (REVISED)
**DECISION**: Extend existing `Client` model to become `Patient`
- **Rationale**: Simpler architecture, reuses existing search/list infrastructure
- **Implementation**:
  - Add healthcare fields to Client model: date_of_birth, gender, blood_type, allergies, chronic_conditions, emergency contacts
  - Add `client_type` field: choices=['b2b', 'patient', 'both']
  - Rename "Client" to "Patient" in healthcare context (UI only, keep model name)
  - Existing procurement clients marked as 'b2b', healthcare patients as 'patient'
- **Benefits**: Single entity for all people, unified search, simpler codebase
- **Location**: `apps/invoicing/models.py` (modify existing Client model)

#### 2. Lab Tests = Separate LIMS Structure (REVISED)
**DECISION**: Create dedicated LabTest model (NOT using Product)
- **Rationale**: LIMS has unique requirements (normal ranges, sample types, test codes) that don't fit Product model
- **Implementation**:
  - `LabTest`: Standalone model with test catalog (test_code, name, price, normal_range, sample_type, category)
  - `LabOrder`: References LabTest directly (not Product)
  - `LabOrderItem`: Links to LabTest with result fields
  - Billing: LabOrder generates Invoice with service items dynamically
- **Benefits**: Clean LIMS architecture, proper medical data structure, easier to extend
- **Location**: `apps/laboratory/models.py`

#### 3. Medications = Product Model (UNCHANGED)
**DECISION**: Keep medications as Product with category='Medications'
- **Rationale**: Medications ARE inventory items needing stock tracking (same as products)
- **Benefits**: Reuses 100% of existing inventory/stock movement infrastructure

#### 4. Consultation Fees = Service Products (UNCHANGED)
**DECISION**: Consultation fees remain as Product with type='service'
- **Rationale**: Simple billing item without complex requirements
- **Benefits**: Reuses existing invoice line item system

#### 5. Billing Integration
**DECISION**: Single `Invoice` model for all healthcare billing
- Consultation invoices: Invoice with consultation fee Product
- Lab invoices: Invoice with dynamically created service items from LabTest prices
- Pharmacy invoices: Invoice with medication Products
- **Benefits**: Unified cashier workflow, single payment tracking system

---

## Phase 1: Core Models + Patient Registration + Billing (Week 1-2)

### Backend Tasks

**1. Extend Client Model to Support Patients (REVISED)**
- **File**: `apps/invoicing/models.py` (modify existing)
- **Add to Client model**:
  - `client_type`: CharField choices=['b2b', 'patient', 'both'] (default='b2b')
  - `patient_number`: CharField (auto-generated PAT-YYYYMM-0001, null for b2b clients)
  - `date_of_birth`: DateField (null=True, for patients only)
  - `gender`: CharField choices=['M', 'F', 'O'] (null=True)
  - `blood_type`: CharField choices=['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] (blank=True)
  - `allergies`: TextField (blank=True, for patients)
  - `chronic_conditions`: TextField (blank=True, for patients)
  - `emergency_contact_name`: CharField (blank=True)
  - `emergency_contact_phone`: CharField (blank=True)
  - `whatsapp`: CharField (blank=True, for SMS notifications)
  - `registration_source`: CharField choices=['internal', 'external', 'emergency'] (blank=True)
  - `referring_hospital`: CharField (blank=True, for external patients)
- **Add method**: `get_age()` - Calculate age from date_of_birth
- **Migration Strategy**: Existing clients default to `client_type='b2b'`, new patients set to 'patient'

- **File**: `apps/patients/models.py` (NEW - create patients app)
- **Models**:
  - `PatientVisit`: Track patient visits and workflow status
    - Fields: visit_number (auto VIS-YYYYMMDD-0001), visit_type, status, timestamps
    - References: client (FK to Client with client_type='patient'), consultation_invoice, staff assignments
    - Status flow: registered → waiting_consultation → in_consultation → completed

**2. Add Healthcare Roles**
- **File**: `apps/accounts/models.py`
- **Modify**: `CustomUser.role` choices to add:
  - `doctor`: Médecin
  - `nurse`: Infirmier/Infirmière
  - `lab_tech`: Technicien de laboratoire
  - `pharmacist`: Pharmacien
  - `receptionist`: Réceptionniste/Caisse
- **Update**: `_get_default_modules_for_role()` method for new roles

**3. Add Healthcare Modules**
- **File**: `apps/core/modules.py`
- **Add modules**: PATIENTS, CONSULTATIONS, LABORATORY, PHARMACY
- **Create profile**: 'healthcare' profile type with all healthcare modules

**4. Create Patient API**
- **File**: `apps/patients/serializers.py`
  - `PatientSerializer`: With age calculation, full_name, visit counts
  - `PatientVisitSerializer`: With related patient and staff names
- **File**: `apps/patients/api.py`
  - `PatientListCreateView`: List/search patients, create new
  - `PatientDetailView`: Retrieve/update/delete patient
  - `PatientSearchView`: Quick search by name/phone
  - `VisitListCreateView`: Register visits
  - `MarkLabVisitView`: Update visit type to lab
- **File**: `apps/patients/urls.py`: Define URL patterns

**5. Create Billing Integration Utilities**
- **File**: `apps/patients/utils.py`
- **Function**: `create_consultation_invoice(patient, visit, user)`
  - Creates Invoice with consultation fee product
  - Links to PatientVisit
  - Sets status to 'sent' (ready for payment)

**6. Setup Healthcare Products**
- **File**: `apps/patients/management/commands/setup_healthcare.py`
- Create ProductCategories: Consultations, Lab Tests, Medications
- Create default products:
  - Consultation Générale: 5,000 XAF
  - Historical setup for easy organization bootstrapping

**7. Register Apps**
- **File**: `saas_procurement/settings.py`
- Add to `INSTALLED_APPS`: `'apps.patients'`

**8. Run Migrations**
```bash
python manage.py makemigrations patients
python manage.py migrate patients
python manage.py setup_healthcare
```

### Frontend Tasks

**1. Patient Registration Page**
- **File**: `frontend/src/pages/patients/PatientRegistration.jsx`
- **Features**:
  - Form with Formik validation: name, DOB, gender, contact info
  - Medical history section: blood type, allergies, chronic conditions
  - Emergency contact fields
  - WhatsApp number for SMS notifications
  - Submit → API POST to `/api/patients/`
  - Success: Redirect to patient detail or reception dashboard

**2. Patient List & Search**
- **File**: `frontend/src/pages/patients/PatientList.jsx`
- **Features**:
  - Table with pagination (reuse existing patterns)
  - Search by name, phone, patient number
  - Quick actions: View details, Check-in
  - Filter by registration date, active status

**3. Patient Detail View**
- **File**: `frontend/src/pages/patients/PatientDetail.jsx`
- **Features**:
  - Display patient demographics and medical info
  - Edit button (for corrections)
  - Visit history table (Phase 1: basic list)
  - Action buttons: Check-in, View Full History (Phase 4)

**4. Reception Dashboard**
- **File**: `frontend/src/pages/reception/ReceptionDashboard.jsx`
- **Features**:
  - Today's visits queue (status-based tabs)
  - Quick check-in form (search patient → select visit type)
  - Billing shortcuts for consultation fee
  - Payment collection workflow
  - Print receipt button

**5. Reusable Components**
- **File**: `frontend/src/components/healthcare/PatientSearch.jsx`
  - Autocomplete search component
  - Search by name or phone
  - Returns patient selection
- **File**: `frontend/src/components/healthcare/PatientCard.jsx`
  - Display patient summary card
  - Shows: photo placeholder, name, age, patient number, contact
- **File**: `frontend/src/components/healthcare/QuickInvoice.jsx`
  - Fast invoice creation for consultations
  - Single product, immediate payment

**6. Navigation Updates**
- **File**: `frontend/src/App.jsx`
  - Add routes: `/patients`, `/patients/new`, `/patients/:id`, `/reception`
  - Protect with role-based guards
- **File**: `frontend/src/components/MobileBottomNav.jsx`
  - Add "Patients" navigation item with PersonIcon
- **File**: `frontend/src/config/modules.js`
  - Add `HEALTHCARE_MODULES` constants
  - Add module icons

**7. API Service Layer**
- **File**: `frontend/src/services/api.js`
- Add endpoints:
  - `getPatients()`, `createPatient()`, `getPatientById()`, `updatePatient()`
  - `searchPatients(query)`, `getPatientHistory(id)`
  - `createVisit()`, `getVisits()`, `updateVisitStatus()`

### Deliverable: Reception Workflow
✅ Receptionist can:
1. Register new patient with demographics and medical info
2. Search and find existing patients quickly
3. Check in patient for consultation
4. Create consultation invoice (5,000 XAF)
5. Collect payment (cash, card, bank transfer)
6. Print receipt with hospital stamp

---

## Phase 2: Laboratory Management (Week 3)

### Backend Tasks

**1. Create Laboratory App with LIMS Structure (REVISED)**
- **File**: `apps/laboratory/models.py`
- **Models**:
  - `LabTestCategory`: Test categories
    - Fields: organization (FK), name, slug, description, is_active
    - Examples: Hématologie, Biochimie, Microbiologie, Immunologie

  - `LabTest`: STANDALONE lab test catalog (NOT Product)
    - Fields:
      - organization (FK)
      - category (FK to LabTestCategory)
      - test_code: CharField unique (e.g., "HEM-CBC-001")
      - name: CharField (e.g., "Numération Formule Sanguine Complète")
      - description: TextField
      - price: DecimalField (test price in XAF)
      - normal_range_male: TextField (normal values for males)
      - normal_range_female: TextField (normal values for females)
      - normal_range_general: TextField (if no gender distinction)
      - unit_of_measurement: CharField (e.g., "g/dL", "cells/mcL", "mg/dL")
      - sample_type: CharField choices=['blood', 'urine', 'stool', 'swab', 'other']
      - sample_volume: CharField (e.g., "5ml", blank=True)
      - container_type: CharField (e.g., "EDTA tube", blank=True)
      - fasting_required: BooleanField (default=False)
      - preparation_instructions: TextField (blank=True)
      - estimated_turnaround_hours: IntegerField (default=24)
      - methodology: CharField (e.g., "Spectrophotometry", blank=True)
      - is_active: BooleanField (default=True)
      - requires_approval: BooleanField (default=False, for sensitive tests)
    - This is the TEST CATALOG - completely separate from Product inventory

  - `LabOrder`: Lab test order
    - Fields: order_number (auto LAB-YYYYMMDD-0001), order_date, status
    - Status: pending → sample_collected → in_progress → completed → results_ready → results_delivered → cancelled
    - Sample tracking: sample_collected_at, sample_collected_by
    - Results tracking: results_completed_at, results_entered_by, results_verified_by
    - SMS tracking: sms_sent, sms_sent_at
    - Reference: patient (FK to Client with client_type='patient'), visit (optional), consultation (optional)
    - Reference: lab_invoice (FK to Invoice, generated from LabTest prices)
    - Priority: CharField choices=['routine', 'urgent', 'stat']
    - Notes: TextField (special instructions)

  - `LabOrderItem`: Individual test in order
    - Fields:
      - lab_order (FK to LabOrder)
      - lab_test (FK to LabTest) - References test catalog, NOT Product
      - status: CharField (can differ from parent if multiple tests)
      - result_value: TextField (free text for MVP - can be numeric, text, or formatted)
      - result_numeric: DecimalField (null=True, for numeric results only)
      - result_unit: CharField (copied from LabTest or override)
      - reference_range: CharField (copied from LabTest based on patient gender)
      - is_abnormal: BooleanField (flag for out-of-range)
      - abnormality_type: CharField choices=['low', 'high', 'critical'] (if abnormal)
      - interpretation: TextField (technician interpretation, blank=True)
      - technician_notes: TextField (internal notes, blank=True)
      - result_entered_at: DateTimeField (null=True)
      - result_verified_at: DateTimeField (null=True)
      - verified_by: FK User (null=True)
    - Method: `check_abnormal()` - Auto-detect if result outside reference range
    - Method: `get_price()` - Returns lab_test.price for billing

**2. Lab API**
- **File**: `apps/laboratory/serializers.py`
  - `LabOrderSerializer`, `LabOrderItemSerializer`
  - Include patient name, test names, estimated completion
- **File**: `apps/laboratory/api.py`
  - `LabOrderListCreateView`: Create orders, list pending/all
  - `LabOrderDetailView`: View/update order
  - `EnterLabResultsView`: Bulk enter results for all items
  - `MarkResultsReadyView`: Update status, trigger SMS
  - `SendResultsNotificationView`: Manual SMS retry
  - `PrintLabResultsView`: Generate PDF
- **File**: `apps/laboratory/urls.py`: Define routes

**3. SMS Integration**
- **File**: `apps/core/sms_service.py`
- **Class**: `SMSService`
  - Method: `send_sms(phone_number, message)`
  - Method: `send_lab_results_notification(lab_order)`
  - Integration: Twilio, Africa's Talking, or Infobip API
  - Configuration: SMS_API_KEY, SMS_API_URL in settings

**4. Lab Results PDF Generator**
- **File**: `apps/laboratory/pdf_generator.py`
- **Class**: `LabResultsPDF`
  - Method: `generate(lab_order)` → returns PDF buffer
  - Layout: Header (hospital info), Patient info, Results table, Footer (technician signature)
  - Reuses reportlab infrastructure from existing invoice PDF

**5. Create Lab Test Catalog (REVISED)**
- Add to `setup_healthcare` command:
  - **LabTestCategory**: Hématologie, Biochimie, Microbiologie, Immunologie, Urologie
  - **LabTest entries** (NOT Product - separate LIMS catalog):
    - Test de Paludisme (RDT): 2,500 XAF, sample=blood, turnaround=2h, category=Microbiologie
    - Numération Formule Sanguine (NFS): 3,000 XAF, sample=blood, unit=cells/mcL, category=Hématologie, normal_range varies
    - Glycémie à jeun: 2,000 XAF, sample=blood, fasting=True, unit=mg/dL, normal=70-110, category=Biochimie
    - Test d'urine complet: 1,500 XAF, sample=urine, category=Urologie
  - These populate LabTest table, NOT Product table

**6. Update Settings**
- **File**: `saas_procurement/settings.py`
- Add `'apps.laboratory'` to INSTALLED_APPS
- Add SMS configuration:
  ```python
  SMS_ENABLED = os.getenv('SMS_ENABLED', 'False').lower() == 'true'
  SMS_API_KEY = os.getenv('SMS_API_KEY', '')
  SMS_API_URL = os.getenv('SMS_API_URL', '')
  SMS_SENDER_ID = os.getenv('SMS_SENDER_ID', 'HealthCenter')
  ```

### Frontend Tasks

**1. Lab Dashboard**
- **File**: `frontend/src/pages/laboratory/LabDashboard.jsx`
- **Features**:
  - Tabs: Pending Orders, In Progress, Completed Today
  - Quick stats: Orders today, Pending results, SMS sent
  - Quick actions: Enter results, Mark ready, Send notification

**2. Lab Order List**
- **File**: `frontend/src/pages/laboratory/LabOrderList.jsx`
- **Features**:
  - Table with order number, patient name, tests, status, timestamps
  - Filter by status, date range
  - Action buttons: View details, Enter results

**3. Lab Results Entry**
- **File**: `frontend/src/pages/laboratory/LabResultsEntry.jsx`
- **Features**:
  - Form to enter results for each test in order
  - Fields: result_value, result_unit, reference_range, is_abnormal checkbox
  - Technician notes textarea
  - Submit → updates all items, changes status to 'completed'

**4. Lab Results Print**
- **File**: `frontend/src/pages/laboratory/LabResultsPrint.jsx`
- **Features**:
  - Preview lab results in browser
  - Print button → opens print dialog or downloads PDF
  - Shows: Patient info, test results table, technician signature
  - "Mark as Delivered" button

**5. Lab Components**
- **File**: `frontend/src/components/healthcare/LabOrderCard.jsx`
  - Display lab order summary
  - Status badge, patient info, tests list, action buttons

**6. Navigation**
- Add `/laboratory` routes to App.jsx
- Add Laboratory nav item (ScienceIcon) to MobileBottomNav
- Role guard: IsLabTech or IsDoctor (read-only)

### Deliverable: Lab Workflow
✅ Lab Technician can:
1. View pending lab orders from doctors/reception
2. Mark sample as collected
3. Enter test results with reference ranges
4. Mark results as ready
5. System sends SMS/WhatsApp notification to patient
6. Print lab results with hospital stamp
7. Mark as delivered when patient collects

---

## Phase 3: Pharmacy Management (Week 4)

### Backend Tasks

**1. Create Pharmacy App**
- **File**: `apps/pharmacy/models.py`
- **Models**:
  - `Medication` (Optional): Extends Product with pharmacy metadata
    - Fields: generic_name, brand_name, strength, form, therapeutic_class
    - Safety: contraindications, side_effects, interactions
    - Expiry: expiry_date (uses Product.stock_quantity)
    - Reference: OneToOne with Product
  - `PharmacyDispensing`: Record of medication dispensing
    - Fields: dispensing_number (auto DISP-YYYYMMDD-0001), dispensed_at
    - Reference: prescription (optional for OTC), pharmacy_invoice
    - Counseling: counseling_provided, counseling_notes
  - `DispensingItem`: Individual medication dispensed
    - Fields: medication (FK Product), quantity_dispensed, dosage_instructions
    - Inventory: unit_cost, unit_price, total_price
    - Automatic: Creates StockMovement on save (deducts inventory)
    - Reference: stock_movement (FK to StockMovement)

**2. Pharmacy API**
- **File**: `apps/pharmacy/serializers.py`
  - `PharmacyDispensingSerializer` with nested `DispensingItemSerializer`
  - Handle inventory validation (check stock before dispensing)
- **File**: `apps/pharmacy/api.py`
  - `PharmacyDispensingCreateView`: Create dispensing record
    - Validates stock availability
    - Creates invoice
    - Updates inventory automatically via DispensingItem.save()
  - `DispensingListView`: View dispensing history
  - `MedicationListView`: View medication catalog (Products with category='Medications')
  - `LowStockMedicationsView`: Query products with stock below threshold
  - `CheckPrescriptionAvailabilityView`: Check if all prescribed meds in stock
- **File**: `apps/pharmacy/urls.py`: Define routes

**3. Medication Products**
- Add to `setup_healthcare` command:
  - Sample medications with stock levels
  - Example: Paracétamol 500mg (100 tablets in stock, threshold: 20)

**4. Update Settings**
- Add `'apps.pharmacy'` to INSTALLED_APPS

### Frontend Tasks

**1. Pharmacy Dashboard**
- **File**: `frontend/src/pages/pharmacy/PharmacyDashboard.jsx`
- **Features**:
  - Today's dispensing count and revenue
  - Low stock alerts widget (reuse existing pattern)
  - Pending prescriptions (Phase 4 integration)
  - Quick dispense button

**2. Dispensing Form**
- **File**: `frontend/src/pages/pharmacy/DispensingForm.jsx`
- **Features**:
  - Search patient (reuse PatientSearch component)
  - Optional: Select prescription (Phase 4)
  - Manual entry: Add medications with dosage instructions
  - Quantity selector with stock availability check
  - Real-time total calculation
  - Submit → Creates dispensing record + invoice + updates inventory

**3. Medication Inventory**
- **File**: `frontend/src/pages/pharmacy/MedicationInventory.jsx`
- **Features**:
  - Table of medications (Product with category='Medications')
  - Columns: Name, strength, form, stock quantity, threshold, expiry date
  - Stock status badges: In Stock, Low Stock, Out of Stock
  - Actions: Adjust stock, Edit details, View movements

**4. Low Stock Alerts**
- **File**: `frontend/src/pages/pharmacy/LowStockAlerts.jsx`
- **Features**:
  - List medications below threshold
  - Recommended reorder quantity
  - Link to procurement (if keeping procurement module)
  - Email/alert supervisor

**5. Pharmacy Components**
- **File**: `frontend/src/components/healthcare/MedicationCard.jsx`
  - Display medication info with stock status
  - Dosage instructions display
  - Quick dispense action

**6. Navigation**
- Add `/pharmacy` routes to App.jsx
- Add Pharmacy nav item (LocalPharmacyIcon)
- Role guard: IsPharmacist

### Deliverable: Pharmacy Workflow
✅ Pharmacist can:
1. Search patient and view prescriptions (Phase 4 integration)
2. Manually dispense medications (OTC or prescription)
3. Check stock availability in real-time
4. System automatically deducts inventory
5. Create pharmacy invoice
6. Receive low stock alerts
7. View medication inventory and expiry dates

---

## Phase 4: Medical History + Consultations (Week 5)

### Backend Tasks

**1. Create Consultations App**
- **File**: `apps/consultations/models.py`
- **Models**:
  - `Consultation`: Medical consultation record
    - Fields: consultation_number (auto CONS-YYYYMMDD-0001), consultation_date
    - Vital signs: temperature, BP, heart_rate, respiratory_rate, weight, height
    - Medical: chief_complaint, physical_examination, diagnosis, treatment_plan
    - Follow-up: follow_up_required, follow_up_date, instructions
    - Reference: patient, visit, doctor
  - `VitalSign` (Optional): Separate vital signs history
    - Used if tracking vitals outside consultations
  - `Prescription`: Medical prescription
    - Fields: prescription_number (auto RX-YYYYMMDD-0001), prescribed_date, status
    - Status: pending → partially_filled → filled → cancelled
    - Reference: consultation, patient, pharmacy_invoice
  - `PrescriptionItem`: Individual medication in prescription
    - Fields: medication (FK Product), dosage, frequency, duration
    - Dispensing: quantity_prescribed, quantity_dispensed, is_dispensed
    - Instructions: route, instructions

**2. Consultations API**
- **File**: `apps/consultations/serializers.py`
  - `ConsultationSerializer` with BMI calculation
  - `PrescriptionSerializer` with nested `PrescriptionItemSerializer`
- **File**: `apps/consultations/api.py`
  - `ConsultationListCreateView`: Create consultation record
  - `ConsultationDetailView`: View/update consultation
  - `ConsultationPrescriptionsView`: Get all prescriptions for consultation
  - `PrescriptionListView`: All prescriptions (filter by status)
  - `PrescriptionDetailView`: Single prescription
  - `DispensePrescriptionView`: Mark items as dispensed (called from pharmacy)
- **File**: `apps/consultations/urls.py`: Define routes

**3. Patient History Endpoint**
- **File**: `apps/patients/api.py`
- **View**: `PatientHistoryView`
  - Aggregates: All consultations, lab orders, prescriptions, visits
  - Chronological timeline
  - Filter by date range, type
  - Billable: Charge 1,000 XAF for printed history

**4. History PDF Generator**
- **File**: `apps/patients/pdf_generator.py`
- **Class**: `PatientHistoryPDF`
  - Comprehensive medical history report
  - Sections: Demographics, Consultations, Lab Results, Prescriptions
  - Chronological order

**5. Update Settings**
- Add `'apps.consultations'` to INSTALLED_APPS

### Frontend Tasks

**1. Doctor's Consultation Queue**
- **File**: `frontend/src/pages/consultations/ConsultationList.jsx`
- **Features**:
  - Today's patients waiting for consultation
  - Filter by status: waiting, in_consultation, completed
  - Patient info cards with chief complaint
  - Start consultation button

**2. Consultation Form**
- **File**: `frontend/src/pages/consultations/ConsultationForm.jsx`
- **Features**:
  - Patient summary header
  - Vital signs section (VitalSignsForm component)
  - Medical history quick view (previous consultations)
  - Form sections:
    - Chief Complaint (textarea)
    - History of Present Illness
    - Physical Examination findings
    - Diagnosis
    - Treatment Plan
  - Action buttons:
    - Prescribe Medications (opens PrescriptionForm)
    - Order Lab Tests (quick order form)
    - Save Consultation
    - Complete Visit

**3. Vital Signs Form**
- **File**: `frontend/src/pages/consultations/VitalSignsForm.jsx`
- **Features**:
  - Input fields: Temperature, BP (systolic/diastolic), Heart Rate, Respiratory Rate
  - Weight, Height with BMI auto-calculation
  - Reusable component (nurse can enter, doctor can view/edit)

**4. Prescription Form**
- **File**: `frontend/src/pages/consultations/PrescriptionForm.jsx`
- **Features**:
  - Add medication rows (search medication products)
  - Fields per medication: Dosage, Frequency, Duration, Quantity, Route
  - Special instructions textarea
  - Stock availability indicator
  - Submit → Creates prescription with items
  - Print prescription button

**5. Patient History Page**
- **File**: `frontend/src/pages/patients/PatientHistory.jsx`
- **Features**:
  - Timeline view of all medical events
  - Filters: All, Consultations, Lab Tests, Prescriptions
  - Date range selector
  - Print full history button (charges 1,000 XAF)
  - Collapsible sections for each visit

**6. Components**
- **File**: `frontend/src/components/healthcare/VitalSignsDisplay.jsx`
  - Display vital signs with normal range indicators
  - Color coding: green (normal), yellow (borderline), red (abnormal)
- **File**: `frontend/src/components/healthcare/PrescriptionPreview.jsx`
  - Display prescription summary
  - Medication list with dosage instructions
  - Dispensing status badges

**7. Navigation**
- Add `/consultations` routes
- Add Consultations nav item (MedicalServicesIcon)
- Role guard: IsDoctor or IsNurse (limited)

### Deliverable: Full Clinical Workflow
✅ Doctor can:
1. View queue of waiting patients
2. Record vital signs (or review nurse-entered vitals)
3. View patient's complete medical history
4. Create consultation record with diagnosis and treatment plan
5. Write prescriptions (linked to pharmacy)
6. Order lab tests (linked to laboratory)
7. Complete visit and update patient status

✅ Patient/Admin can:
1. Request medical history printout (1,000 XAF)
2. View comprehensive timeline of all visits
3. Print official medical history document

---

## Phase 5: Reporting & Integration Testing (Week 6)

### Backend Tasks

**1. Healthcare Reports**
- **File**: `apps/analytics/healthcare_reports.py`
- **Reports**:
  - `DailySummaryReport`:
    - Total visits, consultations, lab tests, prescriptions
    - Revenue by department (consultation, lab, pharmacy)
    - Today vs yesterday comparison
  - `DepartmentRevenueReport`:
    - Revenue breakdown by service type
    - Date range filter
    - Export to PDF/Excel
  - `PatientStatisticsReport`:
    - New patients registered (period)
    - Total visits (period)
    - Most common diagnoses (Phase 2 enhancement)
    - Patient demographics breakdown

**2. Reports API**
- **File**: `apps/analytics/api.py` (extend existing)
- **Views**:
  - `DailySummaryView`: GET /api/reports/daily-summary/?date=YYYY-MM-DD
  - `DepartmentRevenueView`: GET /api/reports/department-revenue/?start_date=...&end_date=...
  - `PatientStatisticsView`: GET /api/reports/patient-statistics/

**3. Dashboard Widgets for Healthcare**
- **File**: `apps/analytics/widgets.py` (extend)
- **Widgets**:
  - `TodayVisitsWidget`: Count and list of today's patients
  - `DepartmentRevenueWidget`: Revenue chart by department
  - `PendingLabOrdersWidget`: Count of tests awaiting results
  - `LowStockMedicationsWidget`: Pharmacy inventory alerts

### Frontend Tasks

**1. Healthcare Dashboard**
- **File**: `frontend/src/pages/dashboard/HealthcareDashboard.jsx`
- **Features**:
  - Grid layout with widgets (reuse existing dashboard architecture)
  - Widgets:
    - Today's Visits (count, status breakdown)
    - Revenue by Department (pie chart)
    - Pending Lab Orders (count, link to lab dashboard)
    - Low Stock Medications (count, link to pharmacy)
    - Recent Activity (visit log)
  - Period selector: Today, Yesterday, Last 7 days, Last 30 days
  - Quick actions: Register Patient, Check-in, View Reports

**2. Daily Summary Report**
- **File**: `frontend/src/pages/reports/DailySummaryReport.jsx`
- **Features**:
  - Date selector
  - Summary cards: Visits, Revenue, Patients (new vs returning)
  - Department breakdown table
  - Comparison with previous period
  - Export to PDF button

**3. Department Revenue Report**
- **File**: `frontend/src/pages/reports/DepartmentRevenueReport.jsx`
- **Features**:
  - Date range picker
  - Revenue table by department
  - Bar chart visualization (Chart.js/Recharts)
  - Filter by payment method
  - Export to Excel

**4. Patient Statistics Dashboard**
- **File**: `frontend/src/pages/reports/PatientStatisticsReport.jsx`
- **Features**:
  - Total patients registered
  - New patients trend chart
  - Visit frequency analysis
  - Demographics breakdown (age groups, gender)

**5. Update Existing Dashboard**
- **File**: `frontend/src/pages/dashboard/Dashboard.jsx`
- Add toggle: "Procurement View" vs "Healthcare View"
- Healthcare view uses HealthcareDashboard.jsx
- Procurement view uses existing dashboard

### Integration Testing

**1. End-to-End Workflow Tests**
- **Test Case 1: New Patient Full Journey (Fabrice scenario)**
  1. Register patient → Verify patient_number generated
  2. Check-in for consultation → Verify visit created
  3. Collect consultation fee → Verify invoice created, payment recorded
  4. Doctor creates consultation → Verify consultation record
  5. Doctor orders lab tests → Verify lab order created, invoice generated
  6. Lab tech enters results → Verify results saved, SMS sent
  7. Doctor prescribes medications → Verify prescription created
  8. Pharmacist dispenses → Verify inventory deducted, invoice created
  9. View patient history → Verify all records visible

- **Test Case 2: External Patient (Angel scenario)**
  1. Quick register with external flag
  2. Direct lab order (no consultation)
  3. Results ready and delivered
  4. Optional pharmacy purchase

- **Test Case 3: Admin Reports (Boris/Tonton)**
  1. Access daily summary
  2. Generate department revenue report
  3. Export patient statistics

**2. Performance Testing**
- Load test: 50 concurrent patients
- Search performance: < 500ms for patient search
- Invoice generation: < 1s
- PDF generation: < 2s

**3. Security Testing**
- Role-based access: Verify receptionist cannot enter lab results
- Audit logging: Verify all patient access logged
- Permission enforcement: Verify API endpoints respect permissions

### Deliverable: Complete System
✅ Full LIMS + HMS + Pharmacy solution with:
1. Patient registration and management
2. Reception and cashier workflows
3. Doctor consultations with prescriptions
4. Laboratory order management and results
5. Pharmacy dispensing with inventory tracking
6. Comprehensive reporting for administrators
7. SMS notifications for lab results
8. Medical history access and printing
9. All workflows integrated and tested

---

## Critical Files Reference

### Backend - Priority Order

**Phase 1 (Essential)**:
1. [apps/patients/models.py](apps/patients/models.py) - Patient, PatientVisit models
2. [apps/accounts/models.py](apps/accounts/models.py) - Add healthcare roles
3. [apps/core/modules.py](apps/core/modules.py) - Add healthcare modules
4. [apps/patients/serializers.py](apps/patients/serializers.py) - Patient API serializers
5. [apps/patients/api.py](apps/patients/api.py) - Patient API views

**Phase 2**:
6. [apps/laboratory/models.py](apps/laboratory/models.py) - Lab order system
7. [apps/core/sms_service.py](apps/core/sms_service.py) - SMS notifications
8. [apps/laboratory/pdf_generator.py](apps/laboratory/pdf_generator.py) - Lab results PDF

**Phase 3**:
9. [apps/pharmacy/models.py](apps/pharmacy/models.py) - Pharmacy dispensing
10. [apps/pharmacy/api.py](apps/pharmacy/api.py) - Pharmacy API

**Phase 4**:
11. [apps/consultations/models.py](apps/consultations/models.py) - Consultations and prescriptions
12. [apps/patients/pdf_generator.py](apps/patients/pdf_generator.py) - Medical history PDF

**Phase 5**:
13. [apps/analytics/healthcare_reports.py](apps/analytics/healthcare_reports.py) - Healthcare reports

### Frontend - Priority Order

**Phase 1 (Essential)**:
1. [frontend/src/pages/patients/PatientRegistration.jsx](frontend/src/pages/patients/PatientRegistration.jsx)
2. [frontend/src/pages/reception/ReceptionDashboard.jsx](frontend/src/pages/reception/ReceptionDashboard.jsx)
3. [frontend/src/components/healthcare/PatientSearch.jsx](frontend/src/components/healthcare/PatientSearch.jsx)
4. [frontend/src/App.jsx](frontend/src/App.jsx) - Add healthcare routes
5. [frontend/src/services/api.js](frontend/src/services/api.js) - API endpoints

**Phase 2**:
6. [frontend/src/pages/laboratory/LabDashboard.jsx](frontend/src/pages/laboratory/LabDashboard.jsx)
7. [frontend/src/pages/laboratory/LabResultsEntry.jsx](frontend/src/pages/laboratory/LabResultsEntry.jsx)

**Phase 3**:
8. [frontend/src/pages/pharmacy/PharmacyDashboard.jsx](frontend/src/pages/pharmacy/PharmacyDashboard.jsx)
9. [frontend/src/pages/pharmacy/DispensingForm.jsx](frontend/src/pages/pharmacy/DispensingForm.jsx)

**Phase 4**:
10. [frontend/src/pages/consultations/ConsultationForm.jsx](frontend/src/pages/consultations/ConsultationForm.jsx)
11. [frontend/src/pages/patients/PatientHistory.jsx](frontend/src/pages/patients/PatientHistory.jsx)

**Phase 5**:
12. [frontend/src/pages/dashboard/HealthcareDashboard.jsx](frontend/src/pages/dashboard/HealthcareDashboard.jsx)

---

## Configuration & Environment

### Environment Variables (.env)
```bash
# Healthcare Configuration
DEFAULT_CURRENCY=XAF
ENABLE_HEALTHCARE_MODULES=True

# SMS Notification Service
SMS_ENABLED=True
SMS_API_KEY=your_sms_api_key_here
SMS_API_URL=https://api.africas-talking.com/version1/messaging
SMS_SENDER_ID=HealthCenter

# Language
DEFAULT_LANGUAGE=fr
SUPPORTED_LANGUAGES=fr,en
```

### Sample Pricing (XAF)
- Consultation Générale: 5,000 XAF
- Test de Paludisme: 2,500 XAF
- Numération Formule Sanguine: 3,000 XAF
- Medical History Printout: 1,000 XAF
- Medications: Varies by item

---

## Verification & Testing

### End-to-End Test Scenarios

**Scenario 1: Fabrice - New Patient Full Journey** ✅
1. **Reception**: Register Fabrice (name, phone, address)
2. **Billing**: Create consultation invoice (5,000 XAF), collect payment, print receipt
3. **Doctor**: View Fabrice's profile, record vital signs, create consultation with diagnosis
4. **Lab Order**: Doctor orders malaria test, invoice created (2,500 XAF), payment collected
5. **Lab**: Technician enters results, marks ready, SMS sent to Fabrice
6. **Results**: Fabrice returns, reception verifies ready, prints results
7. **Pharmacy**: Doctor prescribes medication, pharmacist dispenses, invoice created, inventory updated
8. **Verify**: Check patient history shows all records

**Scenario 2: Angel - External Patient Lab Only** ✅
1. **Reception**: Quick register Angel (mark as external), direct lab order
2. **Billing**: Collect lab test fee
3. **Lab**: Enter results, send notification
4. **Pharmacy**: Optional medication purchase
5. **Verify**: External patient flag visible, no consultation record

**Scenario 3: Patient History Request** ✅
1. **Reception**: Patient requests medical history
2. **Billing**: Create history invoice (1,000 XAF), collect payment
3. **Print**: Generate comprehensive history PDF with all consultations, labs, prescriptions
4. **Verify**: All historical data included

**Scenario 4: Admin Reports** ✅
1. **Boris/Tonton**: Login as admin
2. **Dashboard**: View today's visits, revenue by department
3. **Reports**: Generate daily summary, department revenue, patient statistics
4. **Export**: Download reports as PDF/Excel
5. **Verify**: All departments (consultation, lab, pharmacy) represented

### Testing Checklist

**Functional Testing**:
- [ ] Patient registration with all fields
- [ ] Patient search by name, phone, patient number
- [ ] Check-in workflow for different visit types
- [ ] Invoice creation for consultation, lab, pharmacy
- [ ] Payment collection and receipt printing
- [ ] Doctor consultation form with vital signs
- [ ] Lab order creation and results entry
- [ ] SMS notification sending and delivery
- [ ] Pharmacy dispensing with automatic inventory deduction
- [ ] Prescription creation and fulfillment
- [ ] Patient history view and printing
- [ ] All report generation

**Integration Testing**:
- [ ] Consultation → Lab order → Invoice linkage
- [ ] Prescription → Dispensing → Inventory update
- [ ] Visit → Consultation → Prescription → Dispensing workflow
- [ ] Patient → Multiple visits → History timeline
- [ ] Invoice → Payment → Receipt generation

**Security Testing**:
- [ ] Role-based access enforcement (receptionist cannot enter lab results)
- [ ] Patient data access logging
- [ ] Permission checks on all API endpoints
- [ ] Sensitive field protection (diagnosis, medications)

**Performance Testing**:
- [ ] Patient search response time < 500ms
- [ ] Invoice generation < 1s
- [ ] PDF generation < 2s
- [ ] Dashboard load time < 2s
- [ ] Concurrent user handling (5+ users)

**Procurement Preservation Testing**:
- [ ] Existing supplier management works
- [ ] Purchase orders can be created
- [ ] B2B client records accessible
- [ ] Procurement invoices functional
- [ ] No conflicts between Client and Patient models

---

**Status**: ✅ COMPLETE IMPLEMENTATION PLAN READY FOR USER APPROVAL
