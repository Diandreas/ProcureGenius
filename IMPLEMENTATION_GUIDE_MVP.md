# 🚀 GUIDE D'IMPLÉMENTATION MVP ENTERPRISE

**Date:** 2025-10-07
**Objectif:** Implémenter E-Sourcing, CLM et Migration en respectant l'architecture existante

---

## 📋 ARCHITECTURE EXISTANTE ANALYSÉE

### Frontend (React)
```
frontend/src/
├── pages/              # Pages principales
│   ├── suppliers/
│   ├── purchase-orders/
│   ├── invoices/
│   ├── products/
│   └── ai-chat/
├── components/         # Composants réutilisables
│   ├── common/
│   ├── AI/
│   └── guards/
├── store/             # Redux Toolkit
│   ├── slices/        # authSlice, suppliersSlice, etc.
│   └── store.js
├── services/
│   └── api.js         # Axios API calls
├── layouts/
│   ├── MainLayout.jsx
│   └── AuthLayout.jsx
└── App.jsx            # Router + Theme
```

**Stack Frontend:**
- ✅ React 18+ avec React Router v6
- ✅ Material-UI (MUI) v5
- ✅ Redux Toolkit pour state
- ✅ Axios pour API
- ✅ Notistack pour notifications

### Backend (Django)
```
apps/
├── accounts/          # Utilisateurs
├── suppliers/         # Fournisseurs
├── purchase_orders/   # Bons de commande
├── invoicing/         # Factures + Produits
└── ai_assistant/      # Assistant IA
```

**Stack Backend:**
- ✅ Django 5.0.3 + Django REST Framework
- ✅ PostgreSQL
- ✅ Token Authentication

---

## 🎯 PLAN D'IMPLÉMENTATION (Ordre d'exécution)

### Phase 1: E-SOURCING MVP (Semaine 1-8)

#### Semaine 1-2: Backend E-Sourcing
**1.1 Modèles Django** (`apps/e_sourcing/models.py`)
**1.2 Serializers** (`apps/e_sourcing/serializers.py`)
**1.3 ViewSets & URLs** (`apps/e_sourcing/views.py`, `urls.py`)
**1.4 Admin** (`apps/e_sourcing/admin.py`)

#### Semaine 3-4: Frontend E-Sourcing (Liste & Création)
**2.1 Redux Slice** (`store/slices/eSourcingSlice.js`)
**2.2 API Service** (extension `services/api.js`)
**2.3 Pages:**
  - `pages/e-sourcing/SourcingEvents.jsx` (Liste RFQs)
  - `pages/e-sourcing/SourcingEventForm.jsx` (Créer/Éditer RFQ)

#### Semaine 5-6: Frontend E-Sourcing (Soumissions & Comparaison)
**2.4 Pages:**
  - `pages/e-sourcing/SourcingEventDetail.jsx` (Détails + Soumissions)
  - `pages/e-sourcing/BidComparisonTable.jsx` (Tableau comparatif)
  - `pages/e-sourcing/SupplierBidForm.jsx` (Portail fournisseur)

#### Semaine 7-8: Intégration & Tests
**3.1 Génération BC depuis RFQ gagnante**
**3.2 Notifications email** (Celery tasks)
**3.3 Tests end-to-end**

---

### Phase 2: CLM MVP (Semaine 9-12)

#### Semaine 9-10: Backend CLM
**4.1 Modèles** (`apps/contracts/models.py`)
**4.2 Serializers & Views**
**4.3 Service Extraction IA** (`apps/contracts/services/ai_extraction.py`)
**4.4 Tâches Celery** (alertes renouvellement)

#### Semaine 11-12: Frontend CLM
**5.1 Redux Slice** (`store/slices/contractsSlice.js`)
**5.2 Pages:**
  - `pages/contracts/Contracts.jsx` (Liste)
  - `pages/contracts/ContractDetail.jsx` (Détails + Clauses IA)
  - `pages/contracts/ContractForm.jsx` (Upload)

---

### Phase 3: MIGRATION ERP (Semaine 13-18)

#### Semaine 13-14: Backend Migration
**6.1 Modèles** (`apps/data_migration/models.py`)
**6.2 Importers** (Excel, QuickBooks)
**6.3 Tâches Celery** (import async)

#### Semaine 15-16: Frontend Migration (Excel)
**7.1 Redux Slice** (`store/slices/migrationSlice.js`)
**7.2 Wizard Component:**
  - `pages/migration/MigrationWizard.jsx`
  - Upload CSV → Mapping → Preview → Import

#### Semaine 17-18: Frontend Migration (QuickBooks + Tests)
**7.3 OAuth QuickBooks**
**7.4 Tests end-to-end**

---

## 📂 STRUCTURE FICHIERS À CRÉER

### Backend (Django)

```
apps/e_sourcing/
├── __init__.py
├── models.py                 # SourcingEvent, SupplierBid, etc.
├── serializers.py            # DRF Serializers
├── views.py                  # ViewSets
├── urls.py                   # URL routing
├── admin.py                  # Django Admin
├── services/
│   └── comparison_service.py # Logique comparaison offres
├── tasks.py                  # Celery (emails)
└── migrations/

apps/contracts/
├── __init__.py
├── models.py                 # Contract, ContractDocument, etc.
├── serializers.py
├── views.py
├── urls.py
├── admin.py
├── services/
│   └── ai_extraction.py      # Mistral IA extraction clauses
├── tasks.py                  # Alertes renouvellement
└── migrations/

apps/data_migration/
├── __init__.py
├── models.py                 # MigrationJob, ImportLog
├── serializers.py
├── views.py
├── urls.py
├── admin.py
├── importers/
│   ├── base.py               # BaseImporter
│   ├── excel_importer.py
│   └── quickbooks_importer.py
├── services/
│   └── duplicate_detection.py
├── tasks.py                  # Import async
└── migrations/
```

### Frontend (React)

```
frontend/src/
├── pages/
│   ├── e-sourcing/
│   │   ├── SourcingEvents.jsx        # Liste RFQs
│   │   ├── SourcingEventForm.jsx     # Créer/Éditer RFQ
│   │   ├── SourcingEventDetail.jsx   # Détails + Soumissions
│   │   ├── BidComparisonTable.jsx    # Tableau comparatif
│   │   └── SupplierBidForm.jsx       # Soumission fournisseur
│   ├── contracts/
│   │   ├── Contracts.jsx             # Liste contrats
│   │   ├── ContractForm.jsx          # Upload contrat
│   │   ├── ContractDetail.jsx        # Détails + Clauses IA
│   │   └── ClauseExtractionView.jsx  # Vue clauses extraites
│   └── migration/
│       ├── MigrationWizard.jsx       # Wizard import
│       ├── MigrationDashboard.jsx    # Dashboard jobs
│       └── QuickBooksConnect.jsx     # OAuth QB
├── components/
│   ├── e-sourcing/
│   │   ├── BidLineItemsTable.jsx
│   │   ├── ScoreCard.jsx
│   │   └── InviteSuppliers.jsx
│   ├── contracts/
│   │   ├── ContractCard.jsx
│   │   ├── ClausesList.jsx
│   │   └── ExpiringAlert.jsx
│   └── migration/
│       ├── FileUploader.jsx
│       ├── ColumnMapper.jsx
│       └── ImportProgress.jsx
├── store/slices/
│   ├── eSourcingSlice.js
│   ├── contractsSlice.js
│   └── migrationSlice.js
└── services/
    └── api.js (extension avec nouvelles APIs)
```

---

## 🔧 TEMPLATES DE CODE (À suivre)

### Template Backend: Modèle Django

```python
# apps/e_sourcing/models.py

from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class SourcingEvent(models.Model):
    EVENT_TYPES = [
        ('rfq', 'Request for Quotation'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('published', 'Publié'),
        ('closed', 'Fermé'),
        ('awarded', 'Attribué'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_number = models.CharField(max_length=50, unique=True, blank=True)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES, default='rfq')
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    submission_deadline = models.DateTimeField()

    # Relations
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='sourcing_events')
    invited_suppliers = models.ManyToManyField('suppliers.Supplier', blank=True)

    # Critères évaluation
    evaluation_criteria = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.event_number} - {self.title}"

    def save(self, *args, **kwargs):
        if not self.event_number:
            self.event_number = self.generate_event_number()
        super().save(*args, **kwargs)

    def generate_event_number(self):
        from datetime import datetime
        year_month = datetime.now().strftime('%Y%m')
        last_event = SourcingEvent.objects.filter(
            event_number__startswith=f"RFQ{year_month}"
        ).order_by('-event_number').first()

        if last_event:
            last_num = int(last_event.event_number[-4:])
            next_num = last_num + 1
        else:
            next_num = 1

        return f"RFQ{year_month}-{next_num:04d}"
```

### Template Backend: Serializer

```python
# apps/e_sourcing/serializers.py

from rest_framework import serializers
from .models import SourcingEvent, SourcingItem, SupplierBid, BidLineItem

class SourcingItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SourcingItem
        fields = '__all__'

class SourcingEventSerializer(serializers.ModelSerializer):
    items = SourcingItemSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    bids_count = serializers.SerializerMethodField()

    class Meta:
        model = SourcingEvent
        fields = '__all__'
        read_only_fields = ('id', 'event_number', 'created_at', 'created_by')

    def get_bids_count(self, obj):
        return obj.bids.count()
```

### Template Backend: ViewSet

```python
# apps/e_sourcing/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import SourcingEvent, SupplierBid
from .serializers import SourcingEventSerializer, SupplierBidSerializer

class SourcingEventViewSet(viewsets.ModelViewSet):
    queryset = SourcingEvent.objects.all()
    serializer_class = SourcingEventSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publier l'événement et envoyer invitations"""
        event = self.get_object()
        event.status = 'published'
        event.save()

        # TODO: Envoyer emails aux fournisseurs invités
        # from .tasks import send_sourcing_invitations
        # send_sourcing_invitations.delay(event.id)

        return Response({'status': 'published'})

    @action(detail=True, methods=['get'])
    def bids(self, request, pk=None):
        """Récupérer toutes les soumissions pour cet événement"""
        event = self.get_object()
        bids = event.bids.all()
        serializer = SupplierBidSerializer(bids, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def comparison(self, request, pk=None):
        """Tableau comparatif des offres"""
        event = self.get_object()
        from .services.comparison_service import ComparisonService
        comparison_data = ComparisonService.generate_comparison(event)
        return Response(comparison_data)
```

### Template Frontend: Redux Slice

```javascript
// frontend/src/store/slices/eSourcingSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { eSourcingAPI } from '../../services/api';

// Thunks
export const fetchSourcingEvents = createAsyncThunk(
  'eSourcing/fetchEvents',
  async (params, { rejectWithValue }) => {
    try {
      const response = await eSourcingAPI.list(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Error fetching events');
    }
  }
);

export const createSourcingEvent = createAsyncThunk(
  'eSourcing/createEvent',
  async (data, { rejectWithValue }) => {
    try {
      const response = await eSourcingAPI.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Error creating event');
    }
  }
);

// Slice
const eSourcingSlice = createSlice({
  name: 'eSourcing',
  initialState: {
    events: [],
    currentEvent: null,
    bids: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch events
      .addCase(fetchSourcingEvents.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSourcingEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload.results || action.payload;
      })
      .addCase(fetchSourcingEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create event
      .addCase(createSourcingEvent.pending, (state) => {
        state.loading = true;
      })
      .addCase(createSourcingEvent.fulfilled, (state, action) => {
        state.loading = false;
        state.events.unshift(action.payload);
      })
      .addCase(createSourcingEvent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError } = eSourcingSlice.actions;
export default eSourcingSlice.reducer;
```

### Template Frontend: Page Liste

```javascript
// frontend/src/pages/e-sourcing/SourcingEvents.jsx

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Button, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, Box
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { fetchSourcingEvents } from '../../store/slices/eSourcingSlice';

const SourcingEvents = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { events, loading } = useSelector((state) => state.eSourcing);

  useEffect(() => {
    dispatch(fetchSourcingEvents());
  }, [dispatch]);

  const getStatusChip = (status) => {
    const statusConfig = {
      draft: { label: 'Brouillon', color: 'default' },
      published: { label: 'Publié', color: 'primary' },
      closed: { label: 'Fermé', color: 'secondary' },
      awarded: { label: 'Attribué', color: 'success' },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Demandes de Cotation (RFQ)
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/e-sourcing/new')}
        >
          Nouvelle RFQ
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Numéro</TableCell>
              <TableCell>Titre</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Date limite</TableCell>
              <TableCell>Soumissions</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event) => (
              <TableRow
                key={event.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/e-sourcing/${event.id}`)}
              >
                <TableCell>{event.event_number}</TableCell>
                <TableCell>{event.title}</TableCell>
                <TableCell>{getStatusChip(event.status)}</TableCell>
                <TableCell>
                  {new Date(event.submission_deadline).toLocaleDateString('fr-CA')}
                </TableCell>
                <TableCell>{event.bids_count || 0}</TableCell>
                <TableCell>
                  <Button size="small">Voir</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default SourcingEvents;
```

---

## 🔗 INTÉGRATIONS AVEC EXISTANT

### 1. Ajouter Routes dans App.jsx

```javascript
// frontend/src/App.jsx (ajouter après ligne 416)

// E-Sourcing
<Route path="/e-sourcing" element={<SourcingEvents />} />
<Route path="/e-sourcing/new" element={<SourcingEventForm />} />
<Route path="/e-sourcing/:id" element={<SourcingEventDetail />} />
<Route path="/e-sourcing/:id/edit" element={<SourcingEventForm />} />

// Contracts
<Route path="/contracts" element={<Contracts />} />
<Route path="/contracts/new" element={<ContractForm />} />
<Route path="/contracts/:id" element={<ContractDetail />} />

// Migration
<Route path="/migration" element={<MigrationWizard />} />
<Route path="/migration/dashboard" element={<MigrationDashboard />} />
```

### 2. Ajouter Reducers dans store.js

```javascript
// frontend/src/store/store.js

import eSourcingReducer from './slices/eSourcingSlice';
import contractsReducer from './slices/contractsSlice';
import migrationReducer from './slices/migrationSlice';

export const store = configureStore({
  reducer: {
    // ... existant
    eSourcing: eSourcingReducer,
    contracts: contractsReducer,
    migration: migrationReducer,
  },
});
```

### 3. Étendre services/api.js

```javascript
// frontend/src/services/api.js (ajouter à la fin)

// E-Sourcing API
export const eSourcingAPI = {
  list: (params) => api.get('/e-sourcing/events/', { params }),
  get: (id) => api.get(`/e-sourcing/events/${id}/`),
  create: (data) => api.post('/e-sourcing/events/', data),
  update: (id, data) => api.patch(`/e-sourcing/events/${id}/`, data),
  delete: (id) => api.delete(`/e-sourcing/events/${id}/`),
  publish: (id) => api.post(`/e-sourcing/events/${id}/publish/`),
  getBids: (id) => api.get(`/e-sourcing/events/${id}/bids/`),
  getComparison: (id) => api.get(`/e-sourcing/events/${id}/comparison/`),
  submitBid: (eventId, data) => api.post(`/e-sourcing/events/${eventId}/submit_bid/`, data),
};

// Contracts API
export const contractsAPI = {
  list: (params) => api.get('/contracts/', { params }),
  get: (id) => api.get(`/contracts/${id}/`),
  create: (data) => api.post('/contracts/', data),
  update: (id, data) => api.patch(`/contracts/${id}/`, data),
  delete: (id) => api.delete(`/contracts/${id}/`),
  uploadDocument: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/contracts/${id}/upload_document/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  extractClauses: (id) => api.post(`/contracts/${id}/extract_clauses/`),
  getExpiring: (days) => api.get('/contracts/expiring/', { params: { days } }),
};

// Migration API
export const migrationAPI = {
  list: (params) => api.get('/migration/jobs/', { params }),
  get: (id) => api.get(`/migration/jobs/${id}/`),
  create: (data) => api.post('/migration/jobs/', data),
  uploadFile: (jobId, file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('data_type', type);
    return api.post(`/migration/jobs/${jobId}/upload_file/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  startImport: (jobId) => api.post(`/migration/jobs/${jobId}/start_import/`),
  getStatus: (jobId) => api.get(`/migration/jobs/${jobId}/status/`),
  quickbooksAuth: () => api.get('/migration/quickbooks/auth_url/'),
};
```

### 4. Ajouter Menu Navigation (MainLayout.jsx)

Il faudra ajouter les liens dans le menu de navigation sidebar:
- E-Sourcing / RFQs
- Contrats
- Migration (dans Settings ou nouveau menu "Outils")

---

## 📋 CHECKLIST AVANT DE COMMENCER

### Backend
- [ ] Créer apps Django: `e_sourcing`, `contracts`, `data_migration`
- [ ] Ajouter apps dans `INSTALLED_APPS` (settings.py)
- [ ] Installer dépendances: `pandas`, `PyPDF2`, `fuzzywuzzy`

### Frontend
- [ ] Créer structure dossiers pages/components
- [ ] Installer dépendances si nécessaire (déjà MUI + Redux)

### Base de données
- [ ] Préparer migrations Django
- [ ] Tester en dev

---

## 🚀 ORDRE D'EXÉCUTION RECOMMANDÉ

**Je recommande de procéder module par module, complètement (backend + frontend):**

1. **E-Sourcing d'abord** (8 semaines)
   - Backend complet
   - Frontend complet
   - Tests
   - **Déploiement partiel** (clients peuvent utiliser RFQ)

2. **CLM ensuite** (4 semaines)
   - Backend complet
   - Frontend complet
   - Tests
   - **Déploiement partiel**

3. **Migration enfin** (6 semaines)
   - Backend complet
   - Frontend complet
   - Tests
   - **Déploiement final**

**Avantage:** Delivery incrémental, clients testent au fur et à mesure!

---

**Prêt à commencer l'implémentation?** Je peux créer les fichiers progressivement en suivant ce guide! 🚀
