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
  FormControl,
  InputLabel,
  Select,
  Stack,
  useMediaQuery,
  useTheme,
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
  PictureAsPdf,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { invoicesAPI } from '../../services/api';
import { getStatusColor, getStatusLabel, formatDate, formatCurrency } from '../../utils/formatters';
import { generateInvoicePDF, downloadPDF, openPDFInNewTab, TEMPLATE_TYPES } from '../../services/pdfService';

function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATE_TYPES.CLASSIC);
  const [generatingPdf, setGeneratingPdf] = useState(false);
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

  const handleGeneratePDF = async (action = 'download') => {
    setGeneratingPdf(true);
    try {
      const pdfBlob = await generateInvoicePDF(invoice, selectedTemplate);

      if (action === 'download') {
        downloadPDF(pdfBlob, `facture-${invoice.invoice_number}.pdf`);
        enqueueSnackbar('PDF téléchargé avec succès', { variant: 'success' });
      } else if (action === 'preview') {
        openPDFInNewTab(pdfBlob);
      }

      setPdfDialogOpen(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      enqueueSnackbar('Erreur lors de la génération du PDF', { variant: 'error' });
    } finally {
      setGeneratingPdf(false);
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

  const MobileInvoiceInfoCard = ({ invoice }) => (
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
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
          <Box>
            <Typography variant="h6" sx={{
              fontSize: '1rem',
              fontWeight: 600,
              mb: 0.5,
              letterSpacing: '-0.01em',
              lineHeight: 1.3
            }}>
              {invoice.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{
              fontSize: '0.8rem',
              lineHeight: 1.4
            }}>
              {invoice.invoice_number}
            </Typography>
          </Box>
          <Chip
            icon={getStatusIcon(isOverdue() ? 'overdue' : invoice.status)}
            label={isOverdue() ? `En retard (${getDaysOverdue()} jours)` : getStatusLabel(invoice.status)}
            color={isOverdue() ? 'error' : getStatusColor(invoice.status)}
            size="small"
            sx={{ fontSize: '0.7rem', height: 20, fontWeight: 500 }}
          />
        </Box>

        {invoice.description && (
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', mb: 0.5 }}>
              Description
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              {invoice.description}
            </Typography>
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        <Stack direction="row" spacing={0.75} justifyContent="flex-end">
          <IconButton
            size="small"
            onClick={() => setPdfDialogOpen(true)}
            sx={{
              bgcolor: 'rgba(25, 118, 210, 0.08)',
              color: 'primary.main',
              width: 28,
              height: 28,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: 'primary.main',
                color: 'white',
                transform: 'scale(1.1)',
                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)'
              }
            }}
          >
            <PictureAsPdf fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleEdit}
            sx={{
              bgcolor: 'rgba(66, 66, 66, 0.08)',
              color: 'text.secondary',
              width: 28,
              height: 28,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: 'secondary.main',
                color: 'white',
                transform: 'scale(1.1)',
                boxShadow: '0 2px 8px rgba(66, 66, 66, 0.3)'
              }
            }}
          >
            <Edit fontSize="small" />
          </IconButton>
          {invoice.status === 'draft' && (
            <IconButton
              size="small"
              onClick={() => setSendDialogOpen(true)}
              sx={{
                bgcolor: 'rgba(46, 125, 50, 0.08)',
                color: 'success.main',
                width: 28,
                height: 28,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: 'success.main',
                  color: 'white',
                  transform: 'scale(1.1)',
                  boxShadow: '0 2px 8px rgba(46, 125, 50, 0.3)'
                }
              }}
            >
              <Send fontSize="small" />
            </IconButton>
          )}
          {(invoice.status === 'sent' || isOverdue()) && (
            <IconButton
              size="small"
              onClick={() => setMarkPaidDialogOpen(true)}
              sx={{
                bgcolor: 'rgba(255, 152, 0, 0.08)',
                color: 'warning.main',
                width: 28,
                height: 28,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: 'warning.main',
                  color: 'white',
                  transform: 'scale(1.1)',
                  boxShadow: '0 2px 8px rgba(255, 152, 0, 0.3)'
                }
              }}
            >
              <Payment fontSize="small" />
            </IconButton>
          )}
        </Stack>
      </CardContent>
    </Card>
  );

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
    <Box p={isMobile ? 2 : 3}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={() => navigate('/invoices')}
            sx={{
              bgcolor: 'grey.100',
              '&:hover': { bgcolor: 'grey.200' }
            }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" sx={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 600 }}>
            {invoice.invoice_number}
          </Typography>
        </Box>
        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<PictureAsPdf />}
              onClick={() => setPdfDialogOpen(true)}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Générer PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={handleEdit}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Modifier
            </Button>
            {invoice.status === 'draft' && (
              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={() => setSendDialogOpen(true)}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
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
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Marquer payée
              </Button>
            )}
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                bgcolor: 'grey.100',
                '&:hover': { bgcolor: 'grey.200' }
              }}
            >
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
        )}
      </Box>

      {isMobile ? (
        <Box>
          <MobileInvoiceInfoCard invoice={invoice} />

          {/* Client Info Mobile */}
          {invoice.client && (
            <Card sx={{ mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1.5 }}>
                  Client
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                    <Business fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {invoice.client.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      {invoice.client.email}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={() => navigate(`/clients/${invoice.client.id}`)}
                  sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.875rem' }}
                >
                  Voir le client
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Financial Summary Mobile */}
          <Card sx={{ mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1.5 }}>
                Résumé financier
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'primary.50', borderRadius: 1 }}>
                    <Typography variant="h6" color="primary" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                      {formatCurrency(invoice.subtotal || 0)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Sous-total
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'warning.50', borderRadius: 1 }}>
                    <Typography variant="h6" color="warning.main" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                      {formatCurrency(invoice.tax_amount || 0)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Taxes
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'success.50', borderRadius: 1 }}>
                    <Typography variant="h6" color="success.main" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                      {formatCurrency(invoice.total_amount || 0)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Total
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Items Table Mobile */}
          <Card sx={{ mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1.5 }}>
                Articles facturés
              </Typography>
              {invoice.items?.map((item, index) => (
                <Box key={index} sx={{ mb: 1.5, pb: 1.5, borderBottom: index < invoice.items.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {item.product_reference || 'N/A'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {formatCurrency(item.total_price)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                    {item.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {item.quantity} × {formatCurrency(item.unit_price)}
                  </Typography>
                </Box>
              ))}
              {(!invoice.items || invoice.items.length === 0) && (
                <Typography color="text.secondary" sx={{ fontSize: '0.875rem', textAlign: 'center', py: 2 }}>
                  Aucun article dans cette facture
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Dates Mobile */}
          <Card sx={{ mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1.5 }}>
                Dates importantes
              </Typography>
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Création
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    {formatDate(invoice.created_at)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Émission
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    {formatDate(invoice.issue_date)}
                  </Typography>
                </Box>
                {invoice.due_date && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Échéance
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: isOverdue() ? 'error.main' : 'inherit' }}>
                      {formatDate(invoice.due_date)}
                    </Typography>
                  </Box>
                )}
                {invoice.payment_date && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Paiement
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      {formatDate(invoice.payment_date)}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Main Content */}
          <Grid item xs={12} md={8}>
            {/* Invoice Info */}
            <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Informations générales
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
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
            <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Articles facturés
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => setAddItemDialogOpen(true)}
                    disabled={invoice.status !== 'draft'}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    Ajouter un article
                  </Button>
                </Box>
                <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Référence</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Quantité</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Prix unitaire</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoice.items?.map((item, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{item.product_reference || '-'}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(item.total_price)}</TableCell>
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
            <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Résumé financier
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                      <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                        {formatCurrency(invoice.subtotal || 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Sous-total
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                      <Typography variant="h4" color="warning.main" sx={{ fontWeight: 600 }}>
                        {formatCurrency(invoice.tax_amount || 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Taxes
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                      <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
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
              <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Client
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'secondary.main' }}>
                      <Business />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
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
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    Voir le client
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Dates */}
            <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
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
              <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
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
              <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Créé par
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <Person />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
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
      )}

      {/* Send Dialog */}
      <Dialog open={sendDialogOpen} onClose={() => setSendDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 600 }}>Envoyer la facture</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir envoyer cette facture au client ? Elle ne pourra plus être modifiée.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendDialogOpen(false)} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Annuler
          </Button>
          <Button
            onClick={handleSend}
            color="primary"
            variant="contained"
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
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

      {/* PDF Generation Dialog */}
      <Dialog open={pdfDialogOpen} onClose={() => setPdfDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Générer un PDF de la facture</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Modèle de facture</InputLabel>
              <Select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                label="Modèle de facture"
              >
                <MenuItem value={TEMPLATE_TYPES.CLASSIC}>Classique</MenuItem>
                <MenuItem value={TEMPLATE_TYPES.MODERN}>Moderne</MenuItem>
                <MenuItem value={TEMPLATE_TYPES.MINIMAL}>Minimaliste</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary">
              Choisissez le style de votre facture. Le PDF sera généré avec un QR code de vérification.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPdfDialogOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => handleGeneratePDF('preview')}
            variant="outlined"
            disabled={generatingPdf}
            startIcon={<Print />}
          >
            Aperçu
          </Button>
          <Button
            onClick={() => handleGeneratePDF('download')}
            variant="contained"
            disabled={generatingPdf}
            startIcon={generatingPdf ? <CircularProgress size={20} /> : <Download />}
          >
            {generatingPdf ? 'Génération...' : 'Télécharger'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default InvoiceDetail;