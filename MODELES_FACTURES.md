# 📄 Guide des 5 Modèles de Factures

## 🎨 Modèles Disponibles

ProcureGenius propose **5 modèles de factures professionnels** générés avec WeasyPrint, tous avec QR code de vérification intégré.

---

## 1. 📘 CLASSIC - Corporatif Professionnel

**Style:** Design corporatif classique avec barre bleue
**Couleur principale:** Bleu (#2563eb)
**Idéal pour:** Entreprises traditionnelles, cabinets professionnels

### Caractéristiques
- ✅ En-tête avec barre de couleur distinctive
- ✅ Mise en page structurée et formelle
- ✅ Informations claires et organisées
- ✅ QR code avec bordure bleue

### URL
```
/invoices/<uuid>/pdf/?template=classic
```

---

## 2. 🎯 MODERN - Design Moderne

**Style:** Design contemporain avec dégradés
**Couleur principale:** Violet/Rose (#8b5cf6, gradient)
**Idéal pour:** Startups, agences créatives, tech

### Caractéristiques
- ✅ Dégradés de couleurs modernes
- ✅ Badges pour statut de facture
- ✅ Cards avec ombres légères
- ✅ QR code avec bordure violette

### URL
```
/invoices/<uuid>/pdf/?template=modern
```

---

## 3. ⚪ MINIMAL - Épuré Minimaliste

**Style:** Design épuré ultra-minimaliste
**Couleur principale:** Noir et Blanc
**Idéal pour:** Design studios, architectes, consultants

### Caractéristiques
- ✅ Typographie soignée
- ✅ Espaces blancs généreux
- ✅ Bordures fines et élégantes
- ✅ QR code simple et discret

### URL
```
/invoices/<uuid>/pdf/?template=minimal
```

---

## 4. 💼 PROFESSIONAL - Élégant avec Sidebar

**Style:** Layout avec sidebar latérale
**Couleur principale:** Dégradé Violet/Mauve (#667eea → #764ba2)
**Idéal pour:** Consultants, avocats, experts-comptables

### Caractéristiques
- ✅ Sidebar gauche avec informations entreprise
- ✅ QR code intégré dans la sidebar
- ✅ Logo dans cadre blanc avec shadow
- ✅ Mise en page unique et distinctive
- ✅ Cards colorées pour les informations

### URL
```
/invoices/<uuid>/pdf/?template=professional
```

---

## 5. 🌈 CREATIVE - Coloré et Moderne

**Style:** Design créatif avec formes géométriques
**Couleur principale:** Gradient multicolore (#667eea → #764ba2 → #f093fb)
**Idéal pour:** Agences créatives, designers, marketing

### Caractéristiques
- ✅ Header avec gradient et formes géométriques
- ✅ Cards colorées pour sections
- ✅ Footer avec gradient
- ✅ Design audacieux et vibrant
- ✅ QR code dans footer stylisé

### URL
```
/invoices/<uuid>/pdf/?template=creative
```

---

## 📋 Comparaison des Modèles

| Modèle | Style | Couleurs | Complexité | Meilleur Pour |
|--------|-------|----------|------------|---------------|
| **Classic** | Corporatif | Bleu | Simple | Entreprises traditionnelles |
| **Modern** | Contemporain | Violet/Rose | Moyen | Startups, Tech |
| **Minimal** | Épuré | N&B | Très simple | Designers, Consultants |
| **Professional** | Sidebar | Violet | Complexe | Professions libérales |
| **Creative** | Artistique | Multicolore | Très complexe | Agences créatives |

---

## 🖼️ Support des Logos

**Tous les modèles supportent les formats d'image suivants :**

- ✅ **PNG** (Recommandé - Transparence)
- ✅ JPEG/JPG
- ✅ GIF
- ✅ SVG
- ✅ WebP
- ✅ BMP
- ✅ ICO

**Recommandations logo :**
- Format préféré : **PNG avec transparence**
- Dimensions idéales : 300x150px minimum
- Poids max recommandé : 500 Ko

---

## 🔐 QR Code de Vérification

**Tous les modèles incluent un QR code** contenant :

```json
{
  "invoice_id": "uuid",
  "invoice_number": "FAC2025100013",
  "total": 46666650.00,
  "date": "2025-11-18T10:30:00",
  "status": "paid"
}
```

Le QR code peut être scanné pour :
- ✅ Vérifier l'authenticité de la facture
- ✅ Accéder rapidement aux détails
- ✅ Traçabilité et archivage

---

## 🚀 Utilisation

### Via l'URL Django

```python
# Template Classic
http://localhost:8000/invoices/123e4567.../pdf/?template=classic

# Template Modern
http://localhost:8000/invoices/123e4567.../pdf/?template=modern

# Template Minimal
http://localhost:8000/invoices/123e4567.../pdf/?template=minimal

# Template Professional
http://localhost:8000/invoices/123e4567.../pdf/?template=professional

# Template Creative
http://localhost:8000/invoices/123e4567.../pdf/?template=creative
```

### Via le Frontend React

```javascript
const TEMPLATE_TYPES = {
  CLASSIC: 'classic',
  MODERN: 'modern',
  MINIMAL: 'minimal',
  PROFESSIONAL: 'professional',
  CREATIVE: 'creative',
};

// Générer PDF
const pdfUrl = `/invoices/${invoiceId}/pdf/?template=${TEMPLATE_TYPES.CREATIVE}`;
window.open(pdfUrl, '_blank');
```

### Via Python/Django

```python
from apps.invoicing.models import Invoice
from django.urls import reverse

invoice = Invoice.objects.get(pk='...')
pdf_url = reverse('invoicing:invoice_pdf', kwargs={'pk': invoice.id})
pdf_url += '?template=professional'
```

---

## 🎨 Personnalisation

### Modifier les couleurs d'un template

Éditez le fichier HTML du template :
```
templates/invoicing/pdf_templates/invoice_<nom>.html
```

Modifiez les couleurs dans la section `<style>` :
```css
/* Exemple pour Classic */
.header-bar {
    background-color: #2563eb; /* Changer la couleur */
}
```

### Créer un nouveau modèle

1. **Copier un template existant**
```bash
cp templates/invoicing/pdf_templates/invoice_modern.html \
   templates/invoicing/pdf_templates/invoice_custom.html
```

2. **Modifier le design et les couleurs**

3. **Ajouter au mapping dans views_pdf.py**
```python
template_map = {
    # ...
    'custom': 'invoicing/pdf_templates/invoice_custom.html',
}
```

---

## 🔧 Options PDF

Les PDFs sont générés avec les options suivantes :

```python
pdf_options = {
    'pdf_variant': 'pdf/a-3b',  # Format PDF/A pour archivage long terme
}
```

**Options disponibles :**
- `pdf/a-1b`, `pdf/a-2b`, `pdf/a-3b` - Archivage
- `pdf/ua-1` - Accessibilité
- `optimize_size` - Optimisation taille

---

## 📊 Performances

| Modèle | Taille moyenne | Temps génération |
|--------|----------------|------------------|
| Classic | ~300 Ko | ~1-2s |
| Modern | ~320 Ko | ~1-2s |
| Minimal | ~280 Ko | ~1s |
| Professional | ~340 Ko | ~2-3s |
| Creative | ~360 Ko | ~2-3s |

*Tests effectués avec 10 articles, logo 100Ko, QR code*

---

## 🎯 Recommandations par Secteur

### 💼 Services Professionnels
**Recommandé :** Classic, Professional
Avocats, comptables, consultants

### 🚀 Tech & Startups
**Recommandé :** Modern, Creative
SaaS, développement, innovation

### 🎨 Créatif & Design
**Recommandé :** Minimal, Creative
Agences, designers, artistes

### 🏢 Entreprises Traditionnelles
**Recommandé :** Classic, Professional
Industries, commerce, retail

---

## 📝 Notes Techniques

- **Moteur PDF :** WeasyPrint 62.3
- **Format :** A4 (210x297mm)
- **CSS :** Support CSS3 complet
- **Polices :** System fonts (cross-platform)
- **Encodage :** UTF-8
- **Images :** Base64 embedded

---

## 🆕 Prochaines Versions

Fonctionnalités prévues :
- [ ] Template Builder visuel
- [ ] Preview temps réel
- [ ] Watermark personnalisable
- [ ] Multi-langue automatique
- [ ] Signature électronique
- [ ] Personnalisation par client

---

**Version :** 1.0
**Date :** 18 Novembre 2025
**Auteur :** ProcureGenius Team
