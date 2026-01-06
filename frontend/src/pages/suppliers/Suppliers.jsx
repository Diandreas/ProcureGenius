import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  FormGroup,
  FormControlLabel,
  Checkbox,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Avatar,
  Stack,
  Rating,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Search,
  FilterList,
  Business,
  Email,
  Phone,
  LocationOn,
  Star,
  TrendingUp,
  LocalShipping,
  CheckCircle,
  Block,
  Public,
  StarBorder,
  PictureAsPdf,
  Print,
  Download,
  Receipt,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { suppliersAPI } from '../../services/api';
import { getStatusColor, getStatusLabel, parseRating } from '../../utils/formatters';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { generateSupplierReportPDF, downloadPDF, openPDFInNewTab } from '../../services/pdfReportService';

function Suppliers() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation(['suppliers', 'common']);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState(''); // Nouveau: filtre rapide
  const [showFilters, setShowFilters] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportConfigOpen, setReportConfigOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [reportFilters, setReportFilters] = useState({
    dateStart: '',
    dateEnd: '',
    selectedSuppliers: [],
  });

  // Tous les hooks AVANT tout return conditionnel
  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await suppliersAPI.list();
      setSuppliers(response.data.results || response.data);
    } catch (error) {
      enqueueSnackbar(t('suppliers:messages.loadingError'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Générer automatiquement le PDF quand le dialogue s'ouvre
  useEffect(() => {
    if (pdfDialogOpen && suppliers.length > 0 && !generatedPdfBlob && !generatingPdf) {
      const generatePDF = async () => {
        setGeneratingPdf(true);
        try {
          // Générer un PDF pour le premier fournisseur (ou créer un PDF groupé si endpoint disponible)
          const pdfBlob = await generateSupplierReportPDF(suppliers[0]);
          setGeneratedPdfBlob(pdfBlob);
        } catch (error) {
          console.error('Error generating PDF:', error);
          enqueueSnackbar(t('suppliers:messages.reportError', 'Erreur lors de la génération du rapport'), {
            variant: 'error',
          });
          setPdfDialogOpen(false);
        } finally {
          setGeneratingPdf(false);
        }
      };
      generatePDF();
    }
  }, [pdfDialogOpen, suppliers, generatedPdfBlob, generatingPdf, enqueueSnackbar, t]);

  const handleGenerateBulkReport = useCallback(() => {
    const filtered = suppliers.filter(supplier => {
      const matchesSearch = !searchTerm ||
        supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = !statusFilter || supplier.status === statusFilter;

      const matchesQuick = !quickFilter || (() => {
        if (quickFilter === 'active') return supplier.status === 'active';
        if (quickFilter === 'inactive') return supplier.status === 'inactive';
        if (quickFilter === 'local') return supplier.is_local;
        if (quickFilter === 'international') return !supplier.is_local;
        if (quickFilter === 'top_rated') return parseRating(supplier.rating) >= 4;
        return true;
      })();

      return matchesSearch && matchesStatus && matchesQuick;
    });

    if (filtered.length === 0) {
      enqueueSnackbar(t('suppliers:messages.noSuppliersSelected', 'Aucun fournisseur à générer'), {
        variant: 'warning',
      });
      return;
    }
    setGeneratedPdfBlob(null);
    setPdfDialogOpen(true);
  }, [suppliers, searchTerm, statusFilter, quickFilter, enqueueSnackbar, t]);

  // Enregistrer la fonction de rapport dans la top nav bar
  useEffect(() => {
    // Cette fonction sera appelée par le bouton "Rapport" dans la top nav
    window.handleSupplierReport = handleGenerateBulkReport;
    return () => {
      delete window.handleSupplierReport;
    };
  }, [handleGenerateBulkReport]);

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = !searchTerm ||
      supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || supplier.status === statusFilter;

    // Nouveau: filtre rapide
    const matchesQuick = !quickFilter || (() => {
      if (quickFilter === 'active') return supplier.status === 'active';
      if (quickFilter === 'inactive') return supplier.status === 'inactive';
      if (quickFilter === 'local') return supplier.is_local;
      if (quickFilter === 'international') return !supplier.is_local;
      if (quickFilter === 'top_rated') return parseRating(supplier.rating) >= 4;
      return true;
    })();

    return matchesSearch && matchesStatus && matchesQuick;
  });

  // Statistiques
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.status === 'active').length;
  const inactiveSuppliers = suppliers.filter(s => s.status === 'inactive').length;
  const localSuppliers = suppliers.filter(s => s.is_local).length;
  const internationalSuppliers = suppliers.filter(s => !s.is_local).length;
  const topRatedSuppliers = suppliers.filter(s => parseRating(s.rating) >= 4).length;

  const handleQuickFilterClick = (filterValue) => {
    if (quickFilter === filterValue) {
      setQuickFilter('');
    } else {
      setQuickFilter(filterValue);
    }
  };

  const SupplierCard = ({ supplier }) => (
    <Card
      onClick={() => navigate(`/suppliers/${supplier.id}`)}
      sx={{
        cursor: 'pointer',
        height: '100%',
        borderRadius: 3,
        background: theme => supplier.status === 'active'
          ? `linear-gradient(145deg,
              ${alpha(theme.palette.background.paper, 0.95)} 0%,
              ${alpha(theme.palette.primary.main, 0.03)} 50%,
              ${alpha(theme.palette.background.paper, 0.95)} 100%)`
          : `linear-gradient(145deg,
              ${alpha(theme.palette.background.paper, 0.9)} 0%,
              ${alpha(theme.palette.grey[500], 0.05)} 100%)`,
        boxShadow: theme => supplier.status === 'active'
          ? `0 4px 20px ${alpha(theme.palette.primary.main, 0.08)}, 0 2px 8px ${alpha(theme.palette.common.black, 0.04)}`
          : `0 4px 16px ${alpha(theme.palette.common.black, 0.06)}`,
        backdropFilter: 'blur(20px)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        '&:hover': {
          transform: 'translateY(-8px) scale(1.02)',
          boxShadow: theme => supplier.status === 'active'
            ? `0 12px 40px ${alpha(theme.palette.primary.main, 0.15)}, 0 8px 16px ${alpha(theme.palette.common.black, 0.08)}`
            : `0 12px 32px ${alpha(theme.palette.common.black, 0.12)}`,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: theme => supplier.status === 'active'
            ? `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
            : `linear-gradient(90deg, ${theme.palette.grey[400]}, ${theme.palette.grey[500]})`,
          borderRadius: '3px 3px 0 0',
          boxShadow: theme => supplier.status === 'active'
            ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`
            : 'none'
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: theme => `radial-gradient(circle at top right, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 70%)`,
          pointerEvents: 'none',
          opacity: supplier.status === 'active' ? 1 : 0.3
        }
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
          <Avatar
            sx={{
              width: isMobile ? 48 : 56,
              height: isMobile ? 48 : 56,
              bgcolor: 'primary.main',
              borderRadius: 1,
              fontSize: isMobile ? '1.2rem' : '1.5rem',
            }}
          >
            {supplier.name?.charAt(0)?.toUpperCase() || '?'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                fontSize: isMobile ? '0.875rem' : '0.95rem',
              }}
            >
              {supplier.name}
            </Typography>
            {parseRating(supplier.rating) > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Rating
                  value={parseRating(supplier.rating)}
                  readOnly
                  size="small"
                  sx={{ fontSize: '0.9rem' }}
                />
                <Typography variant="caption" color="text.secondary">
                  ({parseRating(supplier.rating).toFixed(1)})
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Infos de contact */}
        <Stack spacing={0.75} sx={{ mb: 1.5 }}>
          {supplier.contact_person && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Business sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.8rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {supplier.contact_person}
              </Typography>
            </Box>
          )}

          {supplier.email && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.8rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {supplier.email}
              </Typography>
            </Box>
          )}

          {supplier.phone && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                {supplier.phone}
              </Typography>
            </Box>
          )}

          {(supplier.city || supplier.province) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                {[supplier.city, supplier.province].filter(Boolean).join(', ')}
              </Typography>
            </Box>
          )}
        </Stack>

        {/* Footer - Tags diversité */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
          <Chip
            label={getStatusLabel(supplier.status)}
            size="small"
            color={getStatusColor(supplier.status)}
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
          {supplier.is_local && (
            <Chip
              label="Local"
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 18 }}
            />
          )}
          {supplier.is_minority_owned && (
            <Chip
              label={t('suppliers:diversity.minority')}
              size="small"
              color="info"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 18 }}
            />
          )}
          {supplier.is_woman_owned && (
            <Chip
              label={t('suppliers:diversity.woman')}
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 18 }}
            />
          )}
          {supplier.is_indigenous && (
            <Chip
              label={t('suppliers:diversity.indigenous')}
              size="small"
              color="warning"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 18 }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );

  const handlePdfAction = (action) => {
    if (!generatedPdfBlob) return;

    if (action === 'download') {
      downloadPDF(generatedPdfBlob, `rapport-fournisseurs-${new Date().getTime()}.pdf`);
      enqueueSnackbar(t('suppliers:messages.pdfDownloaded', 'PDF téléchargé avec succès'), {
        variant: 'success',
      });
    } else if (action === 'preview') {
      openPDFInNewTab(generatedPdfBlob);
    } else if (action === 'print') {
      const pdfUrl = URL.createObjectURL(generatedPdfBlob);
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
        };
      }
    }
    setPdfDialogOpen(false);
    setGeneratedPdfBlob(null);
  };

  const handleClosePdfDialog = () => {
    setPdfDialogOpen(false);
    setGeneratedPdfBlob(null);
  };

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>

      {/* Header avec stats */}
      <Box sx={{ mb: 3 }}>
        {/* Stats Cards - Cliquables pour filtrer - Design Compact et Moderne */}
        <Grid container spacing={isMobile ? 0.75 : 1.5}>
          {/* Actifs */}
          <Grid item xs={3} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('active')}
              sx={{
                borderRadius: isMobile ? 2 : 2.5,
                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
                border: '1.5px solid',
                borderColor: quickFilter === 'active' ? 'success.main' : theme => alpha(theme.palette.success.main, 0.2),
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-2px) scale(1.02)',
                  boxShadow: theme => `0 8px 24px ${alpha(theme.palette.success.main, 0.3)}`,
                  borderColor: 'success.main'
                },
                '&:active': {
                  transform: 'translateY(0) scale(0.98)'
                },
                ...(quickFilter === 'active' && {
                  boxShadow: theme => `0 4px 16px ${alpha(theme.palette.success.main, 0.4)}`,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: theme => `linear-gradient(90deg, ${theme.palette.success.main}, ${alpha(theme.palette.success.light, 0.8)})`,
                    borderRadius: '2px 2px 0 0'
                  }
                })
              }}
            >
              <CardContent sx={{ 
                p: isMobile ? 1 : 1.5, 
                '&:last-child': { pb: isMobile ? 1 : 1.5 },
                textAlign: 'center'
              }}>
                <Stack direction="column" alignItems="center" spacing={isMobile ? 0.5 : 0.75}>
                  <CheckCircle sx={{ 
                    fontSize: isMobile ? 20 : 24, 
                    color: 'success.main',
                    mb: isMobile ? 0.25 : 0.5
                  }} />
                  <Typography 
                    variant={isMobile ? 'h6' : 'h5'} 
                    fontWeight="700" 
                    sx={{
                      color: 'success.main',
                      fontSize: isMobile ? '1rem' : undefined,
                      lineHeight: 1.2
                    }}
                  >
                    {activeSuppliers}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ 
                      fontSize: isMobile ? '0.625rem' : '0.7rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      lineHeight: 1.2
                    }}
                  >
                    {t('suppliers:filters.active')}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Inactifs */}
          <Grid item xs={3} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('inactive')}
              sx={{
                borderRadius: isMobile ? 2 : 2.5,
                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
                border: '1.5px solid',
                borderColor: quickFilter === 'inactive' ? 'error.main' : theme => alpha(theme.palette.error.main, 0.2),
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-2px) scale(1.02)',
                  boxShadow: theme => `0 8px 24px ${alpha(theme.palette.error.main, 0.3)}`,
                  borderColor: 'error.main'
                },
                '&:active': {
                  transform: 'translateY(0) scale(0.98)'
                },
                ...(quickFilter === 'inactive' && {
                  boxShadow: theme => `0 4px 16px ${alpha(theme.palette.error.main, 0.4)}`,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: theme => `linear-gradient(90deg, ${theme.palette.error.main}, ${alpha(theme.palette.error.light, 0.8)})`,
                    borderRadius: '2px 2px 0 0'
                  }
                })
              }}
            >
              <CardContent sx={{ 
                p: isMobile ? 1 : 1.5, 
                '&:last-child': { pb: isMobile ? 1 : 1.5 },
                textAlign: 'center'
              }}>
                <Stack direction="column" alignItems="center" spacing={isMobile ? 0.5 : 0.75}>
                  <Block sx={{ 
                    fontSize: isMobile ? 20 : 24, 
                    color: 'error.main',
                    mb: isMobile ? 0.25 : 0.5
                  }} />
                  <Typography 
                    variant={isMobile ? 'h6' : 'h5'} 
                    fontWeight="700" 
                    sx={{
                      color: 'error.main',
                      fontSize: isMobile ? '1rem' : undefined,
                      lineHeight: 1.2
                    }}
                  >
                    {inactiveSuppliers}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ 
                      fontSize: isMobile ? '0.625rem' : '0.7rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      lineHeight: 1.2
                    }}
                  >
                    {t('suppliers:filters.inactive')}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Locaux */}
          <Grid item xs={3} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('local')}
              sx={{
                borderRadius: isMobile ? 2 : 2.5,
                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
                border: '1.5px solid',
                borderColor: quickFilter === 'local' ? 'warning.main' : theme => alpha(theme.palette.warning.main, 0.2),
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-2px) scale(1.02)',
                  boxShadow: theme => `0 8px 24px ${alpha(theme.palette.warning.main, 0.3)}`,
                  borderColor: 'warning.main'
                },
                '&:active': {
                  transform: 'translateY(0) scale(0.98)'
                },
                ...(quickFilter === 'local' && {
                  boxShadow: theme => `0 4px 16px ${alpha(theme.palette.warning.main, 0.4)}`,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: theme => `linear-gradient(90deg, ${theme.palette.warning.main}, ${alpha(theme.palette.warning.light, 0.8)})`,
                    borderRadius: '2px 2px 0 0'
                  }
                })
              }}
            >
              <CardContent sx={{ 
                p: isMobile ? 1 : 1.5, 
                '&:last-child': { pb: isMobile ? 1 : 1.5 },
                textAlign: 'center'
              }}>
                <Stack direction="column" alignItems="center" spacing={isMobile ? 0.5 : 0.75}>
                  <LocalShipping sx={{ 
                    fontSize: isMobile ? 20 : 24, 
                    color: 'warning.main',
                    mb: isMobile ? 0.25 : 0.5
                  }} />
                  <Typography 
                    variant={isMobile ? 'h6' : 'h5'} 
                    fontWeight="700" 
                    sx={{
                      color: 'warning.main',
                      fontSize: isMobile ? '1rem' : undefined,
                      lineHeight: 1.2
                    }}
                  >
                    {localSuppliers}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ 
                      fontSize: isMobile ? '0.625rem' : '0.7rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      lineHeight: 1.2
                    }}
                  >
                    {t('suppliers:filters.local')}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Internationaux */}
          <Grid item xs={3} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('international')}
              sx={{
                borderRadius: isMobile ? 2 : 2.5,
                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
                border: '1.5px solid',
                borderColor: quickFilter === 'international' ? 'info.main' : theme => alpha(theme.palette.info.main, 0.2),
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-2px) scale(1.02)',
                  boxShadow: theme => `0 8px 24px ${alpha(theme.palette.info.main, 0.3)}`,
                  borderColor: 'info.main'
                },
                '&:active': {
                  transform: 'translateY(0) scale(0.98)'
                },
                ...(quickFilter === 'international' && {
                  boxShadow: theme => `0 4px 16px ${alpha(theme.palette.info.main, 0.4)}`,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: theme => `linear-gradient(90deg, ${theme.palette.info.main}, ${alpha(theme.palette.info.light, 0.8)})`,
                    borderRadius: '2px 2px 0 0'
                  }
                })
              }}
            >
              <CardContent sx={{ 
                p: isMobile ? 1 : 1.5, 
                '&:last-child': { pb: isMobile ? 1 : 1.5 },
                textAlign: 'center'
              }}>
                <Stack direction="column" alignItems="center" spacing={isMobile ? 0.5 : 0.75}>
                  <Public sx={{ 
                    fontSize: isMobile ? 20 : 24, 
                    color: 'info.main',
                    mb: isMobile ? 0.25 : 0.5
                  }} />
                  <Typography 
                    variant={isMobile ? 'h6' : 'h5'} 
                    fontWeight="700" 
                    sx={{
                      color: 'info.main',
                      fontSize: isMobile ? '1rem' : undefined,
                      lineHeight: 1.2
                    }}
                  >
                    {internationalSuppliers}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ 
                      fontSize: isMobile ? '0.625rem' : '0.7rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      lineHeight: 1.2
                    }}
                  >
                    {t('suppliers:filters.international')}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Rated */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('top_rated')}
              sx={{
                borderRadius: isMobile ? 2 : 2.5,
                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                border: '1.5px solid',
                borderColor: quickFilter === 'top_rated' ? 'secondary.main' : theme => alpha(theme.palette.secondary.main, 0.2),
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-2px) scale(1.02)',
                  boxShadow: theme => `0 8px 24px ${alpha(theme.palette.secondary.main, 0.3)}`,
                  borderColor: 'secondary.main'
                },
                '&:active': {
                  transform: 'translateY(0) scale(0.98)'
                },
                ...(quickFilter === 'top_rated' && {
                  boxShadow: theme => `0 4px 16px ${alpha(theme.palette.secondary.main, 0.4)}`,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: theme => `linear-gradient(90deg, ${theme.palette.secondary.main}, ${alpha(theme.palette.secondary.light, 0.8)})`,
                    borderRadius: '2px 2px 0 0'
                  }
                })
              }}
            >
              <CardContent sx={{ 
                p: isMobile ? 1 : 1.5, 
                '&:last-child': { pb: isMobile ? 1 : 1.5 },
                textAlign: 'center'
              }}>
                <Stack 
                  direction={isMobile ? "row" : "column"} 
                  alignItems="center" 
                  justifyContent={isMobile ? "center" : "center"}
                  spacing={isMobile ? 1 : 0.75}
                >
                  <Star sx={{ 
                    fontSize: isMobile ? 18 : 24, 
                    color: 'secondary.main',
                    mb: isMobile ? 0 : 0.5
                  }} />
                  <Box sx={{ textAlign: isMobile ? 'left' : 'center' }}>
                    <Typography 
                      variant={isMobile ? 'h6' : 'h5'} 
                      fontWeight="700" 
                      sx={{
                        color: 'secondary.main',
                        fontSize: isMobile ? '1rem' : undefined,
                        lineHeight: 1.2
                      }}
                    >
                      {topRatedSuppliers}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ 
                        fontSize: isMobile ? '0.625rem' : '0.7rem',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        lineHeight: 1.2
                      }}
                    >
                      {t('suppliers:filters.topRated')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Indicateur de filtre actif */}
        {quickFilter && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">{t('suppliers:filters.activeFilter')}</Typography>
            <Chip
              label={
                quickFilter === 'active' ? t('suppliers:filters.active') :
                quickFilter === 'inactive' ? t('suppliers:filters.inactive') :
                quickFilter === 'local' ? t('suppliers:filters.local') :
                quickFilter === 'international' ? t('suppliers:filters.internationalFull') :
                quickFilter === 'top_rated' ? t('suppliers:filters.topRated') : ''
              }
              onDelete={() => setQuickFilter('')}
              color={
                quickFilter === 'active' ? 'success' :
                quickFilter === 'inactive' ? 'error' :
                quickFilter === 'local' ? 'warning' :
                quickFilter === 'international' ? 'info' :
                quickFilter === 'top_rated' ? 'secondary' : 'default'
              }
              size="small"
            />
          </Box>
        )}
      </Box>

      {/* Search & Filters */}
      <Card sx={{ mb: 3, borderRadius: 1 }}>
        <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={t('suppliers:search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
              />
              <IconButton
                onClick={() => setShowFilters(!showFilters)}
                sx={{
                  bgcolor: showFilters ? 'primary.main' : 'transparent',
                  color: showFilters ? 'white' : 'inherit',
                  '&:hover': {
                    bgcolor: showFilters ? 'primary.dark' : 'action.hover',
                  },
                }}
              >
                <FilterList />
              </IconButton>
            </Box>

            {showFilters && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('suppliers:filters.statusLabel')}</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      label={t('suppliers:filters.statusLabel')}
                      sx={{ borderRadius: 1 }}
                    >
                      <MenuItem value="">{t('suppliers:filters.all')}</MenuItem>
                      <MenuItem value="active">{t('suppliers:status.active')}</MenuItem>
                      <MenuItem value="pending">{t('suppliers:status.pending')}</MenuItem>
                      <MenuItem value="inactive">{t('suppliers:status.inactive')}</MenuItem>
                      <MenuItem value="blocked">{t('suppliers:status.blocked')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Suppliers Grid */}
      {loading && suppliers.length === 0 ? (
        <LoadingState message={t('suppliers:messages.loading', 'Chargement des fournisseurs...')} />
      ) : filteredSuppliers.length === 0 ? (
        <EmptyState
          title={t('suppliers:messages.noSuppliers')}
          description={t('suppliers:messages.noSuppliersDescription')}
          actionLabel={t('suppliers:newSupplier')}
          onAction={() => navigate('/suppliers/new')}
        />
      ) : (
        <Grid container spacing={isMobile ? 2 : 3}>
          {filteredSuppliers.map((supplier) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={supplier.id}>
              <SupplierCard supplier={supplier} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* PDF Dialog - Génération automatique */}
      <Dialog open={pdfDialogOpen} onClose={handleClosePdfDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PictureAsPdf color="error" />
            {t('suppliers:pdf.title', 'Rapport PDF Fournisseur')}
          </Box>
        </DialogTitle>
        <DialogContent>
          {generatingPdf ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={3}>
              <CircularProgress size={40} />
              <Typography variant="body2" color="text.secondary">
                {t('common:labels.generating', 'Génération du PDF en cours...')}
              </Typography>
            </Box>
          ) : generatedPdfBlob ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              {t('suppliers:pdf.ready', 'Le rapport PDF est prêt. Choisissez une action:')}
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('suppliers:pdf.description', 'Génération du rapport PDF...')}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePdfDialog}>
            {t('common:buttons.cancel', 'Annuler')}
          </Button>
          <Button
            onClick={() => handlePdfAction('preview')}
            variant="outlined"
            disabled={generatingPdf || !generatedPdfBlob}
            startIcon={<Receipt />}
          >
            {t('common:buttons.preview', 'Aperçu')}
          </Button>
          <Button
            onClick={() => handlePdfAction('print')}
            variant="outlined"
            color="secondary"
            disabled={generatingPdf || !generatedPdfBlob}
            startIcon={<Print />}
          >
            {t('common:buttons.print', 'Imprimer')}
          </Button>
          <Button
            onClick={() => handlePdfAction('download')}
            variant="contained"
            disabled={generatingPdf || !generatedPdfBlob}
            startIcon={<Download />}
          >
            {t('common:buttons.download', 'Télécharger')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Suppliers;
