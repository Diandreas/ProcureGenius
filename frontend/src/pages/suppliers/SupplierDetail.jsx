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
  Rating,
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
  LinearProgress,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Collapse,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Edit,
  Delete,
  Email,
  Phone,
  LocationOn,
  Business,
  Person,
  Star,
  ArrowBack,
  MoreVert,
  CheckCircle,
  Warning,
  Block,
  Schedule,
  AttachMoney,
  ShoppingCart,
  Receipt,
  TrendingUp,
  Assessment,
  Inventory,
  Visibility,
  FilterList,
  Clear,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { suppliersAPI } from '../../services/api';
import { getStatusColor, getStatusLabel, formatDate, getPerformanceBadgeColor, parseRating, formatCurrency } from '../../utils/formatters';

function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [supplier, setSupplier] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [poFilterOpen, setPoFilterOpen] = useState(false);
  const [poStatusFilter, setPoStatusFilter] = useState('');
  const [poSearchTerm, setPoSearchTerm] = useState('');

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
    setStatsLoading(true);
    try {
      const response = await suppliersAPI.getStatistics(id);
      setStatistics(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/suppliers/${id}/edit`);
  };

  const handleDelete = async () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${supplier.name} ?`)) {
      try {
        await suppliersAPI.delete(id);
        enqueueSnackbar('Fournisseur supprimé avec succès', { variant: 'success' });
        navigate('/suppliers');
      } catch (error) {
        enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
      }
    }
  };

  const handleToggleStatus = async () => {
    try {
      const response = await suppliersAPI.toggleStatus(id);
      setSupplier(response.data);
      enqueueSnackbar('Statut modifié avec succès', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erreur lors de la modification du statut', { variant: 'error' });
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      active: <CheckCircle color="success" />,
      pending: <Schedule color="warning" />,
      inactive: <Warning color="action" />,
      blocked: <Block color="error" />,
    };
    return icons[status] || null;
  };

  const handleViewPurchaseOrder = (orderId) => {
    navigate(`/purchase-orders/${orderId}`);
  };

  const getFilteredPurchaseOrders = () => {
    if (!statistics?.purchase_orders?.recent) return [];

    let filtered = statistics.purchase_orders.recent;

    if (poStatusFilter) {
      filtered = filtered.filter(order => order.status === poStatusFilter);
    }

    if (poSearchTerm) {
      filtered = filtered.filter(order =>
        order.po_number?.toLowerCase().includes(poSearchTerm.toLowerCase()) ||
        order.title?.toLowerCase().includes(poSearchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const clearPoFilters = () => {
    setPoStatusFilter('');
    setPoSearchTerm('');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!supplier) {
    return (
      <Alert severity="error">
        Fournisseur introuvable
      </Alert>
    );
  }

  return (
    <Box p={isMobile ? 2 : 3}>
      {/* Header */}
      <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={() => navigate('/suppliers')}
            sx={{
              bgcolor: 'rgba(25, 118, 210, 0.08)',
              color: 'primary.main',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: 'primary.main',
                color: 'white',
                transform: 'scale(1.1)',
                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)'
              }
            }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" sx={{
            fontSize: { xs: '1.75rem', md: '2.25rem' },
            fontWeight: 600,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            color: 'text.primary'
          }}>
            {supplier.name}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={handleEdit}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              px: 2,
              py: 1,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'scale(1.02)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }
            }}
          >
            Modifier
          </Button>
          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              bgcolor: 'rgba(66, 66, 66, 0.08)',
              color: 'text.secondary',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: 'secondary.main',
                color: 'white',
                transform: 'scale(1.1)',
                boxShadow: '0 2px 8px rgba(66, 66, 66, 0.3)'
              }
            }}
          >
            <MoreVert />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={handleToggleStatus}>
              {supplier.status === 'active' ? 'Désactiver' : 'Activer'}
            </MenuItem>
            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
              <Delete fontSize="small" sx={{ mr: 1 }} />
              Supprimer
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Informations principales */}
        <Grid item xs={12} md={8}>
          <Card sx={{
            mb: 2.5,
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              borderColor: 'primary.main'
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: 32 }}>
                  {supplier.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Typography variant="h5">
                      {supplier.name}
                    </Typography>
                    <Chip
                      icon={getStatusIcon(supplier.status)}
                      label={getStatusLabel(supplier.status)}
                      color={getStatusColor(supplier.status)}
                    />
                  </Box>
                  {parseRating(supplier.rating) > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Rating value={parseRating(supplier.rating)} readOnly />
                      <Typography variant="body2" color="text.secondary">
                        ({parseRating(supplier.rating).toFixed(1)}/5)
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                {supplier.contact_person && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Personne contact
                        </Typography>
                        <Typography>{supplier.contact_person}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}

                {supplier.email && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Email color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Email
                        </Typography>
                        <Typography>
                          <a href={`mailto:${supplier.email}`} style={{ color: 'inherit' }}>
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
                      <Phone color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Téléphone
                        </Typography>
                        <Typography>
                          <a href={`tel:${supplier.phone}`} style={{ color: 'inherit' }}>
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
                      <LocationOn color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Adresse
                        </Typography>
                        {supplier.address && (
                          <Typography>{supplier.address}</Typography>
                        )}
                        <Typography>
                          {[supplier.city, supplier.province].filter(Boolean).join(', ')}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Catégories */}
          {supplier.categories && supplier.categories.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Catégories
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {supplier.categories.map((category) => (
                    <Chip
                      key={category.id}
                      label={category.name}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Performance */}
          {supplier.performance_badge && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    label={supplier.performance_badge.text}
                    color={getPerformanceBadgeColor(supplier.performance_badge.class)}
                    size="large"
                  />
                  <Typography variant="body2" color="text.secondary">
                    Basé sur la note moyenne et les évaluations
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
          {/* Financial Statistics */}
          {statsLoading ? (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              </CardContent>
            </Card>
          ) : statistics && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <AttachMoney color="primary" />
                  <Typography variant="h6">
                    Statistiques financières
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                      <Typography variant="h4" color="primary">
                        {formatCurrency(statistics.financial_stats.total_spent)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total dépensé
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                      <Typography variant="h4" color="success.main">
                        {statistics.financial_stats.total_orders}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Commandes
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                      <Typography variant="h4" color="info.main">
                        {formatCurrency(statistics.financial_stats.average_order_value)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Valeur moyenne
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Purchase Orders */}
          {statistics && statistics.purchase_orders && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ShoppingCart color="primary" />
                    <Typography variant="h6">
                      Bons de commande ({statistics.purchase_orders.total_count})
                    </Typography>
                  </Box>
                  {statistics.purchase_orders.total_count > 10 && (
                    <Button
                      size="small"
                      startIcon={<FilterList />}
                      onClick={() => setPoFilterOpen(!poFilterOpen)}
                    >
                      Filtres
                    </Button>
                  )}
                </Box>

                {/* Filters */}
                {statistics.purchase_orders.total_count > 10 && (
                  <Collapse in={poFilterOpen}>
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Rechercher par N° ou titre..."
                            value={poSearchTerm}
                            onChange={(e) => setPoSearchTerm(e.target.value)}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <FilterList fontSize="small" />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Statut</InputLabel>
                            <Select
                              value={poStatusFilter}
                              onChange={(e) => setPoStatusFilter(e.target.value)}
                              label="Statut"
                            >
                              <MenuItem value="">Tous</MenuItem>
                              <MenuItem value="draft">Brouillon</MenuItem>
                              <MenuItem value="pending">En attente</MenuItem>
                              <MenuItem value="approved">Approuvé</MenuItem>
                              <MenuItem value="sent">Envoyé</MenuItem>
                              <MenuItem value="received">Reçu</MenuItem>
                              <MenuItem value="cancelled">Annulé</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <Button
                            fullWidth
                            size="small"
                            startIcon={<Clear />}
                            onClick={clearPoFilters}
                          >
                            Effacer
                          </Button>
                        </Grid>
                      </Grid>
                    </Box>
                  </Collapse>
                )}

                {/* Recent Orders */}
                <Typography variant="subtitle1" gutterBottom>
                  Commandes récentes
                </Typography>
                <TableContainer component={Paper} sx={{ mb: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>N° Commande</TableCell>
                        <TableCell>Titre</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell align="right">Montant</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getFilteredPurchaseOrders().map((order) => (
                        <TableRow key={order.id} hover sx={{ cursor: 'pointer' }}>
                          <TableCell onClick={() => handleViewPurchaseOrder(order.id)}>
                            <Typography color="primary" sx={{ fontWeight: 'medium' }}>
                              {order.po_number}
                            </Typography>
                          </TableCell>
                          <TableCell onClick={() => handleViewPurchaseOrder(order.id)}>
                            {order.title}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getStatusLabel(order.status)}
                              color={getStatusColor(order.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(order.total_amount)}
                          </TableCell>
                          <TableCell>{formatDate(order.created_at)}</TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleViewPurchaseOrder(order.id)}
                              color="primary"
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {getFilteredPurchaseOrders().length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                            <Typography color="text.secondary">
                              Aucun bon de commande trouvé
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Orders by Status */}
                <Typography variant="subtitle1" gutterBottom>
                  Répartition par statut
                </Typography>
                <List dense>
                  {statistics.purchase_orders.by_status.map((statusGroup) => (
                    <ListItem key={statusGroup.status}>
                      <ListItemIcon>
                        <Chip
                          label={statusGroup.count}
                          color={getStatusColor(statusGroup.status)}
                          size="small"
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={getStatusLabel(statusGroup.status)}
                        secondary={`${formatCurrency(statusGroup.total_amount || 0)}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          {/* Top Products */}
          {statistics && statistics.top_products && statistics.top_products.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Inventory color="primary" />
                  <Typography variant="h6">
                    Produits les plus achetés
                  </Typography>
                </Box>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Produit</TableCell>
                        <TableCell align="right">Quantité</TableCell>
                        <TableCell align="right">Valeur</TableCell>
                        <TableCell align="right">Commandes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {statistics.top_products.slice(0, 10).map((product, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2">
                              {product.description || product.product_reference}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{product.total_quantity}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(product.total_value)}
                          </TableCell>
                          <TableCell align="right">{product.order_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Diversité */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Diversité
              </Typography>
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

          {/* Activity Timeline */}
          {statistics && statistics.activity_timeline && statistics.activity_timeline.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <TrendingUp color="primary" />
                  <Typography variant="h6">
                    Activité récente (6 mois)
                  </Typography>
                </Box>
                <List dense>
                  {statistics.activity_timeline.map((activity, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={`${activity.created_at__month}/${activity.created_at__year}`}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              {activity.count} commandes
                            </Typography>
                            <Typography variant="caption" color="primary">
                              {formatCurrency(activity.total_amount || 0)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          {/* Performance Metrics - Only show if at least one metric is available */}
          {statistics && statistics.performance_metrics &&
            (statistics.performance_metrics.avg_delivery_time ||
              statistics.performance_metrics.on_time_delivery_rate ||
              statistics.performance_metrics.total_suppliers_rank) && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Assessment color="primary" />
                    <Typography variant="h6">
                      Métriques de performance
                    </Typography>
                  </Box>
                  <List dense>
                    {statistics.performance_metrics.avg_delivery_time && (
                      <ListItem>
                        <ListItemText
                          primary="Temps de livraison moyen"
                          secondary={statistics.performance_metrics.avg_delivery_time}
                        />
                      </ListItem>
                    )}
                    {statistics.performance_metrics.on_time_delivery_rate && (
                      <ListItem>
                        <ListItemText
                          primary="Taux de livraison à temps"
                          secondary={statistics.performance_metrics.on_time_delivery_rate}
                        />
                      </ListItem>
                    )}
                    {statistics.performance_metrics.total_suppliers_rank && (
                      <ListItem>
                        <ListItemText
                          primary="Classement général"
                          secondary={statistics.performance_metrics.total_suppliers_rank}
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            )}

          {/* Dates */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informations système
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Date de création"
                    secondary={formatDate(supplier.created_at)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Dernière modification"
                    secondary={formatDate(supplier.updated_at)}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SupplierDetail;