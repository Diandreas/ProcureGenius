import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  useTheme,
  alpha,
  Divider,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CloudUpload,
  DocumentScanner,
  Receipt,
  ShoppingCart,
  Business,
  ArrowBack,
  CheckCircle,
  Description,
  PictureAsPdf,
  Image,
  Close,
  Inventory,
  BarChart,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { aiChatAPI } from '../../services/api';
import LoadingState from '../../components/LoadingState';
import Mascot from '../../components/Mascot';

const DOCUMENT_TYPES = [
  {
    id: 'expense',
    label: 'Reçu / dépense',
    icon: <Receipt sx={{ fontSize: 32 }} />,
    description: "Ticket, reçu ou facture d'un fournisseur (loyer, électricité, carburant…) : enregistré en dépense",
    color: '#ef4444'
  },
  {
    id: 'invoice',
    label: 'Facture client',
    icon: <Receipt sx={{ fontSize: 32 }} />,
    description: 'Facture que vous avez émise (vente)',
    color: '#10b981'
  },
  {
    id: 'purchase_order',
    label: 'Bon de commande',
    icon: <ShoppingCart sx={{ fontSize: 32 }} />,
    description: 'Bon de commande ou devis',
    color: '#3b82f6'
  },
  {
    id: 'supplier_list',
    label: 'Registre fournisseurs',
    icon: <Business sx={{ fontSize: 32 }} />,
    description: 'Liste ou registre de fournisseurs',
    color: '#f59e0b'
  },
  {
    id: 'product_catalog',
    label: 'Catalogue produits',
    icon: <Inventory sx={{ fontSize: 32 }} />,
    description: 'Catalogue ou liste de produits',
    color: '#8b5cf6'
  },
  {
    id: 'contract',
    label: 'Contrat',
    icon: <Description sx={{ fontSize: 32 }} />,
    description: 'Contrat ou accord commercial',
    color: '#ef4444'
  },
  {
    id: 'financial_report',
    label: 'Rapport financier',
    icon: <BarChart sx={{ fontSize: 32 }} />,
    description: 'Bilan, compte de résultat, rapport',
    color: '#06b6d4'
  },
  {
    id: 'mixed_document',
    label: 'Document complexe',
    icon: <PictureAsPdf sx={{ fontSize: 32 }} />,
    description: 'Document multi-pages avec données mixtes',
    color: '#84cc16'
  },
];

function DocumentImport() {
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation(['aiChat', 'common']);
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const fileInputRef = useRef(null);

  const [searchParams] = useSearchParams();
  // ?type=expense (depuis la page Dépenses) présélectionne le type de document
  const [selectedType, setSelectedType] = useState(
    DOCUMENT_TYPES.some((t) => t.id === searchParams.get('type')) ? searchParams.get('type') : null
  );
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Vérifier le type de fichier
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        enqueueSnackbar(t('aiChat:documentImport.unsupportedFormat'), { variant: 'error' });
        return;
      }

      // Vérifier la taille (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        enqueueSnackbar(t('aiChat:documentImport.fileTooLarge'), { variant: 'error' });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect({ target: { files } });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedType) {
      enqueueSnackbar(t('aiChat:documentImport.selectTypeAndFile'), { variant: 'error' });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Simuler la progression
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('document_type', selectedType);
      formData.append('auto_create', 'false'); // Toujours créer un ImportReview

      const response = await aiChatAPI.analyzeDocument(formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.data.success) {
        setAnalyzing(true);

        // Attendre un peu pour l'effet visuel
        setTimeout(() => {
          enqueueSnackbar(t('aiChat:documentImport.analyzeSuccess'), {
            variant: 'success',
            autoHideDuration: 5000
          });
          navigate('/ai-chat/import-reviews');
        }, 1000);
      } else {
        throw new Error(response.data.error || 'Erreur lors de l\'analyse');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      enqueueSnackbar(t('aiChat:documentImport.uploadError'), { variant: 'error' });
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (file) => {
    if (file.type === 'application/pdf') {
      return <PictureAsPdf sx={{ fontSize: 24 }} />;
    }
    return <Image sx={{ fontSize: 24 }} />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return `0 ${t('aiChat:documentImport.fileSizeUnits.bytes')}`;
    const k = 1024;
    const sizes = [
      t('aiChat:documentImport.fileSizeUnits.bytes'),
      t('aiChat:documentImport.fileSizeUnits.kb'),
      t('aiChat:documentImport.fileSizeUnits.mb'),
      t('aiChat:documentImport.fileSizeUnits.gb'),
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header compact */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, pt: 1 }}>
        <IconButton onClick={() => navigate('/ai-chat')} size="small" sx={{ color: 'text.secondary' }}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
            {t('aiChat:documentImport.title')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('aiChat:documentImport.subtitle')}
          </Typography>
        </Box>
      </Box>

      {/* Type de document - Compact horizontal */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Description sx={{ fontSize: 18 }} />
          {t('aiChat:documentImport.documentType')}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {DOCUMENT_TYPES.map((type) => (
            <Chip
              key={type.id}
              icon={React.cloneElement(type.icon, { sx: { fontSize: 16 } })}
              label={t(`aiChat:documentImport.types.${type.id}`)}
              onClick={() => setSelectedType(type.id)}
              variant={selectedType === type.id ? "filled" : "outlined"}
              sx={{
                borderColor: type.color,
                color: selectedType === type.id ? 'white' : type.color,
                bgcolor: selectedType === type.id ? type.color : 'transparent',
                '&:hover': {
                  bgcolor: selectedType === type.id ? alpha(type.color, 0.8) : alpha(type.color, 0.1),
                },
                fontSize: '0.8rem',
                height: 32,
              }}
            />
          ))}
        </Box>
      </Paper>

      {/* Upload zone - Drag & Drop */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudUpload sx={{ fontSize: 18 }} />
          {t('aiChat:documentImport.fileToAnalyze')}
        </Typography>

        {selectedFile ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1,
                border: 1,
                borderColor: 'success.main',
                borderRadius: 2,
                bgcolor: alpha(theme.palette.success.main, 0.05)
              }}
            >
              {getFileIcon(selectedFile)}
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8rem' }}>
                  {selectedFile.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(selectedFile.size)}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => {
                  setSelectedFile(null);
                  fileInputRef.current?.value && (fileInputRef.current.value = '');
                }}
              >
                <Close sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>
        ) : (
          <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              border: 2,
              borderStyle: 'dashed',
              borderColor: dragOver ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              bgcolor: dragOver ? alpha(theme.palette.primary.main, 0.02) : 'transparent',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, 0.02),
              }
            }}
          >
            <CloudUpload sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              {t('aiChat:documentImport.dropHere')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('aiChat:documentImport.clickToSelect')}
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </Box>
        )}
      </Paper>

      {/* Analyse - Compact */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        {(uploading || analyzing) && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                {analyzing ? t('aiChat:documentImport.analyzingAI') : t('aiChat:documentImport.uploading')}
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 4, borderRadius: 2 }} />
          </Box>
        )}

        <Alert severity="info" sx={{ mb: 2, py: 1 }}>
          <Typography variant="caption">
            {t('aiChat:documentImport.info')}
          </Typography>
        </Alert>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/ai-chat')}
            disabled={uploading || analyzing}
            sx={{ flex: 1 }}
          >
            {t('common:buttons.back')}
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<DocumentScanner />}
            onClick={handleUpload}
            disabled={!selectedFile || !selectedType || uploading || analyzing}
            sx={{ flex: 2 }}
          >
            {analyzing ? t('aiChat:documentImport.analyzingShort') : t('aiChat:documentImport.analyze')}
          </Button>
        </Box>
      </Paper>

      {/* Loading overlay */}
      {(uploading || analyzing) && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <Paper sx={{ p: 4, textAlign: 'center', minWidth: 300, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Mascot
                pose={analyzing ? 'thinking' : 'happy'}
                animation={analyzing ? 'pulse' : 'bounce'}
                size={80}
              />
            </Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {analyzing ? t('aiChat:documentImport.analyzingAI') : t('aiChat:documentImport.uploading')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {analyzing
                ? t('aiChat:documentImport.extracting')
                : t('aiChat:documentImport.preparing')}
            </Typography>
            {uploading && (
              <Box sx={{ mt: 2, width: '100%' }}>
                <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 6, borderRadius: 3 }} />
              </Box>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
}

export default DocumentImport;

