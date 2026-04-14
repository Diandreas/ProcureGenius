import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    Grid, MenuItem, FormControlLabel, Checkbox, Typography, Box,
    IconButton, CircularProgress, Divider, Tabs, Tab, Table, TableHead,
    TableBody, TableRow, TableCell, Tooltip, Alert, Chip, InputAdornment,
} from '@mui/material';
import { Close as CloseIcon, Add as AddIcon, Delete as DeleteIcon, AutoAwesome as AutoIcon, Inventory2 as InventoryIcon, LinkOff as LinkOffIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';
import { productsAPI } from '../../../services/api';
import RichTextEditor from '../../../components/RichTextEditor';

import useCurrentUser from '../../../hooks/useCurrentUser';

const SAMPLE_TYPES = [
    { value: 'blood', label: 'Sang' }, { value: 'urine', label: 'Urine' },
    { value: 'stool', label: 'Selles' }, { value: 'csf', label: 'LCR' },
    { value: 'sputum', label: 'Crachat' }, { value: 'swab', label: 'Ecouvillon' },
    { value: 'tissue', label: 'Tissu' }, { value: 'other', label: 'Autre' },
];

const CONTAINER_TYPES = [
    { value: 'edta', label: 'EDTA (violet)' }, { value: 'serum', label: 'Serum (rouge)' },
    { value: 'citrate', label: 'Citrate (bleu)' }, { value: 'heparin', label: 'Heparine (vert)' },
    { value: 'fluoride', label: 'Fluorure (gris)' }, { value: 'urine_cup', label: 'Pot a urine' },
    { value: 'stool_cup', label: 'Pot a selles' }, { value: 'swab_kit', label: 'Tube ecouvillon' },
    { value: 'other', label: 'Autre' },
];

const VALUE_TYPES = [
    { value: 'numeric', label: 'Numerique' },
    { value: 'text', label: 'Texte' },
    { value: 'pos_neg', label: 'Positif/Negatif' },
];

const EMPTY_PARAMETER = {
    code: '', name: '', group_name: '', unit: '', 
    base_unit: '', conversion_factor: 1.0,
    value_type: 'numeric',
    decimal_places: 2, is_required: true,
    adult_ref_min_male: '', adult_ref_max_male: '',
    adult_ref_min_female: '', adult_ref_max_female: '',
    adult_ref_min_general: '', adult_ref_max_general: '',
    critical_low: '', critical_high: '',
};

const LabTestFormModal = ({ open, onClose, test, onSaved, initialTab }) => {
    const { isAdmin } = useCurrentUser();
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [showNewCategory, setShowNewCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);
    const [activeTab, setActiveTab] = useState(initialTab === 'params' ? 1 : 0);
    const [parameters, setParameters] = useState([]);
    const [products, setProducts] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [consumables, setConsumables] = useState([]);
    const [consumablesLoading, setConsumablesLoading] = useState(false);
    const [addConsumableProduct, setAddConsumableProduct] = useState('');
    const [addConsumableQty, setAddConsumableQty] = useState(1);
    const [addConsumableSearch, setAddConsumableSearch] = useState('');
    const [addConsumableLoading, setAddConsumableLoading] = useState(false);

    const [formData, setFormData] = useState({
        test_code: '', name: '', short_name: '', category: '', description: '',
        price: '', discount: '', sample_type: 'blood', container_type: 'serum',
        sample_volume: '', normal_range_general: '', normal_range_male: '',
        normal_range_female: '', normal_range_child: '', unit_of_measurement: '',
        base_unit: '', conversion_factor: 1.0,
        fasting_required: false, fasting_hours: '', preparation_instructions: '',
        estimated_turnaround_hours: '', methodology: '', is_active: true, requires_approval: false,
        use_large_layout: false,
        show_on_new_page: false,
        linked_product: '',
        result_template: '',
    });

    useEffect(() => {
        if (open) {
            fetchCategories();
            fetchProducts();
            setActiveTab(initialTab === 'params' ? 1 : 0);
            setAddConsumableProduct('');
            setAddConsumableQty(1);
            setAddConsumableSearch('');
            if (test) {
                fetchConsumables(test.id);
                setFormData({
                    test_code: test.test_code || '', name: test.name || '', short_name: test.short_name || '',
                    category: test.category || '', description: test.description || '',
                    price: test.price || '', discount: test.discount || '',
                    sample_type: test.sample_type || 'blood', container_type: test.container_type || 'serum',
                    sample_volume: test.sample_volume || '', normal_range_general: test.normal_range_general || '',
                    normal_range_male: test.normal_range_male || '', normal_range_female: test.normal_range_female || '',
                    normal_range_child: test.normal_range_child || '', unit_of_measurement: test.unit_of_measurement || '',
                    base_unit: test.base_unit || '', conversion_factor: test.conversion_factor || 1.0,
                    fasting_required: test.fasting_required || false, fasting_hours: test.fasting_hours || '',
                    preparation_instructions: test.preparation_instructions || '',
                    estimated_turnaround_hours: test.estimated_turnaround_hours || '',
                    methodology: test.methodology || '',
                    is_active: test.is_active !== undefined ? test.is_active : true,
                    requires_approval: test.requires_approval || false,
                    use_large_layout: test.use_large_layout || false,
                    show_on_new_page: test.show_on_new_page || false,
                    linked_product: test.linked_product || '',
                    result_template: test.result_template || '',
                });
                if (test.parameters && test.parameters.length > 0) {
                    setParameters(test.parameters.map(p => ({
                        id: p.id, _key: p.id,
                        code: p.code || '', name: p.name || '', group_name: p.group_name || '',
                        unit: p.unit || '',
                        base_unit: p.base_unit || '', conversion_factor: p.conversion_factor != null ? parseFloat(p.conversion_factor) : 1.0,
                        value_type: p.value_type || 'numeric',
                        decimal_places: p.decimal_places || 2,
                        is_required: p.is_required !== undefined ? p.is_required : true,
                        adult_ref_min_male: p.adult_ref_min_male != null ? p.adult_ref_min_male : '',
                        adult_ref_max_male: p.adult_ref_max_male != null ? p.adult_ref_max_male : '',
                        adult_ref_min_female: p.adult_ref_min_female != null ? p.adult_ref_min_female : '',
                        adult_ref_max_female: p.adult_ref_max_female != null ? p.adult_ref_max_female : '',
                        adult_ref_min_general: p.adult_ref_min_general != null ? p.adult_ref_min_general : '',
                        adult_ref_max_general: p.adult_ref_max_general != null ? p.adult_ref_max_general : '',
                        critical_low: p.critical_low != null ? p.critical_low : '',
                        critical_high: p.critical_high != null ? p.critical_high : '',
                    })));
                } else {
                    setParameters([]);
                }
            } else {
                autoGenerateTestCode();
                setFormData(prev => ({
                    ...prev, name: '', short_name: '', category: '', description: '',
                    price: '', discount: '', sample_type: 'blood', container_type: 'serum',
                    sample_volume: '', normal_range_general: '', normal_range_male: '',
                    normal_range_female: '', normal_range_child: '', unit_of_measurement: '',
                    base_unit: '', conversion_factor: 1.0,
                    fasting_required: false, fasting_hours: '', preparation_instructions: '',
                    estimated_turnaround_hours: '', methodology: '', is_active: true, requires_approval: false,
                    use_large_layout: false,
                    show_on_new_page: false,
                    linked_product: '',
                }));
                setParameters([]);
                setConsumables([]);
            }
        }
    }, [open, test]);

    const autoGenerateTestCode = async () => {
        try {
            const data = await laboratoryAPI.generateTestCode();
            setFormData(prev => ({ ...prev, test_code: data.test_code }));
        } catch {
            const ts = Date.now().toString(36).toUpperCase().slice(-6);
            setFormData(prev => ({ ...prev, test_code: `TST-${ts}` }));
        }
    };

    const fetchCategories = async () => {
        try {
            const data = await laboratoryAPI.getCategories();
            setCategories(Array.isArray(data) ? data : data.results || []);
        } catch (error) { console.error('Error fetching categories:', error); }
    };

    const fetchProducts = async () => {
        try {
            const resp = await productsAPI.list({ product_type: 'physical', page_size: 200 });
            const items = Array.isArray(resp.data) ? resp.data : resp.data?.results || [];
            setProducts(items);
        } catch (error) { console.error('Error fetching products:', error); }
    };

    const fetchConsumables = async (testId) => {
        if (!testId) { setConsumables([]); return; }
        setConsumablesLoading(true);
        try {
            const data = await laboratoryAPI.getTestConsumables(testId);
            setConsumables(Array.isArray(data) ? data : data.results || []);
        } catch { setConsumables([]); }
        finally { setConsumablesLoading(false); }
    };

    const handleAddConsumable = async () => {
        if (!test?.id || !addConsumableProduct) return;
        setAddConsumableLoading(true);
        try {
            await laboratoryAPI.addTestConsumable(test.id, {
                product: addConsumableProduct,
                quantity_per_test: addConsumableQty,
            });
            enqueueSnackbar('Consommable ajoute', { variant: 'success' });
            setAddConsumableProduct('');
            setAddConsumableQty(1);
            fetchConsumables(test.id);
        } catch (err) {
            const msg = err?.response?.data?.error || err?.response?.data?.detail || 'Erreur ajout consommable';
            enqueueSnackbar(msg, { variant: 'error' });
        } finally { setAddConsumableLoading(false); }
    };

    const handleDeleteConsumable = async (consumableId) => {
        try {
            await laboratoryAPI.deleteTestConsumable(consumableId);
            enqueueSnackbar('Consommable supprime', { variant: 'success' });
            fetchConsumables(test.id);
        } catch { enqueueSnackbar('Erreur suppression', { variant: 'error' }); }
    };

    const handleUpdateConsumableQty = async (consumableId, qty) => {
        try {
            await laboratoryAPI.updateTestConsumable(consumableId, { quantity_per_test: qty });
            fetchConsumables(test.id);
        } catch { enqueueSnackbar('Erreur mise a jour', { variant: 'error' }); }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        setCreatingCategory(true);
        try {
            const newCat = await laboratoryAPI.createCategory({ name: newCategoryName.trim(), is_active: true });
            setCategories(prev => [...prev, newCat]);
            setFormData(prev => ({ ...prev, category: newCat.id }));
            setNewCategoryName(''); setShowNewCategory(false);
            enqueueSnackbar('Categorie creee', { variant: 'success' });
        } catch { enqueueSnackbar('Erreur creation categorie', { variant: 'error' }); }
        finally { setCreatingCategory(false); }
    };

    const addParameter = () => setParameters(prev => [...prev, { ...EMPTY_PARAMETER, _key: Date.now() }]);
    const removeParameter = (index) => setParameters(prev => prev.filter((_, i) => i !== index));
    const updateParameter = (index, field, value) =>
        setParameters(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));

    const handleSubmit = async () => {
        if (!formData.name || !formData.test_code || !formData.category) {
            enqueueSnackbar('Veuillez remplir Code, Nom, Categorie', { variant: 'warning' });
            return;
        }
        setLoading(true);
        try {
            const payload = { ...formData };
            payload.price = (payload.price === '' || payload.price === null) ? 0 : parseFloat(payload.price);
            payload.discount = (payload.discount === '' || payload.discount === null) ? 0 : parseFloat(payload.discount);
            payload.fasting_hours = (payload.fasting_hours === '' || payload.fasting_hours === null) ? null : parseInt(payload.fasting_hours);
            payload.estimated_turnaround_hours = (payload.estimated_turnaround_hours === '' || payload.estimated_turnaround_hours === null) ? 24 : parseInt(payload.estimated_turnaround_hours);
            if (!payload.category || payload.category === '') payload.category = null;
            if (!payload.linked_product || payload.linked_product === '') payload.linked_product = null;
            ['short_name','description','sample_volume','normal_range_general','normal_range_male',
             'normal_range_female','normal_range_child','unit_of_measurement','preparation_instructions','methodology'
            ].forEach(f => { if (payload[f] === null || payload[f] === undefined) payload[f] = ''; });

            let savedTest;
            if (test) {
                savedTest = await laboratoryAPI.updateTest(test.id, payload);
                enqueueSnackbar('Test modifie avec succes', { variant: 'success' });
            } else {
                savedTest = await laboratoryAPI.createTest(payload);
                enqueueSnackbar('Test cree avec succes', { variant: 'success' });
            }

            const testId = savedTest?.id || test?.id;
            if (testId) {
                const cleanParams = parameters.map((p, idx) => ({
                    code: p.code, name: p.name, group_name: p.group_name || '',
                    unit: p.unit || '', 
                    base_unit: p.base_unit || '', 
                    conversion_factor: p.conversion_factor !== '' && p.conversion_factor != null ? parseFloat(p.conversion_factor) : 1.0,
                    value_type: p.value_type || 'numeric',
                    decimal_places: parseInt(p.decimal_places) || 2,
                    is_required: p.is_required !== false, display_order: idx,
                    adult_ref_min_male: p.adult_ref_min_male !== '' ? parseFloat(p.adult_ref_min_male) : null,
                    adult_ref_max_male: p.adult_ref_max_male !== '' ? parseFloat(p.adult_ref_max_male) : null,
                    adult_ref_min_female: p.adult_ref_min_female !== '' ? parseFloat(p.adult_ref_min_female) : null,
                    adult_ref_max_female: p.adult_ref_max_female !== '' ? parseFloat(p.adult_ref_max_female) : null,
                    adult_ref_min_general: p.adult_ref_min_general !== '' ? parseFloat(p.adult_ref_min_general) : null,
                    adult_ref_max_general: p.adult_ref_max_general !== '' ? parseFloat(p.adult_ref_max_general) : null,
                    critical_low: p.critical_low !== '' ? parseFloat(p.critical_low) : null,
                    critical_high: p.critical_high !== '' ? parseFloat(p.critical_high) : null,
                }));
                await laboratoryAPI.saveTestParameters(testId, cleanParams);
            }
            onSaved?.(); onClose();
        } catch (error) {
            let errorMsg = "Erreur lors de l'enregistrement";
            if (error?.response?.data) {
                const data = error.response.data;
                if (typeof data === 'object') {
                    const parts = [];
                    // Handle parameter-level errors
                    if (data.parameter_code) parts.push(`Paramètre '${data.parameter_code}'`);
                    if (data.error && typeof data.error === 'object') {
                        Object.entries(data.error).forEach(([k, v]) => {
                            parts.push(`${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
                        });
                    } else {
                        Object.entries(data).forEach(([k, v]) => {
                            if (k !== 'parameter_code') {
                                parts.push(`${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`);
                            }
                        });
                    }
                    errorMsg = parts.join(' | ') || errorMsg;
                } else {
                    errorMsg = String(data);
                }
            }
            enqueueSnackbar(errorMsg, { variant: 'error', autoHideDuration: 8000 });
        } finally { setLoading(false); }
    };

    const RefRangeCell = ({ param, idx, minField, maxField }) => (
        <Box display="flex" gap={0.5} alignItems="center">
            <TextField size="small" type="number" value={param[minField]}
                onChange={e => updateParameter(idx, minField, e.target.value)} sx={{ width: 60 }} placeholder="min" />
            <Typography variant="caption">-</Typography>
            <TextField size="small" type="number" value={param[maxField]}
                onChange={e => updateParameter(idx, maxField, e.target.value)} sx={{ width: 60 }} placeholder="max" />
        </Box>
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {test ? 'Modifier le Test' : 'Nouveau Test Laboratoire'}
                <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
            </DialogTitle>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="Informations generales" />
                <Tab label={`Parametres structures (${parameters.length})`} />
            </Tabs>
            <DialogContent dividers>
                {activeTab === 0 && (
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="primary" gutterBottom>Identification</Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <TextField fullWidth required label="Code" name="test_code" value={formData.test_code} onChange={handleChange} size="small" />
                                <Tooltip title="Generer automatiquement">
                                    <IconButton size="small" onClick={autoGenerateTestCode} color="primary"><AutoIcon fontSize="small" /></IconButton>
                                </Tooltip>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={8}>
                            <TextField fullWidth required label="Nom complet" name="name" value={formData.name} onChange={handleChange} size="small" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField fullWidth label="Nom abrege" name="short_name" value={formData.short_name} onChange={handleChange} size="small" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            {!showNewCategory ? (
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <TextField fullWidth required select label="Categorie" name="category" value={formData.category} onChange={handleChange} size="small">
                                        {categories.map(cat => (<MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>))}
                                    </TextField>
                                    <IconButton onClick={() => setShowNewCategory(true)} color="primary" size="small"><AddIcon /></IconButton>
                                </Box>
                            ) : (
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <TextField fullWidth label="Nouvelle categorie" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} size="small" />
                                    <Button variant="contained" size="small" onClick={handleCreateCategory} disabled={creatingCategory}>
                                        {creatingCategory ? <CircularProgress size={20} /> : 'OK'}
                                    </Button>
                                    <Button size="small" onClick={() => setShowNewCategory(false)}>Annuler</Button>
                                </Box>
                            )}
                        </Grid>
                        {isAdmin && (
                            <>
                                <Grid item xs={12} sm={2}>
                                    <TextField fullWidth label="Prix (XAF)" name="price" value={formData.price} onChange={handleChange} size="small" type="number" />
                                </Grid>
                                <Grid item xs={12} sm={2}>
                                    <TextField fullWidth label="Reduction (XAF)" name="discount" value={formData.discount} onChange={handleChange} size="small" type="number" />
                                </Grid>
                            </>
                        )}
                        <Grid item xs={12}>
                            <TextField fullWidth multiline rows={2} label="Description" name="description" value={formData.description} onChange={handleChange} size="small" />
                        </Grid>
                        <Grid item xs={12}><Divider /><Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>Echantillon</Typography></Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField fullWidth select label="Type echantillon" name="sample_type" value={formData.sample_type} onChange={handleChange} size="small">
                                {SAMPLE_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField fullWidth select label="Type de tube" name="container_type" value={formData.container_type} onChange={handleChange} size="small">
                                {CONTAINER_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField fullWidth label="Volume requis" name="sample_volume" value={formData.sample_volume} onChange={handleChange} size="small" placeholder="ex: 5 mL" />
                        </Grid>
                        <Grid item xs={12}><Divider /><Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>Valeurs de Reference (test simple)</Typography></Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField fullWidth label="General" name="normal_range_general" value={formData.normal_range_general} onChange={handleChange} size="small" placeholder="ex: 4.5-11.0" />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField fullWidth label="Homme" name="normal_range_male" value={formData.normal_range_male} onChange={handleChange} size="small" />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField fullWidth label="Femme" name="normal_range_female" value={formData.normal_range_female} onChange={handleChange} size="small" />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField fullWidth label="Enfant" name="normal_range_child" value={formData.normal_range_child} onChange={handleChange} size="small" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField fullWidth label="Unite d'affichage" name="unit_of_measurement" value={formData.unit_of_measurement} onChange={handleChange} size="small" placeholder="ex: mg/dL" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField fullWidth label="Unite de base (BD)" name="base_unit" value={formData.base_unit} onChange={handleChange} size="small" placeholder="ex: mmol/L" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField fullWidth label="Facteur de conversion" name="conversion_factor" value={formData.conversion_factor} onChange={handleChange} size="small" type="number" inputProps={{ step: "0.0001" }} helperText="Affichage = Base * Facteur" />
                        </Grid>
                        <Grid item xs={12}><Divider /><Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>Preparation Patient</Typography></Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControlLabel control={<Checkbox checked={formData.fasting_required} onChange={handleChange} name="fasting_required" />} label="Jeune requis" />
                        </Grid>
                        {formData.fasting_required && (
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth label="Duree jeune (heures)" name="fasting_hours" value={formData.fasting_hours} onChange={handleChange} size="small" type="number" />
                            </Grid>
                        )}
                        <Grid item xs={12}>
                            <TextField fullWidth multiline rows={2} label="Instructions de preparation" name="preparation_instructions" value={formData.preparation_instructions} onChange={handleChange} size="small" />
                        </Grid>
                        <Grid item xs={12}><Divider /><Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>Consommables stock (tests rapides, kits…)</Typography></Grid>
                        <Grid item xs={12}>
                            <Alert severity="info" sx={{ mb: 1, py: 0.5 }} icon={<InventoryIcon fontSize="small" />}>
                                Liez un ou plusieurs produits du stock à ce test. A chaque collecte d'echantillon, les quantites indiquees seront deduites automatiquement.
                            </Alert>
                        </Grid>
                        {/* Liste des consommables existants */}
                        {test?.id && (
                            <Grid item xs={12}>
                                {consumablesLoading ? (
                                    <CircularProgress size={20} />
                                ) : consumables.length > 0 ? (
                                    <Table size="small" sx={{ mb: 1 }}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Produit</TableCell>
                                                <TableCell>Ref</TableCell>
                                                <TableCell align="center">Stock</TableCell>
                                                <TableCell align="center">Qte/test</TableCell>
                                                <TableCell align="center">Suppr.</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {consumables.map(c => (
                                                <TableRow key={c.id}>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <InventoryIcon fontSize="small" color="primary" sx={{ opacity: 0.7 }} />
                                                            <Typography variant="body2">{c.product_name}</Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell><Typography variant="caption" color="text.secondary">{c.product_reference}</Typography></TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            label={c.product_stock ?? 0}
                                                            size="small"
                                                            color={(c.product_stock ?? 0) > 0 ? 'success' : 'error'}
                                                            variant="outlined"
                                                            sx={{ fontSize: '0.65rem', height: 18 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <TextField
                                                            type="number"
                                                            size="small"
                                                            value={c.quantity_per_test}
                                                            onChange={e => handleUpdateConsumableQty(c.id, parseInt(e.target.value) || 1)}
                                                            inputProps={{ min: 1, style: { width: 50, textAlign: 'center' } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <IconButton size="small" color="error" onClick={() => handleDeleteConsumable(c.id)}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Aucun consommable lie.</Typography>
                                )}
                            </Grid>
                        )}
                        {/* Formulaire ajout consommable (seulement si test existe) */}
                        {test?.id ? (
                            <>
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        fullWidth
                                        label="Filtrer produit"
                                        value={addConsumableSearch}
                                        onChange={e => setAddConsumableSearch(e.target.value)}
                                        size="small"
                                        placeholder="Rechercher..."
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth select
                                        label="Produit a ajouter"
                                        value={addConsumableProduct}
                                        onChange={e => setAddConsumableProduct(e.target.value)}
                                        size="small"
                                        SelectProps={{ displayEmpty: true }}
                                    >
                                        <MenuItem value=""><em>Selectionner un produit…</em></MenuItem>
                                        {products
                                            .filter(p => !addConsumableSearch || p.name.toLowerCase().includes(addConsumableSearch.toLowerCase()))
                                            .filter(p => !consumables.some(c => c.product === p.id))
                                            .map(p => (
                                                <MenuItem key={p.id} value={p.id}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                                                        <span>{p.name}</span>
                                                        <Chip label={`${p.stock_quantity ?? 0}`} size="small"
                                                            color={(p.stock_quantity ?? 0) > 0 ? 'success' : 'error'}
                                                            variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
                                                    </Box>
                                                </MenuItem>
                                            ))
                                        }
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={1}>
                                    <TextField
                                        fullWidth type="number"
                                        label="Qte"
                                        value={addConsumableQty}
                                        onChange={e => setAddConsumableQty(parseInt(e.target.value) || 1)}
                                        size="small"
                                        inputProps={{ min: 1 }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={2}>
                                    <Button
                                        fullWidth variant="contained" size="small"
                                        startIcon={addConsumableLoading ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
                                        onClick={handleAddConsumable}
                                        disabled={!addConsumableProduct || addConsumableLoading}
                                    >
                                        Ajouter
                                    </Button>
                                </Grid>
                            </>
                        ) : (
                            <Grid item xs={12}>
                                <Alert severity="warning" sx={{ py: 0.5 }}>
                                    Enregistrez d'abord le test pour pouvoir lui lier des consommables.
                                </Alert>
                            </Grid>
                        )}
                        <Grid item xs={12}><Divider /><Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>Traitement</Typography></Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField fullWidth label="Delai execution (heures)" name="estimated_turnaround_hours" value={formData.estimated_turnaround_hours} onChange={handleChange} size="small" type="number" />
                        </Grid>
                        <Grid item xs={12} sm={8}>
                            <TextField fullWidth label="Methodologie" name="methodology" value={formData.methodology} onChange={handleChange} size="small" />
                        </Grid>
                        <Grid item xs={12}><Divider /></Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControlLabel control={<Checkbox checked={formData.is_active} onChange={handleChange} name="is_active" />} label="Actif" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControlLabel control={<Checkbox checked={formData.requires_approval} onChange={handleChange} name="requires_approval" />} label="Necessite approbation" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControlLabel 
                                control={<Checkbox checked={formData.use_large_layout} onChange={handleChange} name="use_large_layout" />} 
                                label="Affichage large (Bactériologie)" 
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControlLabel 
                                control={<Checkbox checked={formData.show_on_new_page} onChange={handleChange} name="show_on_new_page" />} 
                                label="Afficher seul sur une page" 
                            />
                        </Grid>
                    </Grid>
                )}
                {activeTab === 1 && (
                    <Box>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Parametres structures pour tests complexes (ex: NFS, Bilan lipidique...). Laissez vide pour un test simple avec une seule valeur.
                        </Alert>

                        {/* Template de résultat */}
                        <Box sx={{ mb: 2 }}>
                            {formData.use_large_layout ? (
                                <>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Template de résultat — <strong>Affichage large (Bactériologie)</strong>
                                    </Typography>
                                    <Alert severity="success" sx={{ mb: 1, py: 0.5 }} icon={false}>
                                        Éditeur enrichi actif. Vous pouvez insérer des tableaux ou <strong>coller directement depuis Word / Excel</strong> (Ctrl+V) — la mise en forme sera préservée.
                                    </Alert>
                                    <RichTextEditor
                                        value={formData.result_template || ''}
                                        onChange={val => setFormData(prev => ({ ...prev, result_template: val }))}
                                        placeholder="Saisissez ou collez le template de résultat depuis Word..."
                                        minHeight={200}
                                        withTable
                                    />
                                </>
                            ) : (
                                <>
                                    <Typography variant="subtitle2" gutterBottom>Template de résultat (tests simples)</Typography>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={3}
                                        size="small"
                                        placeholder="Ex: Positif / Negatif&#10;Sensible / Résistant&#10;Présence / Absence"
                                        value={formData.result_template || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, result_template: e.target.value }))}
                                        helperText="Guide de saisie affiché au technicien lors de la saisie du résultat (laisser vide si test structuré avec paramètres ci-dessous)"
                                    />
                                </>
                            )}
                        </Box>

                        <Divider sx={{ mb: 2 }} />

                        <Box display="flex" justifyContent="flex-end" mb={1}>
                            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={addParameter}>Ajouter un parametre</Button>
                        </Box>
                        {parameters.length === 0 ? (
                            <Typography color="text.secondary" textAlign="center" py={4}>Aucun parametre - test simple</Typography>
                        ) : (
                            <Box sx={{ overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Code *</TableCell>
                                            <TableCell>Nom *</TableCell>
                                            <TableCell>Groupe</TableCell>
                                            <TableCell>Type</TableCell>
                                            <TableCell>Unite (Aff.)</TableCell>
                                            <TableCell>Unite (Base)</TableCell>
                                            <TableCell>Facteur</TableCell>
                                            <TableCell>Ref H (min-max)</TableCell>
                                            <TableCell>Ref F (min-max)</TableCell>
                                            <TableCell>Ref Gen. (min-max)</TableCell>
                                            <TableCell>Critique</TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {parameters.map((param, idx) => (
                                            <TableRow key={param._key || param.id || idx}>
                                                <TableCell><TextField size="small" value={param.code} required onChange={e => updateParameter(idx, 'code', e.target.value)} sx={{ width: 70 }} placeholder="WBC" /></TableCell>
                                                <TableCell><TextField size="small" value={param.name} required onChange={e => updateParameter(idx, 'name', e.target.value)} sx={{ width: 130 }} placeholder="Globules Blancs" /></TableCell>
                                                <TableCell><TextField size="small" value={param.group_name} onChange={e => updateParameter(idx, 'group_name', e.target.value)} sx={{ width: 100 }} placeholder="Hemogramme" /></TableCell>
                                                <TableCell>
                                                    <TextField select size="small" value={param.value_type} onChange={e => updateParameter(idx, 'value_type', e.target.value)} sx={{ width: 110 }}>
                                                        {VALUE_TYPES.map(vt => <MenuItem key={vt.value} value={vt.value}>{vt.label}</MenuItem>)}
                                                    </TextField>
                                                </TableCell>
                                                <TableCell><TextField size="small" value={param.unit} onChange={e => updateParameter(idx, 'unit', e.target.value)} sx={{ width: 70 }} placeholder="mg/dL" /></TableCell>
                                                <TableCell><TextField size="small" value={param.base_unit} onChange={e => updateParameter(idx, 'base_unit', e.target.value)} sx={{ width: 70 }} placeholder="mmol/L" /></TableCell>
                                                <TableCell><TextField size="small" type="number" value={param.conversion_factor} onChange={e => updateParameter(idx, 'conversion_factor', e.target.value)} sx={{ width: 80 }} inputProps={{ step: "0.0001" }} /></TableCell>
                                                <TableCell><RefRangeCell param={param} idx={idx} minField="adult_ref_min_male" maxField="adult_ref_max_male" /></TableCell>
                                                <TableCell><RefRangeCell param={param} idx={idx} minField="adult_ref_min_female" maxField="adult_ref_max_female" /></TableCell>
                                                <TableCell><RefRangeCell param={param} idx={idx} minField="adult_ref_min_general" maxField="adult_ref_max_general" /></TableCell>
                                                <TableCell>
                                                    <Box display="flex" gap={0.5} alignItems="center">
                                                        <TextField size="small" type="number" value={param.critical_low} onChange={e => updateParameter(idx, 'critical_low', e.target.value)} sx={{ width: 60 }} placeholder="bas" />
                                                        <Typography variant="caption">-</Typography>
                                                        <TextField size="small" type="number" value={param.critical_high} onChange={e => updateParameter(idx, 'critical_high', e.target.value)} sx={{ width: 60 }} placeholder="haut" />
                                                    </Box>
                                                </TableCell>
                                                <TableCell><IconButton size="small" color="error" onClick={() => removeParameter(idx)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={loading}>Annuler</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : (test ? 'Enregistrer' : 'Creer')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default LabTestFormModal;
