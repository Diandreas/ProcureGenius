# ✅ Header avec Logo et Informations Entreprise - Complet

## 🎯 Modifications Appliquées

J'ai mis à jour **tous les templates de rapports PDF** pour inclure le logo et toutes les informations de l'entreprise dans le header, **exactement comme les factures**.

## 📦 Fichiers Modifiés

### 1. Service de Génération (`apps/api/services/report_generator_weasy.py`)

#### ✅ Fonction `_get_organization_data()` - Complétée

**Avant** (Informations basiques):
```python
return {
    'name': org.name,
    'address': getattr(org_settings, 'address', ''),
    'phone': getattr(org_settings, 'phone', ''),
    'email': getattr(org_settings, 'email', ''),
    'currency': getattr(org_settings, 'currency', 'CAD'),
    'logo': getattr(org_settings, 'logo', None),
}
```

**Après** (Informations complètes comme les factures):
```python
org_data = {
    'name': None,
    'address': None,
    'phone': None,
    'email': None,
    'website': None,
    'logo': None,
    'currency': 'CAD',
    'tax_region': 'international',
    # Identifiants légaux et fiscaux
    'niu': None,
    'tax_number': None,
    'rc_number': None,
    'rccm_number': None,
    'vat_number': None,
    # Canada/Québec
    'gst_number': None,
    'qst_number': None,
    'neq': None,
    # Informations bancaires
    'bank_name': None,
    'bank_account': None,
}
```

**Récupération complète**:
- ✅ Nom (priorité: `company_name` > `organization.name`)
- ✅ Adresse (`company_address`)
- ✅ Téléphone (`company_phone`)
- ✅ Email (`company_email`)
- ✅ Website (`company_website`)
- ✅ Logo (`company_logo`)
- ✅ Devise (`default_currency`)
- ✅ Région fiscale (`tax_region`)
- ✅ Identifiants fiscaux selon région:
  - **Cameroun/OHADA**: NIU, RC, RCCM
  - **EU**: VAT
  - **Canada**: NEQ, GST/HST, QST
  - **USA**: TIN
- ✅ Informations bancaires: `bank_name`, `bank_account`

#### ✅ Fonction `_get_logo_base64()` - Améliorée

**Améliorations**:
- ✅ Support de tous les formats d'images (PNG, JPG, GIF, SVG, WebP, BMP)
- ✅ Détection automatique du type MIME
- ✅ Gestion des FileField Django
- ✅ Gestion des chemins de fichiers
- ✅ Gestion des objets avec méthode `read()`
- ✅ Traceback complet pour debug

### 2. Template de Base (`templates/reports/pdf/base_report.html`)

#### ✅ Header - Identique aux Factures

**Structure**:
```html
<div class="header">
    <div class="logo">
        {% if logo_base64 %}
        <img src="{{ logo_base64 }}" alt="Logo">
        {% endif %}
    </div>
    <div class="company-info">
        <!-- Nom -->
        {% if organization.name %}<strong>{{ organization.name }}</strong>{% endif %}
        
        <!-- Adresse -->
        {% if organization.address %}{{ organization.address|striptags|truncatewords:10 }}<br>{% endif %}
        
        <!-- Contact -->
        {% if organization.phone %}{{ organization.phone }}{% endif %}
        {% if organization.phone and organization.email %} • {% endif %}
        {% if organization.email %}{{ organization.email }}{% endif %}
        
        <!-- Informations fiscales selon région -->
        {% if organization.tax_region == 'cameroon' or organization.tax_region == 'ohada' %}
            {% if organization.niu %}<strong>NIU:</strong> {{ organization.niu }} • {% endif %}
            {% if organization.rc_number %}<strong>RC:</strong> {{ organization.rc_number }}{% elif organization.rccm_number %}<strong>RCCM:</strong> {{ organization.rccm_number }}{% endif %}
        {% elif organization.tax_region == 'eu' %}
            {% if organization.vat_number %}<strong>VAT:</strong> {{ organization.vat_number }}{% endif %}
        {% elif organization.tax_region == 'canada' %}
            {% if organization.neq %}<strong>NEQ:</strong> {{ organization.neq }}<br>{% endif %}
            {% if organization.gst_number %}<strong>GST/HST:</strong> {{ organization.gst_number }}{% endif %}
            {% if organization.qst_number %} • <strong>QST:</strong> {{ organization.qst_number }}{% endif %}
        {% elif organization.tax_region == 'usa' %}
            {% if organization.tax_number %}<strong>TIN:</strong> {{ organization.tax_number }}{% endif %}
        {% endif %}
    </div>
</div>
```

#### ✅ Footer - Informations Bancaires Ajoutées

**Ajout**:
```html
{# Informations bancaires (optionnel) #}
{% if organization.bank_account %}
<div style="margin-top: 5px;">
    <strong>Banque:</strong> {{ organization.bank_name|default:"" }}{% if organization.bank_name %} • {% endif %}<strong>Compte:</strong> {{ organization.bank_account }}
</div>
{% endif %}
```

## 🎨 Résultat Visuel

### Header dans Tous les Rapports

```
┌─────────────────────────────────────────────────────┐
│ [LOGO]        Nom de l'Entreprise                   │
│              Adresse complète                       │
│              Téléphone • Email                      │
│              NIU: XXX • RC: XXX (selon région)      │
├─────────────────────────────────────────────────────┤
│ RAPPORT FOURNISSEUR                                 │
│ Nom du fournisseur • Généré le XX/XX/XXXX           │
└─────────────────────────────────────────────────────┘
```

### Footer dans Tous les Rapports

```
┌─────────────────────────────────────────────────────┐
│ [QR Code]    Nom de l'Entreprise                    │
│              Adresse                                 │
│              Téléphone • Email                       │
│              Banque: XXX • Compte: XXX               │
│              ─────────────────────                  │
│              Rapport généré le XX/XX/XXXX            │
└─────────────────────────────────────────────────────┘
```

## ✅ Templates Affectés

Tous les templates héritent automatiquement du header complet car ils utilisent `{% extends "reports/pdf/base_report.html" %}`:

- ✅ `supplier_report.html` - Header complet
- ✅ `client_report.html` - Header complet
- ✅ `product_report.html` - Header complet
- ✅ `invoices_report.html` - Header complet
- ✅ `purchase_orders_report.html` - Header complet

## 🔧 Informations Récupérées

### Depuis OrganizationSettings

**Informations de base**:
- `company_name` → Nom de l'entreprise
- `company_address` → Adresse
- `company_phone` → Téléphone
- `company_email` → Email
- `company_website` → Site web
- `company_logo` → Logo (converti en base64)

**Paramètres**:
- `default_currency` → Devise (CAD, USD, EUR, etc.)
- `tax_region` → Région fiscale (cameroon, ohada, eu, canada, usa)

**Identifiants fiscaux**:
- `company_niu` → NIU (Cameroun)
- `company_rc_number` → RC (Cameroun)
- `company_rccm_number` → RCCM (OHADA)
- `company_vat_number` → VAT (EU)
- `company_gst_number` → GST/HST (Canada)
- `company_qst_number` → QST (Québec)
- `company_neq` → NEQ (Québec)
- `company_tax_number` → TIN (USA)

**Bancaires**:
- `company_bank_name` → Nom de la banque
- `company_bank_account` → Numéro de compte

## 🎯 Affichage Conditionnel

### Selon la Région Fiscale

**Cameroun/OHADA**:
```
NIU: 123456789 • RC: RC12345
ou
NIU: 123456789 • RCCM: RCCM12345
```

**EU**:
```
VAT: FR12345678901
```

**Canada**:
```
NEQ: 1234567890
GST/HST: 123456789RT0001 • QST: 1234567890TQ0001
```

**USA**:
```
TIN: 12-3456789
```

## 📊 Comparaison Avant/Après

### Avant
```
┌─────────────────────────────────────┐
│ [LOGO]    Nom Entreprise            │
│            Adresse                   │
│            Téléphone • Email         │
└─────────────────────────────────────┘
```

### Après (Comme les Factures)
```
┌─────────────────────────────────────┐
│ [LOGO]    Nom Entreprise            │
│            Adresse                   │
│            Téléphone • Email         │
│            NIU: XXX • RC: XXX        │
│            (selon région fiscale)    │
└─────────────────────────────────────┘
```

## ✅ Résultat

**Tous les rapports PDF ont maintenant**:
- ✅ Logo de l'entreprise (si configuré)
- ✅ Nom complet de l'entreprise
- ✅ Adresse complète
- ✅ Coordonnées (téléphone, email)
- ✅ Informations fiscales selon la région
- ✅ Informations bancaires dans le footer
- ✅ Design identique aux factures

**Cohérence totale avec les factures!** 🎉

---

**Date**: 14 Décembre 2025
**Statut**: ✅ COMPLET
**Cohérence**: 100% avec les factures

