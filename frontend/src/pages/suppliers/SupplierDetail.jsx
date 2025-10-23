import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Avatar,
  Divider,
  Grid,
  Stack,
  Rating,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Delete,
  Person,
  Email,
  Phone,
  LocationOn,
  Business,
  Star,
  AttachMoney,
  ShoppingCart,
  Inventory,
  TrendingUp,
  Info,
  CheckCircle,
  Block,
  Assessment,
  Add,
  ReceiptLong,
  Inventory2,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { suppliersAPI } from '../../services/api';
import reportsAPI from '../../services/reportsAPI';
import { getStatusColor, getStatusLabel, formatDate, parseRating, formatCurrency } from '../../utils/formatters';

function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [supplier, setSupplier] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchSupplier();
    fetchStatistics();
  }, [id]);

  const fetchSupplier = async () => {
    setLoading(true);
    try {
      const response = await suppliersAPI.get(id);
      setSupplier(response.data);
    } catch (error) {
      enqueueSnackbar('Erreur lors du chargement du fournisseur', { variant: 'error' });
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await suppliersAPI.getStatistics(id);
      setStatistics(response.data);
    } catch (error) {
      console.error('Erreur statistiques:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Supprimer ${supplier.name} ?`)) {
      try {
        await suppliersAPI.delete(id);
        enqueueSnackbar('Fournisseur supprimé', { variant: 'success' });
        navigate('/suppliers');
      } catch (error) {
        enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
      }
    }
  };

  const handleGenerateReport = async (format = 'pdf') => {
    try {
      enqueueSnackbar(`Génération du rapport ${format.toUpperCase()} en cours...`, { variant: 'info' });

      const response = await reportsAPI.generateSupplierReport(id, format);
      const report = response.data;

      if (report.status === 'completed') {
        enqueueSnackbar('Rapport généré avec succès!', { variant: 'success' });

        // Télécharger automatiquement
        const downloadResponse = await reportsAPI.download(report.id);
        const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', report.file_name || `rapport_${id}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        enqueueSnackbar('Le rapport est en cours de génération...', { variant: 'info' });
      }
    } catch (error) {
      console.error('Erreur génération rapport:', error);
      enqueueSnackbar('Erreur lors de la génération du rapport', { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!supplier) {
    return <Alert severity="error">Fournisseur introuvable</Alert>;
  }

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton onClick={() => navigate('/suppliers')} size={isMobile ? 'small' : 'medium'}>
            <ArrowBack />
          </IconButton>
          <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" sx={{ flex: 1 }}>
            {supplier.name}
          </Typography>
          {!isMobile && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => navigate(`/suppliers/${id}/edit`)}
              >
                Modifier
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={handleDelete}
              >
                Supprimer
              </Button>
            </Stack>
          )}
        </Box>
        {isMobile && (
          <Stack direction="row" spacing={1}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => navigate(`/suppliers/${id}/edit`)}
              size="small"
            >
              Modifier
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={handleDelete}
              size="small"
            >
              Supprimer
            </Button>
          </Stack>
        )}
      </Box>

      {/* Quick Actions */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: isMobile ? 2 : 3 }}>
          <Typography variant="h6" fontWeight="600" gutterBottom sx={{ mb: 2 }}>
            Actions rapides
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate(`/purchase-orders/new?supplier=${id}`)}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #63408a 100%)',
                  }
                }}
              >
                Nouveau bon de commande
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Inventory2 />}
                onClick={() => navigate(`/products/new?supplier=${id}`)}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  bgcolor: 'success.main',
                  '&:hover': {
                    bgcolor: 'success.dark',
                  }
                }}
              >
                Ajouter des produits
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Assessment />}
                onClick={() => handleGenerateReport('pdf')}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  bgcolor: 'warning.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'warning.dark',
                  }
                }}
              >
                Générer un rapport
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<Info />} label="Infos" iconPosition="start" />
        <Tab icon={<ShoppingCart />} label="Commandes" iconPosition="start" />
        <Tab icon={<Inventory />} label="Produits" iconPosition="start" />
      </Tabs>

      {/* Tab: Informations */}
      {activeTab === 0 && (
        <Grid container spacing={isMobile ? 2 : 3}>
          {/* Card principale */}
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 1, mb: isMobile ? 2 : 3 }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <Avatar
                    sx={{
                      width: isMobile ? 80 : 100,
                      height: isMobile ? 80 : 100,
                      bgcolor: 'primary.main',
                      borderRadius: 1,
                      fontSize: isMobile ? '2rem' : '2.5rem',
                    }}
                  >
                    {supplier.name?.charAt(0)?.toUpperCase() || '?'}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" gutterBottom>
                      {supplier.name}
                    </Typography>
                    {parseRating(supplier.rating) > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Rating value={parseRating(supplier.rating)} readOnly size={isMobile ? 'small' : 'medium'} />
                        <Typography variant="body2" color="text.secondary">
                          ({parseRating(supplier.rating).toFixed(1)}/5)
                        </Typography>
                      </Box>
                    )}
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip
                        label={getStatusLabel(supplier.status)}
                        color={getStatusColor(supplier.status)}
                        size="small"
                      />
                      {supplier.is_local && (
                        <Chip label="Local" size="small" color="success" variant="outlined" />
                      )}
                      {supplier.is_minority_owned && (
                        <Chip label="Minorité" size="small" color="info" variant="outlined" />
                      )}
                      {supplier.is_woman_owned && (
                        <Chip label="Femme" size="small" color="secondary" variant="outlined" />
                      )}
                      {supplier.is_indigenous && (
                        <Chip label="Autochtone" size="small" color="warning" variant="outlined" />
                      )}
                    </Stack>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Informations de contact */}
                <Grid container spacing={2}>
                  {supplier.contact_person && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person sx={{ fontSize: 20, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Personne contact
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {supplier.contact_person}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}

                  {supplier.email && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Email sx={{ fontSize: 20, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Email
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            <a href={`mailto:${supplier.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {supplier.email}
                            </a>
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}

                  {supplier.phone && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Phone sx={{ fontSize: 20, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Téléphone
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            <a href={`tel:${supplier.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {supplier.phone}
                            </a>
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}

                  {(supplier.address || supplier.city || supplier.province) && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <LocationOn sx={{ fontSize: 20, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Adresse
                          </Typography>
                          {supplier.address && (
                            <Typography variant="body2" fontWeight="500">
                              {supplier.address}
                            </Typography>
                          )}
                          <Typography variant="body2" fontWeight="500">
                            {[supplier.city, supplier.province].filter(Boolean).join(', ')}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* Statistiques */}
            {statistics?.financial_stats && (
              <Grid container spacing={isMobile ? 2 : 3}>
                <Grid item xs={6} sm={4}>
                  <Card sx={{ borderRadius: 1, bgcolor: 'primary.50' }}>
                    <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
                      <AttachMoney sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                      <Typography variant={isMobile ? 'h5' : 'h4'} color="primary" fontWeight="bold">
                        {formatCurrency(statistics.financial_stats.total_spent || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total dépensé
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={6} sm={4}>
                  <Card sx={{ borderRadius: 1, bgcolor: 'success.50' }}>
                    <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
                      <ShoppingCart sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                      <Typography variant={isMobile ? 'h5' : 'h4'} color="success.main" fontWeight="bold">
                        {statistics.financial_stats.total_orders || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Commandes
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Card sx={{ borderRadius: 1, bgcolor: 'info.50' }}>
                    <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
                      <TrendingUp sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                      <Typography variant={isMobile ? 'h5' : 'h4'} color="info.main" fontWeight="bold">
                        {formatCurrency(statistics.financial_stats.average_order_value || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Valeur moyenne
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            {/* Diversité */}
            <Card sx={{ borderRadius: 1, mb: isMobile ? 2 : 3 }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Business sx={{ color: 'primary.main' }} />
                  <Typography variant="subtitle1" fontWeight="600">
                    Diversité
                  </Typography>
                </Box>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      {supplier.is_local ? <CheckCircle color="success" /> : <Block color="disabled" />}
                    </ListItemIcon>
                    <ListItemText primary="Fournisseur local" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      {supplier.is_minority_owned ? <CheckCircle color="success" /> : <Block color="disabled" />}
                    </ListItemIcon>
                    <ListItemText primary="Propriété minoritaire" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      {supplier.is_woman_owned ? <CheckCircle color="success" /> : <Block color="disabled" />}
                    </ListItemIcon>
                    <ListItemText primary="Propriété féminine" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      {supplier.is_indigenous ? <CheckCircle color="success" /> : <Block color="disabled" />}
                    </ListItemIcon>
                    <ListItemText primary="Entreprise autochtone" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            {/* Catégories */}
            {supplier.categories && supplier.categories.length > 0 && (
              <Card sx={{ borderRadius: 1, mb: isMobile ? 2 : 3 }}>
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                    Catégories
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {supplier.categories.map((category) => (
                      <Chip
                        key={category.id}
                        label={category.name}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Dates */}
            <Card sx={{ borderRadius: 1 }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  Informations système
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Créé le
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(supplier.created_at)}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Modifié le
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(supplier.updated_at)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab: Commandes */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <ShoppingCart color="primary" />
            Bons de commande
          </Typography>
          {statistics?.purchase_orders?.recent && statistics.purchase_orders.recent.length > 0 ? (
            <Card sx={{ borderRadius: 1 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {statistics.purchase_orders.total_count} commande(s) au total
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Alert severity="info">Aucune commande pour ce fournisseur</Alert>
          )}
        </Box>
      )}

      {/* Tab: Produits */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Inventory color="primary" />
            Produits les plus achetés
          </Typography>
          {statistics?.top_products && statistics.top_products.length > 0 ? (
            <Card sx={{ borderRadius: 1 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {statistics.top_products.length} produit(s)
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Alert severity="info">Aucun produit acheté auprès de ce fournisseur</Alert>
          )}
        </Box>
      )}
    </Box>
  );
}

export default SupplierDetail;
