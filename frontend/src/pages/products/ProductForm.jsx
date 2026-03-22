import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Formik, Form, FieldArray } from 'formik';
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
    NavigateNext,
    NavigateBefore,
    DeleteOutline,
    History,
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
        warehouse_id: '', // Gardé pour rétrocompatibilité backend si nécessaire mais géré via lots
        lots: [], // Sera peuplé par useEffect si nouveau produit physique
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
            price: productType === 'service'
                ? Yup.number().min(0, t('products:validation.pricePositive'))
                : Yup.number().positive(t('products:validation.pricePositive')).required(t('products:validation.priceRequired')),
            cost_price: Yup.number().min(0, t('products:validation.costNegative')),
            category_id: Yup.string().nullable(),
            supplier_id: Yup.string().nullable(),
        };

        // Ajout des validations spécifiques selon le type
        if (productType === 'physical') {
            return Yup.object({
                ...baseSchema,
                lots: Yup.array().of(
                    Yup.object({
                        batch_number: Yup.string().required(t('products:validation.batchNumberRequired', 'Numéro de lot requis')),
                        initial_quantity: Yup.number().min(0, t('products:validation.stockNegative')).required(t('products:validation.stockRequired')),
                        warehouse_id: Yup.string().required(t('products:validation.warehouseRequired')),
                    })
                ),
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
            } else {
                // Nouveau produit : si physique, ajouter un lot par défaut
                const defaultType = initialValues.product_type || 'physical';
                if (defaultType === 'physical') {
                    const year = new Date().getFullYear();
                    const random = Math.floor(1000 + Math.random() * 9000);
                    const defaultWarehouseId = (warehousesRes.data.results?.[0]?.id || warehousesRes.data?.[0]?.id || '');
                    
                    setInitialValues(prev => ({
                        ...prev,
                        lots: [{
                            batch_number: `LOT-${year}-${random}`,
                            initial_quantity: 0,
                            warehouse_id: defaultWarehouseId,
                            expiration_date: '',
                            supplier_batch_reference: ''
                        }]
                    }));
                }
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
                const createdProduct = await productsAPI.create(cleanedValues);
                const productId = createdProduct.data.id;
                enqueueSnackbar(t('products:messages.createSuccess'), { variant: 'success' });

                // Créer les lots initiaux si définis
                if (values.product_type === 'physical' && values.lots && values.lots.length > 0) {
                    try {
                        const { productBatchesAPI } = await import('../../services/api');
                        const lotPromises = values.lots
                            .filter(lot => lot.batch_number && lot.batch_number.trim())
                            .map(lot => productBatchesAPI.create({
                                product: productId,
                                batch_number: lot.batch_number,
                                initial_quantity: parseFloat(lot.initial_quantity) || 0,
                                warehouse: lot.warehouse_id || null,
                                expiration_date: lot.expiration_date || null,
                                supplier_batch_reference: lot.supplier_batch_reference || '',
                            }));
                        
                        if (lotPromises.length > 0) {
                            await Promise.all(lotPromises);
                            enqueueSnackbar(`${lotPromises.length} lot(s) initial(aux) créé(s)`, { variant: 'info' });
                        }
                    } catch (e) {
                        console.warn('Erreur lors de la création des lots:', e);
                        enqueueSnackbar('Erreur lors de la création des lots initiaux', { variant: 'warning' });
                    }
                }
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
        <Paper elevation={0} sx={{ p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
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

    // Step labels
    const getSteps = (productType) => {
        if (productType === 'physical') {
            return [
                t('products:steps.info', 'Informations'),
                t('products:steps.pricing', 'Tarification'),
                t('products:steps.lots', 'Lots & Stock')
            ];
        }
        return [
            t('products:steps.info', 'Informations'),
            t('products:steps.pricing', 'Tarification')
        ];
    };

    // Fields to validate per step (for physical; step 2 only exists for physical)
    const STEP_FIELDS = {
        0: ['name', 'description'],
        1: ['price'],
        2: ['lots', 'low_stock_threshold'],
    };

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
                validationSchema={Yup.lazy((values) =>
                    getValidationSchema(values?.product_type || 'physical', warehouses.length > 0)
                )}
                onSubmit={handleSubmit}
                enableReinitialize
            >
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting, setFieldValue, validateForm, setTouched }) => {
                    // Update refs to access from modals
                    formikRef.current.setFieldValue = setFieldValue;
                    formikRef.current.values = values;

                    const steps = getSteps(values.product_type);
                    const totalSteps = steps.length;
                    const isLastStep = activeStep === totalSteps - 1;

                    const handleStepNext = async () => {
                        const stepFieldsList = STEP_FIELDS[activeStep] || [];
                        const touchedFields = {};
                        stepFieldsList.forEach(f => { touchedFields[f] = true; });
                        setTouched(touchedFields, true);
                        const errs = await validateForm();
                        const hasStepErrors = stepFieldsList.some(f => errs[f]);
                        if (!hasStepErrors) {
                            setActiveStep(prev => prev + 1);
                        }
                    };

                    const handleStepBack = () => {
                        if (activeStep === 0) {
                            navigate('/products');
                        } else {
                            setActiveStep(prev => prev - 1);
                        }
                    };

                    // Ensure activeStep is within bounds when product type changes
                    const safeActiveStep = Math.min(activeStep, totalSteps - 1);

                    const handleKeyDown = (e) => {
                        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                            if (!isLastStep) {
                                e.preventDefault();
                                handleStepNext();
                            }
                        }
                    };

                    return (
                        <Form onKeyDown={handleKeyDown}>
                            {/* Stepper */}
                            <Box sx={{ mb: 3 }}>
                                <Stepper
                                    activeStep={safeActiveStep}
                                    alternativeLabel={!isMobile}
                                    orientation={isMobile ? 'vertical' : 'horizontal'}
                                    sx={{
                                        '& .MuiStepLabel-root .Mui-completed': { color: 'primary.main' },
                                        '& .MuiStepLabel-root .Mui-active': { color: 'primary.main' },
                                    }}
                                >
                                    {steps.map((label, index) => (
                                        <Step key={label}>
                                            <StepLabel>{label}</StepLabel>
                                        </Step>
                                    ))}
                                </Stepper>
                            </Box>

                            {/* Step Content */}
                            <Box sx={{ maxWidth: 860, mx: 'auto' }}>

                                {/* STEP 0: Informations */}
                                {safeActiveStep === 0 && (
                                    <Card sx={{ mb: 2.5, borderRadius: 1.5, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: 'none' }}>
                                        <CardContent sx={{ p: isMobile ? 2.5 : 3 }}>
                                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2.5}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Box sx={{
                                                        p: 1,
                                                        borderRadius: 1,
                                                        bgcolor: 'primary.50',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <Description sx={{ fontSize: 22, color: 'primary.main' }} />
                                                    </Box>
                                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                        {t('products:labels.generalInfo')}
                                                    </Typography>
                                                </Box>
                                                {!isMobile && (
                                                    <Chip
                                                        size="small"
                                                        label={t('products:labels.mandatory')}
                                                        color="primary"
                                                        variant="outlined"
                                                        sx={{ borderRadius: 1 }}
                                                    />
                                                )}
                                            </Box>

                                            {/* Product Type Selector */}
                                            <Box sx={{ mb: 2.5 }}>
                                                <ProductTypeSelector value={values.product_type} onChange={(e) => {
                                                    handleChange(e);
                                                    // Reset step if type changes and step would be out of bounds
                                                    const newSteps = getSteps(e.target.value);
                                                    if (activeStep >= newSteps.length) {
                                                        setActiveStep(newSteps.length - 1);
                                                    }
                                                    // Auto-check price_editable for services
                                                    if (e.target.value === 'service') {
                                                        setFieldValue('price_editable', true);
                                                        setFieldValue('price', 0);
                                                    } else {
                                                        setFieldValue('price_editable', false);
                                                    }
                                                }} />
                                            </Box>

                                            <Grid container spacing={1.5}>
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
                                )}

                                {/* STEP 1: Tarification */}
                                {safeActiveStep === 1 && (
                                    <Card sx={{ mb: 2.5, borderRadius: 1.5, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: 'none' }}>
                                        <CardContent sx={{ p: isMobile ? 2.5 : 3 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                                                <Box sx={{
                                                    p: 1,
                                                    borderRadius: 1,
                                                    bgcolor: 'success.50',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <AttachMoney sx={{ fontSize: 22, color: 'success.main' }} />
                                                </Box>
                                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                    {t('products:labels.pricing')}
                                                </Typography>
                                            </Box>

                                            <Grid container spacing={1.5}>
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

                                                <Grid item xs={12}>
                                                    <FormControlLabel
                                                        control={
                                                            <Checkbox
                                                                name="price_editable"
                                                                checked={values.price_editable || false}
                                                                onChange={handleChange}
                                                            />
                                                        }
                                                        label={
                                                            <Box>
                                                                <Typography variant="body2">
                                                                    {t('products:labels.priceEditable')}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {t('products:labels.priceEditableHelp')}
                                                                </Typography>
                                                            </Box>
                                                        }
                                                    />
                                                </Grid>

                                                {/* Catégorie */}
                                                <Grid item xs={12} md={6}>
                                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
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
                                                        <Tooltip title={t('products:modals.manageCategories', 'Gérer les catégories')}>
                                                            <IconButton
                                                                onClick={() => setCategoryModalOpen(true)}
                                                                sx={{
                                                                    bgcolor: 'primary.main',
                                                                    color: 'white',
                                                                    '&:hover': { bgcolor: 'primary.dark' },
                                                                    mt: isMobile ? 0.5 : 0.75
                                                                }}
                                                                size={isMobile ? "small" : "medium"}
                                                            >
                                                                <Add />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
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

                                                {/* Fournisseur */}
                                                {suppliers.length > 0 && (
                                                    <Grid item xs={12} md={6}>
                                                        <Box sx={{ display: 'flex', gap: 1 }}>
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
                                                            </FormControl>
                                                            <IconButton
                                                                onClick={() => setSupplierModalOpen(true)}
                                                                sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                                                                size={isMobile ? "small" : "medium"}
                                                            >
                                                                <Add />
                                                            </IconButton>
                                                        </Box>
                                                    </Grid>
                                                )}
                                            </Grid>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* STEP 2: Stock & Lots (physical only) */}
                                {safeActiveStep === 2 && values.product_type === 'physical' && (
                                    <Card sx={{ mb: 2.5, borderRadius: 1.5, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: 'none' }}>
                                        <CardContent sx={{ p: isMobile ? 2.5 : 3 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Box sx={{
                                                        p: 1,
                                                        borderRadius: 1,
                                                        bgcolor: 'primary.50',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <Inventory sx={{ fontSize: 22, color: 'primary.main' }} />
                                                    </Box>
                                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                        Gestion des Lots & Stock Initial
                                                    </Typography>
                                                </Box>
                                                <Button
                                                    startIcon={<History />}
                                                    size="small"
                                                    variant="outlined"
                                                    disabled
                                                    sx={{ textTransform: 'none', borderRadius: 1.5 }}
                                                >
                                                    Journal des mouvements
                                                </Button>
                                            </Box>

                                            <Alert severity="info" sx={{ mb: 3, borderRadius: 1.5 }}>
                                                Le stock est désormais géré exclusivement par lots. Ajoutez un ou plusieurs lots initiaux pour définir le stock de départ.
                                            </Alert>

                                            <FieldArray name="lots">
                                                {({ push, remove }) => (
                                                    <Box>
                                                        {values.lots.length === 0 ? (
                                                            <Box sx={{ 
                                                                py: 4, 
                                                                textAlign: 'center', 
                                                                bgcolor: 'grey.50', 
                                                                borderRadius: 2,
                                                                border: '1px dashed',
                                                                borderColor: 'divider'
                                                            }}>
                                                                <Typography color="text.secondary" gutterBottom>
                                                                    Aucun lot initial défini
                                                                </Typography>
                                                                <Button 
                                                                    variant="contained" 
                                                                    startIcon={<Add />}
                                                                    onClick={() => push({ 
                                                                        batch_number: `LOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`, 
                                                                        initial_quantity: 0, 
                                                                        warehouse_id: warehouses.length > 0 ? warehouses[0].id : '',
                                                                        expiration_date: '',
                                                                        supplier_batch_reference: ''
                                                                    })}
                                                                    sx={{ borderRadius: 2, textTransform: 'none' }}
                                                                >
                                                                    Ajouter un lot initial
                                                                </Button>
                                                            </Box>
                                                        ) : (
                                                            <Grid container spacing={2}>
                                                                {values.lots.map((lot, index) => (
                                                                    <Grid item xs={12} key={index}>
                                                                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, position: 'relative', bgcolor: index % 2 === 0 ? 'white' : 'grey.50' }}>
                                                                            <IconButton 
                                                                                size="small" 
                                                                                color="error"
                                                                                onClick={() => remove(index)}
                                                                                sx={{ position: 'absolute', top: 8, right: 8 }}
                                                                            >
                                                                                <DeleteOutline fontSize="small" />
                                                                            </IconButton>
                                                                            <Grid container spacing={2}>
                                                                                <Grid item xs={12} md={4}>
                                                                                    <TextField
                                                                                        fullWidth
                                                                                        size="small"
                                                                                        label="Numéro de lot"
                                                                                        name={`lots.${index}.batch_number`}
                                                                                        value={lot.batch_number}
                                                                                        onChange={handleChange}
                                                                                        error={touched.lots?.[index]?.batch_number && Boolean(errors.lots?.[index]?.batch_number)}
                                                                                        helperText={touched.lots?.[index]?.batch_number && errors.lots?.[index]?.batch_number}
                                                                                        required
                                                                                    />
                                                                                </Grid>
                                                                                <Grid item xs={12} md={4}>
                                                                                    <TextField
                                                                                        fullWidth
                                                                                        size="small"
                                                                                        label="Quantité initiale"
                                                                                        type="number"
                                                                                        name={`lots.${index}.initial_quantity`}
                                                                                        value={lot.initial_quantity}
                                                                                        onChange={handleChange}
                                                                                        error={touched.lots?.[index]?.initial_quantity && Boolean(errors.lots?.[index]?.initial_quantity)}
                                                                                        helperText={touched.lots?.[index]?.initial_quantity && errors.lots?.[index]?.initial_quantity}
                                                                                        required
                                                                                    />
                                                                                </Grid>
                                                                                <Grid item xs={12} md={4}>
                                                                                    <FormControl fullWidth size="small" error={touched.lots?.[index]?.warehouse_id && Boolean(errors.lots?.[index]?.warehouse_id)}>
                                                                                        <InputLabel>Entrepôt</InputLabel>
                                                                                        <Select
                                                                                            name={`lots.${index}.warehouse_id`}
                                                                                            value={lot.warehouse_id}
                                                                                            onChange={handleChange}
                                                                                            label="Entrepôt"
                                                                                        >
                                                                                            {warehouses.map((w) => (
                                                                                                <MenuItem key={w.id} value={w.id}>{w.name} ({w.code})</MenuItem>
                                                                                            ))}
                                                                                        </Select>
                                                                                    </FormControl>
                                                                                </Grid>
                                                                                <Grid item xs={12} md={6}>
                                                                                    <TextField
                                                                                        fullWidth
                                                                                        size="small"
                                                                                        label="Date d'expiration"
                                                                                        type="date"
                                                                                        name={`lots.${index}.expiration_date`}
                                                                                        value={lot.expiration_date || ''}
                                                                                        onChange={handleChange}
                                                                                        InputLabelProps={{ shrink: true }}
                                                                                    />
                                                                                </Grid>
                                                                                <Grid item xs={12} md={6}>
                                                                                    <TextField
                                                                                        fullWidth
                                                                                        size="small"
                                                                                        label="Référence fournisseur"
                                                                                        name={`lots.${index}.supplier_batch_reference`}
                                                                                        value={lot.supplier_batch_reference}
                                                                                        onChange={handleChange}
                                                                                    />
                                                                                </Grid>
                                                                            </Grid>
                                                                        </Paper>
                                                                    </Grid>
                                                                ))}
                                                                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                                                                    <Button 
                                                                        variant="outlined"
                                                                        startIcon={<Add />}
                                                                        onClick={() => push({ 
                                                                            batch_number: `LOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`, 
                                                                            initial_quantity: 0, 
                                                                            warehouse_id: warehouses.length > 0 ? warehouses[0].id : '',
                                                                            expiration_date: '',
                                                                            supplier_batch_reference: ''
                                                                        })}
                                                                        sx={{ borderRadius: 2, textTransform: 'none' }}
                                                                    >
                                                                        Ajouter un autre lot
                                                                    </Button>
                                                                </Grid>
                                                            </Grid>
                                                        )}

                                                        <Divider sx={{ my: 3 }} />

                                                        <Grid container spacing={2}>
                                                            <Grid item xs={12} md={6}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    name="low_stock_threshold"
                                                                    label={t('products:labels.lowStockThreshold')}
                                                                    type="number"
                                                                    value={values.low_stock_threshold}
                                                                    onChange={handleChange}
                                                                    onBlur={handleBlur}
                                                                    error={touched.low_stock_threshold && Boolean(errors.low_stock_threshold)}
                                                                    helperText={touched.low_stock_threshold && errors.low_stock_threshold}
                                                                    required
                                                                />
                                                            </Grid>
                                                        </Grid>
                                                    </Box>
                                                )}
                                            </FieldArray>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* For service/digital: is_active on last step (step 1) */}
                                {safeActiveStep === 1 && values.product_type !== 'physical' && (
                                    <Card sx={{ mb: 2.5, borderRadius: 1.5, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: 'none' }}>
                                        <CardContent sx={{ p: isMobile ? 2.5 : 3 }}>
                                            <Divider sx={{ mb: 2 }} />
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
                                )}

                                {/* Navigation Buttons */}
                                <Box sx={{
                                    display: 'flex',
                                    gap: 2,
                                    justifyContent: 'space-between',
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
                                        startIcon={activeStep === 0 ? <Cancel /> : <NavigateBefore />}
                                        onClick={handleStepBack}
                                        disabled={isSubmitting}
                                    >
                                        {activeStep === 0 ? t('products:actions.cancel') : 'Précédent'}
                                    </Button>

                                    {isLastStep ? (
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            startIcon={<Save />}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? <CircularProgress size={24} /> : (isEdit ? t('products:actions.modify') : t('products:actions.create'))}
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="contained"
                                            endIcon={<NavigateNext />}
                                            onClick={handleStepNext}
                                            disabled={isSubmitting}
                                        >
                                            Suivant
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                        </Form>
                    );
                }}
            </Formik>
            </Box>

            {/* Supplier Selection Modal - Modern Design */}
            <Dialog
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
            </Dialog>

            {/* Warehouse Selection Modal - Modern Design */}
            <Dialog
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
            </Dialog>

            {/* Warehouse Form Modal - Modern Design */}
            <Dialog
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
            </Dialog>

            {/* Category Selection Modal - Modern Design */}
            <Dialog
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
            </Dialog>

            {/* Category Form Modal - Modern Design */}
            <Dialog
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
            </Dialog>
        </Box>
    );
}

export default ProductForm;
