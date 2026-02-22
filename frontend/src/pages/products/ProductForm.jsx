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
    const isEdit = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
    const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' });
    const [warehouseFormData, setWarehouseFormData] = useState({ name: '', code: '', city: '' });

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
        stock_quantity: 0,
        low_stock_threshold: 5,
        is_active: true,
        sell_unit: 'piece',
        base_unit: 'piece',
        conversion_factor: 1,
        ordering_cost: 5000,
        holding_cost_percent: 20,
        barcode: '',
        expiration_date: '',
        supply_lead_time_days: 7,
        default_shelf_life_after_opening: '',
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

    const validationSchema = Yup.object({
        name: Yup.string().required('Le nom est requis'),
        price: Yup.number().typeError('Doit être un nombre').min(0, 'Prix positif requis').required('Le prix est requis'),
        cost_price: Yup.number().typeError('Doit être un nombre').min(0, 'Coût positif requis').nullable(),
        stock_quantity: Yup.number().when('product_type', {
            is: 'physical',
            then: (schema) => schema.typeError('Doit être un nombre').min(0, 'Stock positif requis').required('Requis'),
            otherwise: (schema) => schema.nullable()
        }),
        sell_unit: Yup.string().required('Requis'),
        base_unit: Yup.string().required('Requis'),
        conversion_factor: Yup.number().typeError('Doit être un nombre').positive('Doit être positif').required('Requis'),
    });

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
                    setInitialValues({
                        ...initialValues,
                        ...p,
                        category_id: p.category?.id || '',
                        warehouse_id: p.warehouse || '',
                        price: p.price ?? '',
                        cost_price: p.cost_price ?? '',
                        expiration_date: p.expiration_date || '',
                    });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id, isEdit]);

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

    const handleSubmit = async (values, { setSubmitting }) => {
        try {
            const payload = {
                ...values,
                price: values.price === '' ? 0 : parseFloat(values.price),
                cost_price: values.cost_price === '' ? 0 : parseFloat(values.cost_price),
                conversion_factor: values.conversion_factor === '' ? 1 : parseFloat(values.conversion_factor),
                category: values.category_id || null,
                warehouse: values.warehouse_id || null,
                expiration_date: values.expiration_date || null,
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

            // Remove undefined or empty values
            Object.keys(payload).forEach(key => {
                if (payload[key] === undefined || payload[key] === '') {
                    delete payload[key];
                }
            });

            if (values.product_type !== 'physical') {
                payload.stock_quantity = 0;
                payload.low_stock_threshold = 0;
                payload.warehouse = null;
            }

            if (isEdit) {
                await productsAPI.update(id, payload);
                enqueueSnackbar('Produit mis à jour', { variant: 'success' });
            } else {
                await productsAPI.create(payload);
                enqueueSnackbar('Produit créé', { variant: 'success' });
            }
            navigate('/products');
        } catch (error) {
            console.error(error);
            const msg = error.response?.data ? JSON.stringify(error.response.data) : 'Erreur';
            enqueueSnackbar(msg, { variant: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
                enableReinitialize
                innerRef={formikRef}
            >
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
                    <Form>
                        <Stack spacing={3}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="h4" fontWeight={700}>{isEdit ? 'Modifier Produit' : 'Nouveau Produit'}</Typography>
                                <Stack direction="row" spacing={1}>
                                    <Button variant="outlined" onClick={() => navigate('/products')}>Annuler</Button>
                                    <Button variant="contained" type="submit" disabled={isSubmitting} startIcon={isSubmitting && <CircularProgress size={20} />}>
                                        Enregistrer
                                    </Button>
                                </Stack>
                            </Box>

                            <Grid container spacing={3}>
                                <Grid item xs={12} md={8}>
                                    <Stack spacing={3}>
                                        <Card>
                                            <CardContent>
                                                <Typography variant="h6" gutterBottom>Type de produit</Typography>
                                                <ToggleButtonGroup
                                                    value={values.product_type}
                                                    exclusive
                                                    onChange={(e, v) => v && handleChange({ target: { name: 'product_type', value: v } })}
                                                    fullWidth
                                                >
                                                    <ToggleButton value="physical"><Inventory sx={{ mr: 1 }} /> Physique</ToggleButton>
                                                    <ToggleButton value="service"><Build sx={{ mr: 1 }} /> Service</ToggleButton>
                                                </ToggleButtonGroup>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardContent>
                                                <Typography variant="h6" gutterBottom>Informations</Typography>
                                                <Grid container spacing={2}>
                                                    <Grid item xs={12} sm={8}>
                                                        <TextField fullWidth name="name" label="Nom" value={values.name} onChange={handleChange} onBlur={handleBlur} error={touched.name && Boolean(errors.name)} helperText={touched.name && errors.name} required />
                                                    </Grid>
                                                    <Grid item xs={12} sm={4}>
                                                        <TextField fullWidth name="reference" label="Référence" value={values.reference} onChange={handleChange} placeholder="Auto" />
                                                    </Grid>
                                                    <Grid item xs={12}>
                                                        <TextField fullWidth multiline rows={2} name="description" label="Description" value={values.description} onChange={handleChange} />
                                                    </Grid>
                                                </Grid>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardContent>
                                                <Typography variant="h6" gutterBottom>Prix & Unités</Typography>
                                                <Grid container spacing={2}>
                                                    <Grid item xs={12} sm={6}>
                                                        <TextField fullWidth type="number" name="price" label="Prix de vente" value={values.price} onChange={handleChange} onBlur={handleBlur} error={touched.price && Boolean(errors.price)} helperText={touched.price && errors.price} required />
                                                    </Grid>
                                                    <Grid item xs={12} sm={6}>
                                                        <TextField fullWidth type="number" name="cost_price" label="Prix d'achat" value={values.cost_price} onChange={handleChange} />
                                                    </Grid>
                                                    <Grid item xs={12} sm={4}>
                                                        <TextField select fullWidth name="sell_unit" label="Unité de vente" value={values.sell_unit} onChange={handleChange}>
                                                            {UNIT_TYPES.map(u => <MenuItem key={u.value} value={u.value}>{u.label}</MenuItem>)}
                                                        </TextField>
                                                    </Grid>
                                                    <Grid item xs={12} sm={4}>
                                                        <TextField select fullWidth name="base_unit" label="Unité de base" value={values.base_unit} onChange={handleChange}>
                                                            {UNIT_TYPES.map(u => <MenuItem key={u.value} value={u.value}>{u.label}</MenuItem>)}
                                                        </TextField>
                                                    </Grid>
                                                    <Grid item xs={12} sm={4}>
                                                        <TextField fullWidth type="number" name="conversion_factor" label="Facteur" value={values.conversion_factor} onChange={handleChange} />
                                                    </Grid>
                                                </Grid>
                                            </CardContent>
                                        </Card>

                                        {values.product_type === 'physical' && (
                                            <Card>
                                                <CardContent>
                                                    <Typography variant="h6" gutterBottom>Stock & Traçabilité</Typography>
                                                    <Grid container spacing={2}>
                                                        <Grid item xs={12} sm={6}>
                                                            <TextField fullWidth type="number" name="stock_quantity" label="Stock actuel" value={values.stock_quantity} onChange={handleChange} error={touched.stock_quantity && Boolean(errors.stock_quantity)} helperText={touched.stock_quantity && errors.stock_quantity} />
                                                        </Grid>
                                                        <Grid item xs={12} sm={6}>
                                                            <TextField fullWidth type="number" name="low_stock_threshold" label="Seuil alerte" value={values.low_stock_threshold} onChange={handleChange} />
                                                        </Grid>
                                                        <Grid item xs={12} sm={6}>
                                                            <TextField fullWidth name="barcode" label="Code-barres" value={values.barcode} onChange={handleChange} />
                                                        </Grid>
                                                        <Grid item xs={12} sm={6}>
                                                            <TextField fullWidth type="date" name="expiration_date" label="Péremption" value={values.expiration_date} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                                                        </Grid>
                                                    </Grid>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </Stack>
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <Stack spacing={3}>
                                        <Card>
                                            <CardContent>
                                                <Typography variant="subtitle2" gutterBottom>Organisation</Typography>
                                                <Stack spacing={2}>
                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        <TextField select fullWidth label="Catégorie" name="category_id" value={values.category_id} onChange={handleChange} size="small">
                                                            <MenuItem value="">Aucune</MenuItem>
                                                            {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                                        </TextField>
                                                        <IconButton onClick={() => setCategoryModalOpen(true)} color="primary"><Add /></IconButton>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        <TextField select fullWidth label="Entrepôt" name="warehouse_id" value={values.warehouse_id} onChange={handleChange} size="small" disabled={values.product_type !== 'physical'}>
                                                            <MenuItem value="">Aucun</MenuItem>
                                                            {warehouses.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                                                        </TextField>
                                                        <IconButton onClick={() => setWarehouseModalOpen(true)} color="primary" disabled={values.product_type !== 'physical'}><Add /></IconButton>
                                                    </Box>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Stack>
                    </Form>
                )}
            </Formik>

            {/* Modals */}
            <Dialog open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)}>
                <DialogTitle>Nouvelle catégorie</DialogTitle>
                <DialogContent>
                    <TextField fullWidth label="Nom" sx={{ mt: 2 }} value={categoryFormData.name} onChange={e => setCategoryFormData({ ...categoryFormData, name: e.target.value })} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCategoryModalOpen(false)}>Annuler</Button>
                    <Button variant="contained" onClick={handleSaveCategory}>Créer</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={warehouseModalOpen} onClose={() => setWarehouseModalOpen(false)}>
                <DialogTitle>Nouvel entrepôt</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 2 }}>
                        <TextField fullWidth label="Nom" value={warehouseFormData.name} onChange={e => setWarehouseFormData({ ...warehouseFormData, name: e.target.value })} />
                        <TextField fullWidth label="Code" value={warehouseFormData.code} onChange={e => setWarehouseFormData({ ...warehouseFormData, code: e.target.value })} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setWarehouseModalOpen(false)}>Annuler</Button>
                    <Button variant="contained" onClick={handleSaveWarehouse}>Créer</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default ProductForm;
