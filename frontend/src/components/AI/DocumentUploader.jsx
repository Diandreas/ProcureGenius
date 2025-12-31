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
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

const DocumentUploader = ({ onUploadSuccess, onUploadError }) => {
  const { t } = useTranslation(['aiChat', 'common']);
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
          message: t('aiChat:documentUploader.unsupportedFileType'),
        });
        return;
      }

      // Vérifier la taille (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadResult({
          success: false,
          message: t('aiChat:documentUploader.fileTooLarge'),
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

      const response = await api.post('/ai-assistant/analyze-document/', formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = response.data;
      setUploadResult({
        success: true,
        message: t('aiChat:documentUploader.analyzeSuccess'),
        data: result,
      });
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: error.response?.data?.error || error.message || t('aiChat:documentUploader.uploadError'),
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
            {t('aiChat:documentUploader.clickToSelect')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('aiChat:documentUploader.allowedFormats')}
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
                {t('aiChat:documentUploader.uploadingProgress', { progress: uploadProgress })}
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
              {t('aiChat:documentUploader.analyzeDocument')}
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
