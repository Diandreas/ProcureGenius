# 📄 Guide d'utilisation de django-weasyprint

## 🎯 Vue d'ensemble

Nous utilisons **django-weasyprint** pour générer des PDF de factures de qualité professionnelle avec :
- ✅ Support CSS3 complet
- ✅ QR code de vérification
- ✅ 3 templates (Classic, Modern, Minimal)
- ✅ Logo de l'organisation
- ✅ Design responsive

## 📦 Installation

### 1. Dépendances Python (Déjà installées)

```bash
pip install WeasyPrint==62.3 django-weasyprint==2.3.0 qrcode==7.4.2
```

### 2. **IMPORTANT : Installer GTK3 Runtime (Windows)**

WeasyPrint nécessite GTK3 pour fonctionner sur Windows.

**Étapes d'installation :**

1. **Télécharger GTK3 Runtime :**
   - Aller sur : https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases
   - Télécharger la dernière version (ex: `gtk3-runtime-x.x.x-x.exe`)

2. **Installer GTK3 :**
   - Lancer l'installateur téléchargé
   - Suivre les instructions
   - Redémarrer le terminal/IDE après installation

3. **Vérifier l'installation :**
   ```bash
   py -c "from weasyprint import HTML; print('WeasyPrint fonctionne!')"
   ```

   Si pas d'erreur → GTK3 est bien installé ! ✅

## 🚀 Utilisation

### Vue Django avec django-weasyprint

Nous avons créé une vue class-based qui utilise `WeasyTemplateResponseMixin` :

**Fichier :** [apps/invoicing/views_pdf.py](apps/invoicing/views_pdf.py)

```python
from django_weasyprint import WeasyTemplateResponseMixin
from django.views.generic import DetailView

class InvoicePDFView(WeasyTemplateResponseMixin, DetailView):
    model = Invoice
    template_name = 'invoicing/pdf_templates/invoice_modern.html'
    pdf_attachment = False  # Afficher inline
```

### URLs configurées

**Accéder aux PDF :**

```
# URL de base
/invoices/<uuid>/pdf/

# Avec template spécifique
/invoices/<uuid>/pdf/?template=classic
/invoices/<uuid>/pdf/?template=modern
/invoices/<uuid>/pdf/?template=minimal
```

### Exemple d'utilisation

1. **Dans le navigateur :**
   ```
   http://localhost:8000/invoices/123e4567-e89b-12d3-a456-426614174000/pdf/?template=modern
   ```

2. **Dans le code Python :**
   ```python
   from django.urls import reverse

   invoice_id = "123e4567-e89b-12d3-a456-426614174000"
   pdf_url = reverse('invoicing:invoice_pdf', kwargs={'pk': invoice_id})
   pdf_url += '?template=modern'
   ```

3. **Dans le frontend React :**
   ```javascript
   const pdfUrl = `/api/invoices/${invoiceId}/pdf/?template=${templateType}`;
   window.open(pdfUrl, '_blank');
   ```

## 🎨 Templates disponibles

### 1. Classic ([invoice_classic.html](templates/invoicing/pdf_templates/invoice_classic.html))
- Design corporatif professionnel
- Couleur principale : Bleu (#2563eb)
- En-tête avec barre bleue
- QR code avec bordure bleue

### 2. Modern ([invoice_modern.html](templates/invoicing/pdf_templates/invoice_modern.html))
- Design moderne avec dégradés
- Couleurs : Violet/Rose (#8b5cf6)
- Header avec logo et gradient
- QR code avec bordure violette

### 3. Minimal ([invoice_minimal.html](templates/invoicing/pdf_templates/invoice_minimal.html))
- Design épuré et minimaliste
- Couleur : Noir et blanc
- Typographie soignée
- QR code simple

## 🔧 Personnalisation

### Modifier les options PDF

Dans [views_pdf.py](apps/invoicing/views_pdf.py:22-25) :

```python
class InvoicePDFView(WeasyTemplateResponseMixin, DetailView):
    # Options PDF
    pdf_attachment = False  # True = téléchargement, False = affichage inline
    pdf_options = {
        'pdf_variant': 'pdf/a-3b',  # Format PDF/A pour archivage
        'uncompressed_pdf': False,   # Compression
        'optimize_size': ('fonts', 'images'),  # Optimisation
    }
```

### Options PDF disponibles

Selon la documentation WeasyPrint :

```python
pdf_options = {
    # Variant PDF
    'pdf_variant': 'pdf/a-3b',  # pdf/a-1b, pdf/a-2b, pdf/a-3b, pdf/ua-1

    # Optimisation
    'optimize_size': ('fonts', 'images'),
    'uncompressed_pdf': False,

    # Métadonnées
    'pdf_identifier': 'unique-id',
    'pdf_version': '1.7',

    # Formulaires
    'pdf_forms': True,
}
```

### Personnaliser le nom du fichier

```python
def get_pdf_filename(self):
    """Génère le nom du fichier PDF"""
    invoice = self.get_object()
    return f'facture-{invoice.invoice_number}-{invoice.client.name}.pdf'
```

## 🔐 QR Code

Le QR code contient les informations suivantes (JSON) :

```json
{
    "invoice_id": "123e4567-e89b-12d3-a456-426614174000",
    "invoice_number": "FAC2025100013",
    "total": 46666650.00,
    "date": "2025-11-18T10:30:00",
    "status": "paid"
}
```

### Scanner le QR code

Le QR code peut être scanné avec :
- Une application mobile de scan QR
- Un lecteur QR code en ligne
- Un module Python (pyzbar, opencv)

## 📝 Exemple complet

### 1. Créer une vue personnalisée

```python
from django_weasyprint import WeasyTemplateResponseMixin
from django.views.generic import DetailView

class CustomInvoicePDF(WeasyTemplateResponseMixin, DetailView):
    model = Invoice
    template_name = 'invoicing/pdf_templates/invoice_custom.html'

    # Téléchargement au lieu d'affichage
    pdf_attachment = True

    def get_pdf_filename(self):
        invoice = self.get_object()
        client_name = invoice.client.name.replace(' ', '-')
        return f'{client_name}-{invoice.invoice_number}.pdf'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Ajouter des données personnalisées
        context['custom_message'] = "Merci pour votre confiance !"
        return context
```

### 2. Ajouter l'URL

```python
# urls.py
path('<uuid:pk>/pdf/custom/', CustomInvoicePDF.as_view(), name='invoice_pdf_custom'),
```

### 3. Créer un template personnalisé

```html
<!-- templates/invoicing/pdf_templates/invoice_custom.html -->
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        .header { background: #ff6b6b; color: white; padding: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Facture {{ invoice.invoice_number }}</h1>
    </div>

    <p>{{ custom_message }}</p>

    <!-- QR Code -->
    {% if qr_code_base64 %}
    <img src="{{ qr_code_base64 }}" alt="QR Code" />
    {% endif %}
</body>
</html>
```

## 🧪 Tests

### Test manuel

1. **Démarrer le serveur :**
   ```bash
   py manage.py runserver
   ```

2. **Accéder à une facture :**
   ```
   http://localhost:8000/invoices/<uuid>/pdf/?template=modern
   ```

3. **Vérifier :**
   - Le PDF s'affiche dans le navigateur
   - Le QR code est visible en bas de page
   - Le logo de l'organisation est affiché
   - Les informations sont correctes

### Test automatisé

```python
# tests/test_pdf.py
from django.test import TestCase
from django.urls import reverse
from apps.invoicing.models import Invoice

class InvoicePDFTest(TestCase):
    def test_pdf_generation(self):
        invoice = Invoice.objects.first()
        url = reverse('invoicing:invoice_pdf', kwargs={'pk': invoice.id})

        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertTrue(len(response.content) > 0)
```

## 🐛 Dépannage

### Erreur : "cannot load library 'gobject-2.0-0'"

**Problème :** GTK3 n'est pas installé ou pas dans le PATH

**Solution :**
1. Installer GTK3 Runtime (voir section Installation ci-dessus)
2. Redémarrer le terminal/IDE
3. Vérifier le PATH système

### Erreur : "WeasyPrint could not import some external libraries"

**Solution :**
```bash
# Réinstaller WeasyPrint
pip uninstall WeasyPrint
pip install WeasyPrint==62.3

# Vérifier l'installation
py -c "from weasyprint import HTML; print('OK')"
```

### Le QR code n'apparaît pas

**Solution :**
1. Vérifier que qrcode est installé : `pip install qrcode==7.4.2`
2. Vérifier les logs backend pour voir si la génération QR échoue
3. Vérifier que `qr_code_base64` est dans le contexte du template

### Le logo ne s'affiche pas

**Solution :**
1. Vérifier que le logo existe dans `MEDIA_ROOT`
2. Vérifier les permissions du fichier
3. Vérifier que le logo est en base64 dans le template

## 📚 Ressources

- **Documentation django-weasyprint :** https://github.com/fdemmer/django-weasyprint
- **Documentation WeasyPrint :** https://doc.courtbouillon.org/weasyprint/
- **Installation WeasyPrint :** https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#installation
- **GTK3 Runtime :** https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer

## 🎯 Prochaines étapes

- [ ] Installer GTK3 Runtime sur Windows
- [ ] Tester la génération de PDF avec les 3 templates
- [ ] Personnaliser les templates selon vos besoins
- [ ] Ajouter des watermarks pour les brouillons
- [ ] Implémenter la signature électronique (optionnel)

---

**Version :** 1.0
**Date :** 18 Novembre 2025
**Auteur :** ProcureGenius Team
