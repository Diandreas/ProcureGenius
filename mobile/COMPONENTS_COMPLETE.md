# Composants Mobile - Complets ✅

## Statut: Tous les composants Web migrés vers Mobile

Date: 2025-11-03

---

## 📦 Composants Créés

### 1. ✅ QuickCreateDialog
**Fichier:** `mobile/components/QuickCreateDialog.tsx`

**Fonctionnalités:**
- Création rapide d'entités (clients, fournisseurs, produits)
- Configuration dynamique des champs
- Détection des doublons similaires
- Support multi-types (text, email, phone, number, select)
- Validation des champs requis
- Mode "force create" pour outrepasser les avertissements

**Équivalent Web:** `frontend/src/components/common/QuickCreateDialog.jsx`

**Utilisation:**
```typescript
import { QuickCreateDialog } from '../components';

<QuickCreateDialog
  visible={showDialog}
  onDismiss={() => setShowDialog(false)}
  entityType="client"
  fields={clientFields}
  createFunction={clientsAPI.create}
  title="Créer un client rapidement"
  onSuccess={handleSuccess}
/>
```

---

### 2. ✅ ImportWizard
**Fichier:** `mobile/components/ImportWizard.tsx`

**Fonctionnalités:**
- Wizard multi-étapes (4 étapes)
  1. Upload de fichier CSV/Excel
  2. Mapping des colonnes
  3. Aperçu des données
  4. Import avec progress bar
- Support DocumentPicker pour fichiers
- Parsing CSV
- Mapping flexible des colonnes
- Preview DataTable
- Résultats d'import (succès/échecs)

**Équivalent Web:** `frontend/src/components/ImportWizard.jsx`

**Utilisation:**
```typescript
import { ImportWizard } from '../components';

<ImportWizard
  visible={showWizard}
  onDismiss={() => setShowWizard(false)}
  importType="clients"
  onImportComplete={handleImportComplete}
/>
```

---

### 3. ✅ DocumentScanner
**Fichier:** `mobile/components/DocumentScanner.tsx`

**Fonctionnalités:**
- Scanner de documents avec caméra
- Upload d'images depuis galerie
- 2 modes: Camera / Upload
- OCR simulation (extraction de données)
- Support multi-types: facture, reçu, contrat, identité
- Prévisualisation de l'image capturée
- Option auto-create après scan
- Affichage du niveau de confiance

**Équivalent Web:** `frontend/src/components/DocumentScanner.jsx`

**Packages requis:**
- expo-camera
- expo-image-picker

**Utilisation:**
```typescript
import { DocumentScanner } from '../components';

<DocumentScanner
  visible={showScanner}
  onDismiss={() => setShowScanner(false)}
  documentType="invoice"
  onSuccess={handleScanSuccess}
/>
```

---

### 4. ✅ WidgetLibrary
**Fichier:** `mobile/components/WidgetLibrary.tsx`

**Fonctionnalités:**
- Bibliothèque de widgets pour dashboard personnalisable
- Recherche de widgets par nom/description
- Filtres par module (global, products, clients, invoices, etc.)
- Affichage des widgets déjà ajoutés (check mark)
- Ajout rapide de widgets
- Organisation par modules

**Équivalent Web:** `frontend/src/components/dashboard/WidgetLibrary.jsx`

**Utilisation:**
```typescript
import { WidgetLibrary } from '../components';

<WidgetLibrary
  visible={showLibrary}
  onDismiss={() => setShowLibrary(false)}
  availableWidgets={widgetsConfig}
  currentWidgets={userWidgets}
  onAddWidget={handleAddWidget}
/>
```

---

### 5. ✅ BarcodeScanner (Existant - Amélioré)
**Fichier:** `mobile/components/BarcodeScanner.tsx`

**Fonctionnalités:**
- Scan de codes-barres/QR codes
- Support multi-formats (EAN, UPC, Code128, QR, etc.)
- Gestion des permissions caméra
- Overlay personnalisé
- Scan à nouveau après capture

**Package requis:**
- expo-camera
- expo-barcode-scanner

---

### 6. ✅ AdBanner (AdMob)
**Fichier:** `mobile/components/AdSense/AdBanner.tsx`

**Fonctionnalités:**
- Bannières publicitaires Google AdMob
- 4 formats supportés:
  - banner (320x50)
  - rectangle (300x250)
  - leaderboard (728x90)
  - smart (adaptatif)
- IDs de test intégrés pour dev
- Gestion des erreurs de chargement
- Support iOS et Android

**Équivalent Web:** `frontend/src/components/AdSense/AdBanner.jsx`

**Package requis:**
- react-native-google-mobile-ads

**Utilisation:**
```typescript
import { AdBanner } from '../components';

<AdBanner format="banner" />
<AdBanner format="rectangle" style={{ marginVertical: 20 }} />
```

---

### 7. ✅ ConditionalAdBanner
**Fichier:** `mobile/components/AdSense/ConditionalAdBanner.tsx`

**Fonctionnalités:**
- Affiche les pubs UNIQUEMENT pour utilisateurs FREE
- Masque automatiquement pour PRO/ENTERPRISE
- Lecture du plan depuis Redux store
- Wrapper intelligent autour de AdBanner

**Équivalent Web:** `frontend/src/components/AdSense/ConditionalAdBanner.jsx`

**Utilisation:**
```typescript
import { ConditionalAdBanner } from '../components';

// S'affichera uniquement si user.subscription_plan === 'free'
<ConditionalAdBanner format="rectangle" />
```

---

## 📋 Index des Composants

**Fichier:** `mobile/components/index.tsx`

Permet d'importer tous les composants depuis un seul point:

```typescript
import {
  BarcodeScanner,
  QuickCreateDialog,
  ImportWizard,
  DocumentScanner,
  WidgetLibrary,
  AdBanner,
  ConditionalAdBanner,
} from '../components';
```

---

## 📦 Packages Installés

### Nouveaux packages ajoutés:
```json
{
  "react-native-google-mobile-ads": "^13.x.x",
  "expo-image-picker": "^14.x.x"
}
```

### Packages déjà installés (utilisés):
```json
{
  "expo-camera": "^14.x.x",
  "expo-barcode-scanner": "^12.x.x",
  "expo-document-picker": "^11.x.x",
  "expo-file-system": "^16.x.x"
}
```

---

## 🎯 Patterns Établis

### 1. Portal Dialog Pattern
Tous les composants modaux utilisent `Portal` de react-native-paper:

```typescript
<Portal>
  <Dialog visible={visible} onDismiss={onDismiss}>
    <Dialog.Title>Titre</Dialog.Title>
    <Dialog.Content>Contenu</Dialog.Content>
    <Dialog.Actions>
      <Button>Actions</Button>
    </Dialog.Actions>
  </Dialog>
</Portal>
```

### 2. Permission Handling Pattern
Gestion des permissions de manière cohérente:

```typescript
const [hasPermission, setHasPermission] = useState<boolean | null>(null);

useEffect(() => {
  if (visible) {
    requestPermissions();
  }
}, [visible]);

const requestPermissions = async () => {
  const { status } = await Camera.requestCameraPermissionsAsync();
  setHasPermission(status === 'granted');
};
```

### 3. Loading State Pattern
États de chargement uniformes:

```typescript
const [loading, setLoading] = useState(false);

<Button loading={loading} disabled={loading}>
  {loading ? t('common.loading') : t('common.submit')}
</Button>
```

---

## ✅ Comparaison Web vs Mobile

| Composant Web | Composant Mobile | Statut | Notes |
|---------------|------------------|--------|-------|
| QuickCreateDialog | QuickCreateDialog | ✅ 100% | Fonctionnalités identiques |
| ImportWizard | ImportWizard | ✅ 100% | 4 étapes, même workflow |
| DocumentScanner | DocumentScanner | ✅ 100% | Camera native vs webcam |
| WidgetLibrary | WidgetLibrary | ✅ 100% | Même fonctionnalités |
| AdBanner (AdSense) | AdBanner (AdMob) | ✅ 100% | Google Mobile Ads |
| ConditionalAdBanner | ConditionalAdBanner | ✅ 100% | Logique identique |

---

## 🚀 Prochaines Étapes

### Intégration dans les écrans:

1. **Dashboard:** Ajouter WidgetLibrary + ConditionalAdBanner
2. **Settings/Data Migration:** Intégrer ImportWizard
3. **Invoices/Products Forms:** Ajouter QuickCreateDialog
4. **Settings:** Ajouter DocumentScanner pour scan de factures
5. **Products:** BarcodeScanner déjà intégré ✅

### Configuration AdMob:

1. Créer un compte Google AdMob
2. Obtenir les Unit IDs pour Android/iOS
3. Remplacer les Test IDs dans `AdBanner.tsx`
4. Configurer app.json avec AdMob App ID:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-xxxxxxxx~yyyyyyyy",
          "iosAppId": "ca-app-pub-xxxxxxxx~yyyyyyyy"
        }
      ]
    ]
  }
}
```

---

## 📝 Documentation Technique

### QuickCreateDialog Props

```typescript
interface QuickCreateDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess?: (result: any) => void;
  entityType: 'client' | 'supplier' | 'product';
  fields: Field[];
  createFunction: (data: any) => Promise<any>;
  title: string;
  contextData?: Record<string, any>;
}
```

### ImportWizard Props

```typescript
interface ImportWizardProps {
  visible: boolean;
  onDismiss: () => void;
  importType?: 'clients' | 'products' | 'contacts' | 'suppliers';
  onImportComplete?: (results: any) => void;
}
```

### DocumentScanner Props

```typescript
interface DocumentScannerProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess?: (data: any) => void;
  documentType?: 'invoice' | 'receipt' | 'contract' | 'identity';
}
```

### WidgetLibrary Props

```typescript
interface WidgetLibraryProps {
  visible: boolean;
  onDismiss: () => void;
  availableWidgets: Record<string, Widget[]>;
  currentWidgets: string[];
  onAddWidget: (widgetCode: string) => void;
}
```

---

**Tous les composants du web sont maintenant disponibles en mobile! 🎉**
