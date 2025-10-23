import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, IconButton, TextField, InputAdornment,
  FormControl, InputLabel, Select, MenuItem, Grid, Chip, Avatar, Stack,
  CircularProgress, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Search, FilterList, ShoppingCart, AttachMoney, CheckCircle, Schedule, Business,
  Description, HourglassEmpty, Cancel,
} from '@mui/icons-material';
import { purchaseOrdersAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import EmptyState from '../../components/EmptyState';

function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const response = await purchaseOrdersAPI.list();
      setPurchaseOrders(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
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

  const getStatusColor = (status) => {
    const colors = { draft: 'default', sent: 'info', approved: 'success', cancelled: 'error' };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = { draft: 'Brouillon', sent: 'Envoyé', approved: 'Approuvé', cancelled: 'Annulé' };
    return labels[status] || status;
  };

  const filteredPurchaseOrders = purchaseOrders.filter(po => {
    const matchesSearch = !searchTerm ||
      po.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || po.status === statusFilter;

    const matchesQuick = !quickFilter || (() => {
      if (quickFilter === 'draft') return po.status === 'draft';
      if (quickFilter === 'sent') return po.status === 'sent';
      if (quickFilter === 'approved') return po.status === 'approved';
      if (quickFilter === 'cancelled') return po.status === 'cancelled';
      return true;
    })();

    return matchesSearch && matchesStatus && matchesQuick;
  });

  const totalPOs = purchaseOrders.length;
  const draftPOs = purchaseOrders.filter(po => po.status === 'draft').length;
  const pendingPOs = purchaseOrders.filter(po => po.status === 'sent').length;
  const approvedPOs = purchaseOrders.filter(po => po.status === 'approved').length;
  const cancelledPOs = purchaseOrders.filter(po => po.status === 'cancelled').length;
  const totalAmount = purchaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0);

  const POCard = ({ po }) => (
    <Card
      onClick={() => navigate(`/purchase-orders/${po.id}`)}
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
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
          <Avatar
            sx={{
              width: isMobile ? 48 : 56,
              height: isMobile ? 48 : 56,
              bgcolor: 'primary.main',
              borderRadius: 1,
            }}
          >
            <ShoppingCart />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                mb: 0.5,
                fontSize: isMobile ? '0.875rem' : '0.95rem',
                color: 'primary.main',
              }}
            >
              {po.po_number}
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
              {po.title}
            </Typography>
          </Box>
        </Box>

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
            {formatCurrency(po.total_amount)}
          </Typography>
        </Box>

        <Stack spacing={0.75}>
          {po.supplier_name && (
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
                {po.supplier_name}
              </Typography>
            </Box>
          )}
          {po.delivery_date && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Schedule sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                Livraison: {formatDate(po.delivery_date)}
              </Typography>
            </Box>
          )}
        </Stack>

        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={getStatusLabel(po.status)}
            size="small"
            color={getStatusColor(po.status)}
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

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" gutterBottom>
          Bons de commande
        </Typography>

        {/* Stats Cards - Clickable Filters */}
        <Grid container spacing={isMobile ? 1 : 2} sx={{ mt: 1 }}>
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
                      {draftPOs}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      Brouillons
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* En attente */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('sent')}
              sx={{
                borderRadius: 2,
                bgcolor: 'warning.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === 'sent' ? 'warning.main' : 'transparent',
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
                  <HourglassEmpty sx={{ fontSize: isMobile ? 20 : 24, color: 'warning.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="warning.main">
                      {pendingPOs}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      En attente
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Approuvés */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('approved')}
              sx={{
                borderRadius: 2,
                bgcolor: 'success.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === 'approved' ? 'success.main' : 'transparent',
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
                      {approvedPOs}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      Approuvés
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Annulés */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('cancelled')}
              sx={{
                borderRadius: 2,
                bgcolor: 'error.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === 'cancelled' ? 'error.main' : 'transparent',
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
                  <Cancel sx={{ fontSize: isMobile ? 20 : 24, color: 'error.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="error.main">
                      {cancelledPOs}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      Annulés
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
                  <ShoppingCart sx={{ fontSize: isMobile ? 20 : 24, color: 'primary.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="primary.main">
                      {totalPOs}
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
                quickFilter === 'draft' ? 'Brouillons' :
                quickFilter === 'sent' ? 'En attente' :
                quickFilter === 'approved' ? 'Approuvés' :
                quickFilter === 'cancelled' ? 'Annulés' : ''
              }
              onDelete={() => setQuickFilter('')}
              color={
                quickFilter === 'draft' ? 'default' :
                quickFilter === 'sent' ? 'warning' :
                quickFilter === 'approved' ? 'success' :
                quickFilter === 'cancelled' ? 'error' : 'primary'
              }
              size="small"
            />
          </Box>
        )}
      </Box>

      <Card sx={{ mb: 3, borderRadius: 1 }}>
        <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Rechercher un bon de commande..."
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
                      <MenuItem value="sent">Envoyé</MenuItem>
                      <MenuItem value="approved">Approuvé</MenuItem>
                      <MenuItem value="cancelled">Annulé</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}
          </Stack>
        </CardContent>
      </Card>

      {filteredPurchaseOrders.length === 0 ? (
        <EmptyState
          title="Aucun bon de commande"
          description="Aucun bon de commande ne correspond à vos critères de recherche."
          actionLabel="Nouveau bon de commande"
          onAction={() => navigate('/purchase-orders/new')}
        />
      ) : (
        <Grid container spacing={isMobile ? 2 : 3}>
          {filteredPurchaseOrders.map((po) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={po.id}>
              <POCard po={po} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

export default PurchaseOrders;
