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
    Accordion,
    AccordionSummary,
    AccordionDetails,
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
import { useTranslation } from 'react-i18next';
import { productsAPI, suppliersAPI, productCategoriesAPI, warehousesAPI } from '../../services/api';

function ProductForm() {
    const { t } = useTranslation(['products', 'common']);
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
        reference: '',
        description: '',
        product_type: 'physical',
        source_type: 'purchased',
        category_id: '',

        // Prix
        price: '',
        cost_price: '',

        // Relations et stock
        supplier_id: '',
        warehouse_id: '',
        stock_quantity: 0,
        low_stock_threshold: 5,

        // Métadonnées
        is_active: true,
    });

    // Validation dynamique selon le type de produit
    const getValidationSchema = (productType, hasWarehouses = true) => {
        const baseSchema = {
            name: Yup.string().required(t('products:validation.nameRequired')),
            reference: Yup.string(),
            description: Yup.string().required(t('products:validation.descriptionRequired')),
            price: Yup.number().positive(t('products:validation.pricePositive')).required(t('products:validation.priceRequired')),
            cost_price: Yup.number().min(0, t('products:validation.costNegative')),
            category_id: Yup.string().nullable(),
            supplier_id: Yup.string().nullable(),
        };

        // Ajout des validations spécifiques selon le type
        if (productType === 'physical') {
            return Yup.object({
                ...baseSchema,
                // Warehouse requis seulement s'il y en a de disponibles
                warehouse_id: hasWarehouses
                    ? Yup.string().required(t('products:validation.warehouseRequired'))
                    : Yup.string().nullable(),
                stock_quantity: Yup.number().min(0, t('products:validation.stockNegative')).required(t('products:validation.stockRequired')),
                low_stock_threshold: Yup.number().min(0, t('products:validation.thresholdNegative')).required(t('products:validation.thresholdRequired')),
            });
        } else {
            return Yup.object(baseSchema);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Charger les données de manière indépendante pour gérer les erreurs 403
            // Suppliers (optionnel si module désactivé)
            try {
                const suppliersRes = await suppliersAPI.list();
                setSuppliers(suppliersRes.data.results || suppliersRes.data);
            } catch (error) {
                if (error.response?.status === 403) {
                    console.log('Module Suppliers non accessible - continuer sans');
                    setSuppliers([]);
                } else {
                    throw error;
                }
            }

            // Categories (optionnel)
            try {
                const categoriesRes = await productCategoriesAPI.list();
                setCategories(categoriesRes.data.results || categoriesRes.data);
            } catch (error) {
                if (error.response?.status === 403) {
                    console.log('Catégories non accessibles - continuer sans');
                    setCategories([]);
                } else {
                    console.error('Erreur catégories:', error);
                    setCategories([]);
                }
            }

            // Warehouses (requis pour produits physiques)
            try {
                const warehousesRes = await warehousesAPI.list();
                setWarehouses(warehousesRes.data.results || warehousesRes.data);
            } catch (error) {
                console.error('Error loading warehouses:', error);
                setWarehouses([]);
                enqueueSnackbar(t('products:messages.warehousesLoadError'), { variant: 'warning' });
            }

            // Charger le produit si en mode édition
            if (isEdit) {
                const response = await productsAPI.get(id);
                const productData = response.data;
                setInitialValues({
                    ...initialValues,
                    ...productData,
                    supplier_id: productData.supplier || '',
                    category_id: productData.category || '',
                    warehouse_id: productData.warehouse || '',
                });
            }
        } catch (error) {
            console.error('Erreur lors du chargement:', error);
            enqueueSnackbar(t('products:messages.loadingError'), { variant: 'error' });
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
                reference: values.reference || '',
                description: values.description,
                product_type: values.product_type,
                source_type: values.source_type,
                price: parseFloat(values.price),
                cost_price: parseFloat(values.cost_price) || 0,
                category: values.category_id || null,
                is_active: values.is_active,
            };

            // Ajouter supplier et warehouse pour tous les types si définis
            if (values.supplier_id) {
                cleanedValues.supplier = values.supplier_id;
            }

            if (values.warehouse_id) {
                cleanedValues.warehouse = values.warehouse_id;
            }

            // Ajouter stock pour produits physiques
            if (values.product_type === 'physical') {
                cleanedValues.stock_quantity = parseInt(values.stock_quantity) || 0;
                cleanedValues.low_stock_threshold = parseInt(values.low_stock_threshold) || 5;
            }

            if (isEdit) {
                await productsAPI.update(id, cleanedValues);
                enqueueSnackbar(t('products:messages.updateSuccess'), { variant: 'success' });
            } else {
                await productsAPI.create(cleanedValues);
                enqueueSnackbar(t('products:messages.createSuccess'), { variant: 'success' });
            }
            navigate('/products');
        } catch (error) {
            console.error('Erreur:', error);

            // Afficher message d'erreur plus détaillé
            if (error.response?.data) {
                const errorData = error.response.data;
                const errorMessages = [];

                // Parser les erreurs de validation Django
                for (const [field, messages] of Object.entries(errorData)) {
                    if (Array.isArray(messages)) {
                        errorMessages.push(`${field}: ${messages.join(', ')}`);
                    } else if (typeof messages === 'string') {
                        errorMessages.push(messages);
                    }
                }

                if (errorMessages.length > 0) {
                    enqueueSnackbar(`${t('products:messages.saveError')}: ${errorMessages.join(' | ')}`, { variant: 'error' });
                } else {
                    enqueueSnackbar(t('products:messages.saveError'), { variant: 'error' });
                }
            } else {
                enqueueSnackbar(t('products:messages.saveError'), { variant: 'error' });
            }
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
                {t('products:productTypes.title')}
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
                        <Typography variant="body2" fontWeight="bold">{t('products:productTypes.physical')}</Typography>
                        {!isMobile && <Typography variant="caption" display="block">{t('products:productTypes.physicalDesc')}</Typography>}
                    </Box>
                </ToggleButton>
                <ToggleButton value="digital" sx={{ justifyContent: 'flex-start', px: 2 }}>
                    <CloudDownload sx={{ mr: 1 }} />
                    <Box textAlign="left">
                        <Typography variant="body2" fontWeight="bold">{t('products:productTypes.digital')}</Typography>
                        {!isMobile && <Typography variant="caption" display="block">{t('products:productTypes.digitalDesc')}</Typography>}
                    </Box>
                </ToggleButton>
                <ToggleButton value="service" sx={{ justifyContent: 'flex-start', px: 2 }}>
                    <Build sx={{ mr: 1 }} />
                    <Box textAlign="left">
                        <Typography variant="body2" fontWeight="bold">{t('products:productTypes.service')}</Typography>
                        {!isMobile && <Typography variant="caption" display="block">{t('products:productTypes.serviceDesc')}</Typography>}
                    </Box>
                </ToggleButton>
            </ToggleButtonGroup>
        </Paper>
    );

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold" sx={{ mb: 3 }}>
                {isEdit ? t('products:editProduct') : t('products:newProduct')}
            </Typography>

            {/* Message d'information si modules manquants */}
            {(suppliers.length === 0 || warehouses.length === 0) && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    {suppliers.length === 0 && t('products:messages.missingSupplierModule') + ' '}
                    {warehouses.length === 0 && t('products:messages.missingWarehouses')}
                </Alert>
            )}

            <Formik
                initialValues={initialValues}
                validationSchema={getValidationSchema(initialValues.product_type, warehouses.length > 0)}
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

                                {/* Informations générales - ESSENTIELLES UNIQUEMENT */}
                                <Card sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Description sx={{ mr: 1 }} />
                                                {t('products:labels.generalInfo')}
                                            </Typography>
                                            {!isMobile && (
                                                <Chip
                                                    size="small"
                                                    label={t('products:labels.mandatory')}
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
                                                    label={t('products:labels.name')}
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
                                                    name="reference"
                                                    label={t('products:labels.reference')}
                                                    value={values.reference}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.reference && Boolean(errors.reference)}
                                                    helperText={touched.reference && errors.reference || t('products:messages.leaveEmptyForAuto')}
                                                    placeholder="PRD-0001"
                                                />
                                            </Grid>

                                            <Grid item xs={12}>
                                                <TextField
                                                    fullWidth
                                                    multiline
                                                    rows={isMobile ? 3 : 4}
                                                    size={isMobile ? "small" : "medium"}
                                                    name="description"
                                                    label={t('products:labels.detailedDescription')}
                                                    value={values.description}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.description && Boolean(errors.description)}
                                                    helperText={touched.description && errors.description}
                                                    required
                                                />
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>

                                {/* Tarification */}
                                <Card sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                            <AttachMoney sx={{ mr: 1 }} />
                                            {t('products:labels.pricing')}
                                        </Typography>

                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    size={isMobile ? "small" : "medium"}
                                                    name="price"
                                                    label={
                                                        values.product_type === 'service' ? t('products:labels.sellingPrice') :
                                                            values.product_type === 'digital' ? t('products:labels.pricePerLicense') :
                                                                t('products:labels.sellingPrice')
                                                    }
                                                    type="number"
                                                    value={values.price}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.price && Boolean(errors.price)}
                                                    helperText={touched.price && errors.price}
                                                    InputProps={{
                                                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                                    }}
                                                    required
                                                />
                                            </Grid>

                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    size={isMobile ? "small" : "medium"}
                                                    name="cost_price"
                                                    label={t('products:labels.costPrice')}
                                                    type="number"
                                                    value={values.cost_price}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.cost_price && Boolean(errors.cost_price)}
                                                    helperText={touched.cost_price && errors.cost_price}
                                                    InputProps={{
                                                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                                    }}
                                                />
                                            </Grid>

                                        </Grid>
                                    </CardContent>
                                </Card>

                                {/* Badge type visible pour non-physiques */}
                                {values.product_type !== 'physical' && (
                                    <Alert severity="info" sx={{ mb: 2 }}>
                                        Type: {values.product_type === 'service' ? 'Service' : 'Produit Digital'}
                                        {' - '}Aucune gestion de stock nécessaire
                                    </Alert>
                                )}

                                {/* DÉTAILS AVANCÉS - Accordion pour ne pas surcharger */}
                                <Accordion defaultExpanded={false} sx={{ mb: 3 }}>
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Info sx={{ mr: 1, color: 'primary.main' }} />
                                            <Typography variant="h6">Détails avancés</Typography>
                                            <Chip
                                                label="Optionnel"
                                                size="small"
                                                sx={{ ml: 2 }}
                                                variant="outlined"
                                                color="default"
                                            />
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Grid container spacing={2}>
                                            {/* Catégorie - Tous types */}
                                            <Grid item xs={12} md={6}>
                                                <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                                                    <InputLabel>{t('products:labels.category')}</InputLabel>
                                                    <Select
                                                        name="category_id"
                                                        value={values.category_id}
                                                        onChange={handleChange}
                                                        label={t('products:labels.category')}
                                                        startAdornment={<Category sx={{ ml: 1, mr: -0.5, color: 'action.active' }} />}
                                                    >
                                                        <MenuItem value="">
                                                            <em>{t('products:labels.uncategorized')}</em>
                                                        </MenuItem>
                                                        {categories.map((category) => (
                                                            <MenuItem key={category.id} value={category.id}>
                                                                {category.name}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </Grid>

                                            {/* Type de source - Seulement pour physiques */}
                                            {values.product_type === 'physical' && (
                                                <Grid item xs={12} md={6}>
                                                    <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                                                        <InputLabel>{t('products:labels.sourceType')}</InputLabel>
                                                        <Select
                                                            name="source_type"
                                                            value={values.source_type}
                                                            onChange={handleChange}
                                                            label={t('products:labels.sourceType')}
                                                        >
                                                            <MenuItem value="purchased">
                                                                <ShoppingCart sx={{ mr: 1, fontSize: 20 }} />
                                                                {t('products:sourceTypes.purchased')}
                                                            </MenuItem>
                                                            <MenuItem value="manufactured">
                                                                <Construction sx={{ mr: 1, fontSize: 20 }} />
                                                                {t('products:sourceTypes.manufactured')}
                                                            </MenuItem>
                                                            <MenuItem value="resale">
                                                                <Storefront sx={{ mr: 1, fontSize: 20 }} />
                                                                {t('products:sourceTypes.resale')}
                                                            </MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                </Grid>
                                            )}

                                            {/* Fournisseur - Tous types */}
                                            <Grid item xs={12} md={6}>
                                                <FormControl
                                                    fullWidth
                                                    size={isMobile ? "small" : "medium"}
                                                    error={touched.supplier_id && Boolean(errors.supplier_id)}
                                                >
                                                    <InputLabel>
                                                        {t('products:labels.supplierOptional')}
                                                    </InputLabel>
                                                    <Select
                                                        name="supplier_id"
                                                        value={values.supplier_id}
                                                        onChange={handleChange}
                                                        label={t('products:labels.supplierOptional')}
                                                        startAdornment={<Business sx={{ ml: 1, mr: -0.5, color: 'action.active' }} />}
                                                    >
                                                        <MenuItem value="">
                                                            <em>{t('products:labels.noSupplier')}</em>
                                                        </MenuItem>
                                                        {suppliers.map((supplier) => (
                                                            <MenuItem key={supplier.id} value={supplier.id}>
                                                                {supplier.name}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                    {touched.supplier_id && errors.supplier_id && (
                                                        <FormHelperText>{errors.supplier_id}</FormHelperText>
                                                    )}
                                                    {suppliers.length === 0 && (
                                                        <FormHelperText>
                                                            {t('products:messages.missingSupplierModule')}
                                                        </FormHelperText>
                                                    )}
                                                </FormControl>
                                            </Grid>

                                            {/* SECTION STOCK - Seulement pour produits physiques */}
                                            {values.product_type === 'physical' && (
                                                <>
                                                    <Grid item xs={12}>
                                                        <Divider sx={{ my: 1 }}>
                                                            <Chip label="Gestion de stock" icon={<LocalShipping />} size="small" />
                                                        </Divider>
                                                    </Grid>

                                                    {/* Entrepôt */}
                                                    <Grid item xs={12} md={6}>
                                                        <FormControl
                                                            fullWidth
                                                            size={isMobile ? "small" : "medium"}
                                                            required={warehouses.length > 0}
                                                            error={touched.warehouse_id && Boolean(errors.warehouse_id)}
                                                        >
                                                            <InputLabel>{t('products:labels.warehouseMain')} {warehouses.length > 0 ? '' : t('products:labels.optional')}</InputLabel>
                                                            <Select
                                                                name="warehouse_id"
                                                                value={values.warehouse_id}
                                                                onChange={handleChange}
                                                                label={`${t('products:labels.warehouseMain')} ${warehouses.length > 0 ? '' : t('products:labels.optional')}`}
                                                                startAdornment={<Warehouse sx={{ ml: 1, mr: -0.5, color: 'action.active' }} />}
                                                            >
                                                                {warehouses.length === 0 ? (
                                                                    <MenuItem value="">
                                                                        <em>{t('products:labels.noWarehouseAvailable')}</em>
                                                                    </MenuItem>
                                                                ) : (
                                                                    <>
                                                                        <MenuItem value="">
                                                                            <em>{t('products:labels.selectWarehouse')}</em>
                                                                        </MenuItem>
                                                                        {warehouses.map((warehouse) => (
                                                                            <MenuItem key={warehouse.id} value={warehouse.id}>
                                                                                {warehouse.name} ({warehouse.code}) - {warehouse.city}
                                                                            </MenuItem>
                                                                        ))}
                                                                    </>
                                                                )}
                                                            </Select>
                                                            {touched.warehouse_id && errors.warehouse_id && (
                                                                <FormHelperText error>{errors.warehouse_id}</FormHelperText>
                                                            )}
                                                            {warehouses.length === 0 && (
                                                                <FormHelperText>
                                                                    {t('products:messages.noWarehouseAvailable')}
                                                                </FormHelperText>
                                                            )}
                                                        </FormControl>
                                                    </Grid>

                                                    {/* Stock */}
                                                    <Grid item xs={12} md={6}>
                                                        <TextField
                                                            fullWidth
                                                            size={isMobile ? "small" : "medium"}
                                                            name="stock_quantity"
                                                            label={t('products:labels.stockQuantity')}
                                                            type="number"
                                                            value={values.stock_quantity}
                                                            onChange={handleChange}
                                                            onBlur={handleBlur}
                                                            error={touched.stock_quantity && Boolean(errors.stock_quantity)}
                                                            helperText={touched.stock_quantity && errors.stock_quantity}
                                                            required
                                                            InputProps={{
                                                                startAdornment: <Inventory sx={{ mr: 1, color: 'action.active' }} />,
                                                            }}
                                                        />
                                                    </Grid>

                                                    {/* Seuil stock bas */}
                                                    <Grid item xs={12} md={6}>
                                                        <TextField
                                                            fullWidth
                                                            size={isMobile ? "small" : "medium"}
                                                            name="low_stock_threshold"
                                                            label={t('products:labels.lowStockThreshold')}
                                                            type="number"
                                                            value={values.low_stock_threshold}
                                                            onChange={handleChange}
                                                            onBlur={handleBlur}
                                                            error={touched.low_stock_threshold && Boolean(errors.low_stock_threshold)}
                                                            helperText={touched.low_stock_threshold && errors.low_stock_threshold || t('products:messages.alertLowStock')}
                                                            required
                                                        />
                                                    </Grid>
                                                </>
                                            )}
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>
                            </Grid>

                            {/* Sidebar */}
                            <Grid item xs={12} lg={4}>
                                {/* Statut et disponibilité */}
                                <Card sx={{ mb: 2 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            {t('products:labels.status')}
                                        </Typography>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    name="is_active"
                                                    checked={values.is_active}
                                                    onChange={handleChange}
                                                    color="success"
                                                />
                                            }
                                            label={
                                                <Box display="flex" alignItems="center">
                                                    {values.is_active ? (
                                                        <>
                                                            <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                                                            {t('products:labels.activeProduct')}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Warning sx={{ mr: 1, color: 'warning.main' }} />
                                                            {t('products:labels.inactiveProduct')}
                                                        </>
                                                    )}
                                                </Box>
                                            }
                                        />
                                    </CardContent>
                                </Card>

                                {/* Résumé des informations */}
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            {t('products:labels.summary')}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <Box display="flex" justifyContent="space-between">
                                                <Typography variant="caption" color="text.secondary">{t('products:labels.type')}:</Typography>
                                                <Chip
                                                    size="small"
                                                    label={
                                                        values.product_type === 'physical' ? t('products:productTypes.physical') :
                                                            values.product_type === 'digital' ? t('products:productTypes.digital') : t('products:productTypes.service')
                                                    }
                                                    color={
                                                        values.product_type === 'physical' ? 'primary' :
                                                            values.product_type === 'digital' ? 'info' : 'secondary'
                                                    }
                                                />
                                            </Box>
                                            {values.price && (
                                                <Box display="flex" justifyContent="space-between">
                                                    <Typography variant="caption" color="text.secondary">{t('products:labels.price')}:</Typography>
                                                    <Typography variant="body2" fontWeight="bold">${values.price}</Typography>
                                                </Box>
                                            )}
                                            {values.stock_quantity && values.product_type !== 'service' && (
                                                <Box display="flex" justifyContent="space-between">
                                                    <Typography variant="caption" color="text.secondary">
                                                        {values.product_type === 'digital' ? t('products:labels.licensesCount') : t('products:labels.stockQuantity')}:
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
                                    zIndex: isMobile ? 1000 : 1,
                                    boxShadow: isMobile ? 4 : 0,
                                    width: isMobile ? '100%' : 'auto',
                                    margin: isMobile ? '-16px' : 0,
                                }}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<Cancel />}
                                        onClick={() => navigate('/products')}
                                        disabled={isSubmitting}
                                    >
                                        {t('products:actions.cancel')}
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        startIcon={<Save />}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? <CircularProgress size={24} /> : (isEdit ? t('products:actions.modify') : t('products:actions.create'))}
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </Form>
                )}
            </Formik>
        </Box>
    );
}

export default ProductForm;