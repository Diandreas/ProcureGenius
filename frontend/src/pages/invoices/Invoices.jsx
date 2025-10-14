import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/icons-material';
import { invoicesAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import EmptyState from '../../components/EmptyState';

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoicesAPI.list();
      setInvoices(response.data.results || response.data);
    } catch (err) {
      setError('Erreur lors du chargement des factures');
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = !searchTerm ||
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
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
      draft: 'Brouillon',
      sent: 'Envoyée',
      paid: 'Payée',
      overdue: 'En retard',
      cancelled: 'Annulée'
    };
    return labels[status] || status;
  };

  // Statistiques
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(i => i.status === 'paid').length;
  const pendingInvoices = invoices.filter(i => i.status === 'sent').length;
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
                Échéance: {formatDate(invoice.due_date)}
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      {/* Header avec stats */}
      <Box sx={{ mb: 3 }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" gutterBottom>
          Factures
        </Typography>

        {/* Stats Cards */}
        <Grid container spacing={isMobile ? 1 : 2} sx={{ mt: 1 }}>
          <Grid item xs={6} sm={3}>
            <Card sx={{ borderRadius: 1, bgcolor: 'primary.50' }}>
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Receipt sx={{ fontSize: isMobile ? 20 : 24, color: 'primary.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="primary">
                      {totalInvoices}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Card sx={{ borderRadius: 1, bgcolor: 'success.50' }}>
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CheckCircle sx={{ fontSize: isMobile ? 20 : 24, color: 'success.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="success.main">
                      {paidInvoices}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Payées
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Card sx={{ borderRadius: 1, bgcolor: 'warning.50' }}>
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Schedule sx={{ fontSize: isMobile ? 20 : 24, color: 'warning.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="warning.main">
                      {pendingInvoices}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      En attente
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Card sx={{ borderRadius: 1, bgcolor: 'info.50' }}>
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <AttachMoney sx={{ fontSize: isMobile ? 20 : 24, color: 'info.main' }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant={isMobile ? 'subtitle2' : 'h6'}
                      fontWeight="bold"
                      color="info.main"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: isMobile ? '0.9rem' : '1.25rem',
                      }}
                    >
                      {formatCurrency(totalAmount)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Montant total
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Search & Filters */}
      <Card sx={{ mb: 3, borderRadius: 1 }}>
        <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Rechercher une facture..."
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
                    <InputLabel>Statut</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      label="Statut"
                      sx={{ borderRadius: 1 }}
                    >
                      <MenuItem value="">Tous</MenuItem>
                      <MenuItem value="draft">Brouillon</MenuItem>
                      <MenuItem value="sent">Envoyée</MenuItem>
                      <MenuItem value="paid">Payée</MenuItem>
                      <MenuItem value="overdue">En retard</MenuItem>
                      <MenuItem value="cancelled">Annulée</MenuItem>
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
          title="Aucune facture"
          description="Aucune facture ne correspond à vos critères de recherche."
          actionLabel="Nouvelle facture"
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
