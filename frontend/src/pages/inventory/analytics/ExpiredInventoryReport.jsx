import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Paper, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, Button,
  Alert, Card, CardContent, Divider
} from '@mui/material';
import {
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  ArrowBack as ArrowBackIcon,
  DeleteForever as WasteIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import LoadingState from '../../../components/LoadingState';
import useCurrency from '../../../hooks/useCurrency';
import dayjs from 'dayjs';

const ExpiredInventoryReport = () => {
  const navigate = useNavigate();
  const { format: formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/products/expired_report/');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching expired report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState />;

  const { summary, expired_products, expired_batches } = data || {
    summary: { total_expired_products: 0, total_expired_batches: 0, estimated_loss_value: 0 },
    expired_products: [],
    expired_batches: []
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box display="flex" alignItems="center" gap={2} mb={4}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
            Retour
          </Button>
          <Box flexGrow={1}>
            <Typography variant="h4" fontWeight="700" color="error.main">
              Rapport des Produits Périmés
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Inventaire des produits et lots à isoler pour destruction ou retour fournisseur
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<PdfIcon />}>
            Exporter PDF
          </Button>
        </Box>

        {/* Summary */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderLeft: '6px solid', borderColor: 'error.main' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Perte Financière Estimée</Typography>
                <Typography variant="h4" fontWeight="bold" color="error.main">
                  {formatCurrency(summary.estimated_loss_value)}
                </Typography>
                <Typography variant="caption" color="text.secondary">Basé sur le prix d'achat</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderLeft: '6px solid', borderColor: 'warning.main' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Lots Spécifiques Périmés</Typography>
                <Typography variant="h4" fontWeight="bold">
                  {summary.total_expired_batches}
                </Typography>
                <Typography variant="caption" color="text.secondary">Nombre de lots à retirer</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderLeft: '6px solid', borderColor: 'info.main' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Produits Impactés</Typography>
                <Typography variant="h4" fontWeight="bold">
                  {summary.total_expired_products}
                </Typography>
                <Typography variant="caption" color="text.secondary">Fiches produits périmées</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Alert severity="error" icon={<WasteIcon />} sx={{ mb: 4, borderRadius: 2 }}>
          <strong>Consigne de sécurité :</strong> Tous les produits listés ci-dessous doivent être immédiatement retirés de la vente et déplacés vers une zone de quarantaine sécurisée.
        </Alert>

        {/* Expired Batches Table */}
        <Typography variant="h6" fontWeight="700" mb={2}>Lots et Batches Périmés</Typography>
        <TableContainer component={Paper} sx={{ mb: 5, borderRadius: 3, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'error.50' }}>
              <TableRow>
                <TableCell>Produit</TableCell>
                <TableCell>N° de Lot</TableCell>
                <TableCell>Date de Péremption</TableCell>
                <TableCell>Quantité à Isoler</TableCell>
                <TableCell>Valeur de la Perte</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expired_batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">Aucun lot périmé détecté</TableCell>
                </TableRow>
              ) : (
                expired_batches.map(batch => (
                  <TableRow key={batch.id}>
                    <TableCell fontWeight="bold">{batch.product_name}</TableCell>
                    <TableCell><Chip label={batch.batch_number} size="small" variant="outlined" /></TableCell>
                    <TableCell color="error.main">{dayjs(batch.expiry_date).format('DD/MM/YYYY')}</TableCell>
                    <TableCell><strong>{batch.quantity}</strong> unités</TableCell>
                    <TableCell color="error.main">{formatCurrency(batch.loss_value)}</TableCell>
                    <TableCell>
                      <Button size="small" color="error">Mettre au rebut</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Expired Products (Global) */}
        <Typography variant="h6" fontWeight="700" mb={2}>Produits avec Date Globale Dépassée</Typography>
        <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell>Référence</TableCell>
                <TableCell>Nom du Produit</TableCell>
                <TableCell>Date de Péremption</TableCell>
                <TableCell>Stock Total</TableCell>
                <TableCell>Valeur Estimée</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expired_products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">Aucun produit globalement périmé</TableCell>
                </TableRow>
              ) : (
                expired_products.map(product => (
                  <TableRow key={product.id}>
                    <TableCell>{product.reference}</TableCell>
                    <TableCell fontWeight="bold">{product.name}</TableCell>
                    <TableCell color="error.main">{dayjs(product.expiry_date).format('DD/MM/YYYY')}</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>{formatCurrency(product.loss_value)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </Box>
  );
};

export default ExpiredInventoryReport;
