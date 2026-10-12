import React, { useState } from 'react';
import { Box, Paper, Typography, Button, CircularProgress, Alert } from '@mui/material';
import { CloudUpload, CheckCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { aiChatAPI } from '../services/api';
import useCurrency from '../hooks/useCurrency';

const SmartInvoiceUpload = () => {
  const { t } = useTranslation(['invoices', 'common']);
  const { format: fmt } = useCurrency();
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file || !file.name.match(/\.(pdf|png|jpg|jpeg)$/i)) {
      setError(t('invoices:smartUpload.invalidFile'));
      return;
    }

    await processFile(file);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) await processFile(file);
  };

  const processFile = async (file) => {
    setAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('document_type', 'invoice');
    formData.append('auto_create', 'true');

    try {
      // APPEL API CORRIGÉ - Utilise la bonne URL via aiChatAPI
      const response = await aiChatAPI.analyzeDocument(formData);

      if (response.data.success) {
        setExtractedData(response.data.ai_extracted_data);

        // Si création auto réussie
        if (response.data.creation_result?.success) {
          const invoiceId = response.data.creation_result.entity_id;

          // Rediriger vers facture créée après 1.5 secondes
          setTimeout(() => {
            navigate(`/invoices/${invoiceId}/edit`);
          }, 1500);
        }
      } else {
        setError(t('invoices:smartUpload.analysisError'));
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || t('invoices:smartUpload.analysisError'));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Box>
      <Paper
        elevation={dragging ? 8 : 2}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        sx={{
          p: 6,
          textAlign: 'center',
          border: 3,
          borderStyle: 'dashed',
          borderColor: dragging ? 'primary.main' : 'grey.300',
          backgroundColor: dragging ? 'primary.50' : 'white',
          cursor: 'pointer',
          transition: 'all 0.3s',
        }}
      >
        {analyzing ? (
          <Box>
            <CircularProgress size={60} />
            <Typography variant="h6" mt={2}>
              {t('invoices:smartUpload.analyzing')}
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              {t('invoices:smartUpload.extracting')}
            </Typography>
          </Box>
        ) : extractedData ? (
          <Box>
            <CheckCircle color="success" sx={{ fontSize: 60 }} />
            <Typography variant="h6" mt={2} color="success.main">
              {t('invoices:smartUpload.done')}
            </Typography>
            <Typography variant="body2" mt={1}>
              {t('invoices:smartUpload.invoice', { number: extractedData.invoice_number || t('invoices:labels.notAvailable') })}
            </Typography>
            <Typography variant="body2">
              {t('invoices:smartUpload.amount', { amount: fmt(extractedData.total || 0) })}
            </Typography>
            <Typography variant="caption" display="block" mt={2} color="text.secondary">
              {t('invoices:smartUpload.redirecting')}
            </Typography>
          </Box>
        ) : (
          <Box>
            <CloudUpload sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight={600}>
              {t('invoices:smartUpload.dropHere')}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {t('invoices:smartUpload.dropHelp')}
            </Typography>

            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="file-input"
            />
            <label htmlFor="file-input">
              <Button variant="contained" component="span" size="large">
                {t('invoices:smartUpload.clickToSelect')}
              </Button>
            </label>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {extractedData && !analyzing && (
        <Paper elevation={1} sx={{ mt: 3, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('invoices:smartUpload.extractedData')}
          </Typography>
          <Box display="flex" flexDirection="column" gap={1}>
            <Typography variant="body2">
              <strong>{t('invoices:smartUpload.client')}</strong> {extractedData.client_name || t('invoices:labels.notAvailable')}
            </Typography>
            <Typography variant="body2">
              <strong>{t('invoices:smartUpload.invoiceNumber')}</strong> {extractedData.invoice_number || t('invoices:labels.notAvailable')}
            </Typography>
            <Typography variant="body2">
              <strong>{t('invoices:smartUpload.date')}</strong> {extractedData.date || t('invoices:labels.notAvailable')}
            </Typography>
            <Typography variant="body2">
              <strong>{t('invoices:smartUpload.total')}</strong> {fmt(extractedData.total || 0)}
            </Typography>
            <Typography variant="body2">
              <strong>{t('invoices:smartUpload.items')}</strong> {extractedData.items?.length || 0}
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default SmartInvoiceUpload;
