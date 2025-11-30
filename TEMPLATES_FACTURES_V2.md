# 🎨 Templates de Factures Modernes - Version 2.0

## ✨ Nouveautés

### Couleur de Marque Personnalisable
**Toutes les factures s'adaptent maintenant à votre couleur de marque!**

- Paramétrage simple depuis **Paramètres > Général > Couleur de marque**
- 8 couleurs prédéfinies + sélecteur de couleur personnalisé
- Aperçu en temps réel dans les paramètres
- Utilisation cohérente sur tous les documents

### Support Logo PNG avec Transparence
- Format PNG recommandé pour les logos sans fond
- Support de tous les formats: PNG, JPEG, GIF, SVG, WebP
- Outil de recadrage intégré
- Qualité optimisée pour l'impression

---

## 📋 Les 5 Modèles

### 1. **Classic** - Professionnel Épuré

**Style:** Design corporatif moderne et épuré
**Meilleur pour:** Entreprises traditionnelles, services professionnels

#### Caractéristiques
- Header avec bordure colorée (3px)
- Grid layout moderne pour informations
- Cards avec bordure gauche colorée
- Table avec alternance de couleurs subtiles
- Footer avec QR code discret

#### Éléments Colorés
- Bordure header
- Nom entreprise
- Titres des cards
- En-tête tableau
- Total final
- Bordure QR code

**URL:**
```
/invoices/<uuid>/pdf/?template=classic
```

---

### 2. **Modern** - Design Contemporain

**Style:** Minimaliste et contemporain
**Meilleur pour:** Startups, entreprises tech, services digitaux

#### Caractéristiques
- Design épuré avec espaces blancs généreux
- Cards légères avec bordures colorées
- Typography moderne et lisible
- Layout responsive et équilibré
- Accent couleur sur éléments clés

#### Éléments Colorés
- Badge "FACTURE"
- Bordures des cards (4px gauche)
- Labels des sections
- En-tête tableau
- Total final
- QR code

**URL:**
```
/invoices/<uuid>/pdf/?template=modern
```

---

### 3. **Minimal** - Ultra Épuré

**Style:** Minimaliste noir et blanc avec accents de couleur
**Meilleur pour:** Designers, architectes, consultants créatifs

#### Caractéristiques
- Design ultra-clean avec beaucoup d'espace
- Typographie élégante (letterspacing étendu)
- Titre "Facture" géant en font léger (font-weight: 200)
- Ligne d'accent horizontale colorée (2px)
- Bordures fines noires (1-2px)
- Couleur UNIQUEMENT sur éléments critiques

#### Éléments Colorés (MINIMAL)
- Ligne décorative horizontale
- Total final (texte uniquement)
- Statut facture si applicable

**URL:**
```
/invoices/<uuid>/pdf/?template=minimal
```

---

### 4. **Professional** - Layout Sidebar

**Style:** Layout deux colonnes avec sidebar colorée
**Meilleur pour:** Professions libérales, consultants, cabinets

#### Caractéristiques
- **Sidebar verticale gauche** (200px) avec fond coloré
- Logo et QR code dans la sidebar
- Informations émetteur et client dans sidebar
- Zone contenu principale blanche et propre
- Cards avec bordures colorées
- Badges de statut colorés

#### Éléments Colorés
- Fond complet sidebar
- Badge numéro facture
- Labels des cards
- En-tête tableau
- Bordure section header
- Total final

**URL:**
```
/invoices/<uuid>/pdf/?template=professional
```

---

### 5. **Creative** - Design Audacieux

**Style:** Moderne avec accents créatifs
**Meilleur pour:** Agences créatives, marketing, design

#### Caractéristiques
- Bande d'accent horizontale en haut (8px, border-radius)
- Logo dans container avec gradient coloré (15% opacity)
- Box "FACTURE" colorée avec border-radius
- Cards avec barre colorée supérieure (::before)
- Icônes emoji dans les cards (📄, 👤)
- Gradient dans en-tête tableau
- Alternance lignes avec teinte colorée (5% opacity)
- QR code avec wrapper coloré arrondi

#### Éléments Colorés
- Bande header
- Gradient container logo
- Box "FACTURE"
- Barres supérieures cards
- Backgrounds icônes (15%)
- Gradient en-tête tableau
- Alternance lignes (5%)
- Total final (gradient)
- Wrapper QR code
- Nom entreprise footer

**URL:**
```
/invoices/<uuid>/pdf/?template=creative
```

---

## 🎨 Personnalisation de la Couleur

### Via l'Interface

1. **Accéder aux Paramètres**
   - Menu > Paramètres
   - Onglet "Général"
   - Section "Couleur de marque"

2. **Choisir une Couleur**
   - **Option 1:** Utiliser le sélecteur visuel (color picker)
   - **Option 2:** Entrer un code couleur (#RRGGBB)
   - **Option 3:** Cliquer sur une couleur prédéfinie

3. **Couleurs Prédéfinies**
   - 🔵 Bleu (#2563eb) - Par défaut
   - 🟣 Violet (#7c3aed)
   - 🟢 Vert (#059669)
   - 🔴 Rouge (#dc2626)
   - 🟠 Orange (#ea580c)
   - 🩷 Rose (#db2777)
   - 🔷 Indigo (#4f46e5)
   - ⚫ Noir (#1f2937)

4. **Aperçu en Temps Réel**
   - L'aperçu de l'en-tête se met à jour automatiquement
   - Testez différentes couleurs avant d'enregistrer

5. **Enregistrer**
   - Cliquer sur "Enregistrer les modifications"
   - La couleur sera appliquée à tous les nouveaux PDFs

### Via l'API

```python
from apps.core.models import OrganizationSettings

# Récupérer les paramètres
settings = OrganizationSettings.objects.get(organization=org)

# Définir la couleur de marque
settings.brand_color = '#7c3aed'  # Violet
settings.save()
```

---

## 🖼️ Support des Logos

### Formats Supportés
- ✅ **PNG** (RECOMMANDÉ - Transparence)
- ✅ JPEG/JPG
- ✅ GIF
- ✅ SVG
- ✅ WebP
- ✅ BMP
- ✅ ICO

### Recommandations
- **Format préféré:** PNG avec transparence
- **Dimensions:** 300x150px minimum, 600x300px recommandé
- **Poids:** 500 Ko maximum
- **Fond:** Transparent pour meilleur rendu
- **Résolution:** 300 DPI pour impression

### Upload et Recadrage
1. Cliquer sur "Choisir un logo"
2. Sélectionner votre image
3. Utiliser l'outil de recadrage pour ajuster
4. Valider le recadrage
5. Le logo sera automatiquement optimisé

---

## 🔐 QR Code de Vérification

**Tous les modèles incluent un QR code** unique contenant:

```json
{
  "invoice_id": "uuid",
  "invoice_number": "FAC2025100013",
  "total": 46666650.00,
  "date": "2025-11-19T10:30:00",
  "status": "paid"
}
```

### Utilisation
- Scanner le QR code avec un smartphone
- Vérifier l'authenticité de la facture
- Accéder rapidement aux détails
- Traçabilité et archivage

---

## 📊 Comparaison des Templates

| Template | Complexité | Couleur | Espace Blanc | Meilleur Pour |
|----------|-----------|---------|--------------|---------------|
| **Classic** | Simple | Modéré | Normal | Entreprises traditionnelles |
| **Modern** | Moyen | Modéré | Généreux | Startups, Tech |
| **Minimal** | Très Simple | Minimal | Très Généreux | Designers, Créatifs |
| **Professional** | Complexe | Important | Équilibré | Professions libérales |
| **Creative** | Très Complexe | Important | Normal | Agences créatives |

---

## 🚀 Utilisation

### Via le Frontend React

```javascript
import { TEMPLATE_TYPES } from '../../services/pdfService';

// Générer PDF avec template et couleur de marque
const pdfUrl = `/invoices/${invoiceId}/pdf/?template=${TEMPLATE_TYPES.CREATIVE}`;
window.open(pdfUrl, '_blank');
```

### Via l'URL

```
http://localhost:8000/invoices/123e4567.../pdf/?template=classic
http://localhost:8000/invoices/123e4567.../pdf/?template=modern
http://localhost:8000/invoices/123e4567.../pdf/?template=minimal
http://localhost:8000/invoices/123e4567.../pdf/?template=professional
http://localhost:8000/invoices/123e4567.../pdf/?template=creative
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

## ⚙️ Configuration Technique

### Format PDF
```python
pdf_options = {
    'pdf_variant': 'pdf/a-3b',  # Format PDF/A pour archivage long terme
}
```

### Options Disponibles
- `pdf/a-1b`, `pdf/a-2b`, `pdf/a-3b` - Archivage
- `pdf/ua-1` - Accessibilité
- `optimize_size` - Optimisation taille

### Marges et Format
- **Format:** A4 (210x297mm)
- **Marges:** 20mm sur tous les côtés
- **Encodage:** UTF-8
- **Polices:** System fonts (cross-platform)

---

## 📐 Spécifications Design

### Typographie
- **Font principale:** -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto'
- **Taille corps:** 9-10pt
- **Taille titres:** 28-42pt
- **Line-height:** 1.6
- **Letter-spacing:** Variable selon template

### Couleurs
- **Texte principal:** #1a1a1a / #1f2937
- **Texte secondaire:** #666 / #6b7280
- **Arrière-plans:** #f8f9fa, #fafafa
- **Bordures:** #e5e7eb, #e0e0e0
- **Brand color:** Personnalisable (défaut: #2563eb)

### Espacements
- **Sections:** 30-40px
- **Cards:** 20px padding
- **Grid gap:** 30px
- **Bordures:** 1-4px selon importance

---

## 🎯 Recommandations par Secteur

### 💼 Services Professionnels
**Recommandé:** Classic, Professional
Avocats, comptables, consultants, cabinets

**Couleurs suggérées:** Bleu, Indigo, Noir

---

### 🚀 Tech & Startups
**Recommandé:** Modern, Creative
SaaS, développement, innovation, digital

**Couleurs suggérées:** Bleu, Violet, Indigo

---

### 🎨 Créatif & Design
**Recommandé:** Minimal, Creative
Agences, designers, artistes, marketing

**Couleurs suggérées:** Violet, Rose, Orange

---

### 🏢 Entreprises Traditionnelles
**Recommandé:** Classic, Professional
Industries, commerce, retail, manufacturing

**Couleurs suggérées:** Bleu, Vert, Noir

---

## 🔧 Développement

### Créer un Nouveau Template

1. **Copier un template existant**
```bash
cp templates/invoicing/pdf_templates/invoice_modern.html \
   templates/invoicing/pdf_templates/invoice_custom.html
```

2. **Modifier le design**
   - Utiliser `{{ brand_color|default:'#2563eb' }}` pour la couleur
   - Respecter la structure des variables Django
   - Tester avec différentes couleurs

3. **Ajouter au mapping**
```python
# Dans apps/invoicing/views_pdf.py
template_map = {
    # ...
    'custom': 'invoicing/pdf_templates/invoice_custom.html',
}
```

4. **Ajouter au frontend**
```javascript
// Dans frontend/src/services/pdfService.js
export const TEMPLATE_TYPES = {
    // ...
    CUSTOM: 'custom',
};
```

### Variables Django Disponibles

```django
{{ invoice.invoice_number }}
{{ invoice.title }}
{{ invoice.description }}
{{ issue_date }}
{{ due_date }}
{{ client.name }}
{{ client.email }}
{{ client.address }}
{{ organization.name }}
{{ organization.address }}
{{ organization.phone }}
{{ organization.email }}
{{ brand_color }}  {# NOUVEAU #}
{{ logo_base64 }}
{{ qr_code_base64 }}
{{ items }}  {# Liste des articles #}
{{ subtotal }}
{{ tax_amount }}
{{ total_amount }}
```

---

## 📊 Performances

| Template | Taille Moyenne | Temps Génération |
|----------|----------------|------------------|
| Classic | ~290 Ko | ~1s |
| Modern | ~310 Ko | ~1-2s |
| Minimal | ~270 Ko | ~1s |
| Professional | ~340 Ko | ~2s |
| Creative | ~370 Ko | ~2-3s |

*Tests avec 10 articles, logo 100Ko, QR code*

---

## 🆕 Roadmap

### Fonctionnalités Prévues
- [ ] Template Builder visuel dans le frontend
- [ ] Preview PDF en temps réel
- [ ] Watermark personnalisable
- [ ] Multi-langue automatique
- [ ] Signature électronique intégrée
- [ ] Personnalisation par client
- [ ] Templates pour devis et bons de commande
- [ ] Export en batch avec templates différents

---

## 📝 Notes Techniques

- **Moteur PDF:** WeasyPrint 62.3
- **Framework:** django-weasyprint 2.3.0
- **CSS:** Support CSS3 complet (Flexbox, Grid, etc.)
- **Images:** Base64 embedded (pas de dépendances externes)
- **QR Code:** qrcode 7.4.2
- **Compatibilité:** Windows, Linux, MacOS

---

**Version:** 2.0
**Date:** 19 Novembre 2025
**Auteur:** ProcureGenius Team

---

## 🎓 Guide Rapide

1. **Choisir un template** adapté à votre secteur
2. **Personnaliser la couleur** de marque dans Paramètres
3. **Uploader votre logo** (PNG transparent recommandé)
4. **Tester le rendu** en générant une facture
5. **Ajuster si nécessaire** la couleur ou le template
6. **Utiliser partout** - la configuration s'applique automatiquement!
