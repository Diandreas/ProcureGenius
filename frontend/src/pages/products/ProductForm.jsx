import React, { useState, useEffect, useRef } from 'react';
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
    Stack,
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemIcon,
    Autocomplete,
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
    Add,
    Edit,
    Delete,
    Search,
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

    // Modal states
    const [supplierModalOpen, setSupplierModalOpen] = useState(false);
    const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [supplierSearch, setSupplierSearch] = useState('');
    const [warehouseSearch, setWarehouseSearch] = useState('');
    const [categorySearch, setCategorySearch] = useState('');

    // CRUD states for warehouses and categories
    const [warehouseFormOpen, setWarehouseFormOpen] = useState(false);
    const [categoryFormOpen, setCategoryFormOpen] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    const [warehouseFormData, setWarehouseFormData] = useState({ name: '', code: '', city: '', address: '', province: '', postal_code: '', country: 'Canada' });
    const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' });

    // Refs to access Formik values and setFieldValue from modals
    const formikRef = useRef({ setFieldValue: null, values: null });

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
        price_editable: false,

        // Relations et stock
        supplier_id: '',
        warehouse_id: '',
        stock_quantity: 0,
        low_stock_threshold: 5,

        // Métadonnées
        is_active: true,

        // Unités
        sell_unit: 'piece',
        base_unit: 'piece',
        conversion_factor: 1,
    });

    const UNIT_TYPES = [
        { value: 'piece', label: 'Pièce' },
        { value: 'box', label: 'Boîte' },
        { value: 'tablet', label: 'Comprimé' },
        { value: 'capsule', label: 'Gélule' },
        { value: 'blister', label: 'Plaquette' },
        { value: 'bottle', label: 'Flacon' },
        { value: 'vial', label: 'Ampoule' },
        { value: 'sachet', label: 'Sachet' },
        { value: 'tube', label: 'Tube' },
        { value: 'ml', label: 'Millilitre' },
        { value: 'l', label: 'Litre' },
        { value: 'g', label: 'Gramme' },
        { value: 'kg', label: 'Kilogramme' },
    ];

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
            sell_unit: Yup.string().required(t('products:validation.required')),
            base_unit: Yup.string().required(t('products:validation.required')),
            conversion_factor: Yup.number().positive().required(t('products:validation.required')),
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

    const handleOpenWarehouseForm = (warehouse = null) => {
        if (warehouse) {
            setEditingWarehouse(warehouse);
            setWarehouseFormData({
                name: warehouse.name || '',
                code: warehouse.code || '',
                city: warehouse.city || '',
                address: warehouse.address || '',
                province: warehouse.province || '',
                postal_code: warehouse.postal_code || '',
                country: warehouse.country || 'Canada'
            });
        } else {
            setEditingWarehouse(null);
            setWarehouseFormData({ name: '', code: '', city: '', address: '', province: '', postal_code: '', country: 'Canada' });
        }
        setWarehouseFormOpen(true);
    };

    const handleOpenCategoryForm = (category = null) => {
        if (category) {
            setEditingCategory(category);
            setCategoryFormData({
                name: category.name || '',
                description: category.description || ''
            });
        } else {
            setEditingCategory(null);
            setCategoryFormData({ name: '', description: '' });
        }
        setCategoryFormOpen(true);
    };

    // Modal handlers that use setFieldValue
    const handleSupplierSelect = (supplier) => {
        if (formikRef.current.setFieldValue) {
            formikRef.current.setFieldValue('supplier_id', supplier.id);
        }
        setSupplierModalOpen(false);
        setSupplierSearch('');
    };

    const handleWarehouseSelect = (warehouse) => {
        if (formikRef.current.setFieldValue) {
            formikRef.current.setFieldValue('warehouse_id', warehouse.id);
        }
        setWarehouseModalOpen(false);
        setWarehouseSearch('');
    };

    const handleCategorySelect = (category) => {
        if (formikRef.current.setFieldValue) {
            formikRef.current.setFieldValue('category_id', category.id);
        }
        setCategoryModalOpen(false);
        setCategorySearch('');
    };

    const handleCreateSupplier = async (name, email) => {
        try {
            const response = await suppliersAPI.create({ name, email });
            const newSupplier = response.data;
            setSuppliers(prev => [...prev, newSupplier]);
            if (formikRef.current.setFieldValue) {
                formikRef.current.setFieldValue('supplier_id', newSupplier.id);
            }
            setSupplierModalOpen(false);
            enqueueSnackbar(t('products:messages.supplierCreated'), { variant: 'success' });
        } catch (error) {
            enqueueSnackbar(t('products:messages.supplierCreateError'), { variant: 'error' });
        }
    };

    const handleSaveWarehouse = async () => {
        try {
            // Nettoyer les données - ne garder que les champs remplis
            const cleanedData = {
                name: warehouseFormData.name.trim(),
                code: warehouseFormData.code.trim().toUpperCase(),
            };

            // Ajouter les champs optionnels seulement s'ils sont remplis
            if (warehouseFormData.address?.trim()) {
                cleanedData.address = warehouseFormData.address.trim();
            }
            if (warehouseFormData.city?.trim()) {
                cleanedData.city = warehouseFormData.city.trim();
            }
            if (warehouseFormData.province?.trim()) {
                cleanedData.province = warehouseFormData.province.trim();
            }
            if (warehouseFormData.postal_code?.trim()) {
                cleanedData.postal_code = warehouseFormData.postal_code.trim();
            }
            // Country a toujours une valeur par défaut
            cleanedData.country = (warehouseFormData.country?.trim() || 'Canada');

            let response;
            if (editingWarehouse) {
                response = await warehousesAPI.update(editingWarehouse.id, cleanedData);
                setWarehouses(prev => prev.map(w => w.id === editingWarehouse.id ? response.data : w));
                enqueueSnackbar(t('products:messages.warehouseUpdated', 'Entrepôt modifié avec succès'), { variant: 'success' });
            } else {
                response = await warehousesAPI.create(cleanedData);
                setWarehouses(prev => [...prev, response.data]);
                // Auto-select the newly created warehouse
                if (formikRef.current.setFieldValue) {
                    formikRef.current.setFieldValue('warehouse_id', response.data.id);
                }
                enqueueSnackbar(t('products:messages.warehouseCreated'), { variant: 'success' });
            }
            setWarehouseFormOpen(false);
            setEditingWarehouse(null);
            setWarehouseFormData({ name: '', code: '', city: '', address: '', province: '', postal_code: '', country: 'Canada' });
        } catch (error) {
            console.error('Warehouse error:', error);
            const errorMessage = error.response?.data?.code?.[0] ||
                error.response?.data?.name?.[0] ||
                error.response?.data?.detail ||
                error.response?.data?.message ||
                t('products:messages.warehouseCreateError');
            enqueueSnackbar(errorMessage, { variant: 'error' });
        }
    };

    const handleDeleteWarehouse = async (warehouseId) => {
        if (window.confirm(t('products:messages.deleteWarehouseConfirm', 'Êtes-vous sûr de vouloir supprimer cet entrepôt ?'))) {
            try {
                await warehousesAPI.delete(warehouseId);
                setWarehouses(prev => prev.filter(w => w.id !== warehouseId));
                if (formikRef.current.values && formikRef.current.values.warehouse_id === warehouseId && formikRef.current.setFieldValue) {
                    formikRef.current.setFieldValue('warehouse_id', '');
                }
                enqueueSnackbar(t('products:messages.warehouseDeleted', 'Entrepôt supprimé avec succès'), { variant: 'success' });
            } catch (error) {
                enqueueSnackbar(t('products:messages.warehouseDeleteError', 'Erreur lors de la suppression'), { variant: 'error' });
            }
        }
    };

    const handleSaveCategory = async () => {
        try {
            let response;
            if (editingCategory) {
                response = await productCategoriesAPI.update(editingCategory.id, categoryFormData);
                setCategories(prev => prev.map(c => c.id === editingCategory.id ? response.data : c));
                enqueueSnackbar(t('products:messages.categoryUpdated', 'Catégorie modifiée avec succès'), { variant: 'success' });
            } else {
                response = await productCategoriesAPI.create(categoryFormData);
                setCategories(prev => [...prev, response.data]);
                // Auto-select the newly created category
                if (formikRef.current.setFieldValue) {
                    formikRef.current.setFieldValue('category_id', response.data.id);
                }
                enqueueSnackbar(t('products:messages.categoryCreated'), { variant: 'success' });
            }
            setCategoryFormOpen(false);
            setEditingCategory(null);
            setCategoryFormData({ name: '', description: '' });
        } catch (error) {
            enqueueSnackbar(t('products:messages.categoryCreateError'), { variant: 'error' });
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (window.confirm(t('products:messages.deleteCategoryConfirm', 'Êtes-vous sûr de vouloir supprimer cette catégorie ?'))) {
            try {
                await productCategoriesAPI.delete(categoryId);
                setCategories(prev => prev.filter(c => c.id !== categoryId));
                if (formikRef.current.values && formikRef.current.values.category_id === categoryId && formikRef.current.setFieldValue) {
                    formikRef.current.setFieldValue('category_id', '');
                }
                enqueueSnackbar(t('products:messages.categoryDeleted', 'Catégorie supprimée avec succès'), { variant: 'success' });
            } catch (error) {
                enqueueSnackbar(t('products:messages.categoryDeleteError', 'Erreur lors de la suppression'), { variant: 'error' });
            }
        }
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
                price_editable: values.price_editable,
                category: values.category_id || null,
                is_active: true, // Toujours actif par défaut
                sell_unit: values.sell_unit,
                base_unit: values.base_unit,
                conversion_factor: parseFloat(values.conversion_factor) || 1,
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
        <ToggleButtonGroup
            value={value}
            exclusive
            onChange={(e, newValue) => newValue && onChange({ target: { name: 'product_type', value: newValue } })}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
        >
            <ToggleButton value="physical" sx={{ py: 1 }}>
                <Inventory sx={{ mr: 1, fontSize: 20 }} />
                <Typography variant="body2" fontWeight="bold">{t('products:productTypes.physical')}</Typography>
            </ToggleButton>
            <ToggleButton value="service" sx={{ py: 1 }}>
                <Build sx={{ mr: 1, fontSize: 20 }} />
                <Typography variant="body2" fontWeight="bold">{t('products:productTypes.service')}</Typography>
            </ToggleButton>
        </ToggleButtonGroup>
    );

    return (
        <Box sx={{
            maxWidth: 1400,
            mx: 'auto',
            p: { xs: 0, sm: 2, md: 3 },
            bgcolor: 'background.default',
            minHeight: '100vh'
        }}>
            {/* Header - Caché sur mobile (géré par top navbar) */}
            <Box sx={{ mb: 3, display: { xs: 'none', md: 'block' } }}>
                <Typography variant={isMobile ? "h5" : "h4"} fontWeight={700} sx={{ mb: 0.5 }}>
                    {isEdit ? t('products:editProduct') : t('products:newProduct')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {isEdit ? t('products:messages.editProductDescription') : t('products:messages.createProductDescription')}
                </Typography>
            </Box>

            {/* Actions Mobile - Style mobile app compact (pas de bouton back, géré par top navbar) */}
            <Box sx={{
                mb: 1.5,
                display: { xs: 'flex', md: 'none' },
                justifyContent: 'flex-end',
                px: 2,
                py: 1
            }}>
                {/* Les actions sont gérées par le top navbar sur mobile */}
            </Box>
            <Box sx={{ px: isMobile ? 2 : 0 }}>

                {/* Message d'information si warehouses manquants */}
                {warehouses.length === 0 && (
                    <Alert
                        severity="info"
                        sx={{
                            mb: 3,
                            borderRadius: 1.5,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            border: 'none',
                            '& .MuiAlert-icon': {
                                alignItems: 'center'
                            }
                        }}
                    >
                        {t('products:messages.missingWarehouses')}
                    </Alert>
                )}

                <Formik
                    initialValues={initialValues}
                    validationSchema={getValidationSchema(initialValues.product_type, warehouses.length > 0)}
                    onSubmit={handleSubmit}
                    enableReinitialize
                >
                    {({ values, errors, touched, handleChange, handleBlur, isSubmitting, setFieldValue }) => {
                        // Update refs to access from modals
                        formikRef.current.setFieldValue = setFieldValue;
                        formikRef.current.values = values;

                        return (
                            <Form>
                                <Grid container spacing={2}>
                                    {/* Section principale */}
                                    <Grid item xs={12} md={8}>
                                        <ProductTypeSelector value={values.product_type} onChange={handleChange} />

                                        <Card variant="outlined" sx={{ mb: 2 }}>
                                            <CardContent sx={{ p: 2 }}>
                                                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                                                    <Info sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                                                    Informations
                                                </Typography>
                                                <Grid container spacing={2}>
                                                    <Grid item xs={12} sm={8}>
                                                        <TextField
                                                            fullWidth size="small"
                                                            name="name" label={t('products:labels.name')}
                                                            value={values.name} onChange={handleChange} onBlur={handleBlur}
                                                            error={touched.name && Boolean(errors.name)}
                                                            required
                                                        />
                                                    </Grid>
                                                    <Grid item xs={12} sm={4}>
                                                        <TextField
                                                            fullWidth size="small"
                                                            name="reference" label={t('products:labels.reference')}
                                                            value={values.reference} onChange={handleChange} onBlur={handleBlur}
                                                            placeholder="Auto"
                                                        />
                                                    </Grid>
                                                    <Grid item xs={12}>
                                                        <TextField
                                                            fullWidth multiline rows={2} size="small"
                                                            name="description" label={t('products:labels.description')}
                                                            value={values.description} onChange={handleChange}
                                                        />
                                                    </Grid>
                                                </Grid>
                                            </CardContent>
                                        </Card>

                                        {/* Unités et Prix */}
                                        <Card variant="outlined" sx={{ mb: 2 }}>
                                            <CardContent sx={{ p: 2 }}>
                                                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                                                    <AttachMoney sx={{ mr: 1, fontSize: 20, color: 'success.main' }} />
                                                    Unités & Prix
                                                </Typography>
                                                <Grid container spacing={2}>
                                                    <Grid item xs={12} sm={values.product_type === 'physical' ? 4 : 12}>
                                                        <TextField
                                                            select fullWidth size="small"
                                                            name="sell_unit" label={values.product_type === 'physical' ? t('products:labels.sellUnit', 'Unité de Vente') : t('products:labels.unit', 'Unité')}
                                                            value={values.sell_unit} onChange={(e) => {
                                                                handleChange(e);
                                                                if (values.product_type === 'service') {
                                                                    setFieldValue('base_unit', e.target.value);
                                                                }
                                                            }}
                                                        >
                                                            {UNIT_TYPES.map(u => <MenuItem key={u.value} value={u.value}>{u.label}</MenuItem>)}
                                                        </TextField>
                                                    </Grid>
                                                    {values.product_type === 'physical' && (
                                                        <>
                                                            <Grid item xs={12} sm={4}>
                                                                <TextField
                                                                    select fullWidth size="small"
                                                                    name="base_unit" label={t('products:labels.baseUnit', 'Unité de Stockage')}
                                                                    value={values.base_unit} onChange={handleChange}
                                                                    helperText="(Stocké)"
                                                                >
                                                                    {UNIT_TYPES.map(u => <MenuItem key={u.value} value={u.value}>{u.label}</MenuItem>)}
                                                                </TextField>
                                                            </Grid>
                                                            <Grid item xs={12} sm={4}>
                                                                <TextField
                                                                    fullWidth size="small" type="number"
                                                                    name="conversion_factor" label="Facteur"
                                                                    value={values.conversion_factor} onChange={handleChange}
                                                                    helperText={`1 ${values.sell_unit} = ${values.conversion_factor} ${values.base_unit}`}
                                                                />
                                                            </Grid>
                                                        </>
                                                    )}
                                                    <Grid item xs={12} sm={6}>
                                                        <TextField
                                                            fullWidth size="small" type="number"
                                                            name="price" label="Prix de Vente"
                                                            value={values.price} onChange={handleChange}
                                                            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={12} sm={6}>
                                                        <TextField
                                                            fullWidth size="small" type="number"
                                                            name="cost_price" label="Coût d'achat"
                                                            value={values.cost_price} onChange={handleChange}
                                                            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={12}>
                                                        <FormControlLabel
                                                            control={
                                                                <Checkbox
                                                                    name="price_editable"
                                                                    checked={values.price_editable}
                                                                    onChange={handleChange}
                                                                    color="primary"
                                                                />
                                                            }
                                                            label={
                                                                <Box>
                                                                    <Typography variant="body2" fontWeight={500}>
                                                                        {t('products:labels.priceEditable', 'Prix modifiable lors de la facturation')}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        Permet d'ajuster le prix manuellement sur chaque facture
                                                                    </Typography>
                                                                </Box>
                                                            }
                                                        />
                                                    </Grid>
                                                </Grid>
                                            </CardContent>
                                        </Card>

                                        {/* Stock (Physique seulement) */}
                                        {values.product_type === 'physical' && (
                                            <Card variant="outlined">
                                                <CardContent sx={{ p: 2 }}>
                                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                                                        <Inventory sx={{ mr: 1, fontSize: 20, color: 'warning.main' }} />
                                                        Stock
                                                    </Typography>
                                                    <Grid container spacing={2}>
                                                        <Grid item xs={12} sm={6}>
                                                            <TextField
                                                                fullWidth size="small" type="number"
                                                                name="stock_quantity" label={`Quantité (${values.base_unit})`}
                                                                value={values.stock_quantity} onChange={handleChange}
                                                            />
                                                        </Grid>
                                                        <Grid item xs={12} sm={6}>
                                                            <TextField
                                                                fullWidth size="small" type="number"
                                                                name="low_stock_threshold" label="Seuil alerte"
                                                                value={values.low_stock_threshold} onChange={handleChange}
                                                            />
                                                        </Grid>
                                                        <Grid item xs={12}>
                                                            <TextField
                                                                select fullWidth size="small"
                                                                name="warehouse_id" label="Entrepôt"
                                                                value={values.warehouse_id} onChange={handleChange}
                                                            >
                                                                {warehouses.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                                                            </TextField>
                                                        </Grid>
                                                    </Grid>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </Grid>

                                    {/* Sidebar (Catégorie, Fournisseur, Actions) */}
                                    <Grid item xs={12} md={4}>
                                        <Card variant="outlined" sx={{ mb: 2 }}>
                                            <CardContent sx={{ p: 2 }}>
                                                <Button
                                                    type="submit"
                                                    variant="contained"
                                                    fullWidth
                                                    disabled={isSubmitting}
                                                    startIcon={<Save />}
                                                    sx={{ mb: 1 }}
                                                >
                                                    {isEdit ? t('common:save') : t('common:create')}
                                                </Button>
                                                <Button
                                                    fullWidth
                                                    variant="outlined"
                                                    onClick={() => navigate('/products')}
                                                >
                                                    {t('common:cancel')}
                                                </Button>
                                            </CardContent>
                                        </Card>

                                        <Card variant="outlined">
                                            <CardContent sx={{ p: 2 }}>
                                                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                                                    Organisation
                                                </Typography>
                                                <Stack spacing={2}>
                                                    <TextField
                                                        select fullWidth size="small"
                                                        name="category_id" label="Catégorie"
                                                        value={values.category_id} onChange={handleChange}
                                                    >
                                                        <MenuItem value=""><em>Aucune</em></MenuItem>
                                                        {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                                    </TextField>
                                                    <TextField
                                                        select fullWidth size="small"
                                                        name="supplier_id" label="Fournisseur"
                                                        value={values.supplier_id} onChange={handleChange}
                                                    >
                                                        <MenuItem value=""><em>Aucun</em></MenuItem>
                                                        {suppliers.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                                                    </TextField>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>
                            </Form>
                        );
                    }}
                </Formik>
            </Box>

            {/* Supplier Selection Modal - Modern Design */}
            < Dialog
                open={supplierModalOpen}
                onClose={() => setSupplierModalOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 1.5,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }
                }}
            >
                <DialogTitle sx={{ pb: 2, pt: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{
                                p: 1,
                                borderRadius: 2,
                                bgcolor: 'info.50',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Business color="info" />
                            </Box>
                            <Box>
                                <Typography variant="h6" fontWeight={600}>
                                    {t('products:modals.selectSupplier', 'Sélectionner un fournisseur')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Choisissez un fournisseur pour ce produit
                                </Typography>
                            </Box>
                        </Box>
                        <Button
                            startIcon={<Add />}
                            variant="contained"
                            size="small"
                            onClick={() => {
                                const name = prompt(t('products:modals.supplierName', 'Nom du fournisseur:'));
                                const email = prompt(t('products:modals.supplierEmail', 'Email (optionnel):'));
                                if (name) {
                                    handleCreateSupplier(name, email || '');
                                }
                            }}
                            sx={{ borderRadius: 2 }}
                        >
                            {t('products:actions.add', 'Ajouter')}
                        </Button>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        fullWidth
                        size="medium"
                        placeholder={t('products:modals.searchSupplier', 'Rechercher un fournisseur...')}
                        value={supplierSearch}
                        onChange={(e) => setSupplierSearch(e.target.value)}
                        sx={{ mb: 2 }}
                        InputProps={{
                            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                    />
                    <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                        {suppliers
                            .filter(s => !supplierSearch || s.name.toLowerCase().includes(supplierSearch.toLowerCase()))
                            .map((supplier) => (
                                <ListItem
                                    key={supplier.id}
                                    disablePadding
                                    sx={{
                                        mb: 1,
                                        borderRadius: 2,
                                        bgcolor: 'background.default',
                                        '&:hover': {
                                            bgcolor: 'action.hover'
                                        }
                                    }}
                                >
                                    <ListItemButton
                                        onClick={() => handleSupplierSelect(supplier)}
                                        sx={{ borderRadius: 1 }}
                                    >
                                        <ListItemIcon>
                                            <Box sx={{
                                                p: 1,
                                                borderRadius: 1.5,
                                                bgcolor: 'info.50',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Business color="info" fontSize="small" />
                                            </Box>
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={supplier.name}
                                            secondary={supplier.email || t('common:labels.noEmail')}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        {suppliers.length === 0 && (
                            <ListItem>
                                <ListItemText
                                    primary={t('products:messages.noSuppliers', 'Aucun fournisseur disponible')}
                                    secondary={t('products:messages.clickAddToCreateFirstSupplier')}
                                />
                            </ListItem>
                        )}
                    </List>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button
                        onClick={() => setSupplierModalOpen(false)}
                        sx={{ borderRadius: 2 }}
                    >
                        {t('products:actions.cancel')}
                    </Button>
                </DialogActions>
            </Dialog >

            {/* Warehouse Selection Modal - Modern Design */}
            < Dialog
                open={warehouseModalOpen}
                onClose={() => setWarehouseModalOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 1.5,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }
                }}
            >
                <DialogTitle sx={{ pb: 2, pt: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{
                                p: 1,
                                borderRadius: 2,
                                bgcolor: 'primary.50',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Warehouse color="primary" />
                            </Box>
                            <Box>
                                <Typography variant="h6" fontWeight={600}>
                                    {t('products:modals.manageWarehouses', 'Gérer les entrepôts')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Sélectionnez ou gérez vos entrepôts
                                </Typography>
                            </Box>
                        </Box>
                        <Button
                            startIcon={<Add />}
                            variant="contained"
                            size="small"
                            onClick={() => {
                                setWarehouseModalOpen(false);
                                handleOpenWarehouseForm();
                            }}
                            sx={{ borderRadius: 2 }}
                        >
                            {t('products:actions.add', 'Ajouter')}
                        </Button>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        fullWidth
                        size="medium"
                        placeholder={t('products:modals.searchWarehouse', 'Rechercher un entrepôt...')}
                        value={warehouseSearch}
                        onChange={(e) => setWarehouseSearch(e.target.value)}
                        sx={{ mb: 2 }}
                        InputProps={{
                            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                    />
                    <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                        {warehouses
                            .filter(w => !warehouseSearch || w.name.toLowerCase().includes(warehouseSearch.toLowerCase()) || w.code.toLowerCase().includes(warehouseSearch.toLowerCase()))
                            .map((warehouse) => (
                                <ListItem
                                    key={warehouse.id}
                                    sx={{
                                        mb: 1,
                                        borderRadius: 2,
                                        bgcolor: 'background.default',
                                        '&:hover': {
                                            bgcolor: 'action.hover'
                                        }
                                    }}
                                    secondaryAction={
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <IconButton
                                                edge="end"
                                                size="small"
                                                onClick={() => {
                                                    setWarehouseModalOpen(false);
                                                    handleOpenWarehouseForm(warehouse);
                                                }}
                                                sx={{
                                                    '&:hover': { bgcolor: 'primary.50' }
                                                }}
                                            >
                                                <Edit fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                edge="end"
                                                size="small"
                                                onClick={() => handleDeleteWarehouse(warehouse.id)}
                                                sx={{
                                                    '&:hover': { bgcolor: 'error.50' }
                                                }}
                                            >
                                                <Delete fontSize="small" color="error" />
                                            </IconButton>
                                        </Box>
                                    }
                                >
                                    <ListItemButton
                                        onClick={() => {
                                            handleWarehouseSelect(warehouse);
                                        }}
                                        sx={{ borderRadius: 1 }}
                                    >
                                        <ListItemIcon>
                                            <Box sx={{
                                                p: 1,
                                                borderRadius: 1.5,
                                                bgcolor: 'primary.50',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Warehouse color="primary" fontSize="small" />
                                            </Box>
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Typography fontWeight={500}>
                                                    {warehouse.name} <Chip label={warehouse.code} size="small" sx={{ ml: 1, height: 20 }} />
                                                </Typography>
                                            }
                                            secondary={warehouse.city || warehouse.address}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        {warehouses.length === 0 && (
                            <ListItem>
                                <ListItemText
                                    primary={t('products:messages.noWarehouses', 'Aucun entrepôt disponible')}
                                    secondary={t('products:messages.clickAddToCreateFirstWarehouse')}
                                />
                            </ListItem>
                        )}
                    </List>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button
                        onClick={() => setWarehouseModalOpen(false)}
                        sx={{ borderRadius: 2 }}
                    >
                        {t('products:actions.cancel')}
                    </Button>
                </DialogActions>
            </Dialog >

            {/* Warehouse Form Modal - Modern Design */}
            < Dialog
                open={warehouseFormOpen}
                onClose={() => {
                    setWarehouseFormOpen(false);
                    setEditingWarehouse(null);
                    setWarehouseFormData({ name: '', code: '', city: '', address: '', province: '', postal_code: '', country: 'Canada' });
                }}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 1.5,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }
                }}
            >
                <DialogTitle sx={{ pb: 1, pt: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            p: 1,
                            borderRadius: 2,
                            bgcolor: 'primary.50',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Warehouse color="primary" />
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight={600}>
                                {editingWarehouse ? t('products:modals.editWarehouse', 'Modifier l\'entrepôt') : t('products:modals.newWarehouse', 'Nouvel entrepôt')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {editingWarehouse ? t('products:messages.editWarehouseDescription') : t('products:messages.createWarehouseDescription')}
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={8}>
                                <TextField
                                    fullWidth
                                    label={t('products:modals.warehouseName', 'Nom de l\'entrepôt')}
                                    value={warehouseFormData.name}
                                    onChange={(e) => setWarehouseFormData({ ...warehouseFormData, name: e.target.value })}
                                    required
                                    autoFocus
                                    variant="outlined"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    label={t('products:modals.warehouseCode', 'Code')}
                                    value={warehouseFormData.code}
                                    onChange={(e) => setWarehouseFormData({ ...warehouseFormData, code: e.target.value.toUpperCase() })}
                                    required
                                    variant="outlined"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                                    helperText={t('products:messages.uniqueCode')}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label={t('products:modals.warehouseAddress', 'Adresse')}
                                    value={warehouseFormData.address}
                                    onChange={(e) => setWarehouseFormData({ ...warehouseFormData, address: e.target.value })}
                                    multiline
                                    rows={2}
                                    variant="outlined"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label={t('products:modals.warehouseCity', 'Ville')}
                                    value={warehouseFormData.city}
                                    onChange={(e) => setWarehouseFormData({ ...warehouseFormData, city: e.target.value })}
                                    variant="outlined"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label={t('common:labels.province')}
                                    value={warehouseFormData.province}
                                    onChange={(e) => setWarehouseFormData({ ...warehouseFormData, province: e.target.value })}
                                    variant="outlined"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label={t('common:labels.postalCode')}
                                    value={warehouseFormData.postal_code}
                                    onChange={(e) => setWarehouseFormData({ ...warehouseFormData, postal_code: e.target.value })}
                                    variant="outlined"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label={t('common:labels.country')}
                                    value={warehouseFormData.country}
                                    onChange={(e) => setWarehouseFormData({ ...warehouseFormData, country: e.target.value })}
                                    variant="outlined"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
                    <Button
                        onClick={() => {
                            setWarehouseFormOpen(false);
                            setEditingWarehouse(null);
                            setWarehouseFormData({ name: '', code: '', city: '', address: '', province: '', postal_code: '', country: 'Canada' });
                        }}
                        sx={{ borderRadius: 2 }}
                    >
                        {t('products:actions.cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveWarehouse}
                        disabled={!warehouseFormData.name || !warehouseFormData.code}
                        startIcon={<Save />}
                        sx={{ borderRadius: 2, px: 3 }}
                    >
                        {editingWarehouse ? t('products:actions.save', 'Enregistrer') : t('products:actions.create')}
                    </Button>
                </DialogActions>
            </Dialog >

            {/* Category Selection Modal - Modern Design */}
            < Dialog
                open={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 1.5,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }
                }}
            >
                <DialogTitle sx={{ pb: 2, pt: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{
                                p: 1,
                                borderRadius: 2,
                                bgcolor: 'secondary.50',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Category color="secondary" />
                            </Box>
                            <Box>
                                <Typography variant="h6" fontWeight={600}>
                                    {t('products:modals.manageCategories', 'Gérer les catégories')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Organisez vos produits par catégories
                                </Typography>
                            </Box>
                        </Box>
                        <Button
                            startIcon={<Add />}
                            variant="contained"
                            size="small"
                            onClick={() => {
                                setCategoryModalOpen(false);
                                handleOpenCategoryForm();
                            }}
                            sx={{ borderRadius: 2 }}
                        >
                            {t('products:actions.add', 'Ajouter')}
                        </Button>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        fullWidth
                        size="medium"
                        placeholder={t('products:modals.searchCategory', 'Rechercher une catégorie...')}
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        sx={{ mb: 2 }}
                        InputProps={{
                            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                    />
                    <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                        <ListItem
                            disablePadding
                            sx={{
                                mb: 1,
                                borderRadius: 2,
                                bgcolor: 'background.default',
                                '&:hover': {
                                    bgcolor: 'action.hover'
                                }
                            }}
                        >
                            <ListItemButton
                                onClick={() => {
                                    if (formikRef.current.setFieldValue) {
                                        formikRef.current.setFieldValue('category_id', '');
                                    }
                                    setCategoryModalOpen(false);
                                }}
                                sx={{ borderRadius: 2 }}
                            >
                                <ListItemIcon>
                                    <Box sx={{
                                        p: 1,
                                        borderRadius: 1.5,
                                        bgcolor: 'grey.100',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Category color="disabled" fontSize="small" />
                                    </Box>
                                </ListItemIcon>
                                <ListItemText
                                    primary={t('products:labels.uncategorized')}
                                    secondary={t('products:messages.uncategorizedProduct')}
                                />
                            </ListItemButton>
                        </ListItem>
                        {categories
                            .filter(c => !categorySearch || c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                            .map((category) => (
                                <ListItem
                                    key={category.id}
                                    sx={{
                                        mb: 1,
                                        borderRadius: 2,
                                        bgcolor: 'background.default',
                                        '&:hover': {
                                            bgcolor: 'action.hover'
                                        }
                                    }}
                                    secondaryAction={
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <IconButton
                                                edge="end"
                                                size="small"
                                                onClick={() => {
                                                    setCategoryModalOpen(false);
                                                    handleOpenCategoryForm(category);
                                                }}
                                                sx={{
                                                    '&:hover': { bgcolor: 'secondary.50' }
                                                }}
                                            >
                                                <Edit fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                edge="end"
                                                size="small"
                                                onClick={() => handleDeleteCategory(category.id)}
                                                sx={{
                                                    '&:hover': { bgcolor: 'error.50' }
                                                }}
                                            >
                                                <Delete fontSize="small" color="error" />
                                            </IconButton>
                                        </Box>
                                    }
                                >
                                    <ListItemButton
                                        onClick={() => handleCategorySelect(category)}
                                        sx={{ borderRadius: 1 }}
                                    >
                                        <ListItemIcon>
                                            <Box sx={{
                                                p: 1,
                                                borderRadius: 1.5,
                                                bgcolor: 'secondary.50',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Category color="secondary" fontSize="small" />
                                            </Box>
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={category.name}
                                            secondary={category.description || t('common:labels.noDescription')}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        {categories.length === 0 && (
                            <ListItem>
                                <ListItemText
                                    primary={t('products:messages.noCategories', 'Aucune catégorie disponible')}
                                    secondary={t('products:messages.clickAddToCreateFirstCategory')}
                                />
                            </ListItem>
                        )}
                    </List>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button
                        onClick={() => setCategoryModalOpen(false)}
                        sx={{ borderRadius: 2 }}
                    >
                        {t('products:actions.cancel')}
                    </Button>
                </DialogActions>
            </Dialog >

            {/* Category Form Modal - Modern Design */}
            < Dialog
                open={categoryFormOpen}
                onClose={() => {
                    setCategoryFormOpen(false);
                    setEditingCategory(null);
                    setCategoryFormData({ name: '', description: '' });
                }}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 1.5,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }
                }}
            >
                <DialogTitle sx={{ pb: 1, pt: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            p: 1,
                            borderRadius: 2,
                            bgcolor: 'secondary.50',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Category color="secondary" />
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight={600}>
                                {editingCategory ? t('products:modals.editCategory', 'Modifier la catégorie') : t('products:modals.newCategory', 'Nouvelle catégorie')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {editingCategory ? t('products:messages.editCategoryDescription') : t('products:messages.createCategoryDescription')}
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <TextField
                            fullWidth
                            label={t('products:modals.categoryName', 'Nom de la catégorie')}
                            value={categoryFormData.name}
                            onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                            required
                            autoFocus
                            variant="outlined"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                        <TextField
                            fullWidth
                            label={t('products:modals.categoryDescription', 'Description')}
                            value={categoryFormData.description}
                            onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                            multiline
                            rows={3}
                            variant="outlined"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            helperText={t('products:modals.categoryDescriptionHelper', 'Description optionnelle de la catégorie')}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
                    <Button
                        onClick={() => {
                            setCategoryFormOpen(false);
                            setEditingCategory(null);
                            setCategoryFormData({ name: '', description: '' });
                        }}
                        sx={{ borderRadius: 2 }}
                    >
                        {t('products:actions.cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveCategory}
                        disabled={!categoryFormData.name}
                        startIcon={<Save />}
                        sx={{ borderRadius: 2, px: 3 }}
                    >
                        {editingCategory ? t('products:actions.save', 'Enregistrer') : t('products:actions.create')}
                    </Button>
                </DialogActions>
            </Dialog >
        </Box >
    );
}

export default ProductForm;