# 📄 Amélioration du Système de Facturation - WeasyPrint

## 🎯 Améliorations Apportées

### 1. **Migration vers WeasyPrint** ✨
- Remplacement de xhtml2pdf par **WeasyPrint** pour une meilleure qualité PDF
- Support CSS3 avancé pour des designs modernes et professionnels
- Meilleur rendu des polices, couleurs et mise en page

### 2. **QR Code sur toutes les factures** 🔐
- Ajout d'un QR code de vérification sur les 3 templates (Classic, Modern, Minimal)
- Le QR code contient :
  - ID de la facture
  - Numéro de facture
  - Montant total
  - Date d'émission
  - Statut de la facture
- Permet la vérification d'authenticité par scan

### 3. **Bouton "Imprimer"** 🖨️
- Nouveau bouton dans l'interface pour impression directe
- Ouvre la boîte de dialogue d'impression du navigateur
- Permet de choisir l'imprimante, le format, les options d'impression
- Alternative pratique au téléchargement PDF

## 📦 Installation

### 1. Installer les dépendances Python

```bash
pip install -r requirements.txt
```

Les nouvelles dépendances ajoutées :
- `WeasyPrint==62.3` - Générateur PDF HTML/CSS
- `django-weasyprint==2.3.0` - Intégration Django
- `qrcode==7.4.2` - Génération de QR codes

### 2. Installation système (WeasyPrint nécessite certaines bibliothèques)

**Windows:**
```bash
# Installer GTK3 runtime
# Télécharger depuis : https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install python3-cffi python3-brotli libpango-1.0-0 libpangoft2-1.0-0
```

**macOS:**
```bash
brew install pango
```

## 🚀 Utilisation

### Backend - Génération PDF avec WeasyPrint

Le générateur WeasyPrint est automatiquement utilisé par défaut :

```python
from apps.api.services.pdf_generator_weasy import generate_invoice_pdf_weasy

# Générer un PDF avec WeasyPrint
pdf_buffer = generate_invoice_pdf_weasy(invoice, template_type='modern')
```

Templates disponibles :
- `classic` - Design corporatif classique avec bordures bleues
- `modern` - Design moderne avec dégradés violet/rose
- `minimal` - Design épuré et minimaliste

### Frontend - Utilisation du bouton Imprimer

Dans la page de détails de facture :
1. Cliquer sur "Générer PDF"
2. Choisir le template (Classic, Modern, Minimal)
3. Options disponibles :
   - **Aperçu** - Ouvrir le PDF dans un nouvel onglet
   - **Imprimer** - Ouvrir la boîte de dialogue d'impression
   - **Télécharger** - Télécharger le PDF

## 🎨 Templates HTML

Les 3 templates ont été améliorés avec :

### Template Classic ([invoice_classic.html](templates/invoicing/pdf_templates/invoice_classic.html))
- En-tête avec barre bleue
- Design corporatif professionnel
- QR code avec bordure bleue
- Footer avec informations de contact

### Template Modern ([invoice_modern.html](templates/invoicing/pdf_templates/invoice_modern.html))
- Bande de couleur dégradée en haut
- Design carte moderne
- QR code avec bordure violette
- Badges pour le statut de facture

### Template Minimal ([invoice_minimal.html](templates/invoicing/pdf_templates/invoice_minimal.html))
- Design ultra épuré
- Typographie soignée
- QR code minimaliste
- Bordures fines et élégantes

## 🔧 Configuration

### Fallback sur ReportLab

Si WeasyPrint n'est pas disponible, le système utilise automatiquement ReportLab comme solution de secours :

```python
# Dans pdf_generator_weasy.py
try:
    from weasyprint import HTML, CSS
except ImportError:
    print("⚠ WeasyPrint non disponible, utilisation de ReportLab fallback")
    from .pdf_generator import generate_invoice_pdf
    return generate_invoice_pdf(invoice, template_type)
```

## 📊 Comparaison des Générateurs

| Fonctionnalité | xhtml2pdf | ReportLab | WeasyPrint ✨ |
|----------------|-----------|-----------|---------------|
| Support CSS3 | ❌ Limité | ❌ Non | ✅ Excellent |
| QR Code | ❌ Manuel | ✅ Intégré | ✅ Intégré |
| Design Moderne | ⚠️ Basique | ✅ Avancé | ✅ Excellent |
| Performance | ⚠️ Moyenne | ✅ Rapide | ✅ Rapide |
| Flexibilité | ❌ Limitée | ✅ Haute | ✅ Très Haute |

## 🧪 Tests

Pour tester la génération de PDF :

```bash
# Depuis le dossier du projet
python test_xhtml2pdf.py
```

Cela générera 3 fichiers PDF de test :
- `test_invoice_classic_v2.pdf`
- `test_invoice_modern_v2.pdf`
- `test_invoice_minimal_v2.pdf`

## 📝 Fichiers Modifiés

### Backend
- [requirements.txt](requirements.txt) - Ajout de WeasyPrint, django-weasyprint, qrcode
- [apps/api/services/pdf_generator_weasy.py](apps/api/services/pdf_generator_weasy.py) - Nouveau générateur WeasyPrint

### Templates
- [templates/invoicing/pdf_templates/invoice_classic.html](templates/invoicing/pdf_templates/invoice_classic.html)
- [templates/invoicing/pdf_templates/invoice_modern.html](templates/invoicing/pdf_templates/invoice_modern.html)
- [templates/invoicing/pdf_templates/invoice_minimal.html](templates/invoicing/pdf_templates/invoice_minimal.html)

### Frontend
- [frontend/src/pages/invoices/InvoiceDetail.jsx](frontend/src/pages/invoices/InvoiceDetail.jsx) - Ajout bouton Imprimer

## 🎯 Prochaines Étapes (Optionnel)

- [ ] Ajouter plus de templates (Professional, Colorful, etc.)
- [ ] Personnalisation avancée des couleurs par organisation
- [ ] Export en différents formats (A4, Letter, A5)
- [ ] Watermark pour les brouillons
- [ ] Multi-langue pour les factures

## 🐛 Dépannage

### Erreur : "WeasyPrint non disponible"
- Vérifier l'installation de GTK3 (Windows) ou Pango (Linux/macOS)
- Réinstaller WeasyPrint : `pip install --force-reinstall WeasyPrint`

### Le QR code n'apparaît pas
- Vérifier que `qrcode` est installé : `pip install qrcode`
- Vérifier les logs backend pour voir si la génération QR échoue

### L'impression ne fonctionne pas
- Vérifier que les popups ne sont pas bloqués par le navigateur
- Essayer dans un navigateur différent
- Utiliser l'option "Aperçu" puis imprimer manuellement (Ctrl+P)

## 📞 Support

Pour toute question ou problème, consulter :
- Documentation WeasyPrint : https://doc.courtbouillon.org/weasyprint/
- Documentation qrcode : https://github.com/lincolnloop/python-qrcode

---

**Version:** 1.0
**Date:** 18 Novembre 2025
**Auteur:** ProcureGenius Team
