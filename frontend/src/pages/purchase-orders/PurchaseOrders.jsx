import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Link,
  Stack,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Add, Visibility, Edit, Search, Business } from '@mui/icons-material';
import { purchaseOrdersAPI } from '../../services/api';
import EmptyState from '../../components/EmptyState';

function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [filteredPurchaseOrders, setFilteredPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const response = await purchaseOrdersAPI.list();
      const orders = response.data.results || response.data;
      setPurchaseOrders(orders);
      setFilteredPurchaseOrders(orders);
    } catch (err) {
      setError('Erreur lors du chargement des bons de commande');
      console.error('Error fetching purchase orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchTerm) {
      setFilteredPurchaseOrders(purchaseOrders);
    } else {
      const filtered = purchaseOrders.filter(po =>
        po.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPurchaseOrders(filtered);
    }
  }, [searchTerm, purchaseOrders]);

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      pending: 'warning',
      approved: 'success',
      sent: 'info',
      received: 'success',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: 'Brouillon',
      pending: 'En attente',
      approved: 'Approuvé',
      sent: 'Envoyé',
      received: 'Reçu',
      cancelled: 'Annulé'
    };
    return labels[status] || status;
  };

  const MobilePurchaseOrderCard = ({ po }) => (
    <Card sx={{
      mb: 1.5,
      borderRadius: 3,
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        borderColor: 'primary.main',
        background: 'rgba(255, 255, 255, 0.95)'
      }
    }}>
      <CardContent sx={{ p: 1.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.75}>
          <Box>
            <Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
              {po.po_number}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {po.title}
            </Typography>
          </Box>
          <Chip
            label={getStatusLabel(po.status)}
            color={getStatusColor(po.status)}
            size="small"
            sx={{ fontSize: '0.7rem', height: 20, fontWeight: 500 }}
          />
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Business fontSize="small" sx={{ color: 'text.secondary', fontSize: '0.875rem' }} />
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              {po.supplier_name || po.supplier?.name || 'N/A'}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
            {po.total_amount} CAD
          </Typography>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.25}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            {new Date(po.created_at).toLocaleDateString('fr-FR')}
          </Typography>
        </Box>

        <Divider sx={{ mb: 1.25, opacity: 0.6 }} />

        <Stack direction="row" spacing={0.75} justifyContent="flex-end">
          <Button
            size="small"
            startIcon={<Visibility />}
            onClick={() => navigate(`/purchase-orders/${po.id}`)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.75rem',
              px: 2,
              py: 0.5,
              minHeight: 28,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)'
              }
            }}
          >
            Voir
          </Button>
          <Button
            size="small"
            startIcon={<Edit />}
            onClick={() => navigate(`/purchase-orders/${po.id}/edit`)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.75rem',
              px: 2,
              py: 0.5,
              minHeight: 28,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 2px 8px rgba(66, 66, 66, 0.3)'
              }
            }}
          >
            Modifier
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
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
    <Box p={isMobile ? 2 : 3}>
      {/* Filtres de recherche */}
      <Box mb={2.5}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Rechercher par numéro, titre ou fournisseur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                  borderWidth: 2
                }
              },
              '&.Mui-focused': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                  borderWidth: 2
                }
              }
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {isMobile ? (
        <Box>
          {filteredPurchaseOrders.map((po) => (
            <MobilePurchaseOrderCard key={po.id} po={po} />
          ))}
          {filteredPurchaseOrders.length === 0 && purchaseOrders.length > 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="textSecondary">
                Aucun bon de commande ne correspond à votre recherche
              </Typography>
            </Box>
          )}
          {purchaseOrders.length === 0 && (
            <EmptyState
              title="Aucun bon de commande"
              description="Vous n'avez pas encore créé de bon de commande. Commencez par créer votre premier bon de commande pour gérer vos achats."
              mascotPose="thinking"
              actionLabel="Créer le premier bon de commande"
              onAction={() => navigate('/purchase-orders/new')}
            />
          )}
        </Box>
      ) : (
        <Card sx={{
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          <CardContent sx={{ p: 0 }}>
            <TableContainer component={Paper} sx={{
              borderRadius: 0,
              background: 'transparent',
              boxShadow: 'none'
            }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Numéro</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Titre</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Fournisseur</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Statut</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Montant total</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Date de création</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPurchaseOrders.map((po) => (
                    <TableRow key={po.id} hover sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.04)',
                        transform: 'scale(1.001)'
                      }
                    }}>
                      <TableCell onClick={() => navigate(`/purchase-orders/${po.id}`)} sx={{ py: 1.5 }}>
                        <Link
                          component="button"
                          variant="body1"
                          onClick={() => navigate(`/purchase-orders/${po.id}`)}
                          sx={{
                            textDecoration: 'none',
                            color: 'primary.main',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            '&:hover': {
                              textDecoration: 'underline',
                            },
                          }}
                        >
                          {po.po_number}
                        </Link>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                          {po.title}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        {po.supplier ? (
                          <Link
                            component="button"
                            variant="body1"
                            onClick={() => navigate(`/suppliers/${po.supplier.id || po.supplier}`)}
                            sx={{
                              textDecoration: 'none',
                              color: 'primary.main',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              fontSize: '0.875rem',
                              '&:hover': {
                                textDecoration: 'underline',
                              },
                            }}
                          >
                            <Business fontSize="small" />
                            {po.supplier_name || po.supplier.name || 'N/A'}
                          </Link>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                            <Business fontSize="small" />
                            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                              {po.supplier_name || 'N/A'}
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Chip
                          label={getStatusLabel(po.status)}
                          color={getStatusColor(po.status)}
                          size="small"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                          {po.total_amount} CAD
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                          {new Date(po.created_at).toLocaleDateString('fr-FR')}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Button
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => navigate(`/purchase-orders/${po.id}`)}
                            sx={{
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: 500,
                              fontSize: '0.75rem',
                              px: 2,
                              py: 0.5,
                              minHeight: 28,
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                transform: 'scale(1.05)',
                                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)'
                              }
                            }}
                          >
                            Voir
                          </Button>
                          <Button
                            size="small"
                            startIcon={<Edit />}
                            onClick={() => navigate(`/purchase-orders/${po.id}/edit`)}
                            sx={{
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: 500,
                              fontSize: '0.75rem',
                              px: 2,
                              py: 0.5,
                              minHeight: 28,
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                transform: 'scale(1.05)',
                                boxShadow: '0 2px 8px rgba(66, 66, 66, 0.3)'
                              }
                            }}
                          >
                            Modifier
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default PurchaseOrders;