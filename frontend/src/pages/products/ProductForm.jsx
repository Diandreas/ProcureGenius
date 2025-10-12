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
const getValidationSchema = (productType, hasWarehouses = true) => {
    const baseSchema = {
        name: Yup.string().required('Le nom est requis'),
        reference: Yup.string(),
        description: Yup.string().required('La description est requise'),
        price: Yup.number().positive('Le prix doit être positif').required('Le prix est requis'),
        cost_price: Yup.number().min(0, 'Le coût ne peut pas être négatif'),
        category_id: Yup.string().nullable(),
        supplier_id: Yup.string().nullable(),
    };

    // Ajout des validations spécifiques selon le type
    if (productType === 'physical') {
        return Yup.object({
            ...baseSchema,
            // Warehouse requis seulement s'il y en a de disponibles
            warehouse_id: hasWarehouses
                ? Yup.string().required('L\'entrepôt est requis pour les produits physiques')
                : Yup.string().nullable(),
            stock_quantity: Yup.number().min(0, 'Le stock ne peut pas être négatif').required('Le stock est requis'),
            low_stock_threshold: Yup.number().min(0, 'Le seuil ne peut pas être négatif').required('Requis'),
        });
    } else {
        return Yup.object(baseSchema);
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
                console.error('Erreur warehouses:', error);
                setWarehouses([]);
                enqueueSnackbar('Impossible de charger les entrepôts', { variant: 'warning' });
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
                enqueueSnackbar('Produit modifié avec succès', { variant: 'success' });
            } else {
                await productsAPI.create(cleanedValues);
                enqueueSnackbar('Produit créé avec succès', { variant: 'success' });
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
                    enqueueSnackbar(`Erreur: ${errorMessages.join(' | ')}`, { variant: 'error' });
                } else {
                    enqueueSnackbar('Erreur lors de l\'enregistrement', { variant: 'error' });
                }
            } else {
                enqueueSnackbar('Erreur lors de l\'enregistrement', { variant: 'error' });
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

            {/* Message d'information si modules manquants */}
            {(suppliers.length === 0 || warehouses.length === 0) && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    {suppliers.length === 0 && 'Le module Fournisseurs n\'est pas activé. '}
                    {warehouses.length === 0 && 'Aucun entrepôt disponible. Créez-en un dans les paramètres pour les produits physiques.'}
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
                                                    name="reference"
                                                    label="Référence"
                                                    value={values.reference}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.reference && Boolean(errors.reference)}
                                                    helperText={touched.reference && errors.reference || "Laissez vide pour générer automatiquement"}
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
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    size={isMobile ? "small" : "medium"}
                                                    name="price"
                                                    label={
                                                        values.product_type === 'service' ? 'Prix de vente' :
                                                            values.product_type === 'digital' ? 'Prix par licence' :
                                                                'Prix de vente'
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
                                                    label="Prix d'achat / Coût"
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

                                {/* Inventaire et logistique - Seulement pour produits physiques et numériques */}
                                <Collapse in={values.product_type !== 'service'} timeout="auto">
                                    <Card sx={{ mb: 3 }}>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                                {values.product_type === 'digital' ? <Cloud sx={{ mr: 1 }} /> : <LocalShipping sx={{ mr: 1 }} />}
                                                {values.product_type === 'digital' ? 'Distribution numérique' : 'Stock et logistique'}
                                            </Typography>

                                            <Grid container spacing={2}>
                                                {/* Fournisseur/Éditeur - Afficher toujours, vide si non disponible */}
                                                <Grid item xs={12} md={6}>
                                                    <FormControl
                                                        fullWidth
                                                        size={isMobile ? "small" : "medium"}
                                                        error={touched.supplier_id && Boolean(errors.supplier_id)}
                                                    >
                                                        <InputLabel>
                                                            {values.product_type === 'digital' ? 'Éditeur / Plateforme' : 'Fournisseur (optionnel)'}
                                                        </InputLabel>
                                                        <Select
                                                            name="supplier_id"
                                                            value={values.supplier_id}
                                                            onChange={handleChange}
                                                            label={values.product_type === 'digital' ? 'Éditeur / Plateforme' : 'Fournisseur (optionnel)'}
                                                            startAdornment={<Business sx={{ ml: 1, mr: -0.5, color: 'action.active' }} />}
                                                        >
                                                            <MenuItem value="">
                                                                <em>Aucun fournisseur</em>
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
                                                                Module Fournisseurs non activé ou vide
                                                            </FormHelperText>
                                                        )}
                                                    </FormControl>
                                                </Grid>

                                                {/* Entrepôt - Seulement pour produits physiques */}
                                                {values.product_type === 'physical' && (
                                                    <Grid item xs={12} md={6}>
                                                        <FormControl
                                                            fullWidth
                                                            size={isMobile ? "small" : "medium"}
                                                            required={warehouses.length > 0}
                                                            error={touched.warehouse_id && Boolean(errors.warehouse_id)}
                                                        >
                                                            <InputLabel>Entrepôt principal {warehouses.length > 0 ? '' : '(optionnel)'}</InputLabel>
                                                            <Select
                                                                name="warehouse_id"
                                                                value={values.warehouse_id}
                                                                onChange={handleChange}
                                                                label={`Entrepôt principal ${warehouses.length > 0 ? '' : '(optionnel)'}`}
                                                                startAdornment={<Warehouse sx={{ ml: 1, mr: -0.5, color: 'action.active' }} />}
                                                            >
                                                                {warehouses.length === 0 ? (
                                                                    <MenuItem value="">
                                                                        <em>Aucun entrepôt disponible</em>
                                                                    </MenuItem>
                                                                ) : (
                                                                    <>
                                                                        <MenuItem value="">
                                                                            <em>Sélectionner un entrepôt</em>
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
                                                                    ⚠️ Aucun entrepôt disponible. Le produit sera créé sans entrepôt.
                                                                </FormHelperText>
                                                            )}
                                                        </FormControl>
                                                    </Grid>
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
                                                        helperText={touched.stock_quantity && errors.stock_quantity}
                                                        required={values.product_type === 'physical'}
                                                        InputProps={{
                                                            startAdornment: <Inventory sx={{ mr: 1, color: 'action.active' }} />,
                                                        }}
                                                    />
                                                </Grid>

                                                {/* Seuil stock bas - Seulement pour produits physiques */}
                                                {values.product_type === 'physical' && (
                                                    <Grid item xs={12} md={6}>
                                                        <TextField
                                                            fullWidth
                                                            size={isMobile ? "small" : "medium"}
                                                            name="low_stock_threshold"
                                                            label="Seuil de stock bas"
                                                            type="number"
                                                            value={values.low_stock_threshold}
                                                            onChange={handleChange}
                                                            onBlur={handleBlur}
                                                            error={touched.low_stock_threshold && Boolean(errors.low_stock_threshold)}
                                                            helperText={touched.low_stock_threshold && errors.low_stock_threshold || "Alerte si stock <= ce seuil"}
                                                            required
                                                        />
                                                    </Grid>
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
                                                            Produit actif
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Warning sx={{ mr: 1, color: 'warning.main' }} />
                                                            Produit inactif
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
                                            {values.price && (
                                                <Box display="flex" justifyContent="space-between">
                                                    <Typography variant="caption" color="text.secondary">Prix:</Typography>
                                                    <Typography variant="body2" fontWeight="bold">${values.price}</Typography>
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