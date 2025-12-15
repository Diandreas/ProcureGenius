import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
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
  CircularProgress,
  useMediaQuery,
  useTheme,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import {
  Search,
  FilterList,
  Person,
  Email,
  Phone,
  AttachMoney,
  Receipt,
  CreditCard,
  Business,
  TrendingUp,
  CheckCircle,
  Block,
  Star,
  FiberNew,
  PictureAsPdf,
  Print,
  Download,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { fetchClients } from '../../store/slices/clientsSlice';
import useCurrency from '../../hooks/useCurrency';
import EmptyState from '../../components/EmptyState';
import { generateClientsBulkReport, downloadPDF, openPDFInNewTab } from '../../services/pdfReportService';

function Clients() {
  const { t } = useTranslation(['clients', 'common']);
  const { format: formatCurrency } = useCurrency();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Redux state
  const { clients, loading, error } = useSelector((state) => state.clients);

  // Local UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentTermsFilter, setPaymentTermsFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState('');
  const [reportConfigOpen, setReportConfigOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [reportFilters, setReportFilters] = useState({
    dateStart: '',
    dateEnd: '',
    selectedClients: [],
  });

  useEffect(() => {
    dispatch(fetchClients());
  }, [dispatch]);

  const handleGenerateReportClick = useCallback(() => {
    setReportConfigOpen(true);
  }, []);

  // Enregistrer la fonction de rapport dans la top nav bar
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('register-report-action', {
      detail: {
        onClick: handleGenerateReportClick,
        label: t('clients:actions.generateReport', 'Rapport PDF'),
      }
    }));

    return () => {
      window.dispatchEvent(new CustomEvent('clear-report-action'));
    };
  }, [handleGenerateReportClick, t]);

  const handleQuickFilterClick = (filterValue) => {
    if (quickFilter === filterValue) {
      setQuickFilter('');
    } else {
      setQuickFilter(filterValue);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchTerm ||
      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter ||
      (statusFilter === 'active' && client.is_active) ||
      (statusFilter === 'inactive' && !client.is_active);

    const matchesPaymentTerms = !paymentTermsFilter || client.payment_terms === paymentTermsFilter;

    const matchesQuick = !quickFilter || (() => {
      if (quickFilter === 'active') return client.is_active;
      if (quickFilter === 'inactive') return !client.is_active;
      if (quickFilter === 'vip') return (client.total_sales_amount || 0) > 10000;
      if (quickFilter === 'new') {
        if (!client.created_at) return false;
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return new Date(client.created_at) > monthAgo;
      }
      return true;
    })();

    return matchesSearch && matchesStatus && matchesPaymentTerms && matchesQuick;
  });

  // Statistiques
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.is_active).length;
  const inactiveClients = clients.filter(c => !c.is_active).length;
  const vipClients = clients.filter(c => (c.total_sales_amount || 0) > 10000).length;
  const newClients = clients.filter(c => {
    if (!c.created_at) return false;
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return new Date(c.created_at) > monthAgo;
  }).length;
  const totalRevenue = clients.reduce((sum, c) => sum + (c.total_sales_amount || 0), 0);
  const totalInvoices = clients.reduce((sum, c) => sum + (c.total_invoices || 0), 0);

  const ClientCard = ({ client }) => (
    <Card
      onClick={() => navigate(`/clients/${client.id}`)}
      sx={{
        cursor: 'pointer',
        height: '100%',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 2,
          transform: 'translateY(-2px)',
        },
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
            {client.name?.charAt(0)?.toUpperCase() || '?'}
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
              {client.name}
            </Typography>
            {client.legal_name && client.legal_name !== client.name && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.7rem', display: 'block' }}
              >
                {client.legal_name}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Infos de contact */}
        <Stack spacing={0.75} sx={{ mb: 1.5 }}>
          {client.contact_person && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.8rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
              >
                {client.contact_person}
              </Typography>
            </Box>
          )}

          {client.email && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.8rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
              >
                {client.email}
              </Typography>
            </Box>
          )}

          {client.phone && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                {client.phone}
              </Typography>
            </Box>
          )}

          {client.payment_terms && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <CreditCard sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                {client.payment_terms}
              </Typography>
            </Box>
          )}
        </Stack>

        {/* Stats */}
        {(client.total_invoices > 0 || client.total_sales_amount > 0) && (
          <Box
            sx={{
              bgcolor: 'success.50',
              borderRadius: 1,
              p: 1,
              mb: 1.5,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              {client.total_invoices > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Receipt sx={{ fontSize: 16, color: 'success.main' }} />
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    {client.total_invoices}
                  </Typography>
                </Box>
              )}
              {client.total_sales_amount > 0 && (
                <Typography
                  variant="body2"
                  sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'success.main' }}
                >
                  {formatCurrency(client.total_sales_amount)}
                </Typography>
              )}
            </Stack>
          </Box>
        )}

        {/* Footer */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={client.is_active ? t('clients:status.active') : t('clients:status.inactive')}
            size="small"
            color={client.is_active ? 'success' : 'default'}
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
          {client.business_number && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              N° {client.business_number}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  if (loading && clients.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{t('clients:messages.loadingError')}</Alert>
      </Box>
    );
  }

  const handleConfigureReport = async () => {
    setReportConfigOpen(false);
    setGeneratingPdf(true);
    setReportDialogOpen(true);
    
    try {
      const pdfBlob = await generateClientsBulkReport({
        itemIds: reportFilters.selectedClients.length > 0 ? reportFilters.selectedClients : undefined,
        dateStart: reportFilters.dateStart || undefined,
        dateEnd: reportFilters.dateEnd || undefined,
        status: quickFilter || statusFilter || undefined,
      });
      setGeneratedPdfBlob(pdfBlob);
    } catch (error) {
      console.error('Error generating report:', error);
      enqueueSnackbar(t('clients:messages.reportError', 'Erreur lors de la génération du rapport'), {
        variant: 'error',
      });
      setReportDialogOpen(false);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleCloseDialog = () => {
    setReportDialogOpen(false);
    setGeneratedPdfBlob(null);
  };

  const handlePdfAction = (action) => {
    if (!generatedPdfBlob) return;

    if (action === 'download') {
      downloadPDF(generatedPdfBlob, `rapport-clients-${new Date().getTime()}.pdf`);
      enqueueSnackbar(t('clients:messages.pdfDownloadedSuccess', 'PDF téléchargé avec succès'), {
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
      enqueueSnackbar(t('clients:messages.printWindowOpened', 'Fenêtre d\'impression ouverte'), {
        variant: 'success',
      });
    }
    setReportDialogOpen(false);
  };


  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>

      {/* Header avec stats */}
      <Box sx={{ mb: 3 }}>
        {/* Stats Cards - Clickable Filters */}
        <Grid container spacing={isMobile ? 1 : 2}>
          {/* Actifs */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('active')}
              sx={{
                borderRadius: 2,
                bgcolor: 'success.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === 'active' ? 'success.main' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                  borderColor: 'success.main'
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CheckCircle sx={{ fontSize: isMobile ? 20 : 24, color: 'success.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="success.main">
                      {activeClients}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      {t('clients:filters.active')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Inactifs */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('inactive')}
              sx={{
                borderRadius: 2,
                bgcolor: 'error.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === 'inactive' ? 'error.main' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                  borderColor: 'error.main'
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Block sx={{ fontSize: isMobile ? 20 : 24, color: 'error.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="error.main">
                      {inactiveClients}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      {t('clients:filters.inactive')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* VIP */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('vip')}
              sx={{
                borderRadius: 2,
                bgcolor: 'secondary.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === 'vip' ? 'secondary.main' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                  borderColor: 'secondary.main'
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Star sx={{ fontSize: isMobile ? 20 : 24, color: 'secondary.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="secondary.main">
                      {vipClients}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      {t('clients:filters.vip')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Nouveaux */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('new')}
              sx={{
                borderRadius: 2,
                bgcolor: 'info.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === 'new' ? 'info.main' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                  borderColor: 'info.main'
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <FiberNew sx={{ fontSize: isMobile ? 20 : 24, color: 'info.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="info.main">
                      {newClients}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      {t('clients:filters.new')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Tous */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('')}
              sx={{
                borderRadius: 2,
                bgcolor: 'primary.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === '' ? 'primary.main' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                  borderColor: 'primary.main'
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Person sx={{ fontSize: isMobile ? 20 : 24, color: 'primary.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="primary.main">
                      {totalClients}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      {t('clients:filters.all')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filter Indicator */}
        {quickFilter && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">{t('clients:filters.activeFilter')}</Typography>
            <Chip
              label={
                quickFilter === 'active' ? t('clients:filters.active') :
                  quickFilter === 'inactive' ? t('clients:filters.inactive') :
                    quickFilter === 'vip' ? t('clients:filters.vip') :
                      quickFilter === 'new' ? t('clients:filters.new') : ''
              }
              onDelete={() => setQuickFilter('')}
              color={
                quickFilter === 'active' ? 'success' :
                  quickFilter === 'inactive' ? 'error' :
                    quickFilter === 'vip' ? 'secondary' :
                      quickFilter === 'new' ? 'info' : 'primary'
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
                placeholder={t('clients:search.placeholder')}
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
                    <InputLabel>{t('clients:filters.statusLabel')}</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      label={t('clients:filters.statusLabel')}
                      sx={{ borderRadius: 1 }}
                    >
                      <MenuItem value="">{t('clients:filters.all')}</MenuItem>
                      <MenuItem value="active">{t('clients:status.active')}</MenuItem>
                      <MenuItem value="inactive">{t('clients:status.inactive')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('clients:filters.paymentTermsLabel')}</InputLabel>
                    <Select
                      value={paymentTermsFilter}
                      onChange={(e) => setPaymentTermsFilter(e.target.value)}
                      label={t('clients:filters.paymentTermsLabel')}
                      sx={{ borderRadius: 1 }}
                    >
                      <MenuItem value="">{t('clients:filters.allPaymentTerms')}</MenuItem>
                      <MenuItem value="NET 15">NET 15</MenuItem>
                      <MenuItem value="NET 30">NET 30</MenuItem>
                      <MenuItem value="NET 45">NET 45</MenuItem>
                      <MenuItem value="NET 60">NET 60</MenuItem>
                      <MenuItem value="CASH">CASH</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <EmptyState
          title={t('clients:messages.noClients')}
          description={t('clients:messages.noClientsDescription')}
          actionLabel={t('clients:newClient')}
          onAction={() => navigate('/clients/new')}
        />
      ) : (
        <Grid container spacing={isMobile ? 2 : 3}>
          {filteredClients.map((client) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={client.id}>
              <ClientCard client={client} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Configuration Dialog */}
      <Dialog open={reportConfigOpen} onClose={() => setReportConfigOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PictureAsPdf color="error" />
            {t('clients:report.title', 'Générer un Rapport de Clients')}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Période */}
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              📅 Période (optionnel)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Filtrer par période - laisser vide pour tout inclure
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
              <TextField
                label="Date de début"
                type="date"
                value={reportFilters.dateStart}
                onChange={(e) => setReportFilters({ ...reportFilters, dateStart: e.target.value })}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                inputProps={{ max: reportFilters.dateEnd || undefined }}
              />
              <TextField
                label="Date de fin"
                type="date"
                value={reportFilters.dateEnd}
                onChange={(e) => setReportFilters({ ...reportFilters, dateEnd: e.target.value })}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: reportFilters.dateStart || undefined }}
              />
            </Stack>

            <Divider sx={{ my: 2 }} />

            {/* Sélection de clients */}
            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                📋 Clients à inclure
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                {reportFilters.selectedClients.length > 0
                  ? `${reportFilters.selectedClients.length} client(s) sélectionné(s)`
                  : 'Tous les clients filtrés seront inclus'}
              </Typography>
              
              <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                <FormControl component="fieldset" fullWidth>
                  <FormGroup>
                    {filteredClients.map((client) => (
                      <FormControlLabel
                        key={client.id}
                        control={
                          <Checkbox
                            checked={reportFilters.selectedClients.includes(client.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setReportFilters({
                                  ...reportFilters,
                                  selectedClients: [...reportFilters.selectedClients, client.id]
                                });
                              } else {
                                setReportFilters({
                                  ...reportFilters,
                                  selectedClients: reportFilters.selectedClients.filter(id => id !== client.id)
                                });
                              }
                            }}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2">{client.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {client.email || '-'} • {client.contact_person || '-'}
                            </Typography>
                          </Box>
                        }
                        sx={{ width: '100%', m: 0, py: 0.5 }}
                      />
                    ))}
                  </FormGroup>
                </FormControl>
              </Box>

              {filteredClients.length > 0 && (
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    onClick={() => setReportFilters({ ...reportFilters, selectedClients: filteredClients.map(c => c.id) })}
                  >
                    Tout sélectionner
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setReportFilters({ ...reportFilters, selectedClients: [] })}
                  >
                    Tout désélectionner
                  </Button>
                </Box>
              )}
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="caption">
                {reportFilters.selectedClients.length > 0
                  ? `Un rapport sera généré avec ${reportFilters.selectedClients.length} client(s) sélectionné(s)`
                  : `Un rapport sera généré avec tous les clients (${filteredClients.length})`}
                {(reportFilters.dateStart || reportFilters.dateEnd) && ' pour la période spécifiée'}
                .
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportConfigOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleConfigureReport}
            variant="contained"
            color="success"
            startIcon={<PictureAsPdf />}
          >
            Générer le Rapport
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF Actions Dialog */}
      <Dialog open={reportDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PictureAsPdf color="error" />
            {t('clients:dialogs.generatePdf', 'Générer un PDF du rapport')}
          </Box>
        </DialogTitle>
        <DialogContent>
          {generatingPdf ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {t('clients:labels.generatingLabel', 'Génération du rapport en cours...')}
              </Typography>
            </Box>
          ) : generatedPdfBlob ? (
            <Box sx={{ py: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                {t('clients:messages.reportGenerated', 'Rapport généré avec succès ! Choisissez une action ci-dessous.')}
              </Alert>
              <Typography variant="body2" color="text.secondary">
                {t('clients:messages.pdfGenerationHelpText', 'Vous pouvez prévisualiser, télécharger ou imprimer directement le rapport.')}
              </Typography>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={generatingPdf}>
            {t('clients:buttons.cancel', 'Annuler')}
          </Button>
          {generatedPdfBlob && (
            <>
              <Button
                onClick={() => handlePdfAction('preview')}
                variant="outlined"
                startIcon={<Receipt />}
              >
                {t('clients:buttons.preview', 'Aperçu')}
              </Button>
              <Button
                onClick={() => handlePdfAction('print')}
                variant="outlined"
                color="secondary"
                startIcon={<Print />}
              >
                {t('clients:buttons.print', 'Imprimer')}
              </Button>
              <Button
                onClick={() => handlePdfAction('download')}
                variant="contained"
                color="success"
                startIcon={<Download />}
              >
                {t('clients:buttons.download', 'Télécharger')}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Clients;
