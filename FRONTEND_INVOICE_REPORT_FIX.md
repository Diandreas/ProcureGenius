# Frontend Invoice Report Fix

## Issues Fixed

### 1. Missing Translation Keys ✅

Added the following missing translation keys to both French and English locale files:

#### French (`frontend/src/locales/fr/invoices.json`)
```json
{
  "messages": {
    "reportError": "Erreur lors de la génération du rapport"
  },
  "actions": {
    "generateReport": "Rapport PDF"
  },
  "report": {
    "title": "Générer un Rapport de Factures",
    "itemLabel": "facture",
    "itemsLabel": "factures"
  }
}
```

#### English (`frontend/src/locales/en/invoices.json`)
```json
{
  "messages": {
    "reportError": "Error generating report"
  },
  "actions": {
    "generateReport": "PDF Report"
  },
  "report": {
    "title": "Generate Invoices Report",
    "itemLabel": "invoice",
    "itemsLabel": "invoices"
  }
}
```

### 2. Backend 500 Error - Debugging Steps

The 500 Internal Server Error is coming from the backend endpoint:
```
POST http://localhost:8000/api/v1/invoices/bulk-pdf-report/
```

#### Backend Code Location
- **Endpoint**: `apps/api/views.py` - Line 1433-1572
- **Report Generator**: `apps/api/services/report_generator_weasy.py` - Line 572-679
- **Template**: `templates/reports/pdf/invoices_report.html`

#### Possible Causes

1. **Missing WeasyPrint Library**
   - The backend uses WeasyPrint to generate PDFs
   - Check if WeasyPrint is installed: `pip list | grep -i weasy`
   - Install if missing: `pip install weasyprint`

2. **Missing GTK3 Runtime (Windows)**
   - WeasyPrint requires GTK3 runtime on Windows
   - See `INSTALL_GTK3_WINDOWS.md` in the project root

3. **Template Rendering Error**
   - The template might be missing or have syntax errors
   - Check Django template path configuration

4. **Database Query Error**
   - The queryset might be failing due to missing relations
   - Check if `Invoice` model has `client` and `created_by` foreign keys

#### How to Debug

1. **Check Backend Logs**
   ```bash
   # Look for detailed error messages in the Django console
   # The backend has extensive error logging with traceback
   ```

2. **Test the Endpoint Manually**
   ```bash
   curl -X POST http://localhost:8000/api/v1/invoices/bulk-pdf-report/ \
     -H "Authorization: Token YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

3. **Check Django Shell**
   ```python
   python manage.py shell
   
   from apps.api.models import Invoice
   from apps.api.services.report_generator_weasy import generate_invoices_report_pdf
   
   # Test if invoices exist
   invoices = Invoice.objects.all()[:5]
   print(f"Invoices count: {invoices.count()}")
   
   # Test report generation
   try:
       pdf_buffer = generate_invoices_report_pdf(invoices, None, None, None)
       print("PDF generated successfully!")
   except Exception as e:
       print(f"Error: {e}")
       import traceback
       traceback.print_exc()
   ```

4. **Check WeasyPrint Installation**
   ```python
   python manage.py shell
   
   try:
       from weasyprint import HTML
       print("WeasyPrint is installed!")
   except ImportError as e:
       print(f"WeasyPrint not available: {e}")
   ```

#### Backend Error Handling

The backend already has comprehensive error handling:
- Line 1559-1565: Handles ImportError (WeasyPrint not available)
- Line 1566-1572: Handles general exceptions with traceback

The error response will include:
```json
{
  "error": "Error message",
  "traceback": "Full Python traceback"
}
```

Check the browser console or network tab for the detailed error response.

## Frontend Changes Made

### Files Modified
1. `frontend/src/locales/fr/invoices.json` - Added missing French translations
2. `frontend/src/locales/en/invoices.json` - Added missing English translations

### Files Reviewed (No Changes Needed)
1. `frontend/src/pages/invoices/Invoices.jsx` - Already correctly using translation keys
2. `frontend/src/components/common/ReportGenerationDialog.jsx` - Working correctly
3. `frontend/src/services/pdfReportService.js` - API call is correct

## Testing

After fixing the backend issue, test the following:

1. **Open Invoices Page**
   - Navigate to `/invoices`
   - Verify no translation key errors in console

2. **Generate Report**
   - Click "Rapport PDF" button
   - Select date range (optional)
   - Select specific invoices (optional)
   - Click "Générer le Rapport"
   - Should generate and download PDF

3. **Verify Translations**
   - All labels should be in French (or English if language is set to EN)
   - No "missingKey" errors in console

## Next Steps

1. **Start Backend Server** (if not running)
   ```bash
   python manage.py runserver
   ```

2. **Check Backend Console** for error messages when clicking "Générer le Rapport"

3. **Install Missing Dependencies** if needed:
   ```bash
   pip install weasyprint
   # On Windows, also install GTK3 runtime
   ```

4. **Verify Database** has invoices:
   ```bash
   python manage.py shell -c "from apps.api.models import Invoice; print(Invoice.objects.count())"
   ```

## Summary

✅ **Fixed**: Missing i18n translation keys for invoice reports
✅ **Fixed**: Missing custom template filter (`div`) causing template rendering errors
✅ **Fixed**: Template not loading custom filters
✅ **Improved**: Pre-calculate percentages in backend instead of complex template logic

## All Changes Made

### Frontend
1. `frontend/src/locales/fr/invoices.json` - Added missing French translations
2. `frontend/src/locales/en/invoices.json` - Added missing English translations

### Backend
1. `apps/invoicing/templatetags/invoice_filters.py` - Added missing `div` filter
2. `templates/reports/pdf/invoices_report.html` - Added `{% load invoice_filters %}` and simplified percentage display
3. `apps/api/services/report_generator_weasy.py` - Pre-calculate percentages in backend

The application should now work correctly. Test by:
1. Starting the backend server: `python manage.py runserver`
2. Opening the invoices page in the frontend
3. Clicking "Rapport PDF" button
4. Generating a report

