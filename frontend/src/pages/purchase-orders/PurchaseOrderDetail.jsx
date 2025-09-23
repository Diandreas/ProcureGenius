import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Edit,
  Delete,
  Print,
  Email,
  CheckCircle,
  Schedule,
  Warning,
  Block,
  ArrowBack,
  MoreVert,
  AttachMoney,
  Business,
  Person,
  CalendarToday,
  Receipt,
  Add,
  Remove,
  Download,
  Send,
  Done,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { purchaseOrdersAPI } from '../../services/api';
import { getStatusColor, getStatusLabel, formatDate, formatCurrency } from '../../utils/formatters';

function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unit_price: 0,
    product_reference: ''
  });

  useEffect(() => {
    fetchPurchaseOrder();
  }, [id]);

  const fetchPurchaseOrder = async () => {
    setLoading(true);
    try {
      const response = await purchaseOrdersAPI.get(id);
      setPurchaseOrder(response.data);
    } catch (error) {
      enqueueSnackbar('Erreur lors du chargement du bon de commande', { variant: 'error' });
      navigate('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/purchase-orders/${id}/edit`);
  };

  const handleDelete = async () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ce bon de commande ?`)) {
      try {
        await purchaseOrdersAPI.delete(id);
        enqueueSnackbar('Bon de commande supprimé avec succès', { variant: 'success' });
        navigate('/purchase-orders');
      } catch (error) {
        enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
      }
    }
  };

  const handleApprove = async () => {
    try {
      const response = await purchaseOrdersAPI.approve(id);
      setPurchaseOrder(response.data);
      enqueueSnackbar('Bon de commande approuvé avec succès', { variant: 'success' });
      setApproveDialogOpen(false);
    } catch (error) {
      enqueueSnackbar('Erreur lors de l\'approbation', { variant: 'error' });
    }
  };

  const handleAddItem = async () => {
    try {
      const response = await purchaseOrdersAPI.addItem(id, newItem);
      await fetchPurchaseOrder(); // Reload to get updated totals
      enqueueSnackbar('Article ajouté avec succès', { variant: 'success' });
      setAddItemDialogOpen(false);
      setNewItem({ description: '', quantity: 1, unit_price: 0, product_reference: '' });
    } catch (error) {
      enqueueSnackbar('Erreur lors de l\'ajout de l\'article', { variant: 'error' });
    }
  };

  const handlePrintPDF = async () => {
    try {
      await purchaseOrdersAPI.printPDF(id);
      enqueueSnackbar('PDF généré avec succès', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erreur lors de la génération du PDF', { variant: 'error' });
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      draft: <Edit color="action" />,
      pending: <Schedule color="warning" />,
      approved: <CheckCircle color="success" />,
      sent: <Send color="info" />,
      received: <CheckCircle color="success" />,
      cancelled: <Block color="error" />,
    };
    return icons[status] || null;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!purchaseOrder) {
    return (
      <Alert severity="error">
        Bon de commande introuvable
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/purchase-orders')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            {purchaseOrder.po_number}
          </Typography>
          <Chip
            icon={getStatusIcon(purchaseOrder.status)}
            label={getStatusLabel(purchaseOrder.status)}
            color={getStatusColor(purchaseOrder.status)}
            size="large"
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={handlePrintPDF}
          >
            Imprimer PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={handleEdit}
          >
            Modifier
          </Button>
          {purchaseOrder.status === 'draft' && (
            <Button
              variant="contained"
              startIcon={<Done />}
              onClick={() => setApproveDialogOpen(true)}
              color="success"
            >
              Approuver
            </Button>
          )}
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MoreVert />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={() => setAddItemDialogOpen(true)}>
              <Add fontSize="small" sx={{ mr: 1 }} />
              Ajouter un article
            </MenuItem>
            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
              <Delete fontSize="small" sx={{ mr: 1 }} />
              Supprimer
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {/* Order Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informations générales
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h5" sx={{ mb: 2 }}>
                    {purchaseOrder.title}
                  </Typography>
                </Grid>
                {purchaseOrder.description && (
                  <Grid item xs={12}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Description
                      </Typography>
                      <Typography>{purchaseOrder.description}</Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Articles commandés
                </Typography>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => setAddItemDialogOpen(true)}
                  disabled={purchaseOrder.status !== 'draft'}
                >
                  Ajouter un article
                </Button>
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Référence</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Quantité</TableCell>
                      <TableCell align="right">Prix unitaire</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {purchaseOrder.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.product_reference || '-'}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.total_price)}</TableCell>
                      </TableRow>
                    ))}
                    {(!purchaseOrder.items || purchaseOrder.items.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                          <Typography color="text.secondary">
                            Aucun article dans ce bon de commande
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Résumé financier
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                    <Typography variant="h4" color="primary">
                      {formatCurrency(purchaseOrder.subtotal || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sous-total
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                    <Typography variant="h4" color="warning.main">
                      {formatCurrency(purchaseOrder.tax_amount || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Taxes
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                    <Typography variant="h4" color="success.main">
                      {formatCurrency(purchaseOrder.total_amount || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Supplier Info */}
          {purchaseOrder.supplier && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Fournisseur
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <Business />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                      {purchaseOrder.supplier.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {purchaseOrder.supplier.email}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => navigate(`/suppliers/${purchaseOrder.supplier.id}`)}
                >
                  Voir le fournisseur
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Dates */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Dates importantes
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CalendarToday color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Date de création"
                    secondary={formatDate(purchaseOrder.created_at)}
                  />
                </ListItem>
                {purchaseOrder.required_date && (
                  <ListItem>
                    <ListItemIcon>
                      <Schedule color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Date requise"
                      secondary={formatDate(purchaseOrder.required_date)}
                    />
                  </ListItem>
                )}
                <ListItem>
                  <ListItemIcon>
                    <Edit color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Dernière modification"
                    secondary={formatDate(purchaseOrder.updated_at)}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Created By */}
          {purchaseOrder.created_by && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Créé par
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                    <Person />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1">
                      {purchaseOrder.created_by.first_name} {purchaseOrder.created_by.last_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {purchaseOrder.created_by.email}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)}>
        <DialogTitle>Approuver le bon de commande</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir approuver ce bon de commande ? Cette action ne peut pas être annulée.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleApprove} color="success" variant="contained">
            Approuver
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onClose={() => setAddItemDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajouter un article</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Référence produit"
                value={newItem.product_reference}
                onChange={(e) => setNewItem({ ...newItem, product_reference: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                required
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Quantité"
                type="number"
                required
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Prix unitaire"
                type="number"
                required
                value={newItem.unit_price}
                onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddItemDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleAddItem}
            variant="contained"
            disabled={!newItem.description || newItem.quantity <= 0}
          >
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PurchaseOrderDetail;