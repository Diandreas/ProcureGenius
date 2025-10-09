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
    LinearProgress,
    Tabs,
    Tab,
} from '@mui/material';
import {
    Edit,
    Delete,
    ArrowBack,
    MoreVert,
    CheckCircle,
    Warning,
    Block,
    AttachMoney,
    Inventory,
    ShoppingCart,
    LocalShipping,
    Category,
    Business,
    Assessment,
    TrendingUp,
    Schedule,
    Star,
    History,
    Info as InfoIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { productsAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import StockMovementsTab from '../../components/StockMovementsTab';

function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [anchorEl, setAnchorEl] = useState(null);
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        fetchProduct();
    }, [id]);

    const fetchProduct = async () => {
        setLoading(true);
        try {
            const response = await productsAPI.get(id);
            setProduct(response.data);
        } catch (error) {
            enqueueSnackbar('Erreur lors du chargement du produit', { variant: 'error' });
            navigate('/products');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        navigate(`/products/${id}/edit`);
    };

    const handleDelete = async () => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${product.name} ?`)) {
            try {
                await productsAPI.delete(id);
                enqueueSnackbar('Produit supprimé avec succès', { variant: 'success' });
                navigate('/products');
            } catch (error) {
                enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
            }
        }
    };

    const getAvailabilityIcon = (isAvailable) => {
        return isAvailable ? <CheckCircle color="success" /> : <Block color="error" />;
    };

    const getStockStatus = () => {
        if (!product.stock_quantity) return null;

        if (product.stock_quantity === 0) {
            return { label: 'Rupture de stock', color: 'error', icon: <Warning /> };
        } else if (product.stock_quantity <= product.minimum_order_quantity) {
            return { label: 'Stock bas', color: 'warning', icon: <Warning /> };
        } else {
            return { label: 'En stock', color: 'success', icon: <CheckCircle /> };
        }
    };

    const getEffectivePrice = (quantity = 1) => {
        if (product.bulk_price && product.bulk_quantity && quantity >= product.bulk_quantity) {
            return product.bulk_price;
        }
        return product.unit_price;
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (!product) {
        return (
            <Alert severity="error">
                Produit introuvable
            </Alert>
        );
    }

    const stockStatus = getStockStatus();

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => navigate('/products')}>
                        <ArrowBack />
                    </IconButton>
                    <Typography variant="h4" fontWeight="bold">
                        {product.name}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={handleEdit}
                    >
                        Modifier
                    </Button>
                    <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                        <MoreVert />
                    </IconButton>
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={() => setAnchorEl(null)}
                    >
                        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                            <Delete fontSize="small" sx={{ mr: 1 }} />
                            Supprimer
                        </MenuItem>
                    </Menu>
                </Box>
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                    <Tab icon={<InfoIcon />} label="Informations" />
                    {product.product_type === 'physical' && (
                        <Tab icon={<History />} label="Historique Stock" />
                    )}
                </Tabs>
            </Box>

            {activeTab === 0 && (
                <Grid container spacing={3}>
                    {/* Informations principales */}
                    <Grid item xs={12} md={8}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                {product.image ? (
                                    <Avatar
                                        src={product.image}
                                        sx={{ width: 80, height: 80 }}
                                        variant="rounded"
                                    />
                                ) : (
                                    <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: 32 }}>
                                        <Inventory />
                                    </Avatar>
                                )}
                                <Box sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                        <Typography variant="h5">
                                            {product.name}
                                        </Typography>
                                        <Chip
                                            icon={getAvailabilityIcon(product.is_available)}
                                            label={product.is_available ? 'Disponible' : 'Indisponible'}
                                            color={product.is_available ? 'success' : 'error'}
                                        />
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        SKU: {product.sku}
                                    </Typography>
                                    {product.category && (
                                        <Chip
                                            icon={<Category />}
                                            label={product.category.name}
                                            variant="outlined"
                                            size="small"
                                        />
                                    )}
                                </Box>
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <Typography variant="h6" gutterBottom>
                                        Description
                                    </Typography>
                                    <Typography variant="body1" paragraph>
                                        {product.description}
                                    </Typography>
                                </Grid>

                                {product.specifications && Object.keys(product.specifications).length > 0 && (
                                    <Grid item xs={12}>
                                        <Typography variant="h6" gutterBottom>
                                            Spécifications
                                        </Typography>
                                        <List dense>
                                            {Object.entries(product.specifications).map(([key, value]) => (
                                                <ListItem key={key}>
                                                    <ListItemText
                                                        primary={key}
                                                        secondary={value}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Grid>
                                )}

                                {product.supplier && (
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Business color="action" />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    Fournisseur
                                                </Typography>
                                                <Typography
                                                    component="span"
                                                    color="primary"
                                                    sx={{ cursor: 'pointer', fontWeight: 'medium' }}
                                                    onClick={() => navigate(`/suppliers/${product.supplier.id}`)}
                                                >
                                                    {product.supplier.name}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                )}

                                <Grid item xs={12} sm={6}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <LocalShipping color="action" />
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Délai de livraison
                                            </Typography>
                                            <Typography>{product.lead_time_days} jours</Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Prix et commande */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AttachMoney color="primary" />
                                Tarification
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                                        <Typography variant="h4" color="primary">
                                            {formatCurrency(product.unit_price)}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Prix unitaire
                                        </Typography>
                                    </Box>
                                </Grid>

                                {product.bulk_price && product.bulk_quantity && (
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                                            <Typography variant="h4" color="success.main">
                                                {formatCurrency(product.bulk_price)}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Prix en gros (min. {product.bulk_quantity})
                                            </Typography>
                                        </Box>
                                    </Grid>
                                )}

                                <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary">
                                        Quantité minimum de commande: {product.minimum_order_quantity}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Prévisions IA */}
                    {(product.ai_demand_forecast && Object.keys(product.ai_demand_forecast).length > 0) ||
                        (product.ai_price_trend && Object.keys(product.ai_price_trend).length > 0) && (
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Assessment color="primary" />
                                        Analyses IA
                                    </Typography>
                                    <Grid container spacing={2}>
                                        {product.ai_demand_forecast && Object.keys(product.ai_demand_forecast).length > 0 && (
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="subtitle2" gutterBottom>
                                                    Prévision de demande
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {JSON.stringify(product.ai_demand_forecast)}
                                                </Typography>
                                            </Grid>
                                        )}
                                        {product.ai_price_trend && Object.keys(product.ai_price_trend).length > 0 && (
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="subtitle2" gutterBottom>
                                                    Tendance des prix
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {JSON.stringify(product.ai_price_trend)}
                                                </Typography>
                                            </Grid>
                                        )}
                                    </Grid>
                                </CardContent>
                            </Card>
                        )}
                </Grid>

                {/* Sidebar */}
                <Grid item xs={12} md={4}>
                    {/* Stock */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Inventory color="primary" />
                                Gestion du stock
                            </Typography>

                            {stockStatus && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                    <Chip
                                        icon={stockStatus.icon}
                                        label={stockStatus.label}
                                        color={stockStatus.color}
                                        size="large"
                                    />
                                </Box>
                            )}

                            <List dense>
                                <ListItem>
                                    <ListItemText
                                        primary="Quantité en stock"
                                        secondary={product.stock_quantity || 'Non spécifié'}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary="Commande minimum"
                                        secondary={product.minimum_order_quantity}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary="Disponibilité"
                                        secondary={product.is_available ? 'Disponible' : 'Indisponible'}
                                    />
                                </ListItem>
                            </List>
                        </CardContent>
                    </Card>

                    {/* Calculateur de prix */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Calculateur de prix
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Prix selon la quantité commandée
                            </Typography>

                            {[1, 5, 10, product.bulk_quantity].filter(Boolean).map((qty) => (
                                <Box key={qty} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                                    <Typography variant="body2">
                                        {qty} unité{qty > 1 ? 's' : ''}
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {formatCurrency(getEffectivePrice(qty))}
                                    </Typography>
                                </Box>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Dates */}
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Informations système
                            </Typography>
                            <List dense>
                                <ListItem>
                                    <ListItemIcon>
                                        <Schedule />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Date de création"
                                        secondary={formatDate(product.created_at)}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon>
                                        <Schedule />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Dernière modification"
                                        secondary={formatDate(product.updated_at)}
                                    />
                                </ListItem>
                            </List>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
            )}

            {activeTab === 1 && product.product_type === 'physical' && (
                <StockMovementsTab productId={id} productType={product.product_type} />
            )}
        </Box>
    );
}

export default ProductDetail;
