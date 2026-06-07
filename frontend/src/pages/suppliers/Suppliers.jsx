import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { alpha } from '@mui/material/styles';
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
  Edit,
  Close,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { suppliersAPI } from '../../services/api';
import { getStatusColor, getStatusLabel, parseRating } from '../../utils/formatters';
import { useHeader } from '../../contexts/HeaderContext';
import { NeumorphicKpis, NeumorphicSearch, NeumorphicCard } from '../../components/neumorphic/NeumorphicList';
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
  const { setPageHeader } = useHeader();

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

  // Set the page header via Context
  useEffect(() => {
    setPageHeader({
      title: t('suppliers:title', 'Fournisseurs'),
      // Action pour le bouton mobile à gauche
      action: {
        label: t('navigation:topBar.new', 'Nouveau'),
        icon: <Business />,
        onClick: () => navigate('/suppliers/new'),
        color: 'primary',
        variant: 'contained'
      },
      // Actions pour le desktop à droite
      actions: (
        <Button
          variant="contained"
          color="primary"
          startIcon={<Business />}
          onClick={() => navigate('/suppliers/new')}
          sx={{
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 600,
            px: { xs: 2, sm: 3 },
            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}`
          }}
        >
          {t('navigation:topBar.newSupplier', 'Nouveau fournisseur')}
        </Button>
      )
    });
    return () => setPageHeader({ title: '', actions: null });
  }, [t, navigate, theme.palette.primary, setPageHeader]);

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

  const handleCardClick = useCallback((event, supplier) => {
    // Navigation simple vers le détail (sans animation morph)
    navigate(`/suppliers/${supplier.id}`);
  }, [navigate]);

  const SupplierCard = ({ supplier, index }) => {
    const isActive = supplier.status === 'active';
    const rating = parseRating(supplier.rating);
    const top = rating >= 4;
    const accent = top ? '#8b5cf6' : isActive ? '#10b981' : '#94a3b8';
    return (
      <NeumorphicCard
        index={index}
        accentColor={accent}
        status={{ label: top ? 'Top' : isActive ? 'Actif' : 'Inactif', color: accent }}
        title={supplier.name}
        subtitle={supplier.contact_person || supplier.email || ''}
        amount={rating ? rating.toFixed(1) + '/5' : null}
        footer={supplier.is_local ? 'Local' : 'International'}
        onClick={(e) => handleCardClick(e, supplier)}
        actions={(
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/suppliers/${supplier.id}/edit`); }}
            sx={{ width: 30, height: 30, borderRadius: 2, color: 'text.disabled', '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.1) } }}>
            <Edit sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      />
    );
  };

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
    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, maxWidth: 1280, mx: 'auto' }}>

      <NeumorphicKpis
        activeKey={quickFilter}
        onSelect={handleQuickFilterClick}
        kpis={[
          { key: '', label: 'Fournisseurs', value: totalSuppliers, sub: 'au total', color: '#2563eb' },
          { key: 'active', label: 'Actifs', value: activeSuppliers, sub: 'en activite', color: '#10b981' },
          { key: 'top_rated', label: 'Top notes', value: topRatedSuppliers, sub: '4+ etoiles', color: '#8b5cf6' },
          { key: 'local', label: 'Locaux', value: localSuppliers, sub: 'proximite', color: '#3b82f6' },
          { key: 'international', label: 'Internat.', value: internationalSuppliers, sub: 'a l etranger', color: '#f59e0b' },
        ]}
      />

      <NeumorphicSearch
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Rechercher un fournisseur, un contact..."
      />

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
        <Grid container spacing={{ xs: 2, sm: 2.5 }}>
          <AnimatePresence mode="popLayout">
            {filteredSuppliers.map((supplier, index) => (
              <Grid item xs={6} sm={6} md={4} lg={3} key={supplier.id}>
                <SupplierCard supplier={supplier} index={index} />
              </Grid>
            ))}
          </AnimatePresence>
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
