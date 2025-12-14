import React, { useState } from 'react';
import { Box, Paper, Typography, Button, CircularProgress, Alert } from '@mui/material';
import { CloudUpload, CheckCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SmartInvoiceUpload = () => {
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
      setError('Veuillez glisser un fichier PDF ou image (PNG, JPG)');
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
      // APPEL API EXISTANT !
      const response = await axios.post('/api/ai-assistant/analyze-document/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

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
        setError('Erreur lors de l\'analyse du document');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || 'Erreur lors de l\'analyse du document');
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
              Analyse en cours...
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              L'IA extrait toutes les informations
            </Typography>
          </Box>
        ) : extractedData ? (
          <Box>
            <CheckCircle color="success" sx={{ fontSize: 60 }} />
            <Typography variant="h6" mt={2} color="success.main">
              Analyse terminée !
            </Typography>
            <Typography variant="body2" mt={1}>
              Facture: {extractedData.invoice_number || 'N/A'}
            </Typography>
            <Typography variant="body2">
              Montant: {extractedData.total || 0}€
            </Typography>
            <Typography variant="caption" display="block" mt={2} color="text.secondary">
              Redirection vers le formulaire pré-rempli...
            </Typography>
          </Box>
        ) : (
          <Box>
            <CloudUpload sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight={600}>
              Glissez votre facture PDF ici
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              L'IA analysera et pré-remplira automatiquement le formulaire
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
                Ou cliquez pour sélectionner
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
            Données extraites
          </Typography>
          <Box display="flex" flexDirection="column" gap={1}>
            <Typography variant="body2">
              <strong>Client:</strong> {extractedData.client_name || 'N/A'}
            </Typography>
            <Typography variant="body2">
              <strong>N° Facture:</strong> {extractedData.invoice_number || 'N/A'}
            </Typography>
            <Typography variant="body2">
              <strong>Date:</strong> {extractedData.date || 'N/A'}
            </Typography>
            <Typography variant="body2">
              <strong>Total:</strong> {extractedData.total || 0}€
            </Typography>
            <Typography variant="body2">
              <strong>Articles:</strong> {extractedData.items?.length || 0}
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default SmartInvoiceUpload;
