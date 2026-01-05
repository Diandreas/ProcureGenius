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
    Autocomplete,
} from '@mui/material';
import {
    Save,
    Cancel,
    Inventory,
    AttachMoney,
    Upload,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { productsAPI, suppliersAPI } from '../../services/api';

const validationSchema = Yup.object({
    name: Yup.string().required('Le nom est requis'),
    sku: Yup.string().required('Le SKU est requis'),
    description: Yup.string().required('La description est requise'),
    unit_price: Yup.number().positive('Le prix doit être positif').required('Le prix unitaire est requis'),
    bulk_price: Yup.number().positive('Le prix de gros doit être positif').nullable(),
    bulk_quantity: Yup.number().positive('La quantité de gros doit être positive').nullable(),
    stock_quantity: Yup.number().min(0, 'Le stock ne peut pas être négatif').nullable(),
    minimum_order_quantity: Yup.number().positive('La quantité minimum doit être positive').required('La quantité minimum est requise'),
    lead_time_days: Yup.number().positive('Le délai de livraison doit être positif').required('Le délai de livraison est requis'),
    supplier_id: Yup.string().required('Le fournisseur est requis'),
});

function ProductForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { enqueueSnackbar } = useSnackbar();
    const isEdit = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [initialValues, setInitialValues] = useState({
        name: '',
        sku: '',
        description: '',
        specifications: {},
        unit_price: '',
        bulk_price: '',
        bulk_quantity: '',
        stock_quantity: '',
        minimum_order_quantity: 1,
        lead_time_days: 7,
        is_available: true,
        supplier_id: '',
        category_id: '',
        image: null,
    });

    useEffect(() => {
        fetchSuppliers();
        fetchCategories();
        if (isEdit) {
            fetchProduct();
        }
    }, [id]);

    const fetchSuppliers = async () => {
        try {
            const response = await suppliersAPI.list();
            setSuppliers(response.data.results || response.data);
        } catch (error) {
            console.error('Erreur lors du chargement des fournisseurs:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            // TODO: Implement categories API endpoint
            setCategories([]);
        } catch (error) {
            console.error('Erreur lors du chargement des catégories:', error);
        }
    };

    const fetchProduct = async () => {
        setLoading(true);
        try {
            const response = await productsAPI.get(id);
            const product = response.data;
            setInitialValues({
                ...product,
                supplier_id: product.supplier?.id || '',
                category_id: product.category?.id || '',
                unit_price: product.unit_price || '',
                bulk_price: product.bulk_price || '',
                bulk_quantity: product.bulk_quantity || '',
                stock_quantity: product.stock_quantity || '',
                specifications: product.specifications || {},
            });
        } catch (error) {
            enqueueSnackbar('Erreur lors du chargement du produit', { variant: 'error' });
            navigate('/products');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values, { setSubmitting }) => {
        try {
            // Clean up empty values
            const cleanedValues = {
                ...values,
                unit_price: parseFloat(values.unit_price),
                bulk_price: values.bulk_price ? parseFloat(values.bulk_price) : null,
                bulk_quantity: values.bulk_quantity ? parseInt(values.bulk_quantity) : null,
                stock_quantity: values.stock_quantity ? parseInt(values.stock_quantity) : null,
                minimum_order_quantity: parseInt(values.minimum_order_quantity),
                lead_time_days: parseInt(values.lead_time_days),
                category_id: values.category_id || null,
            };

            if (isEdit) {
                await productsAPI.update(id, cleanedValues);
                enqueueSnackbar('Produit modifié avec succès', { variant: 'success' });
            } else {
                await productsAPI.create(cleanedValues);
                enqueueSnackbar('Produit créé avec succès', { variant: 'success' });
            }
            navigate('/products');
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement:', error);
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

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
                {isEdit ? 'Modifier le produit' : 'Nouveau produit'}
            </Typography>

            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
                enableReinitialize
            >
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting, setFieldValue }) => (
                    <Form>
                        <Grid container spacing={3}>
                            {/* Informations générales */}
                            <Grid item xs={12} md={8}>
                                <Card sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Informations générales
                                        </Typography>

                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
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
                                                    name="sku"
                                                    label="SKU"
                                                    value={values.sku}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.sku && Boolean(errors.sku)}
                                                    helperText={touched.sku && errors.sku}
                                                    required
                                                />
                                            </Grid>

                                            <Grid item xs={12}>
                                                <TextField
                                                    fullWidth
                                                    multiline
                                                    rows={4}
                                                    name="description"
                                                    label="Description"
                                                    value={values.description}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.description && Boolean(errors.description)}
                                                    helperText={touched.description && errors.description}
                                                    required
                                                />
                                            </Grid>

                                            <Grid item xs={12} md={6}>
                                                <FormControl fullWidth required>
                                                    <InputLabel>Fournisseur</InputLabel>
                                                    <Select
                                                        name="supplier_id"
                                                        value={values.supplier_id}
                                                        onChange={handleChange}
                                                        label="Fournisseur"
                                                        error={touched.supplier_id && Boolean(errors.supplier_id)}
                                                    >
                                                        {suppliers.map((supplier) => (
                                                            <MenuItem key={supplier.id} value={supplier.id}>
                                                                {supplier.name}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </Grid>

                                            <Grid item xs={12} md={6}>
                                                <FormControl fullWidth>
                                                    <InputLabel>Catégorie</InputLabel>
                                                    <Select
                                                        name="category_id"
                                                        value={values.category_id}
                                                        onChange={handleChange}
                                                        label="Catégorie"
                                                    >
                                                        <MenuItem value="">Aucune</MenuItem>
                                                        {categories.map((category) => (
                                                            <MenuItem key={category.id} value={category.id}>
                                                                {category.name}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>

                                {/* Prix */}
                                <Card sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <AttachMoney />
                                            Tarification
                                        </Typography>

                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    name="unit_price"
                                                    label="Prix unitaire"
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

                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    name="bulk_price"
                                                    label="Prix en gros"
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
                                                    name="bulk_quantity"
                                                    label="Quantité minimum pour prix en gros"
                                                    type="number"
                                                    value={values.bulk_quantity}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.bulk_quantity && Boolean(errors.bulk_quantity)}
                                                    helperText={touched.bulk_quantity && errors.bulk_quantity}
                                                />
                                            </Grid>

                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
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
                                        </Grid>
                                    </CardContent>
                                </Card>

                                {/* Stock et livraison */}
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Inventory />
                                            Stock et livraison
                                        </Typography>

                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    name="stock_quantity"
                                                    label="Quantité en stock"
                                                    type="number"
                                                    value={values.stock_quantity}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.stock_quantity && Boolean(errors.stock_quantity)}
                                                    helperText={touched.stock_quantity && errors.stock_quantity}
                                                />
                                            </Grid>

                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    name="lead_time_days"
                                                    label="Délai de livraison (jours)"
                                                    type="number"
                                                    value={values.lead_time_days}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.lead_time_days && Boolean(errors.lead_time_days)}
                                                    helperText={touched.lead_time_days && errors.lead_time_days}
                                                    required
                                                />
                                            </Grid>

                                            <Grid item xs={12}>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            name="is_available"
                                                            checked={values.is_available}
                                                            onChange={handleChange}
                                                        />
                                                    }
                                                    label="Produit disponible"
                                                />
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Sidebar - Image et spécifications */}
                            <Grid item xs={12} md={4}>
                                <Card sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Image du produit
                                        </Typography>

                                        {values.image && typeof values.image === 'string' && (
                                            <Box sx={{ mb: 2, textAlign: 'center' }}>
                                                <img
                                                    src={values.image}
                                                    alt="Produit"
                                                    style={{
                                                        maxWidth: '100%',
                                                        maxHeight: 200,
                                                        objectFit: 'contain',
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
                                        >
                                            {values.image ? 'Changer l\'image' : 'Ajouter une image'}
                                            <input
                                                type="file"
                                                hidden
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        // TODO: Implement file upload
                                                        console.log('File selected:', file);
                                                    }
                                                }}
                                            />
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Spécifications
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Ajoutez des spécifications techniques du produit
                                        </Typography>

                                        {/* TODO: Implement dynamic specifications editor */}
                                        <Alert severity="info" sx={{ mt: 2 }}>
                                            L'éditeur de spécifications sera disponible prochainement
                                        </Alert>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Actions */}
                            <Grid item xs={12}>
                                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<Cancel />}
                                        onClick={() => navigate('/products')}
                                        disabled={isSubmitting}
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        startIcon={<Save />}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? <CircularProgress size={24} /> : (isEdit ? 'Modifier' : 'Créer')}
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
