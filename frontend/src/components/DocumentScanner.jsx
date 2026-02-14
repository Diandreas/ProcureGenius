import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Checkbox, Paper, IconButton, Tabs,  } from '@mui/material';
import { SafeTab } from '../components/safe';
import {
  CameraAlt,
  CloudUpload,
  Close,
  DocumentScanner as ScanIcon,
  CheckCircle,
} from '@mui/icons-material';
import Webcam from 'react-webcam';
import { useDropzone } from 'react-dropzone';
import { aiChatAPI } from '../services/api';
import { useSnackbar } from 'notistack';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`scanner-tabpanel-${index}`}
      aria-labelledby={`scanner-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function DocumentScanner({ open, onClose, onSuccess }) {
  const { enqueueSnackbar } = useSnackbar();
  const webcamRef = useRef(null);
  
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [documentType, setDocumentType] = useState('invoice');
  const [autoCreate, setAutoCreate] = useState(true);
  const [extractedData, setExtractedData] = useState(null);
  const [ocrText, setOcrText] = useState('');

  const handleCapture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
  }, [webcamRef]);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.tiff']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const processDocument = async () => {
    if (!capturedImage) {
      enqueueSnackbar('Veuillez capturer ou télécharger une image', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      // Convertir base64 en blob pour l'upload
      const base64Data = capturedImage.split(',')[1];
      const blob = atob(base64Data);
      const arrayBuffer = new ArrayBuffer(blob.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < blob.length; i++) {
        uint8Array[i] = blob.charCodeAt(i);
      }
      
      const file = new File([uint8Array], 'document.png', { type: 'image/png' });
      
      // Créer FormData pour l'upload
      const formData = new FormData();
      formData.append('image', file);
      formData.append('document_type', documentType);
      formData.append('auto_create', autoCreate);

      const response = await aiChatAPI.analyzeDocument(formData);
      
      if (response.data.success) {
        setExtractedData(response.data.ai_extracted_data || response.data.extracted_data);
        setOcrText(response.data.ocr_text);
        
        if (response.data.creation_result?.success) {
          enqueueSnackbar(response.data.creation_result.message, { variant: 'success' });
          if (onSuccess) {
            onSuccess(response.data.creation_result);
          }
        }
      } else {
        enqueueSnackbar(response.data.error || 'Erreur lors de l\'analyse', { variant: 'error' });
      }
    } catch (error) {
      console.error('Document processing error:', error);
      enqueueSnackbar('Erreur lors du traitement du document', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setExtractedData(null);
    setOcrText('');
  };

  const handleClose = () => {
    resetScanner();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Scanner un document</Typography>
          <IconButton onClick={handleClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Type de document</InputLabel>
            <Select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              label="Type de document"
            >
              <MenuItem value="invoice">Facture</MenuItem>
              <MenuItem value="purchase_order">Bon de commande</MenuItem>
              <MenuItem value="supplier_list">Liste de fournisseurs</MenuItem>
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Checkbox
                checked={autoCreate}
                onChange={(e) => setAutoCreate(e.target.checked)}
              />
            }
            label="Créer automatiquement"
          />
        </Box>

        {!capturedImage && !extractedData && (
          <>
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
              <SafeTab label="Caméra" icon={<CameraAlt />} />
              <SafeTab label="Télécharger" icon={<CloudUpload />} />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              <Box sx={{ textAlign: 'center' }}>
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/png"
                  width="100%"
                  videoConstraints={{
                    facingMode: 'environment',
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleCapture}
                  startIcon={<CameraAlt />}
                  sx={{ mt: 2 }}
                >
                  Capturer
                </Button>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box
                {...getRootProps()}
                sx={{
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'grey.300',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                }}
              >
                <input {...getInputProps()} />
                <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {isDragActive
                    ? 'Déposez le fichier ici'
                    : 'Glissez-déposez un fichier ici ou cliquez pour sélectionner'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Formats supportés : JPEG, PNG, GIF, BMP, TIFF (max 10MB)
                </Typography>
              </Box>
            </TabPanel>
          </>
        )}

        {capturedImage && !extractedData && (
          <Box sx={{ textAlign: 'center' }}>
            <img
              src={capturedImage}
              alt="Document capturé"
              style={{ maxWidth: '100%', maxHeight: 400 }}
            />
            <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button onClick={resetScanner} disabled={loading}>
                Reprendre
              </Button>
              <Button
                variant="contained"
                onClick={processDocument}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <ScanIcon />}
              >
                {loading ? 'Analyse en cours...' : 'Analyser'}
              </Button>
            </Box>
          </Box>
        )}

        {extractedData && (
          <Box>
            <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
              Document analysé avec succès !
            </Alert>
            
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Données extraites
              </Typography>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                {JSON.stringify(extractedData, null, 2)}
              </pre>
            </Paper>
            
            {ocrText && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Texte extrait (OCR)
                </Typography>
                <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                  {ocrText}
                </Typography>
              </Paper>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Fermer</Button>
        {extractedData && (
          <Button variant="contained" onClick={resetScanner}>
            Scanner un autre document
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default DocumentScanner;