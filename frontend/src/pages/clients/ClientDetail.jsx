import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Avatar,
  Divider,
  Grid,
  Stack,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Delete,
  Person,
  Email,
  Phone,
  LocationOn,
  Business,
  CreditCard,
  AttachMoney,
  Receipt,
  Inventory,
  TrendingUp,
  Info,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { clientsAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import ClientInvoicesTable from '../../components/clients/ClientInvoicesTable';
import ClientProductsTable from '../../components/clients/ClientProductsTable';

function ClientDetail() {
  const { t } = useTranslation(['clients', 'common']);
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [client, setClient] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchClient();
    fetchStatistics();
  }, [id]);

  const fetchClient = async () => {
    setLoading(true);
    try {
      const response = await clientsAPI.get(id);
      setClient(response.data);
    } catch (error) {
      enqueueSnackbar(t('clients:messages.loadClientError'), { variant: 'error' });
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await clientsAPI.getStatistics(id);
      setStatistics(response.data);
    } catch (error) {
      console.error('Error loading client statistics:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(t('clients:messages.deleteConfirmation', { name: client.name }))) {
      try {
        await clientsAPI.delete(id);
        enqueueSnackbar(t('clients:messages.clientDeleted'), { variant: 'success' });
        navigate('/clients');
      } catch (error) {
        enqueueSnackbar(t('clients:messages.deleteError'), { variant: 'error' });
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!client) {
    return <Alert severity="error">{t('clients:messages.clientNotFound')}</Alert>;
  }

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate('/clients')} size={isMobile ? 'small' : 'medium'}>
            <ArrowBack />
          </IconButton>
          <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" sx={{ flex: 1 }}>
            {client.name}
          </Typography>
          <Tooltip title={t('clients:tooltips.editClient')}>
            <IconButton
              onClick={() => navigate(`/clients/${id}/edit`)}
              sx={{
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'primary.light',
                  color: 'white',
                }
              }}
            >
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('clients:tooltips.deleteClient')}>
            <IconButton
              onClick={handleDelete}
              sx={{
                color: 'error.main',
                '&:hover': {
                  bgcolor: 'error.light',
                  color: 'white',
                }
              }}
            >
              <Delete />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<Info />} label={t('clients:tabs.info')} iconPosition="start" />
        <Tab icon={<Receipt />} label={t('clients:tabs.invoices')} iconPosition="start" />
        <Tab icon={<Inventory />} label={t('clients:tabs.products')} iconPosition="start" />
      </Tabs>

      {/* Tab: Informations */}
      {activeTab === 0 && (
        <Grid container spacing={isMobile ? 2 : 3}>
          {/* Card principale */}
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 1, mb: isMobile ? 2 : 3 }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <Avatar
                    sx={{
                      width: isMobile ? 80 : 100,
                      height: isMobile ? 80 : 100,
                      bgcolor: 'primary.main',
                      borderRadius: 1,
                      fontSize: isMobile ? '2rem' : '2.5rem',
                    }}
                  >
                    {client.name?.charAt(0)?.toUpperCase() || '?'}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" gutterBottom>
                      {client.name}
                    </Typography>
                    {client.legal_name && client.legal_name !== client.name && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {client.legal_name}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Chip
                        label={client.is_active ? t('clients:status.active') : t('clients:status.inactive')}
                        color={client.is_active ? 'success' : 'default'}
                        size="small"
                      />
                      {client.business_number && (
                        <Chip
                          icon={<Business sx={{ fontSize: 16 }} />}
                          label={client.business_number}
                          variant="outlined"
                          size="small"
                        />
                      )}
                    </Stack>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Informations de contact */}
                <Grid container spacing={2}>
                  {client.contact_person && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person sx={{ fontSize: 20, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {t('clients:labels.contactPerson')}
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {client.contact_person}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}

                  {client.email && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Email sx={{ fontSize: 20, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {t('clients:labels.email')}
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            <a href={`mailto:${client.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {client.email}
                            </a>
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}

                  {client.phone && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Phone sx={{ fontSize: 20, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {t('clients:labels.phone')}
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            <a href={`tel:${client.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {client.phone}
                            </a>
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}

                  {client.billing_address && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <LocationOn sx={{ fontSize: 20, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {t('clients:labels.address')}
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {client.billing_address}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* Statistiques */}
            {statistics?.sales_summary && (
              <Grid container spacing={isMobile ? 2 : 3}>
                <Grid item xs={6}>
                  <Card sx={{ borderRadius: 1, bgcolor: 'primary.50' }}>
                    <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
                      <Receipt sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                      <Typography variant={isMobile ? 'h5' : 'h4'} color="primary" fontWeight="bold">
                        {statistics.sales_summary.total_invoices || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('clients:tabs.invoices')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={6}>
                  <Card sx={{ borderRadius: 1, bgcolor: 'success.50' }}>
                    <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
                      <AttachMoney sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                      <Typography variant={isMobile ? 'h5' : 'h4'} color="success.main" fontWeight="bold">
                        {formatCurrency(statistics.sales_summary.total_sales_amount || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('clients:stats.totalRevenue')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {statistics.sales_summary.unique_products > 0 && (
                  <Grid item xs={6}>
                    <Card sx={{ borderRadius: 1, bgcolor: 'info.50' }}>
                      <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
                        <Inventory sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                        <Typography variant={isMobile ? 'h5' : 'h4'} color="info.main" fontWeight="bold">
                          {statistics.sales_summary.unique_products}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('clients:stats.productsPurchased')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {statistics.sales_summary.average_invoice_amount > 0 && (
                  <Grid item xs={6}>
                    <Card sx={{ borderRadius: 1, bgcolor: 'warning.50' }}>
                      <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
                        <TrendingUp sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                        <Typography variant={isMobile ? 'h5' : 'h4'} color="warning.main" fontWeight="bold">
                          {formatCurrency(statistics.sales_summary.average_invoice_amount)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('clients:stats.averageBasket')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            )}
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            {/* Conditions commerciales */}
            <Card sx={{ borderRadius: 1, mb: isMobile ? 2 : 3 }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CreditCard sx={{ color: 'primary.main' }} />
                  <Typography variant="subtitle1" fontWeight="600">
                    {t('clients:labels.conditions')}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    textAlign: 'center',
                    p: 2,
                    borderRadius: 1,
                    bgcolor: 'info.50',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" color="info.main" fontWeight="bold">
                    {client.payment_terms || 'NET 30'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('clients:labels.paymentTerms')}
                  </Typography>
                </Box>

                {client.credit_limit && (
                  <Box
                    sx={{
                      textAlign: 'center',
                      p: 2,
                      borderRadius: 1,
                      bgcolor: 'success.50',
                    }}
                  >
                    <Typography variant="h6" color="success.main" fontWeight="bold">
                      {formatCurrency(client.credit_limit)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('clients:labels.creditLimit')}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Actions rapides */}
            <Card sx={{ borderRadius: 1, mb: isMobile ? 2 : 3 }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  {t('clients:labels.quickActions')}
                </Typography>
                <Stack spacing={1}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Receipt />}
                    onClick={() => navigate(`/invoices/new?client=${id}`)}
                    size="small"
                  >
                    {t('clients:actions.createInvoice')}
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Email />}
                    href={`mailto:${client.email}`}
                    disabled={!client.email}
                    size="small"
                  >
                    {t('clients:actions.sendEmail')}
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Phone />}
                    href={`tel:${client.phone}`}
                    disabled={!client.phone}
                    size="small"
                  >
                    {t('clients:actions.call')}
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card sx={{ borderRadius: 1 }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  {t('clients:labels.systemInfo')}
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t('clients:labels.createdOn')}
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(client.created_at)}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t('clients:labels.updatedOn')}
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(client.updated_at)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab: Factures */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Receipt color="primary" />
            {t('clients:tabs.invoices')}
          </Typography>
          <ClientInvoicesTable
            invoices={statistics?.recent_invoices}
            loading={!statistics}
          />
        </Box>
      )}

      {/* Tab: Produits */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Inventory color="primary" />
            {t('clients:tabs.products')}
          </Typography>
          <ClientProductsTable
            products={statistics?.top_products}
            loading={!statistics}
          />
        </Box>
      )}
    </Box>
  );
}

export default ClientDetail;
