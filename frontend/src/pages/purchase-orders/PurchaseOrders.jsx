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
} from '@mui/material';
import { Add, Visibility, Edit } from '@mui/icons-material';
import { purchaseOrdersAPI } from '../../services/api';

function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const response = await purchaseOrdersAPI.list();
      setPurchaseOrders(response.data.results || response.data);
    } catch (err) {
      setError('Erreur lors du chargement des bons de commande');
      console.error('Error fetching purchase orders:', err);
    } finally {
      setLoading(false);
    }
  };

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
        <Typography variant="h4">Bons de commande</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/purchase-orders/create')}
        >
          Nouveau bon de commande
        </Button>
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
                {purchaseOrders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell>{po.po_number}</TableCell>
                    <TableCell>{po.title}</TableCell>
                    <TableCell>{po.supplier_name || 'N/A'}</TableCell>
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

          {purchaseOrders.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="textSecondary">
                Aucun bon de commande trouvé
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/purchase-orders/create')}
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