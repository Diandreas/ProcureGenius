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
} from '@mui/material';
import { Add, Visibility, Edit, Search, Business } from '@mui/icons-material';
import { purchaseOrdersAPI } from '../../services/api';

function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [filteredPurchaseOrders, setFilteredPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

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
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/purchase-orders/new')}
        >
          Nouveau bon de commande
        </Button>
      </Box>

      <Box mb={3}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Rechercher par numéro, titre ou fournisseur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Numéro</TableCell>
                  <TableCell>Titre</TableCell>
                  <TableCell>Fournisseur</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Montant total</TableCell>
                  <TableCell>Date de création</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPurchaseOrders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell>
                      <Link
                        component="button"
                        variant="body1"
                        onClick={() => navigate(`/purchase-orders/${po.id}`)}
                        sx={{
                          textDecoration: 'none',
                          color: 'primary.main',
                          fontWeight: 'medium',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        {po.po_number}
                      </Link>
                    </TableCell>
                    <TableCell>{po.title}</TableCell>
                    <TableCell>
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
                          {po.supplier_name || 'N/A'}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(po.status)}
                        color={getStatusColor(po.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{po.total_amount} CAD</TableCell>
                    <TableCell>
                      {new Date(po.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => navigate(`/purchase-orders/${po.id}`)}
                      >
                        Voir
                      </Button>
                      <Button
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => navigate(`/purchase-orders/${po.id}/edit`)}
                        sx={{ ml: 1 }}
                      >
                        Modifier
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {filteredPurchaseOrders.length === 0 && purchaseOrders.length > 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="textSecondary">
                Aucun bon de commande ne correspond à votre recherche
              </Typography>
            </Box>
          )}

          {purchaseOrders.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="textSecondary">
                Aucun bon de commande trouvé
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/purchase-orders/new')}
                sx={{ mt: 2 }}
              >
                Créer le premier bon de commande
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default PurchaseOrders;