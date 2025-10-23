import React, { useState, useEffect } from 'react';
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
} from '@mui/icons-material';
import { clientsAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import EmptyState from '../../components/EmptyState';

function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentTermsFilter, setPaymentTermsFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await clientsAPI.list();
      setClients(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

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
            label={client.is_active ? 'Actif' : 'Inactif'}
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

  if (loading) {
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

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      {/* Header avec stats */}
      <Box sx={{ mb: 3 }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" gutterBottom>
          Clients
        </Typography>

        {/* Stats Cards - Clickable Filters */}
        <Grid container spacing={isMobile ? 1 : 2} sx={{ mt: 1 }}>
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
                      Actifs
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
                      Inactifs
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
                      VIP
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
                      Nouveaux
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
                      Tous
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
            <Typography variant="body2" color="text.secondary">Filtre actif:</Typography>
            <Chip
              label={
                quickFilter === 'active' ? 'Actifs' :
                quickFilter === 'inactive' ? 'Inactifs' :
                quickFilter === 'vip' ? 'VIP' :
                quickFilter === 'new' ? 'Nouveaux (30j)' : ''
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
                placeholder="Rechercher un client..."
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
                      <MenuItem value="active">Actif</MenuItem>
                      <MenuItem value="inactive">Inactif</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Conditions de paiement</InputLabel>
                    <Select
                      value={paymentTermsFilter}
                      onChange={(e) => setPaymentTermsFilter(e.target.value)}
                      label="Conditions de paiement"
                      sx={{ borderRadius: 1 }}
                    >
                      <MenuItem value="">Toutes</MenuItem>
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
          title="Aucun client"
          description="Aucun client ne correspond à vos critères de recherche."
          actionLabel="Nouveau client"
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
    </Box>
  );
}

export default Clients;
