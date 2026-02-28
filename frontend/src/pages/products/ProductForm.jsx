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
    MenuItem,
    FormControlLabel,
    Checkbox,
    CircularProgress,
    Alert,
    IconButton,
    Paper,
    Tooltip,
    Stepper,
    Step,
    StepLabel,
    useTheme,
    useMediaQuery,
    ToggleButton,
    ToggleButtonGroup,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Divider
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    Save,
    Cancel,
    Inventory,
    Build,
    Add,
    Edit,
    Delete,
    ArrowBack,
    ArrowForward,
    Check,
    LockOpen,
    Warning,
    DeleteForever,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { productsAPI, suppliersAPI, productCategoriesAPI, warehousesAPI, authAPI } from '../../services/api';
import batchAPI from '../../services/batchAPI';

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

const statusColors = {
    available: 'success',
    opened: 'info',
    expired: 'error',
    depleted: 'default',
};

const statusLabels = {
    available: 'Disponible',
    opened: 'Ouvert',
    expired: 'Périmé',
    depleted: 'Épuisé',
};

function ProductForm() {
    const { t } = useTranslation(['products', 'common']);
    const navigate = useNavigate();
    const { id } = useParams();
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isEdit = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [canSeeCostPrice, setCanSeeCostPrice] = useState(false);
    const [categories, setCategories] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
    const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' });
    const [warehouseFormData, setWarehouseFormData] = useState({ name: '', code: '', city: '' });

    // Stepper
    const [activeStep, setActiveStep] = useState(0);
    const [savedProductId, setSavedProductId] = useState(id || null);
    const [savingStep1, setSavingStep1] = useState(false);

    // Batches (step 2)
    const [batches, setBatches] = useState([]);
    const [batchesLoading, setBatchesLoading] = useState(false);
    const [batchDialogOpen, setBatchDialogOpen] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, batch: null });
    const [batchFormData, setBatchFormData] = useState({
        batch_number: '', lot_number: '', quantity: '', expiry_date: '',
        shelf_life_after_opening_days: '', notes: ''
    });

    const formikRef = useRef(null);

    const [initialValues, setInitialValues] = useState({
        name: '',
        reference: '',
        description: '',
        product_type: 'physical',
        source_type: 'purchased',
        category_id: '',
        price: '',
        cost_price: '',
        price_editable: false,
        supplier_id: '',
        warehouse_id: '',
        low_stock_threshold: 5,
        is_active: true,
        sell_unit: 'piece',
        base_unit: 'piece',
        conversion_factor: 1,
        ordering_cost: 5000,
        holding_cost_percent: 20,
        barcode: '',
        supply_lead_time_days: 7,
        default_shelf_life_after_opening: '',
    });

    const validationSchema = Yup.object({
        name: Yup.string().required('Le nom est requis'),
        price: Yup.number().typeError('Doit être un nombre').min(0, 'Prix positif requis').required('Le prix est requis'),
        cost_price: Yup.number().typeError('Doit être un nombre').min(0, 'Coût positif requis').nullable(),
        sell_unit: Yup.string().required('Requis'),
        base_unit: Yup.string().required('Requis'),
        conversion_factor: Yup.number().typeError('Doit être un nombre').positive('Doit être positif').required('Requis'),
    });

    const steps = ['Détails du produit', 'Lots & Péremptions'];

    useEffect(() => {
        authAPI.getProfile().then(res => {
            const role = res.data?.role;
            setCanSeeCostPrice(role === 'admin' || role === 'manager');
        }).catch(() => {});
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [cats, whs] = await Promise.all([
                    productCategoriesAPI.list().catch(() => ({ data: [] })),
                    warehousesAPI.list().catch(() => ({ data: [] }))
                ]);
                setCategories(cats.data.results || cats.data);
                setWarehouses(whs.data.results || whs.data);

                if (isEdit) {
                    const res = await productsAPI.get(id);
                    const p = res.data;
                    setInitialValues(prev => ({
                        ...prev,
                        ...p,
                        category_id: p.category?.id || '',
                        warehouse_id: p.warehouse || '',
                        price: p.price ?? '',
                        cost_price: p.cost_price ?? '',
                    }));
                    // Load batches immediately if editing
                    fetchBatches(id);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id, isEdit]);

    // Load batches when entering step 2
    const fetchBatches = async (productId) => {
        if (!productId) return;
        setBatchesLoading(true);
        try {
            const data = await batchAPI.getProductBatches(productId);
            setBatches(data);
        } catch (err) {
            console.error('Error fetching batches:', err);
        } finally {
            setBatchesLoading(false);
        }
    };

    const buildPayload = (values) => {
        const payload = {
            ...values,
            price: values.price === '' ? 0 : parseFloat(values.price),
            cost_price: values.cost_price === '' ? 0 : parseFloat(values.cost_price),
            conversion_factor: values.conversion_factor === '' ? 1 : parseFloat(values.conversion_factor),
            category: values.category_id || null,
            warehouse: values.warehouse_id || null,
            barcode: values.barcode || null,
            reference: values.reference || undefined,
            ordering_cost: values.ordering_cost === '' ? null : parseFloat(values.ordering_cost),
            holding_cost_percent: values.holding_cost_percent === '' ? null : parseFloat(values.holding_cost_percent),
            supply_lead_time_days: values.supply_lead_time_days === '' ? null : parseInt(values.supply_lead_time_days),
            default_shelf_life_after_opening: values.default_shelf_life_after_opening === '' ? null : parseInt(values.default_shelf_life_after_opening),
        };
        delete payload.category_id;
        delete payload.warehouse_id;
        delete payload.supplier_id;
        Object.keys(payload).forEach(key => {
            if (payload[key] === undefined || payload[key] === '') {
                delete payload[key];
            }
        });
        // Stock is managed exclusively through batches
        payload.stock_quantity = 0;
        if (values.product_type !== 'physical') {
            payload.low_stock_threshold = 0;
            payload.warehouse = null;
        }
        return payload;
    };

    const handleStepClick = async (stepIndex) => {
        if (stepIndex === activeStep) return;
        
        // If moving forward to step 1 (Lots), we need to save product first
        if (stepIndex === 1 && !savedProductId) {
            await handleNext();
            return;
        }
        
        // Otherwise allow movement
        setActiveStep(stepIndex);
        if (stepIndex === 1 && savedProductId) {
            fetchBatches(savedProductId);
        }
    };

    // Step 1 → Step 2: save/create the product, then go to batch step
    const handleNext = async () => {
        const formik = formikRef.current;
        if (!formik) return;

        // Validate form first
        const errors = await formik.validateForm();
        formik.setTouched(Object.keys(formik.values).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
        if (Object.keys(errors).length > 0) {
            enqueueSnackbar('Veuillez corriger les erreurs dans le formulaire', { variant: 'warning' });
            return;
        }

        const values = formik.values;

        // If service product, skip batches — just save and finish
        if (values.product_type !== 'physical') {
            await handleFinalSubmit(values);
            return;
        }

        setSavingStep1(true);
        try {
            const payload = buildPayload(values);

            if (isEdit || savedProductId) {
                const currentId = id || savedProductId;
                await productsAPI.update(currentId, payload);
                enqueueSnackbar('Informations produit mises à jour', { variant: 'success' });
                await fetchBatches(currentId);
            } else {
                const newProduct = await productsAPI.create(payload);
                const newId = newProduct.data?.id;
                setSavedProductId(newId);
                enqueueSnackbar('Produit créé avec succès', { variant: 'success' });
                await fetchBatches(newId);
            }
            setActiveStep(1);
        } catch (error) {
            console.error(error);
            const msg = error.response?.data ? JSON.stringify(error.response.data) : 'Erreur lors de la sauvegarde';
            enqueueSnackbar(msg, { variant: 'error' });
        } finally {
            setSavingStep1(false);
        }
    };

    // Final submit (service products or direct save without batches)
    const handleFinalSubmit = async (values) => {
        try {
            const payload = buildPayload(values);
            if (isEdit || savedProductId) {
                const currentId = id || savedProductId;
                await productsAPI.update(currentId, payload);
                enqueueSnackbar('Produit mis à jour', { variant: 'success' });
                navigate(`/products/${currentId}`);
            } else {
                const res = await productsAPI.create(payload);
                enqueueSnackbar('Produit créé', { variant: 'success' });
                navigate(`/products/${res.data.id}`);
            }
        } catch (error) {
            console.error(error);
            const msg = error.response?.data ? JSON.stringify(error.response.data) : 'Erreur';
            enqueueSnackbar(msg, { variant: 'error' });
        }
    };

    // Finish from step 2
    const handleFinish = () => {
        if (savedProductId) {
            navigate(`/products/${savedProductId}`);
        } else {
            navigate('/products');
        }
    };

    const handleSaveCategory = async () => {
        try {
            const res = await productCategoriesAPI.create(categoryFormData);
            setCategories(prev => [...prev, res.data]);
            formikRef.current.setFieldValue('category_id', res.data.id);
            setCategoryModalOpen(false);
            enqueueSnackbar('Catégorie créée', { variant: 'success' });
        } catch (err) {
            enqueueSnackbar('Erreur', { variant: 'error' });
        }
    };

    const handleSaveWarehouse = async () => {
        try {
            const res = await warehousesAPI.create(warehouseFormData);
            setWarehouses(prev => [...prev, res.data]);
            formikRef.current.setFieldValue('warehouse_id', res.data.id);
            setWarehouseModalOpen(false);
            enqueueSnackbar('Entrepôt créé', { variant: 'success' });
        } catch (err) {
            enqueueSnackbar('Erreur', { variant: 'error' });
        }
    };

    // ---- Batch management (step 2) ----
    const generateBatchNumber = () => {
        const now = new Date();
        const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `LOT-${datePart}-${randomPart}`;
    };

    const handleOpenNewBatchDialog = () => {
        const productData = formikRef.current?.values;
        setBatchFormData({
            batch_number: generateBatchNumber(),
            lot_number: '',
            quantity: '',
            expiry_date: '',
            shelf_life_after_opening_days: productData?.default_shelf_life_after_opening || '',
            notes: '',
        });
        setBatchDialogOpen(true);
    };

    const handleCreateBatch = async () => {
        const productId = savedProductId || id;
        if (!productId) {
            enqueueSnackbar('Produit non sauvegardé — impossible de créer un lot', { variant: 'error' });
            return;
        }
        try {
            const qty = parseInt(batchFormData.quantity) || 0;
            await batchAPI.createBatch(productId, {
                batch_number: batchFormData.batch_number,
                lot_number: batchFormData.lot_number || '',
                quantity: qty,
                quantity_remaining: qty,
                expiry_date: batchFormData.expiry_date,
                shelf_life_after_opening_days: batchFormData.shelf_life_after_opening_days
                    ? parseInt(batchFormData.shelf_life_after_opening_days) : null,
                notes: batchFormData.notes || '',
            });
            setBatchDialogOpen(false);
            enqueueSnackbar('Lot créé avec succès', { variant: 'success' });
            await fetchBatches(productId);
        } catch (error) {
            console.error('Error creating batch:', error);
            const msg = error?.response?.data
                ? (typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data))
                : 'Erreur lors de la création du lot';
            enqueueSnackbar(msg, { variant: 'error' });
        }
    };

    const handleOpenBatch = async (batchId) => {
        const productId = savedProductId || id;
        try {
            await batchAPI.openBatch(batchId);
            enqueueSnackbar('Lot marqué comme ouvert', { variant: 'success' });
            await fetchBatches(productId);
        } catch (error) {
            console.error('Error opening batch:', error);
        }
    };

    const handleDeleteBatch = async () => {
        const batch = deleteDialog.batch;
        if (!batch) return;
        const productId = savedProductId || id;
        try {
            await batchAPI.deleteBatch(batch.id);
            setDeleteDialog({ open: false, batch: null });
            enqueueSnackbar('Lot supprimé', { variant: 'success' });
            await fetchBatches(productId);
        } catch (error) {
            const msg = error?.response?.data?.error || 'Erreur lors de la suppression';
            enqueueSnackbar(msg, { variant: 'error' });
        }
    };

    const canDeleteBatch = (batch) => {
        if (!batch.received_at) return false;
        const elapsed = (Date.now() - new Date(batch.received_at).getTime()) / 1000;
        return elapsed <= 1800;
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => navigate('/products')} size="small">
                        <ArrowBack />
                    </IconButton>
                    <Typography variant="h4" fontWeight={800} sx={{ color: 'primary.main' }}>
                        {isEdit ? 'Modifier le Produit' : 'Nouveau Produit'}
                    </Typography>
                </Box>
                <Button 
                    variant="outlined" 
                    startIcon={<Cancel />} 
                    onClick={() => navigate('/products')}
                    sx={{ borderRadius: 2 }}
                >
                    Annuler
                </Button>
            </Box>

            {/* Stepper avec navigation interactive */}
            <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Stepper activeStep={activeStep} alternativeLabel={!isMobile}>
                    {steps.map((label, index) => (
                        <Step key={label} completed={activeStep > index || (index === 1 && batches.length > 0)}>
                            <StepLabel 
                                onClick={() => handleStepClick(index)}
                                sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                                StepIconProps={{
                                    sx: { 
                                        cursor: 'pointer',
                                        ...(activeStep === index && { color: 'primary.main', transform: 'scale(1.2)' })
                                    }
                                }}
                            >
                                <Typography variant="subtitle2" fontWeight={activeStep === index ? 700 : 500}>
                                    {label}
                                </Typography>
                            </StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Paper>

            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={() => {}} 
                enableReinitialize
                innerRef={formikRef}
            >
                {({ values, errors, touched, handleChange, handleBlur, setFieldValue }) => (
                    <Form>
                        {/* ===== STEP 1: Product Details ===== */}
                        {activeStep === 0 && (
                            <Stack spacing={3}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={8}>
                                        <Stack spacing={3}>
                                            <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                                <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                    <Typography variant="subtitle1" fontWeight={700}>Nature du produit</Typography>
                                                </Box>
                                                <CardContent>
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                        Choisissez si vous créez un article physique (avec gestion de stock et lots) ou une prestation de service.
                                                    </Typography>
                                                    <ToggleButtonGroup
                                                        value={values.product_type}
                                                        exclusive
                                                        onChange={(e, v) => v && setFieldValue('product_type', v)}
                                                        fullWidth
                                                        color="primary"
                                                    >
                                                        <ToggleButton value="physical" sx={{ py: 1.5, borderRadius: 2 }}>
                                                            <Inventory sx={{ mr: 1 }} /> Physique (Médicaments, Réactifs...)
                                                        </ToggleButton>
                                                        <ToggleButton value="service" sx={{ py: 1.5, borderRadius: 2 }}>
                                                            <Build sx={{ mr: 1 }} /> Service (Consultation, Acte...)
                                                        </ToggleButton>
                                                    </ToggleButtonGroup>
                                                </CardContent>
                                            </Card>

                                            <Card sx={{ borderRadius: 3 }}>
                                                <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                    <Typography variant="subtitle1" fontWeight={700}>Informations Générales</Typography>
                                                </Box>
                                                <CardContent>
                                                    <Grid container spacing={2.5}>
                                                        <Grid item xs={12} sm={8}>
                                                            <TextField fullWidth name="name" label="Nom du produit" value={values.name} onChange={handleChange} onBlur={handleBlur} error={touched.name && Boolean(errors.name)} helperText={touched.name && errors.name} required placeholder="Ex: Paracétamol 500mg" />
                                                        </Grid>
                                                        <Grid item xs={12} sm={4}>
                                                            <TextField fullWidth name="reference" label="Référence" value={values.reference} onChange={handleChange} placeholder="Génération auto" helperText="Code interne unique" />
                                                        </Grid>
                                                        <Grid item xs={12}>
                                                            <TextField fullWidth multiline rows={3} name="description" label="Description détaillée" value={values.description} onChange={handleChange} placeholder="Indications, posologie sommaire ou notes..." />
                                                        </Grid>
                                                    </Grid>
                                                </CardContent>
                                            </Card>

                                            <Card sx={{ borderRadius: 3 }}>
                                                <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                    <Typography variant="subtitle1" fontWeight={700}>Tarification & Unités</Typography>
                                                </Box>
                                                <CardContent>
                                                    <Grid container spacing={2.5}>
                                                        <Grid item xs={12} sm={6}>
                                                            <TextField 
                                                                fullWidth type="number" name="price" label="Prix de vente" 
                                                                value={values.price} onChange={handleChange} onBlur={handleBlur} 
                                                                error={touched.price && Boolean(errors.price)} helperText={touched.price && errors.price} 
                                                                required
                                                                InputProps={{ endAdornment: <Typography variant="caption">XAF</Typography> }}
                                                            />
                                                        </Grid>
                                                        <Grid item xs={12} sm={6}>
                                                            {canSeeCostPrice && (
                                                                <TextField 
                                                                    fullWidth type="number" name="cost_price" label="Prix d'achat (Coût)" 
                                                                    value={values.cost_price} onChange={handleChange}
                                                                    InputProps={{ endAdornment: <Typography variant="caption">XAF</Typography> }}
                                                                    helperText="Utilisé pour calculer vos marges"
                                                                />
                                                            )}
                                                        </Grid>
                                                        
                                                        {values.product_type === 'physical' && (
                                                            <>
                                                                <Grid item xs={12}><Divider><Chip label="Gestion des unités" size="small" /></Divider></Grid>

                                                                <Grid item xs={12} sm={4}>
                                                                    <TextField select fullWidth name="sell_unit" label="Unité de vente" value={values.sell_unit} onChange={handleChange} helperText="Ce que le client achète (ex: Boîte)">
                                                                        {UNIT_TYPES.map(u => <MenuItem key={u.value} value={u.value}>{u.label}</MenuItem>)}
                                                                    </TextField>
                                                                </Grid>
                                                                <Grid item xs={12} sm={4}>
                                                                    <TextField select fullWidth name="base_unit" label="Unité de base" value={values.base_unit} onChange={handleChange} helperText="Plus petite unité (ex: Comprimé)">
                                                                        {UNIT_TYPES.map(u => <MenuItem key={u.value} value={u.value}>{u.label}</MenuItem>)}
                                                                    </TextField>
                                                                </Grid>
                                                                <Grid item xs={12} sm={4}>
                                                                    <TextField
                                                                        fullWidth type="number" name="conversion_factor" label="Facteur de conversion"
                                                                        value={values.conversion_factor} onChange={handleChange}
                                                                        helperText={`1 ${UNIT_TYPES.find(u => u.value === values.sell_unit)?.label || 'Unité'} = X ${UNIT_TYPES.find(u => u.value === values.base_unit)?.label || 'Base'}`}
                                                                    />
                                                                </Grid>
                                                            </>
                                                        )}
                                                    </Grid>
                                                </CardContent>
                                            </Card>

                                            {values.product_type === 'physical' && (
                                                <Card sx={{ borderRadius: 3 }}>
                                                    <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                        <Typography variant="subtitle1" fontWeight={700}>Stock & Traçabilité</Typography>
                                                    </Box>
                                                    <CardContent>
                                                        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                                                            Le stock est géré automatiquement via les lots à l'étape suivante.
                                                        </Alert>
                                                        <Grid container spacing={2.5}>
                                                            <Grid item xs={12} sm={6}>
                                                                <TextField fullWidth type="number" name="low_stock_threshold" label="Seuil d'alerte stock" value={values.low_stock_threshold} onChange={handleChange} helperText="Alerte quand le stock descend en dessous" />
                                                            </Grid>
                                                            <Grid item xs={12} sm={6}>
                                                                <TextField fullWidth name="barcode" label="Code-barres (EAN/UPC)" value={values.barcode} onChange={handleChange} placeholder="Scannez ou saisissez..." />
                                                            </Grid>
                                                            <Grid item xs={12} sm={6}>
                                                                <TextField fullWidth type="number" name="default_shelf_life_after_opening" label="Validité après ouverture (jours)" value={values.default_shelf_life_after_opening} onChange={handleChange} placeholder="Ex: 14" />
                                                            </Grid>
                                                            <Grid item xs={12} sm={6}>
                                                                <TextField fullWidth type="number" name="supply_lead_time_days" label="Délai de livraison (jours)" value={values.supply_lead_time_days} onChange={handleChange} helperText="Délai moyen de réapprovisionnement" placeholder="Ex: 7" />
                                                            </Grid>
                                                        </Grid>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </Stack>
                                    </Grid>

                                    <Grid item xs={12} md={4}>
                                        <Stack spacing={3}>
                                            <Card sx={{ borderRadius: 3 }}>
                                                <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                    <Typography variant="subtitle1" fontWeight={700}>Organisation</Typography>
                                                </Box>
                                                <CardContent>
                                                    <Stack spacing={2.5}>
                                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                                            <TextField select fullWidth label="Catégorie" name="category_id" value={values.category_id} onChange={handleChange} size="small" required error={touched.category_id && !values.category_id}>
                                                                <MenuItem value="">Choisir une catégorie...</MenuItem>
                                                                {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                                            </TextField>
                                                            <Tooltip title="Nouvelle catégorie">
                                                                <IconButton onClick={() => setCategoryModalOpen(true)} color="primary" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}><Add /></IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                        
                                                        {values.product_type === 'physical' && (
                                                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                                                <TextField select fullWidth label="Entrepôt par défaut" name="warehouse_id" value={values.warehouse_id} onChange={handleChange} size="small">
                                                                    <MenuItem value="">Aucun spécifique</MenuItem>
                                                                    {warehouses.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                                                                </TextField>
                                                                <Tooltip title="Nouvel entrepôt">
                                                                    <IconButton onClick={() => setWarehouseModalOpen(true)} color="primary" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}><Add /></IconButton>
                                                                </Tooltip>
                                                            </Box>
                                                        )}
                                                        
                                                        <FormControlLabel
                                                            control={<Checkbox name="is_active" checked={values.is_active} onChange={handleChange} color="primary" />}
                                                            label="Produit actif et disponible"
                                                        />
                                                    </Stack>
                                                </CardContent>
                                            </Card>

                                            {isEdit && (
                                                <Card sx={{ borderRadius: 3, bgcolor: alpha(theme.palette.info.main, 0.05), border: '1px dashed', borderColor: 'info.main' }}>
                                                    <CardContent>
                                                        <Typography variant="subtitle2" color="info.main" gutterBottom fontWeight={700}>Mode Édition</Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Vous modifiez un produit existant. Les changements seront appliqués immédiatement après avoir cliqué sur le bouton ci-dessous.
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </Stack>
                                    </Grid>
                                </Grid>

                                {/* Step 1 actions */}
                                <Paper elevation={3} sx={{ p: 2, mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2, borderRadius: 3, position: 'sticky', bottom: 16, zIndex: 10 }}>
                                    <Button
                                        variant="outlined"
                                        size="large"
                                        onClick={() => navigate('/products')}
                                        sx={{ borderRadius: 2, px: 4 }}
                                    >
                                        Annuler
                                    </Button>
                                    {values.product_type === 'physical' ? (
                                        <Button
                                            variant="contained"
                                            size="large"
                                            endIcon={savingStep1 ? <CircularProgress size={20} color="inherit" /> : <ArrowForward />}
                                            onClick={handleNext}
                                            disabled={savingStep1}
                                            sx={{ borderRadius: 2, px: 4 }}
                                        >
                                            {savingStep1 ? 'Sauvegarde...' : 'Suivant — Gérer les Lots'}
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="contained"
                                            size="large"
                                            startIcon={savingStep1 ? <CircularProgress size={20} color="inherit" /> : <Save />}
                                            onClick={handleNext}
                                            disabled={savingStep1}
                                            sx={{ borderRadius: 2, px: 4 }}
                                        >
                                            Enregistrer le service
                                        </Button>
                                    )}
                                </Paper>
                            </Stack>
                        )}

                        {/* ===== STEP 2: Batches ===== */}
                        {activeStep === 1 && (
                            <Stack spacing={3}>
                                <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 3, alignItems: 'flex-start' }}>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="h5" fontWeight={700} gutterBottom>
                                            Gestion des Lots : {values.name}
                                        </Typography>
                                        <Typography variant="body1" color="text.secondary" paragraph>
                                            Enregistrez ici les différents lots reçus avec leurs dates de péremption respectives. 
                                            Cela permet une traçabilité précise (FEFO - First Expired, First Out).
                                        </Typography>
                                        
                                        <Alert severity="info" sx={{ borderRadius: 3, mb: 3 }}>
                                            <Typography variant="subtitle2" fontWeight={700}>Pourquoi gérer des lots ?</Typography>
                                            - Alerte automatique avant péremption.<br />
                                            - Traçabilité totale en cas de rappel produit.<br />
                                            - Inventaire valorisé plus précis.
                                        </Alert>
                                    </Box>
                                    
                                    <Card sx={{ minWidth: isMobile ? '100%' : 300, borderRadius: 3, bgcolor: 'primary.main', color: 'white' }}>
                                        <CardContent>
                                            <Typography variant="subtitle2" sx={{ opacity: 0.8 }} gutterBottom>Stock Actuel</Typography>
                                            <Typography variant="h3" fontWeight={800}>{batches.reduce((sum, b) => sum + b.quantity_remaining, 0)}</Typography>
                                            <Typography variant="body2" sx={{ opacity: 0.8 }}>{UNIT_TYPES.find(u => u.value === values.base_unit)?.label || 'unités'}</Typography>
                                            <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />
                                            <Button 
                                                fullWidth variant="contained" 
                                                color="secondary" startIcon={<Add />} 
                                                onClick={handleOpenNewBatchDialog}
                                                sx={{ borderRadius: 2, fontWeight: 700 }}
                                            >
                                                Nouveau Lot
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Box>

                                {batchesLoading ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
                                        <CircularProgress size={60} />
                                    </Box>
                                ) : (
                                    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                                        <TableContainer>
                                            <Table>
                                                <TableHead>
                                                    <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
                                                        <TableCell sx={{ fontWeight: 700 }}>Identification du Lot</TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }} align="center">Quantité</TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }} align="center">Péremption</TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }} align="center">Statut</TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {batches.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={5} align="center">
                                                                <Box sx={{ py: 6, opacity: 0.5 }}>
                                                                    <Inventory sx={{ fontSize: 48, mb: 1 }} />
                                                                    <Typography>Aucun lot enregistré pour le moment.</Typography>
                                                                    <Button variant="text" onClick={handleOpenNewBatchDialog}>Cliquez ici pour ajouter votre premier lot</Button>
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        batches.map(batch => (
                                                            <TableRow key={batch.id} hover sx={batch.is_expired ? { bgcolor: alpha(theme.palette.error.main, 0.05) } : {}}>
                                                                <TableCell>
                                                                    <Typography fontWeight={700} color="primary">{batch.batch_number}</Typography>
                                                                    {batch.lot_number && <Typography variant="caption" color="text.secondary">Fournisseur: {batch.lot_number}</Typography>}
                                                                </TableCell>
                                                                <TableCell align="center">
                                                                    <Typography fontWeight={700}>{batch.quantity_remaining}</Typography>
                                                                    <Typography variant="caption" color="text.secondary">sur {batch.quantity}</Typography>
                                                                </TableCell>
                                                                <TableCell align="center">
                                                                    <Typography fontWeight={600} color={batch.days_until_expiry <= 30 ? 'error.main' : 'inherit'}>
                                                                        {dayjs(batch.expiry_date).format('DD/MM/YYYY')}
                                                                    </Typography>
                                                                    <Typography variant="caption" color={batch.days_until_expiry <= 0 ? 'error.main' : 'text.secondary'}>
                                                                        {batch.days_until_expiry <= 0 ? 'PÉRIMÉ' : `${batch.days_until_expiry} jours restants`}
                                                                    </Typography>
                                                                </TableCell>
                                                                <TableCell align="center">
                                                                    <Chip 
                                                                        label={statusLabels[batch.status] || batch.status} 
                                                                        color={statusColors[batch.status] || 'default'} 
                                                                        size="small"
                                                                        sx={{ fontWeight: 700 }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                                        {batch.status === 'available' && (
                                                                            <Tooltip title="Ouvrir le flacon/paquet">
                                                                                <IconButton size="small" onClick={() => handleOpenBatch(batch.id)} color="info">
                                                                                    <LockOpen fontSize="small" />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                        )}
                                                                        {canDeleteBatch(batch) && (
                                                                            <Tooltip title="Supprimer (erreur de saisie)">
                                                                                <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, batch })}>
                                                                                    <DeleteForever fontSize="small" />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                        )}
                                                                    </Stack>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Card>
                                )}

                                {/* Step 2 actions */}
                                <Paper elevation={3} sx={{ p: 2, mt: 4, display: 'flex', justifyContent: 'space-between', borderRadius: 3, position: 'sticky', bottom: 16, zIndex: 10 }}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<ArrowBack />}
                                        onClick={() => setActiveStep(0)}
                                        sx={{ borderRadius: 2, px: 3 }}
                                    >
                                        Retour aux détails
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        size="large"
                                        startIcon={<Check />}
                                        onClick={handleFinish}
                                        sx={{ borderRadius: 2, px: 6, fontWeight: 700 }}
                                    >
                                        Terminer & Voir la fiche
                                    </Button>
                                </Paper>
                            </Stack>
                        )}
                    </Form>
                )}
            </Formik>

            {/* Modal de création de lot (inchangé mais stylisé) */}
            <Dialog open={batchDialogOpen} onClose={() => setBatchDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 800, bgcolor: 'primary.main', color: 'white' }}>Nouveau Lot / Réception</DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
                        <Grid item xs={6}>
                            <TextField 
                                fullWidth label="Numéro de lot interne" required 
                                value={batchFormData.batch_number} 
                                onChange={e => setBatchFormData({ ...batchFormData, batch_number: e.target.value })} 
                                helperText="Identifiant unique"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField 
                                fullWidth label="Lot fournisseur" 
                                value={batchFormData.lot_number} 
                                onChange={e => setBatchFormData({ ...batchFormData, lot_number: e.target.value })} 
                                placeholder="Optionnel"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField 
                                fullWidth label="Quantité reçue" type="number" required 
                                value={batchFormData.quantity} 
                                onChange={e => setBatchFormData({ ...batchFormData, quantity: e.target.value })} 
                                helperText={`En ${UNIT_TYPES.find(u => u.value === formikRef.current?.values?.base_unit)?.label || 'unités'}`}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField 
                                fullWidth label="Date de péremption" type="date" required 
                                InputLabelProps={{ shrink: true }}
                                value={batchFormData.expiry_date} 
                                onChange={e => setBatchFormData({ ...batchFormData, expiry_date: e.target.value })} 
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField 
                                fullWidth label="Notes / Observations" multiline rows={2} 
                                value={batchFormData.notes} 
                                onChange={e => setBatchFormData({ ...batchFormData, notes: e.target.value })} 
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 0 }}>
                    <Button onClick={() => setBatchDialogOpen(false)} sx={{ borderRadius: 2 }}>Annuler</Button>
                    <Button 
                        variant="contained" 
                        onClick={handleCreateBatch} 
                        disabled={!batchFormData.batch_number || !batchFormData.quantity || !batchFormData.expiry_date}
                        sx={{ borderRadius: 2, px: 4 }}
                    >
                        Valider la réception
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Batch Dialog */}
            <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, batch: null })} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700 }}>Supprimer le lot</DialogTitle>
                <DialogContent>
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                        Cette action est irréversible. Le stock sera ajusté automatiquement.
                    </Alert>
                    {deleteDialog.batch && (
                        <Box sx={{ p: 1 }}>
                            <Typography variant="body2">
                                Lot : <strong>{deleteDialog.batch.batch_number}</strong><br />
                                Quantité restante : <strong>{deleteDialog.batch.quantity_remaining}</strong>
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteDialog({ open: false, batch: null })}>Annuler</Button>
                    <Button variant="contained" color="error" startIcon={<DeleteForever />} onClick={handleDeleteBatch} sx={{ borderRadius: 2 }}>
                        Supprimer définitivement
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Category Modal */}
            <Dialog open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700 }}>Nouvelle catégorie</DialogTitle>
                <DialogContent>
                    <TextField fullWidth label="Nom de la catégorie" sx={{ mt: 2 }} value={categoryFormData.name} onChange={e => setCategoryFormData({ ...categoryFormData, name: e.target.value })} />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setCategoryModalOpen(false)}>Annuler</Button>
                    <Button variant="contained" onClick={handleSaveCategory} sx={{ borderRadius: 2 }}>Créer</Button>
                </DialogActions>
            </Dialog>

            {/* Warehouse Modal */}
            <Dialog open={warehouseModalOpen} onClose={() => setWarehouseModalOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700 }}>Nouvel entrepôt</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 2 }}>
                        <TextField fullWidth label="Nom" value={warehouseFormData.name} onChange={e => setWarehouseFormData({ ...warehouseFormData, name: e.target.value })} />
                        <TextField fullWidth label="Code" value={warehouseFormData.code} onChange={e => setWarehouseFormData({ ...warehouseFormData, code: e.target.value })} />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setWarehouseModalOpen(false)}>Annuler</Button>
                    <Button variant="contained" onClick={handleSaveWarehouse} sx={{ borderRadius: 2 }}>Créer</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default ProductForm;
