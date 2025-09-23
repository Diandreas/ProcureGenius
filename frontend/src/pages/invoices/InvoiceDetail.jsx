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
  Payment,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { invoicesAPI } from '../../services/api';
import { getStatusColor, getStatusLabel, formatDate, formatCurrency } from '../../utils/formatters';

function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    notes: ''
  });
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unit_price: 0,
    product_reference: ''
  });

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const response = await invoicesAPI.get(id);
      setInvoice(response.data);
    } catch (error) {
      enqueueSnackbar('Erreur lors du chargement de la facture', { variant: 'error' });
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/invoices/${id}/edit`);
  };

  const handleDelete = async () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer cette facture ?`)) {
      try {
        await invoicesAPI.delete(id);
        enqueueSnackbar('Facture supprimée avec succès', { variant: 'success' });
        navigate('/invoices');
      } catch (error) {
        enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
      }
    }
  };

  const handleSend = async () => {
    try {
      const response = await invoicesAPI.send(id);
      setInvoice(response.data);
      enqueueSnackbar('Facture envoyée avec succès', { variant: 'success' });
      setSendDialogOpen(false);
    } catch (error) {
      enqueueSnackbar('Erreur lors de l\'envoi', { variant: 'error' });
    }
  };

  const handleMarkPaid = async () => {
    try {
      const response = await invoicesAPI.markPaid(id, paymentData);
      setInvoice(response.data);
      enqueueSnackbar('Facture marquée comme payée', { variant: 'success' });
      setMarkPaidDialogOpen(false);
      setPaymentData({ payment_date: new Date().toISOString().split('T')[0], payment_method: '', notes: '' });
    } catch (error) {
      enqueueSnackbar('Erreur lors du marquage du paiement', { variant: 'error' });
    }
  };

  const handleAddItem = async () => {
    try {
      const response = await invoicesAPI.addItem(id, newItem);
      await fetchInvoice(); // Reload to get updated totals
      enqueueSnackbar('Article ajouté avec succès', { variant: 'success' });
      setAddItemDialogOpen(false);
      setNewItem({ description: '', quantity: 1, unit_price: 0, product_reference: '' });
    } catch (error) {
      enqueueSnackbar('Erreur lors de l\'ajout de l\'article', { variant: 'error' });
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      draft: <Edit color="action" />,
      sent: <Send color="info" />,
      paid: <CheckCircle color="success" />,
      overdue: <Warning color="error" />,
      cancelled: <Block color="error" />,
    };
    return icons[status] || null;
  };

  const isOverdue = () => {
    if (!invoice?.due_date || invoice.status === 'paid') return false;
    return new Date(invoice.due_date) < new Date() && invoice.status === 'sent';
  };

  const getDaysOverdue = () => {
    if (!isOverdue()) return 0;
    const today = new Date();
    const dueDate = new Date(invoice.due_date);
    return Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!invoice) {
    return (
      <Alert severity="error">
        Facture introuvable
      </Alert>
    );
  }

  const actualStatus = isOverdue() ? 'overdue' : invoice.status;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/invoices')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            {invoice.invoice_number}
          </Typography>
          <Chip
            icon={getStatusIcon(isOverdue() ? 'overdue' : invoice.status)}
            label={isOverdue() ? `En retard (${getDaysOverdue()} jours)` : getStatusLabel(invoice.status)}
            color={isOverdue() ? 'error' : getStatusColor(invoice.status)}
            size="large"
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={() => window.print()}
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
          {invoice.status === 'draft' && (
            <Button
              variant="contained"
              startIcon={<Send />}
              onClick={() => setSendDialogOpen(true)}
              color="primary"
            >
              Envoyer
            </Button>
          )}
          {(invoice.status === 'sent' || isOverdue()) && (
            <Button
              variant="contained"
              startIcon={<Payment />}
              onClick={() => setMarkPaidDialogOpen(true)}
              color="success"
            >
              Marquer payée
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
            <MenuItem onClick={() => setAddItemDialogOpen(true)} disabled={invoice.status !== 'draft'}>
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
          {/* Invoice Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informations générales
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h5" sx={{ mb: 2 }}>
                    {invoice.title}
                  </Typography>
                </Grid>
                {invoice.description && (
                  <Grid item xs={12}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Description
                      </Typography>
                      <Typography>{invoice.description}</Typography>
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
                  Articles facturés
                </Typography>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => setAddItemDialogOpen(true)}
                  disabled={invoice.status !== 'draft'}
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
                    {invoice.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.product_reference || '-'}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.total_price)}</TableCell>
                      </TableRow>
                    ))}
                    {(!invoice.items || invoice.items.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                          <Typography color="text.secondary">
                            Aucun article dans cette facture
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
                      {formatCurrency(invoice.subtotal || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sous-total
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                    <Typography variant="h4" color="warning.main">
                      {formatCurrency(invoice.tax_amount || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Taxes
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                    <Typography variant="h4" color="success.main">
                      {formatCurrency(invoice.total_amount || 0)}
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
          {/* Client Info */}
          {invoice.client && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Client
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                    <Business />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                      {invoice.client.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {invoice.client.email}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => navigate(`/clients/${invoice.client.id}`)}
                >
                  Voir le client
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
                    secondary={formatDate(invoice.created_at)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Send color="info" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Date d'émission"
                    secondary={formatDate(invoice.issue_date)}
                  />
                </ListItem>
                {invoice.due_date && (
                  <ListItem>
                    <ListItemIcon>
                      <Schedule color={isOverdue() ? "error" : "warning"} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Date d'échéance"
                      secondary={
                        <Box>
                          <Typography variant="body2" color={isOverdue() ? "error" : "inherit"}>
                            {formatDate(invoice.due_date)}
                          </Typography>
                          {isOverdue() && (
                            <Typography variant="caption" color="error">
                              En retard de {getDaysOverdue()} jours
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                )}
                {invoice.payment_date && (
                  <ListItem>
                    <ListItemIcon>
                      <Payment color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Date de paiement"
                      secondary={formatDate(invoice.payment_date)}
                    />
                  </ListItem>
                )}
                <ListItem>
                  <ListItemIcon>
                    <Edit color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Dernière modification"
                    secondary={formatDate(invoice.updated_at)}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Payment Info */}
          {invoice.status === 'paid' && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Informations de paiement
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Méthode de paiement"
                      secondary={invoice.payment_method || 'Non spécifié'}
                    />
                  </ListItem>
                  {invoice.payment_reference && (
                    <ListItem>
                      <ListItemText
                        primary="Référence de paiement"
                        secondary={invoice.payment_reference}
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          )}

          {/* Created By */}
          {invoice.created_by && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Créé par
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <Person />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1">
                      {invoice.created_by.first_name} {invoice.created_by.last_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {invoice.created_by.email}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Send Dialog */}
      <Dialog open={sendDialogOpen} onClose={() => setSendDialogOpen(false)}>
        <DialogTitle>Envoyer la facture</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir envoyer cette facture au client ? Elle ne pourra plus être modifiée.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleSend} color="primary" variant="contained">
            Envoyer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mark Paid Dialog */}
      <Dialog open={markPaidDialogOpen} onClose={() => setMarkPaidDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Marquer comme payée</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Date de paiement"
                type="date"
                value={paymentData.payment_date}
                onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Méthode de paiement"
                value={paymentData.payment_method}
                onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                placeholder="Ex: Virement, Chèque, Espèces..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                placeholder="Notes additionnelles..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMarkPaidDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleMarkPaid}
            variant="contained"
            color="success"
          >
            Marquer payée
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

export default InvoiceDetail;