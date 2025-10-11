import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Checkbox,
    CircularProgress,
    Alert,
    InputAdornment,
    Chip,
    Divider,
    IconButton,
    Collapse,
    Paper,
    Tooltip,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    useTheme,
    useMediaQuery,
    ToggleButton,
    ToggleButtonGroup,
    Fade,
    Slide,
    FormHelperText,
} from '@mui/material';
import {
    Save,
    Cancel,
    Inventory,
    AttachMoney,
    Upload,
    Info,
    LocalShipping,
    Category,
    Business,
    Image,
    Description,
    Storefront,
    Build,
    ShoppingCart,
    Cloud,
    Construction,
    ExpandMore,
    ExpandLess,
    CheckCircle,
    Warning,
    CloudDownload,
    Schedule,
    Warehouse,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { productsAPI, suppliersAPI, productCategoriesAPI, warehousesAPI } from '../../services/api';

// Validation dynamique selon le type de produit
const getValidationSchema = (productType) => {
    const baseSchema = {
        name: Yup.string().required('Le nom est requis'),
        sku: Yup.string().required('Le SKU est requis'),
        description: Yup.string().required('La description est requise'),
        unit_price: Yup.number().positive('Le prix doit être positif').required('Le prix est requis'),
        category_id: Yup.string().nullable(),
    };

    // Ajout des validations spécifiques selon le type
    if (productType === 'physical') {
        return Yup.object({
            ...baseSchema,
            supplier_id: Yup.string().required('Le fournisseur est requis'),
            warehouse_id: Yup.string().required('L\'entrepôt est requis'),
            stock_quantity: Yup.number().min(0, 'Le stock ne peut pas être négatif').required('Le stock est requis'),
            minimum_order_quantity: Yup.number().positive('Doit être positif').required('Requis'),
            lead_time_days: Yup.number().positive('Doit être positif').required('Requis'),
            bulk_price: Yup.number().positive('Le prix de gros doit être positif').nullable(),
            bulk_quantity: Yup.number().positive('La quantité doit être positive').nullable(),
        });
    } else if (productType === 'digital') {
        return Yup.object({
            ...baseSchema,
            supplier_id: Yup.string().required('L\'éditeur est requis'),
            stock_quantity: Yup.number().min(0, 'Les licences ne peuvent pas être négatives').nullable(),
            download_url: Yup.string().url('URL invalide').nullable(),
            license_duration_days: Yup.number().positive('Doit être positif').nullable(),
        });
    } else { // service
        return Yup.object({
            ...baseSchema,
            service_duration_hours: Yup.number().positive('Doit être positif').nullable(),
            max_simultaneous_bookings: Yup.number().positive('Doit être positif').nullable(),
        });
    }
};

function ProductForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));
    const isEdit = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [expandedSections, setExpandedSections] = useState({
        general: true,
        pricing: true,
        inventory: true,
        advanced: false,
    });
    const [activeStep, setActiveStep] = useState(0);

    const [initialValues, setInitialValues] = useState({
        // Informations de base
        name: '',
        sku: '',
        description: '',
        product_type: 'physical',
        source_type: 'purchased',
        category_id: '',

        // Prix
        unit_price: '',
        bulk_price: '',
        bulk_quantity: '',

        // Spécifique aux produits physiques
        supplier_id: '',
        warehouse_id: '',
        stock_quantity: '',
        minimum_order_quantity: 1,
        lead_time_days: 7,

        // Spécifique aux produits numériques
        download_url: '',
        license_duration_days: '',
        max_downloads: '',

        // Spécifique aux services
        service_duration_hours: '',
        max_simultaneous_bookings: '',
        booking_buffer_hours: '',

        // Autres
        is_available: true,
        tags: [],
        specifications: {},
        image: null,
    });

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [suppliersRes, categoriesRes, warehousesRes] = await Promise.all([
                suppliersAPI.list(),
                productCategoriesAPI.list(),
                warehousesAPI.list(),
            ]);

            setSuppliers(suppliersRes.data.results || suppliersRes.data);
            setCategories(categoriesRes.data.results || categoriesRes.data);
            setWarehouses(warehousesRes.data.results || warehousesRes.data);

            if (isEdit) {
                const response = await productsAPI.get(id);
                setInitialValues({
                    ...initialValues,
                    ...response.data,
                    supplier_id: response.data.supplier?.id || '',
                    category_id: response.data.category?.id || '',
                    warehouse_id: response.data.warehouse?.id || '',
                });
            }
        } catch (error) {
            console.error('Erreur lors du chargement:', error);
            enqueueSnackbar('Erreur lors du chargement des données', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const handleSubmit = async (values, { setSubmitting }) => {
        try {
            // Nettoyer les valeurs selon le type de produit
            const cleanedValues = {
                name: values.name,
                sku: values.sku,
                description: values.description,
                product_type: values.product_type,
                unit_price: parseFloat(values.unit_price),
                category_id: values.category_id || null,
                is_available: values.is_available,
            };

            // Ajouter les champs spécifiques selon le type
            if (values.product_type === 'physical') {
                Object.assign(cleanedValues, {
                    source_type: values.source_type,
                    supplier_id: values.supplier_id,
                    warehouse_id: values.warehouse_id,
                    stock_quantity: parseInt(values.stock_quantity),
                    minimum_order_quantity: parseInt(values.minimum_order_quantity),
                    lead_time_days: parseInt(values.lead_time_days),
                    bulk_price: values.bulk_price ? parseFloat(values.bulk_price) : null,
                    bulk_quantity: values.bulk_quantity ? parseInt(values.bulk_quantity) : null,
                });
            } else if (values.product_type === 'digital') {
                Object.assign(cleanedValues, {
                    supplier_id: values.supplier_id,
                    download_url: values.download_url || null,
                    license_duration_days: values.license_duration_days ? parseInt(values.license_duration_days) : null,
                    stock_quantity: values.stock_quantity ? parseInt(values.stock_quantity) : null,
                });
            } else if (values.product_type === 'service') {
                Object.assign(cleanedValues, {
                    service_duration_hours: values.service_duration_hours ? parseFloat(values.service_duration_hours) : null,
                    max_simultaneous_bookings: values.max_simultaneous_bookings ? parseInt(values.max_simultaneous_bookings) : null,
                });
            }

            if (isEdit) {
                await productsAPI.update(id, cleanedValues);
                enqueueSnackbar('Produit modifié avec succès', { variant: 'success' });
            } else {
                await productsAPI.create(cleanedValues);
                enqueueSnackbar('Produit créé avec succès', { variant: 'success' });
            }
            navigate('/products');
        } catch (error) {
            console.error('Erreur:', error);
            enqueueSnackbar('Erreur lors de l\'enregistrement', { variant: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                <CircularProgress />
            </Box>
        );
    }

    const ProductTypeSelector = ({ value, onChange }) => (
        <Paper elevation={0} sx={{ p: 2, backgroundColor: 'background.default', borderRadius: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                Type de produit
            </Typography>
            <ToggleButtonGroup
                value={value}
                exclusive
                onChange={(e, newValue) => newValue && onChange({ target: { name: 'product_type', value: newValue } })}
                fullWidth
                size={isMobile ? "small" : "medium"}
                orientation={isMobile ? "vertical" : "horizontal"}
            >
                <ToggleButton value="physical" sx={{ justifyContent: 'flex-start', px: 2 }}>
                    <Inventory sx={{ mr: 1 }} />
                    <Box textAlign="left">
                        <Typography variant="body2" fontWeight="bold">Physique</Typography>
                        {!isMobile && <Typography variant="caption" display="block">Stock, entrepôt, livraison</Typography>}
                    </Box>
                </ToggleButton>
                <ToggleButton value="digital" sx={{ justifyContent: 'flex-start', px: 2 }}>
                    <CloudDownload sx={{ mr: 1 }} />
                    <Box textAlign="left">
                        <Typography variant="body2" fontWeight="bold">Numérique</Typography>
                        {!isMobile && <Typography variant="caption" display="block">Téléchargeable, licences</Typography>}
                    </Box>
                </ToggleButton>
                <ToggleButton value="service" sx={{ justifyContent: 'flex-start', px: 2 }}>
                    <Build sx={{ mr: 1 }} />
                    <Box textAlign="left">
                        <Typography variant="body2" fontWeight="bold">Service</Typography>
                        {!isMobile && <Typography variant="caption" display="block">Prestation, consultation</Typography>}
                    </Box>
                </ToggleButton>
            </ToggleButtonGroup>
        </Paper>
    );

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold" sx={{ mb: 3 }}>
                {isEdit ? 'Modifier le produit' : 'Nouveau produit'}
            </Typography>

            <Formik
                initialValues={initialValues}
                validationSchema={getValidationSchema(initialValues.product_type)}
                onSubmit={handleSubmit}
                enableReinitialize
            >
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting, setFieldValue }) => (
                    <Form>
                        <Grid container spacing={isMobile ? 2 : 3}>
                            {/* Section principale */}
                            <Grid item xs={12} lg={8}>
                                {/* Sélecteur de type de produit */}
                                <Box sx={{ mb: 3 }}>
                                    <ProductTypeSelector value={values.product_type} onChange={handleChange} />
                                </Box>

                                {/* Informations générales */}
                                <Card sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Description sx={{ mr: 1 }} />
                                                Informations générales
                                            </Typography>
                                            {!isMobile && (
                                                <Chip
                                                    size="small"
                                                    label="Obligatoire"
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                            )}
                                        </Box>

                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    size={isMobile ? "small" : "medium"}
                                                    name="name"
                                                    label="Nom du produit"
                                                    value={values.name}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.name && Boolean(errors.name)}
                                                    helperText={touched.name && errors.name}
                                                    required
                                                />
                                            </Grid>

                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    size={isMobile ? "small" : "medium"}
                                                    name="sku"
                                                    label="Code SKU"
                                                    value={values.sku}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.sku && Boolean(errors.sku)}
                                                    helperText={touched.sku && errors.sku}
                                                    required
                                                    placeholder="PRD-001"
                                                />
                                            </Grid>

                                            <Grid item xs={12}>
                                                <TextField
                                                    fullWidth
                                                    multiline
                                                    rows={isMobile ? 3 : 4}
                                                    size={isMobile ? "small" : "medium"}
                                                    name="description"
                                                    label="Description détaillée"
                                                    value={values.description}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.description && Boolean(errors.description)}
                                                    helperText={touched.description && errors.description}
                                                    required
                                                />
                                            </Grid>

                                            <Grid item xs={12} md={6}>
                                                <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                                                    <InputLabel>Catégorie</InputLabel>
                                                    <Select
                                                        name="category_id"
                                                        value={values.category_id}
                                                        onChange={handleChange}
                                                        label="Catégorie"
                                                        startAdornment={<Category sx={{ ml: 1, mr: -0.5, color: 'action.active' }} />}
                                                    >
                                                        <MenuItem value="">
                                                            <em>Non catégorisé</em>
                                                        </MenuItem>
                                                        {categories.map((category) => (
                                                            <MenuItem key={category.id} value={category.id}>
                                                                {category.name}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </Grid>

                                            {/* Champs conditionnels selon le type */}
                                            <Fade in={values.product_type === 'physical'} unmountOnExit>
                                                <Grid item xs={12} md={6}>
                                                    <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                                                        <InputLabel>Source d'approvisionnement</InputLabel>
                                                        <Select
                                                            name="source_type"
                                                            value={values.source_type}
                                                            onChange={handleChange}
                                                            label="Source d'approvisionnement"
                                                        >
                                                            <MenuItem value="purchased">
                                                                <ShoppingCart sx={{ mr: 1, fontSize: 20 }} />
                                                                Acheté (fournisseur)
                                                            </MenuItem>
                                                            <MenuItem value="manufactured">
                                                                <Construction sx={{ mr: 1, fontSize: 20 }} />
                                                                Fabriqué (interne)
                                                            </MenuItem>
                                                            <MenuItem value="resale">
                                                                <Storefront sx={{ mr: 1, fontSize: 20 }} />
                                                                Revente
                                                            </MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                </Grid>
                                            </Fade>
                                        </Grid>
                                    </CardContent>
                                </Card>

                                {/* Tarification */}
                                <Card sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                            <AttachMoney sx={{ mr: 1 }} />
                                            Tarification
                                        </Typography>

                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={values.product_type === 'service' ? 12 : 6}>
                                                <TextField
                                                    fullWidth
                                                    size={isMobile ? "small" : "medium"}
                                                    name="unit_price"
                                                    label={
                                                        values.product_type === 'service' ? 'Tarif horaire / Forfait' :
                                                            values.product_type === 'digital' ? 'Prix par licence' :
                                                                'Prix unitaire'
                                                    }
                                                    type="number"
                                                    value={values.unit_price}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.unit_price && Boolean(errors.unit_price)}
                                                    helperText={touched.unit_price && errors.unit_price}
                                                    InputProps={{
                                                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                                    }}
                                                    required
                                                />
                                            </Grid>

                                            {/* Prix de gros - seulement pour produits physiques */}
                                            <Collapse in={values.product_type === 'physical'} timeout="auto">
                                                <Grid container spacing={2} sx={{ pl: 2, mt: 0 }}>
                                                    <Grid item xs={12} md={6}>
                                                        <TextField
                                                            fullWidth
                                                            size={isMobile ? "small" : "medium"}
                                                            name="bulk_price"
                                                            label="Prix de gros (optionnel)"
                                                            type="number"
                                                            value={values.bulk_price}
                                                            onChange={handleChange}
                                                            onBlur={handleBlur}
                                                            error={touched.bulk_price && Boolean(errors.bulk_price)}
                                                            helperText={touched.bulk_price && errors.bulk_price}
                                                            InputProps={{
                                                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                                            }}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={12} md={6}>
                                                        <TextField
                                                            fullWidth
                                                            size={isMobile ? "small" : "medium"}
                                                            name="bulk_quantity"
                                                            label="Quantité min. pour prix de gros"
                                                            type="number"
                                                            value={values.bulk_quantity}
                                                            onChange={handleChange}
                                                            disabled={!values.bulk_price}
                                                            helperText="Active automatiquement le prix de gros"
                                                        />
                                                    </Grid>
                                                </Grid>
                                            </Collapse>

                                            {/* Durée pour les services */}
                                            <Collapse in={values.product_type === 'service'} timeout="auto">
                                                <Grid container spacing={2} sx={{ pl: 2, mt: 0 }}>
                                                    <Grid item xs={12} md={6}>
                                                        <TextField
                                                            fullWidth
                                                            size={isMobile ? "small" : "medium"}
                                                            name="service_duration_hours"
                                                            label="Durée du service (heures)"
                                                            type="number"
                                                            value={values.service_duration_hours}
                                                            onChange={handleChange}
                                                            InputProps={{
                                                                startAdornment: <Schedule sx={{ mr: 1, color: 'action.active' }} />,
                                                            }}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={12} md={6}>
                                                        <TextField
                                                            fullWidth
                                                            size={isMobile ? "small" : "medium"}
                                                            name="max_simultaneous_bookings"
                                                            label="Réservations simultanées max"
                                                            type="number"
                                                            value={values.max_simultaneous_bookings}
                                                            onChange={handleChange}
                                                            helperText="Nombre de clients en même temps"
                                                        />
                                                    </Grid>
                                                </Grid>
                                            </Collapse>
                                        </Grid>
                                    </CardContent>
                                </Card>

                                {/* Inventaire et logistique - Seulement pour produits physiques et numériques */}
                                <Collapse in={values.product_type !== 'service'} timeout="auto">
                                    <Card sx={{ mb: 3 }}>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                                {values.product_type === 'digital' ? <Cloud sx={{ mr: 1 }} /> : <LocalShipping sx={{ mr: 1 }} />}
                                                {values.product_type === 'digital' ? 'Distribution numérique' : 'Stock et logistique'}
                                            </Typography>

                                            <Grid container spacing={2}>
                                                {/* Fournisseur/Éditeur */}
                                                <Grid item xs={12} md={6}>
                                                    <FormControl
                                                        fullWidth
                                                        size={isMobile ? "small" : "medium"}
                                                        required
                                                        error={touched.supplier_id && Boolean(errors.supplier_id)}
                                                    >
                                                        <InputLabel>
                                                            {values.product_type === 'digital' ? 'Éditeur / Plateforme' : 'Fournisseur'}
                                                        </InputLabel>
                                                        <Select
                                                            name="supplier_id"
                                                            value={values.supplier_id}
                                                            onChange={handleChange}
                                                            label={values.product_type === 'digital' ? 'Éditeur / Plateforme' : 'Fournisseur'}
                                                            startAdornment={<Business sx={{ ml: 1, mr: -0.5, color: 'action.active' }} />}
                                                        >
                                                            {suppliers.map((supplier) => (
                                                                <MenuItem key={supplier.id} value={supplier.id}>
                                                                    {supplier.name}
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                        {touched.supplier_id && errors.supplier_id && (
                                                            <FormHelperText>{errors.supplier_id}</FormHelperText>
                                                        )}
                                                    </FormControl>
                                                </Grid>

                                                {/* Entrepôt - Seulement pour produits physiques */}
                                                {values.product_type === 'physical' && (
                                                    <Grid item xs={12} md={6}>
                                                        <FormControl
                                                            fullWidth
                                                            size={isMobile ? "small" : "medium"}
                                                            required
                                                            error={touched.warehouse_id && Boolean(errors.warehouse_id)}
                                                        >
                                                            <InputLabel>Entrepôt principal</InputLabel>
                                                            <Select
                                                                name="warehouse_id"
                                                                value={values.warehouse_id}
                                                                onChange={handleChange}
                                                                label="Entrepôt principal"
                                                                startAdornment={<Warehouse sx={{ ml: 1, mr: -0.5, color: 'action.active' }} />}
                                                            >
                                                                {warehouses.map((warehouse) => (
                                                                    <MenuItem key={warehouse.id} value={warehouse.id}>
                                                                        {warehouse.name} ({warehouse.code})
                                                                    </MenuItem>
                                                                ))}
                                                            </Select>
                                                            {touched.warehouse_id && errors.warehouse_id && (
                                                                <FormHelperText>{errors.warehouse_id}</FormHelperText>
                                                            )}
                                                        </FormControl>
                                                    </Grid>
                                                )}

                                                {/* URL de téléchargement - Seulement pour produits numériques */}
                                                {values.product_type === 'digital' && (
                                                    <>
                                                        <Grid item xs={12} md={6}>
                                                            <TextField
                                                                fullWidth
                                                                size={isMobile ? "small" : "medium"}
                                                                name="download_url"
                                                                label="URL de téléchargement"
                                                                value={values.download_url}
                                                                onChange={handleChange}
                                                                placeholder="https://..."
                                                                helperText="Lien direct ou plateforme de distribution"
                                                            />
                                                        </Grid>
                                                        <Grid item xs={12} md={6}>
                                                            <TextField
                                                                fullWidth
                                                                size={isMobile ? "small" : "medium"}
                                                                name="license_duration_days"
                                                                label="Durée de la licence (jours)"
                                                                type="number"
                                                                value={values.license_duration_days}
                                                                onChange={handleChange}
                                                                helperText="Laissez vide pour une licence permanente"
                                                            />
                                                        </Grid>
                                                    </>
                                                )}

                                                {/* Stock / Licences */}
                                                <Grid item xs={12} md={6}>
                                                    <TextField
                                                        fullWidth
                                                        size={isMobile ? "small" : "medium"}
                                                        name="stock_quantity"
                                                        label={values.product_type === 'digital' ? 'Nombre de licences' : 'Quantité en stock'}
                                                        type="number"
                                                        value={values.stock_quantity}
                                                        onChange={handleChange}
                                                        onBlur={handleBlur}
                                                        error={touched.stock_quantity && Boolean(errors.stock_quantity)}
                                                        helperText={
                                                            values.product_type === 'digital'
                                                                ? 'Laissez vide pour illimité'
                                                                : touched.stock_quantity && errors.stock_quantity
                                                        }
                                                        required={values.product_type === 'physical'}
                                                        InputProps={{
                                                            startAdornment: <Inventory sx={{ mr: 1, color: 'action.active' }} />,
                                                        }}
                                                    />
                                                </Grid>

                                                {/* Quantité minimum - Seulement pour produits physiques */}
                                                {values.product_type === 'physical' && (
                                                    <>
                                                        <Grid item xs={12} md={6}>
                                                            <TextField
                                                                fullWidth
                                                                size={isMobile ? "small" : "medium"}
                                                                name="minimum_order_quantity"
                                                                label="Quantité minimum de commande"
                                                                type="number"
                                                                value={values.minimum_order_quantity}
                                                                onChange={handleChange}
                                                                onBlur={handleBlur}
                                                                error={touched.minimum_order_quantity && Boolean(errors.minimum_order_quantity)}
                                                                helperText={touched.minimum_order_quantity && errors.minimum_order_quantity}
                                                                required
                                                            />
                                                        </Grid>

                                                        <Grid item xs={12} md={6}>
                                                            <TextField
                                                                fullWidth
                                                                size={isMobile ? "small" : "medium"}
                                                                name="lead_time_days"
                                                                label="Délai de livraison (jours)"
                                                                type="number"
                                                                value={values.lead_time_days}
                                                                onChange={handleChange}
                                                                onBlur={handleBlur}
                                                                error={touched.lead_time_days && Boolean(errors.lead_time_days)}
                                                                helperText={touched.lead_time_days && errors.lead_time_days}
                                                                required
                                                                InputProps={{
                                                                    startAdornment: <LocalShipping sx={{ mr: 1, color: 'action.active' }} />,
                                                                }}
                                                            />
                                                        </Grid>
                                                    </>
                                                )}
                                            </Grid>
                                        </CardContent>
                                    </Card>
                                </Collapse>
                            </Grid>

                            {/* Sidebar */}
                            <Grid item xs={12} lg={4}>
                                {/* Statut et disponibilité */}
                                <Card sx={{ mb: 2 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Statut
                                        </Typography>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    name="is_available"
                                                    checked={values.is_available}
                                                    onChange={handleChange}
                                                    color="success"
                                                />
                                            }
                                            label={
                                                <Box display="flex" alignItems="center">
                                                    {values.is_available ? (
                                                        <>
                                                            <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                                                            Disponible à la vente
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Warning sx={{ mr: 1, color: 'warning.main' }} />
                                                            Non disponible
                                                        </>
                                                    )}
                                                </Box>
                                            }
                                        />
                                    </CardContent>
                                </Card>

                                {/* Image du produit */}
                                <Card sx={{ mb: 2 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Image sx={{ mr: 1 }} />
                                            Image
                                        </Typography>

                                        {values.image && typeof values.image === 'string' && (
                                            <Box sx={{ mb: 2, textAlign: 'center' }}>
                                                <img
                                                    src={values.image}
                                                    alt="Produit"
                                                    style={{
                                                        maxWidth: '100%',
                                                        maxHeight: 150,
                                                        objectFit: 'cover',
                                                        borderRadius: 8,
                                                    }}
                                                />
                                            </Box>
                                        )}

                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            startIcon={<Upload />}
                                            component="label"
                                            size={isMobile ? "small" : "medium"}
                                        >
                                            {values.image ? 'Changer' : 'Ajouter'}
                                            <input
                                                type="file"
                                                hidden
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        // TODO: Implement file upload
                                                        console.log('File:', file);
                                                    }
                                                }}
                                            />
                                        </Button>
                                    </CardContent>
                                </Card>

                                {/* Résumé des informations */}
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Résumé
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <Box display="flex" justifyContent="space-between">
                                                <Typography variant="caption" color="text.secondary">Type:</Typography>
                                                <Chip
                                                    size="small"
                                                    label={
                                                        values.product_type === 'physical' ? 'Physique' :
                                                            values.product_type === 'digital' ? 'Numérique' : 'Service'
                                                    }
                                                    color={
                                                        values.product_type === 'physical' ? 'primary' :
                                                            values.product_type === 'digital' ? 'info' : 'secondary'
                                                    }
                                                />
                                            </Box>
                                            {values.unit_price && (
                                                <Box display="flex" justifyContent="space-between">
                                                    <Typography variant="caption" color="text.secondary">Prix:</Typography>
                                                    <Typography variant="body2" fontWeight="bold">${values.unit_price}</Typography>
                                                </Box>
                                            )}
                                            {values.stock_quantity && values.product_type !== 'service' && (
                                                <Box display="flex" justifyContent="space-between">
                                                    <Typography variant="caption" color="text.secondary">
                                                        {values.product_type === 'digital' ? 'Licences:' : 'Stock:'}
                                                    </Typography>
                                                    <Typography variant="body2">{values.stock_quantity}</Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Boutons d'action */}
                            <Grid item xs={12}>
                                <Box sx={{
                                    display: 'flex',
                                    gap: 2,
                                    justifyContent: 'flex-end',
                                    position: isMobile ? 'fixed' : 'relative',
                                    bottom: isMobile ? 0 : 'auto',
                                    left: isMobile ? 0 : 'auto',
                                    right: isMobile ? 0 : 'auto',
                                    backgroundColor: isMobile ? 'background.paper' : 'transparent',
                                    p: isMobile ? 2 : 0,
                                    boxShadow: isMobile ? '0 -2px 10px rgba(0,0,0,0.1)' : 'none',
                                    zIndex: isMobile ? 1000 : 'auto',
                                }}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<Cancel />}
                                        onClick={() => navigate('/products')}
                                        disabled={isSubmitting}
                                        size={isMobile ? "medium" : "large"}
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        startIcon={<Save />}
                                        disabled={isSubmitting}
                                        size={isMobile ? "medium" : "large"}
                                    >
                                        {isSubmitting ? <CircularProgress size={24} /> : (isEdit ? 'Modifier' : 'Créer')}
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </Form>
                )}
            </Formik>

            {/* Espaceur pour mobile (éviter que les boutons fixes cachent le contenu) */}
            {isMobile && <Box sx={{ height: 80 }} />}
        </Box>
    );
}

export default ProductForm;