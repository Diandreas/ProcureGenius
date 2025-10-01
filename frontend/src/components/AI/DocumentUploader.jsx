import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  LinearProgress,
  Alert,
  IconButton,
  Chip,
} from '@mui/material';
import {
  CloudUpload,
  Close,
  Description,
  CheckCircle,
} from '@mui/icons-material';

const DocumentUploader = ({ onUploadSuccess, onUploadError }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Vérifier le type de fichier
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setUploadResult({
          success: false,
          message: 'Type de fichier non supporté. Utilisez PNG, JPG ou PDF.',
        });
        return;
      }

      // Vérifier la taille (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadResult({
          success: false,
          message: 'Fichier trop volumineux. Taille maximale: 10MB.',
        });
        return;
      }

      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('document', selectedFile);

    try {
      // Simulation de progression
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/ai-assistant/analyze-document/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (response.ok) {
        setUploadResult({
          success: true,
          message: 'Document analysé avec succès',
          data: result,
        });
        if (onUploadSuccess) {
          onUploadSuccess(result);
        }
      } else {
        throw new Error(result.error || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: error.message,
      });
      if (onUploadError) {
        onUploadError(error);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.pdf"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {!selectedFile ? (
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            textAlign: 'center',
            cursor: 'pointer',
            borderStyle: 'dashed',
            borderWidth: 2,
            bgcolor: 'grey.50',
            '&:hover': {
              bgcolor: 'grey.100',
            },
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="body1" gutterBottom>
            Cliquez pour sélectionner un document
          </Typography>
          <Typography variant="caption" color="text.secondary">
            PNG, JPG, PDF (max 10MB)
          </Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Description color="primary" />
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              {selectedFile.name}
            </Typography>
            <Chip label={`${(selectedFile.size / 1024).toFixed(1)} KB`} size="small" />
            {!uploading && (
              <IconButton size="small" onClick={handleClear}>
                <Close />
              </IconButton>
            )}
          </Box>

          {uploading && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                Téléchargement et analyse en cours... {uploadProgress}%
              </Typography>
            </Box>
          )}

          {!uploading && !uploadResult && (
            <Button
              variant="contained"
              fullWidth
              startIcon={<CloudUpload />}
              onClick={handleUpload}
            >
              Analyser le document
            </Button>
          )}

          {uploadResult && (
            <Alert
              severity={uploadResult.success ? 'success' : 'error'}
              icon={uploadResult.success ? <CheckCircle /> : undefined}
              sx={{ mt: 1 }}
            >
              {uploadResult.message}
            </Alert>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default DocumentUploader;
