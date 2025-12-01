import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search,
  FilterList,
  Receipt,
  Business,
  Person,
  AttachMoney,
  TrendingUp,
  Schedule,
  CheckCircle,
  Warning,
  Error,
  Description,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { fetchInvoices } from '../../store/slices/invoicesSlice';
import { formatCurrency, formatDate } from '../../utils/formatters';
import EmptyState from '../../components/EmptyState';

function Invoices() {
  const { t } = useTranslation(['invoices', 'common']);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Redux state
  const { invoices, loading, error } = useSelector((state) => state.invoices);

  // Local UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState('');

  useEffect(() => {
    dispatch(fetchInvoices());
  }, [dispatch]);

  const handleQuickFilterClick = (filterValue) => {
    if (quickFilter === filterValue) {
      setQuickFilter('');
    } else {
      setQuickFilter(filterValue);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = !searchTerm ||
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || invoice.status === statusFilter;

    const matchesQuick = !quickFilter || (() => {
      if (quickFilter === 'paid') return invoice.status === 'paid';
      if (quickFilter === 'unpaid') return invoice.status === 'sent';
      if (quickFilter === 'overdue') return invoice.status === 'overdue';
      if (quickFilter === 'draft') return invoice.status === 'draft';
      return true;
    })();

    return matchesSearch && matchesStatus && matchesQuick;
  });

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      sent: 'info',
      paid: 'success',
      overdue: 'error',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: t('invoices:status.draft'),
      sent: t('invoices:status.sent'),
      paid: t('invoices:status.paid'),
      overdue: t('invoices:status.overdue'),
      cancelled: t('invoices:status.cancelled')
    };
    return labels[status] || status;
  };

  // Statistiques
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(i => i.status === 'paid').length;
  const unpaidInvoices = invoices.filter(i => i.status === 'sent').length;
  const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;
  const draftInvoices = invoices.filter(i => i.status === 'draft').length;
  const totalAmount = invoices.reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0);

  const InvoiceCard = ({ invoice }) => (
    <Card
      onClick={() => navigate(`/invoices/${invoice.id}`)}
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
            }}
          >
            <Receipt />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                mb: 0.5,
                color: 'primary.main',
                fontSize: isMobile ? '0.875rem' : '0.95rem',
              }}
            >
              {invoice.invoice_number}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: '0.75rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              {invoice.title}
            </Typography>
          </Box>
        </Box>

        {/* Prix */}
        <Box
          sx={{
            bgcolor: 'success.50',
            borderRadius: 1,
            p: 1,
            mb: 1.5,
            textAlign: 'center',
          }}
        >
          <Typography
            variant="h6"
            color="success.main"
            sx={{ fontWeight: 700, fontSize: isMobile ? '1.1rem' : '1.25rem' }}
          >
            {formatCurrency(invoice.total_amount)}
          </Typography>
        </Box>

        {/* Infos */}
        <Stack spacing={0.75}>
          {invoice.client_name && (
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
                {invoice.client_name}
              </Typography>
            </Box>
          )}

          {invoice.due_date && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Schedule sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                {t('invoices:labels.dueDate')} {formatDate(invoice.due_date)}
              </Typography>
            </Box>
          )}
        </Stack>

        {/* Footer */}
        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={getStatusLabel(invoice.status)}
            size="small"
            color={getStatusColor(invoice.status)}
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
        </Box>
      </CardContent>
    </Card>
  );

  if (loading && invoices.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{t('invoices:messages.loadingError')}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      {/* Header avec stats */}
      <Box sx={{ mb: 3 }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" gutterBottom>
          {t('invoices:title')}
        </Typography>

        {/* Stats Cards - Clickable Filters */}
        <Grid container spacing={isMobile ? 1 : 2} sx={{ mt: 1 }}>
          {/* Payées */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('paid')}
              sx={{
                borderRadius: 2,
                bgcolor: 'success.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === 'paid' ? 'success.main' : 'transparent',
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
                      {paidInvoices}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      {t('invoices:filters.paid')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Impayées */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('unpaid')}
              sx={{
                borderRadius: 2,
                bgcolor: 'warning.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === 'unpaid' ? 'warning.main' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                  borderColor: 'warning.main'
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Warning sx={{ fontSize: isMobile ? 20 : 24, color: 'warning.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="warning.main">
                      {unpaidInvoices}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      {t('invoices:filters.unpaid')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* En retard */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('overdue')}
              sx={{
                borderRadius: 2,
                bgcolor: 'error.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === 'overdue' ? 'error.main' : 'transparent',
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
                  <Error sx={{ fontSize: isMobile ? 20 : 24, color: 'error.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="error.main">
                      {overdueInvoices}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      {t('invoices:filters.overdue')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Brouillons */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('draft')}
              sx={{
                borderRadius: 2,
                bgcolor: 'grey.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === 'draft' ? 'grey.600' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                  borderColor: 'grey.600'
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Description sx={{ fontSize: isMobile ? 20 : 24, color: 'grey.600' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="grey.700">
                      {draftInvoices}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      {t('invoices:filters.drafts')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Toutes */}
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
                  <Receipt sx={{ fontSize: isMobile ? 20 : 24, color: 'primary.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="primary.main">
                      {totalInvoices}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      {t('invoices:filters.allInvoices')}
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
            <Typography variant="body2" color="text.secondary">{t('invoices:filters.activeFilter')}</Typography>
            <Chip
              label={
                quickFilter === 'paid' ? t('invoices:filters.paid') :
                  quickFilter === 'unpaid' ? t('invoices:filters.unpaid') :
                    quickFilter === 'overdue' ? t('invoices:filters.overdue') :
                      quickFilter === 'draft' ? t('invoices:filters.drafts') : ''
              }
              onDelete={() => setQuickFilter('')}
              color={
                quickFilter === 'paid' ? 'success' :
                  quickFilter === 'unpaid' ? 'warning' :
                    quickFilter === 'overdue' ? 'error' :
                      quickFilter === 'draft' ? 'default' : 'primary'
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
                placeholder={t('invoices:search.placeholder')}
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
                    <InputLabel>{t('invoices:filters.statusLabel')}</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      label={t('invoices:filters.statusLabel')}
                      sx={{ borderRadius: 1 }}
                    >
                      <MenuItem value="">{t('invoices:filters.all')}</MenuItem>
                      <MenuItem value="draft">{t('invoices:status.draft')}</MenuItem>
                      <MenuItem value="sent">{t('invoices:status.sent')}</MenuItem>
                      <MenuItem value="paid">{t('invoices:status.paid')}</MenuItem>
                      <MenuItem value="overdue">{t('invoices:status.overdue')}</MenuItem>
                      <MenuItem value="cancelled">{t('invoices:status.cancelled')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Invoices Grid */}
      {filteredInvoices.length === 0 ? (
        <EmptyState
          title={t('invoices:messages.noInvoices')}
          description={t('invoices:messages.noInvoicesDescription')}
          actionLabel={t('invoices:newInvoice')}
          onAction={() => navigate('/invoices/new')}
        />
      ) : (
        <Grid container spacing={isMobile ? 2 : 3}>
          {filteredInvoices.map((invoice) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={invoice.id}>
              <InvoiceCard invoice={invoice} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

export default Invoices;
