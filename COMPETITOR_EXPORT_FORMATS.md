# Formats d'Export des Concurrents - Analyse

## Vue d'ensemble

Recherche effectuée sur les formats d'exportation des principaux concurrents pour assurer une migration facile vers ProcureGenius.

---

## 1. SAP Ariba

### Formats supportés

**Excel (.xls, .xlsx)**
- Export direct depuis l'UI Ariba
- Bouton "Excel Export" disponible
- Limite: Peut être restreint pour très grands volumes

**CSV**
- Format préféré pour gros volumes
- UTF-8 encoding recommandé
- Conversion Excel → CSV via VBA macros
- Upload via Core Administration > Data Import/Export

### Champs typiques Ariba

**Suppliers (Fournisseurs)**
```
Supplier Name, Tax ID, Address Line 1, Address Line 2, City, State/Province,
Postal Code, Country, Contact Name, Contact Email, Contact Phone, Website,
Payment Terms, Currency, Status
```

**Products/Items**
```
Item Number, Description, Unit of Measure, Unit Price, Currency, Category,
Manufacturer, Manufacturer Part Number, UNSPSC Code, Status
```

**Invoices**
```
Invoice Number, PO Number, Supplier Name, Invoice Date, Due Date,
Line Item, Quantity, Unit Price, Total Amount, Tax Amount, Currency, Status
```

**Purchase Requisitions**
```
PR Number, Requester, Department, Item Description, Quantity,
Unit Price, Total, Delivery Date, Status, Approval Chain
```

### Particularités Ariba

✅ Délimiteurs: Virgule (,) standard
✅ Encodage: UTF-8 mandatory
✅ Format dates: YYYY-MM-DD ou MM/DD/YYYY
✅ Nombres: Point (.) comme séparateur décimal
❌ Attention: Excel peut corrompre les numéros avec formattage auto

---

## 2. Coupa

### Formats supportés

**CSV (Flat Files)**
- Format principal pour import/export
- Export standard toutes les heures pour factures approuvées
- Limite: 10,000 lignes par export (avec Coupa Advanced)
- Emplacement: ./Outgoing/Invoices sur SFTP

**cXML**
- Format structuré pour automatisation
- Utilisé principalement pour soumission factures

**Excel**
- Feuilles de calcul pré-formatées
- Envoyées par email par clients
- Format non standard

**PDF**
- Upload via Coupa Supplier Portal
- Ou envoi par email

### Champs typiques Coupa

**Suppliers (Supplier Information Export)**
```
Supplier Number, Supplier Name, Status, Tax ID, DUNS Number,
Primary Contact First Name, Primary Contact Last Name, Primary Contact Email,
Address Line 1, Address Line 2, City, State, Postal Code, Country,
Payment Terms, Currency, Remit-To Address, Website
```

**Invoices (Invoices Export)**
```
Invoice Number, Supplier Number, Supplier Name, PO Number, Invoice Date,
Due Date, Payment Date, Line Item Number, Item Description, Quantity,
Unit Price, Line Total, Tax Amount, Total Amount, Currency, Status,
Approval Status, Payment Status
```

**Purchase Orders**
```
PO Number, Supplier Name, Requisition Number, Order Date, Delivery Date,
Ship-To Address, Bill-To Address, Line Item, Description, Quantity,
Unit Price, Total, Status, Department, Buyer
```

### Particularités Coupa

✅ Identifiants uniques: Invoice Number + (Supplier Name OU Supplier Number)
✅ Export automatique: Toutes les heures pour factures approuvées
✅ Formats multiples: Coupa, Xero, Sage, Dynamics GP
✅ Champs personnalisables: Colonnes sélectionnables
✅ SFTP standard: ./Outgoing/Invoices

---

## 3. Procurify

### Formats supportés

**CSV personnalisable**
- Format principal avec colonnes configurables
- Templates sauvegardables
- Réarrangement des colonnes possible

**Formats pré-configurés**
- Procurify (format complet avec tous les champs)
- Xero (format comptabilité)
- Sage (format comptabilité)
- Dynamics GP (format ERP)
- QuickBooks (via intégration)

### Champs typiques Procurify

**Vendors (Fournisseurs)**
```
Vendor Name, Vendor Code, Tax Number, Email, Phone, Website,
Address, City, Province/State, Postal Code, Country,
Contact Person, Payment Terms, Account Code, Status
```

**Products (Catalog Items)**
```
Item Name, SKU, Description, Category, Unit of Measure,
Unit Cost, Preferred Vendor, Account Code, Location, Status
```

**Purchase Orders**
```
PO Number, Vendor Name, Order Date, Expected Delivery Date,
Requester, Department, Location, Line Item, Description, Quantity,
Unit Price, Total, Tax, Shipping, Grand Total, Status, Approvers
```

**Bills/Invoices**
```
Bill Number, Vendor, PO Number, Bill Date, Due Date, Payment Date,
Line Item, Description, Quantity, Unit Cost, Amount, Tax,
Total, Status, Paid Status, Payment Method
```

### Particularités Procurify

✅ Templates personnalisés sauvegardables
✅ Sélection flexible des colonnes
✅ Headers configurables
✅ Formats multiples pour différents systèmes (Xero, Sage, etc.)
✅ Intégrations natives: QuickBooks, Xero, Sage, Bill.com

**Champs Bill.com matching:**
- Vendors
- Account Codes
- Location/Departments
- Classes
- Job/Customer

---

## 4. Autres plateformes

### Jaggaer (anciennement SciQuest)
- CSV avec champs similaires à SAP
- Excel pour petits volumes
- API REST pour intégrations

### Ivalua
- Excel templates structurés
- CSV pour bulk export
- Format XML pour intégrations

### GEP SMART
- Excel natif
- CSV délimité
- API JSON pour temps réel

---

## Champs communs à tous les concurrents

### Fournisseurs (Suppliers/Vendors)
| Champ | Ariba | Coupa | Procurify | Notre Système |
|-------|-------|-------|-----------|---------------|
| Nom | ✅ | ✅ | ✅ | name |
| Email | ✅ | ✅ | ✅ | email |
| Téléphone | ✅ | ✅ | ✅ | phone |
| Adresse | ✅ | ✅ | ✅ | address |
| Ville | ✅ | ✅ | ✅ | city |
| Province/État | ✅ | ✅ | ✅ | province |
| Code postal | ✅ | ✅ | ✅ | postal_code |
| Pays | ✅ | ✅ | ✅ | country |
| Contact | ✅ | ✅ | ✅ | contact_person |
| Site web | ✅ | ✅ | ✅ | website |
| Numéro fiscal | ✅ | ✅ | ✅ | tax_number |
| Conditions paiement | ✅ | ✅ | ✅ | payment_terms |

### Produits (Products/Items)
| Champ | Ariba | Coupa | Procurify | Notre Système |
|-------|-------|-------|-----------|---------------|
| Nom | ✅ | ✅ | ✅ | name |
| SKU/Code | ✅ | ✅ | ✅ | sku |
| Description | ✅ | ✅ | ✅ | description |
| Catégorie | ✅ | ✅ | ✅ | category |
| Prix unitaire | ✅ | ✅ | ✅ | unit_price |
| Coût | ✅ | ✅ | ✅ | cost_price |
| Unité de mesure | ✅ | ✅ | ✅ | unit_of_measure |
| Fournisseur | ✅ | ✅ | ✅ | supplier |

### Factures (Invoices)
| Champ | Ariba | Coupa | Procurify | Notre Système |
|-------|-------|-------|-----------|---------------|
| Numéro facture | ✅ | ✅ | ✅ | invoice_number |
| Fournisseur | ✅ | ✅ | ✅ | supplier |
| Date facture | ✅ | ✅ | ✅ | invoice_date |
| Date échéance | ✅ | ✅ | ✅ | due_date |
| Montant total | ✅ | ✅ | ✅ | total_amount |
| Montant taxes | ✅ | ✅ | ✅ | tax_amount |
| Statut | ✅ | ✅ | ✅ | status |
| Numéro PO | ✅ | ✅ | ✅ | po_number |

---

## Recommandations d'implémentation

### 1. Templates pré-configurés

Créer des templates de mapping pour chaque concurrent:

**Template SAP Ariba**
```json
{
  "name": "SAP Ariba - Fournisseurs",
  "field_mapping": {
    "Supplier Name": "name",
    "Contact Email": "email",
    "Contact Phone": "phone",
    "Address Line 1": "address",
    "City": "city",
    "State/Province": "province",
    "Postal Code": "postal_code",
    "Country": "country",
    "Contact Name": "contact_person",
    "Website": "website",
    "Tax ID": "tax_number",
    "Payment Terms": "payment_terms"
  }
}
```

**Template Coupa**
```json
{
  "name": "Coupa - Fournisseurs",
  "field_mapping": {
    "Supplier Name": "name",
    "Primary Contact Email": "email",
    "Primary Contact Phone": "phone",
    "Address Line 1": "address",
    "City": "city",
    "State": "province",
    "Postal Code": "postal_code",
    "Country": "country",
    "Primary Contact First Name": "contact_person",
    "Website": "website",
    "Tax ID": "tax_number",
    "Payment Terms": "payment_terms"
  }
}
```

**Template Procurify**
```json
{
  "name": "Procurify - Fournisseurs",
  "field_mapping": {
    "Vendor Name": "name",
    "Email": "email",
    "Phone": "phone",
    "Address": "address",
    "City": "city",
    "Province/State": "province",
    "Postal Code": "postal_code",
    "Country": "country",
    "Contact Person": "contact_person",
    "Website": "website",
    "Tax Number": "tax_number",
    "Payment Terms": "payment_terms"
  }
}
```

### 2. Auto-détection du format

Implémenter une fonction qui détecte automatiquement le format:

```python
def detect_competitor_format(headers: List[str]) -> str:
    """Détecte le format du concurrent basé sur les en-têtes"""

    ariba_markers = ['Supplier Name', 'Tax ID', 'Contact Name']
    coupa_markers = ['Supplier Number', 'Primary Contact Email', 'DUNS Number']
    procurify_markers = ['Vendor Code', 'Vendor Name', 'Account Code']

    if all(marker in headers for marker in ariba_markers):
        return 'sap_ariba'
    elif all(marker in headers for marker in coupa_markers):
        return 'coupa'
    elif all(marker in headers for marker in procurify_markers):
        return 'procurify'

    return 'generic'
```

### 3. Validation et nettoyage

**Problèmes communs à gérer:**

1. **Formats de date différents**
   - Ariba: YYYY-MM-DD
   - Coupa: MM/DD/YYYY
   - Procurify: YYYY-MM-DD
   - Solution: Parser flexible avec dateutil

2. **Encodage**
   - UTF-8 par défaut
   - Détecter BOM
   - Convertir si nécessaire

3. **Numéros et devises**
   - Virgule vs point comme décimal
   - Symboles de devise ($, €, CAD)
   - Espaces dans les nombres

4. **Champs multiples combinés**
   - Contact = First Name + Last Name
   - Adresse = Line 1 + Line 2

### 4. Guide migration par concurrent

Créer des guides spécifiques:

**De SAP Ariba vers ProcureGenius:**
1. Ouvrir Ariba UI
2. Naviguer vers section Suppliers/Vendors
3. Cliquer "Excel Export"
4. Sauvegarder le fichier
5. Dans ProcureGenius: Settings → Migration
6. Sélectionner "Import depuis SAP Ariba"
7. Upload fichier Excel
8. Le mapping sera automatique!

**De Coupa vers ProcureGenius:**
1. Dans Coupa, aller à Suppliers
2. Cliquer l'ellipse (...) près de Search
3. Sélectionner "Export as CSV Plain Text"
4. Dans ProcureGenius: Settings → Migration
5. Sélectionner "Import depuis Coupa"
6. Upload fichier CSV
7. Mapping automatique appliqué

**De Procurify vers ProcureGenius:**
1. Dans Procurify, section Vendors
2. Choisir "Export" avec format "Procurify" complet
3. Sélectionner toutes les colonnes
4. Exporter en CSV
5. Dans ProcureGenius: Settings → Migration
6. Sélectionner "Import depuis Procurify"
7. Upload et mapping auto

---

## Prochaines étapes techniques

### Backend

1. **Créer modèle MappingTemplate**
   ```python
   class MappingTemplate(models.Model):
       name = models.CharField(max_length=200)
       competitor = models.CharField(max_length=50)  # ariba, coupa, procurify
       entity_type = models.CharField(max_length=30)  # suppliers, products, etc.
       field_mapping = models.JSONField()
       transformation_rules = models.JSONField(default=dict)
       is_active = models.BooleanField(default=True)
   ```

2. **API endpoint détection automatique**
   ```python
   POST /api/v1/migration/detect-format/
   {
       "headers": ["Supplier Name", "Tax ID", ...]
   }
   →
   {
       "detected_format": "sap_ariba",
       "confidence": 0.95,
       "suggested_template": "SAP Ariba - Suppliers"
   }
   ```

3. **Templates pré-chargés**
   - Fixtures Django avec templates pour Ariba, Coupa, Procurify
   - Chargés automatiquement lors du déploiement

### Frontend

1. **Sélecteur de plateforme source**
   ```jsx
   <FormControl fullWidth>
     <InputLabel>Vous venez de...</InputLabel>
     <Select value={sourceplatform}>
       <MenuItem value="sap_ariba">SAP Ariba</MenuItem>
       <MenuItem value="coupa">Coupa</MenuItem>
       <MenuItem value="procurify">Procurify</MenuItem>
       <MenuItem value="other">Autre plateforme</MenuItem>
     </Select>
   </FormControl>
   ```

2. **Auto-application du template**
   - Détection automatique lors de l'upload
   - Proposition du template approprié
   - Possibilité d'ajuster manuellement

3. **Guides intégrés**
   - Stepper avec instructions par concurrent
   - Screenshots des étapes d'export
   - Vidéos tutoriels (optionnel)

---

## Conclusion

✅ **Tous les concurrents exportent en CSV/Excel** - Notre système est compatible!

✅ **Champs similaires** - Mapping facile avec templates pré-configurés

✅ **Formats détectables** - Auto-détection possible basée sur headers

✅ **Migration simplifiée** - Expérience guidée pour chaque plateforme

**Prochaine étape:** Implémenter les templates et la détection automatique dans le code!
