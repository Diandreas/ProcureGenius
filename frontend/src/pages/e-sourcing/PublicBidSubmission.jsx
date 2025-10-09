import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  Checkbox,
  FormControlLabel,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function PublicBidSubmission() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState(null);
  const [canSubmit, setCanSubmit] = useState(false);
  const [error, setError] = useState(null);

  // Formulaire fournisseur
  const [supplierData, setSupplierData] = useState({
    supplier_name: '',
    supplier_email: '',
    supplier_phone: '',
    supplier_address: '',
  });

  // Formulaire soumission
  const [bidData, setBidData] = useState({
    cover_letter: '',
    technical_response: '',
    terms_accepted: false,
    tax_amount: 0,
    delivery_time_days: '',
  });

  // Items
  const [items, setItems] = useState([
    {
      product_reference: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      unit_of_measure: 'unité',
      specifications: '',
      notes: '',
    },
  ]);

  useEffect(() => {
    fetchEvent();
  }, [token]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`/api/v1/e-sourcing/public/${token}/`);
      setEvent(response.data.event);
      setCanSubmit(response.data.can_submit);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Impossible de charger l'événement");
      setLoading(false);
    }
  };

  const handleSupplierChange = (field, value) => {
    setSupplierData({ ...supplierData, [field]: value });
  };

  const handleBidChange = (field, value) => {
    setBidData({ ...bidData, [field]: value });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        product_reference: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        unit_of_measure: 'unité',
        specifications: '',
        notes: '',
      },
    ]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotal = () => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const total = subtotal + parseFloat(bidData.tax_amount || 0);
    return { subtotal, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!bidData.terms_accepted) {
      enqueueSnackbar('Vous devez accepter les termes et conditions', { variant: 'error' });
      return;
    }

    if (items.some((item) => !item.product_reference || !item.description)) {
      enqueueSnackbar('Tous les articles doivent avoir une référence et une description', {
        variant: 'error',
      });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        ...supplierData,
        ...bidData,
        delivery_time_days: bidData.delivery_time_days ? parseInt(bidData.delivery_time_days) : null,
        items: items.map((item) => ({
          product_reference: item.product_reference,
          description: item.description,
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price),
          unit_of_measure: item.unit_of_measure,
          specifications: item.specifications,
          notes: item.notes,
        })),
      };

      await axios.post(`/api/v1/e-sourcing/public/${token}/submit/`, payload);

      enqueueSnackbar('Votre offre a été soumise avec succès !', { variant: 'success' });

      // Afficher message de succès
      setEvent(null);
      setError(null);
      setCanSubmit(false);
    } catch (err) {
      enqueueSnackbar(
        err.response?.data?.message || "Erreur lors de la soumission de l'offre",
        { variant: 'error' }
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!canSubmit && event) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 3 }}>
        <Card sx={{ maxWidth: 600 }}>
          <CardContent>
            <Alert severity="warning">
              La date limite de soumission pour cet appel d'offres est dépassée.
            </Alert>
            <Typography variant="h6" sx={{ mt: 2 }}>
              {event.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Date limite : {format(new Date(event.submission_deadline), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (!event && !loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 3 }}>
        <Card sx={{ maxWidth: 600 }}>
          <CardContent>
            <Alert severity="success">
              <Typography variant="h6" gutterBottom>
                Votre offre a été soumise avec succès ! 🎉
              </Typography>
              <Typography variant="body2">
                Nous avons bien reçu votre soumission. Vous serez contacté par email si votre offre est retenue.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const { subtotal, total } = calculateTotal();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: 4 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
        {/* En-tête */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              {event.title}
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {event.event_number}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body1" paragraph>
              {event.description}
            </Typography>
            {event.requirements && (
              <>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Exigences
                </Typography>
                <Typography variant="body2" paragraph style={{ whiteSpace: 'pre-line' }}>
                  {event.requirements}
                </Typography>
              </>
            )}
            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Date limite de soumission :</strong>{' '}
              {format(new Date(event.submission_deadline), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
            </Alert>
          </CardContent>
        </Card>

        {/* Formulaire */}
        <form onSubmit={handleSubmit}>
          {/* Informations fournisseur */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Vos informations
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Nom de l'entreprise"
                    value={supplierData.supplier_name}
                    onChange={(e) => handleSupplierChange('supplier_name', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    type="email"
                    label="Email"
                    value={supplierData.supplier_email}
                    onChange={(e) => handleSupplierChange('supplier_email', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Téléphone"
                    value={supplierData.supplier_phone}
                    onChange={(e) => handleSupplierChange('supplier_phone', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Délai de livraison (jours)"
                    type="number"
                    value={bidData.delivery_time_days}
                    onChange={(e) => handleBidChange('delivery_time_days', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Adresse complète"
                    value={supplierData.supplier_address}
                    onChange={(e) => handleSupplierChange('supplier_address', e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Articles */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Articles proposés</Typography>
                <Button startIcon={<Add />} onClick={addItem} variant="outlined" size="small">
                  Ajouter un article
                </Button>
              </Box>

              <Paper variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Référence *</TableCell>
                      <TableCell>Description *</TableCell>
                      <TableCell>Qté *</TableCell>
                      <TableCell>Prix unit. *</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell width={50}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            size="small"
                            required
                            fullWidth
                            value={item.product_reference}
                            onChange={(e) => handleItemChange(index, 'product_reference', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            required
                            fullWidth
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            required
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            required
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {(item.quantity * item.unit_price).toFixed(2)} $
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                            color="error"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>

              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Typography variant="body1">
                  <strong>Sous-total :</strong> {subtotal.toFixed(2)} $
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  label="Taxes"
                  value={bidData.tax_amount}
                  onChange={(e) => handleBidChange('tax_amount', e.target.value)}
                  sx={{ width: 150, mt: 1 }}
                />
                <Typography variant="h6" sx={{ mt: 1 }}>
                  <strong>Total :</strong> {total.toFixed(2)} $
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Réponses */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Votre proposition
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Lettre de présentation"
                    value={bidData.cover_letter}
                    onChange={(e) => handleBidChange('cover_letter', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Réponse technique"
                    value={bidData.technical_response}
                    onChange={(e) => handleBidChange('technical_response', e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Termes et conditions */}
          {event.terms_and_conditions && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Termes et conditions
                </Typography>
                <Typography variant="body2" paragraph style={{ whiteSpace: 'pre-line' }}>
                  {event.terms_and_conditions}
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={bidData.terms_accepted}
                      onChange={(e) => handleBidChange('terms_accepted', e.target.checked)}
                      required
                    />
                  }
                  label="J'accepte les termes et conditions *"
                />
              </CardContent>
            </Card>
          )}

          {/* Bouton de soumission */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting || !bidData.terms_accepted}
            >
              {submitting ? <CircularProgress size={24} /> : 'Soumettre mon offre'}
            </Button>
          </Box>
        </form>
      </Box>
    </Box>
  );
}

export default PublicBidSubmission;
