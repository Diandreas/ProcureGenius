import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    MenuItem,
    FormControlLabel,
    Checkbox,
    Typography,
    Box,
    IconButton,
    CircularProgress,
    Divider
} from '@mui/material';
import { Close as CloseIcon, Add as AddIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';

const SAMPLE_TYPES = [
    { value: 'blood', label: 'Sang' },
    { value: 'urine', label: 'Urine' },
    { value: 'stool', label: 'Selles' },
    { value: 'csf', label: 'LCR' },
    { value: 'sputum', label: 'Crachat' },
    { value: 'swab', label: 'Écouvillon' },
    { value: 'tissue', label: 'Tissu' },
    { value: 'other', label: 'Autre' },
];

const CONTAINER_TYPES = [
    { value: 'edta', label: 'EDTA (violet)' },
    { value: 'serum', label: 'Sérum (rouge)' },
    { value: 'citrate', label: 'Citrate (bleu)' },
    { value: 'heparin', label: 'Héparine (vert)' },
    { value: 'fluoride', label: 'Fluorure (gris)' },
    { value: 'urine_cup', label: 'Pot à urine' },
    { value: 'stool_cup', label: 'Pot à selles' },
    { value: 'swab_tube', label: 'Tube écouvillon' },
    { value: 'other', label: 'Autre' },
];

const LabTestFormModal = ({ open, onClose, test, onSaved }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [showNewCategory, setShowNewCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);

    const [formData, setFormData] = useState({
        test_code: '',
        name: '',
        short_name: '',
        category: '',
        description: '',
        price: '',
        sample_type: 'blood',
        container_type: 'serum',
        sample_volume: '',
        normal_range_general: '',
        normal_range_male: '',
        normal_range_female: '',
        normal_range_child: '',
        unit_of_measurement: '',
        fasting_required: false,
        fasting_hours: '',
        preparation_instructions: '',
        estimated_turnaround_hours: '',
        methodology: '',
        is_active: true,
        requires_approval: false,
    });

    useEffect(() => {
        if (open) {
            fetchCategories();
            if (test) {
                setFormData({
                    test_code: test.test_code || '',
                    name: test.name || '',
                    short_name: test.short_name || '',
                    category: test.category || '',
                    description: test.description || '',
                    price: test.price || '',
                    sample_type: test.sample_type || 'blood',
                    container_type: test.container_type || 'serum',
                    sample_volume: test.sample_volume || '',
                    normal_range_general: test.normal_range_general || '',
                    normal_range_male: test.normal_range_male || '',
                    normal_range_female: test.normal_range_female || '',
                    normal_range_child: test.normal_range_child || '',
                    unit_of_measurement: test.unit_of_measurement || '',
                    fasting_required: test.fasting_required || false,
                    fasting_hours: test.fasting_hours || '',
                    preparation_instructions: test.preparation_instructions || '',
                    estimated_turnaround_hours: test.estimated_turnaround_hours || '',
                    methodology: test.methodology || '',
                    is_active: test.is_active !== undefined ? test.is_active : true,
                    requires_approval: test.requires_approval || false,
                });
            } else {
                setFormData(prev => ({
                    ...prev,
                    test_code: '',
                    name: '',
                    short_name: '',
                    category: '',
                    description: '',
                    price: '',
                    sample_type: 'blood',
                    container_type: 'serum',
                    sample_volume: '',
                    normal_range_general: '',
                    normal_range_male: '',
                    normal_range_female: '',
                    normal_range_child: '',
                    unit_of_measurement: '',
                    fasting_required: false,
                    fasting_hours: '',
                    preparation_instructions: '',
                    estimated_turnaround_hours: '',
                    methodology: '',
                    is_active: true,
                    requires_approval: false,
                }));
            }
        }
    }, [open, test]);

    const fetchCategories = async () => {
        try {
            const data = await laboratoryAPI.getCategories();
            setCategories(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        setCreatingCategory(true);
        try {
            const newCat = await laboratoryAPI.createCategory({ name: newCategoryName.trim(), is_active: true });
            setCategories(prev => [...prev, newCat]);
            setFormData(prev => ({ ...prev, category: newCat.id }));
            setNewCategoryName('');
            setShowNewCategory(false);
            enqueueSnackbar('Catégorie créée', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar('Erreur lors de la création de la catégorie', { variant: 'error' });
        } finally {
            setCreatingCategory(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.test_code || !formData.category) {
            enqueueSnackbar('Veuillez remplir les champs obligatoires (Code, Nom, Catégorie)', { variant: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const payload = { ...formData };
            // Convert numeric fields
            if (payload.price) payload.price = parseFloat(payload.price);
            if (payload.fasting_hours) payload.fasting_hours = parseInt(payload.fasting_hours);
            if (payload.estimated_turnaround_hours) payload.estimated_turnaround_hours = parseInt(payload.estimated_turnaround_hours);
            if (payload.sample_volume) payload.sample_volume = parseFloat(payload.sample_volume);

            if (test) {
                await laboratoryAPI.updateTest(test.id, payload);
                enqueueSnackbar('Test modifié avec succès', { variant: 'success' });
            } else {
                await laboratoryAPI.createTest(payload);
                enqueueSnackbar('Test créé avec succès', { variant: 'success' });
            }
            onSaved?.();
            onClose();
        } catch (error) {
            console.error('Error saving test:', error);
            enqueueSnackbar(
                error?.response?.data?.detail || 'Erreur lors de l\'enregistrement',
                { variant: 'error' }
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {test ? 'Modifier le Test' : 'Nouveau Test Laboratoire'}
                <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    {/* Identification */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" color="primary" gutterBottom>Identification</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth required label="Code" name="test_code" value={formData.test_code} onChange={handleChange} size="small" />
                    </Grid>
                    <Grid item xs={12} sm={8}>
                        <TextField fullWidth required label="Nom complet" name="name" value={formData.name} onChange={handleChange} size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Nom abrégé" name="short_name" value={formData.short_name} onChange={handleChange} size="small" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        {!showNewCategory ? (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField
                                    fullWidth required select label="Catégorie" name="category"
                                    value={formData.category} onChange={handleChange} size="small"
                                >
                                    {categories.map(cat => (
                                        <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                                    ))}
                                </TextField>
                                <IconButton onClick={() => setShowNewCategory(true)} color="primary" size="small" title="Nouvelle catégorie">
                                    <AddIcon />
                                </IconButton>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField
                                    fullWidth label="Nouvelle catégorie" value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)} size="small"
                                />
                                <Button variant="contained" size="small" onClick={handleCreateCategory} disabled={creatingCategory}>
                                    {creatingCategory ? <CircularProgress size={20} /> : 'OK'}
                                </Button>
                                <Button size="small" onClick={() => setShowNewCategory(false)}>Annuler</Button>
                            </Box>
                        )}
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <TextField fullWidth label="Prix (XAF)" name="price" value={formData.price} onChange={handleChange} size="small" type="number" />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth multiline rows={2} label="Description" name="description" value={formData.description} onChange={handleChange} size="small" />
                    </Grid>

                    {/* Échantillon */}
                    <Grid item xs={12}><Divider /><Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>Échantillon</Typography></Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth select label="Type d'échantillon" name="sample_type" value={formData.sample_type} onChange={handleChange} size="small">
                            {SAMPLE_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth select label="Type de tube" name="container_type" value={formData.container_type} onChange={handleChange} size="small">
                            {CONTAINER_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Volume (mL)" name="sample_volume" value={formData.sample_volume} onChange={handleChange} size="small" type="number" />
                    </Grid>

                    {/* Valeurs de référence */}
                    <Grid item xs={12}><Divider /><Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>Valeurs de Référence</Typography></Grid>
                    <Grid item xs={12} sm={3}>
                        <TextField fullWidth label="Général" name="normal_range_general" value={formData.normal_range_general} onChange={handleChange} size="small" placeholder="ex: 4.5-11.0" />
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
                        <TextField fullWidth label="Unité de mesure" name="unit_of_measurement" value={formData.unit_of_measurement} onChange={handleChange} size="small" placeholder="ex: g/dL, mmol/L" />
                    </Grid>

                    {/* Préparation */}
                    <Grid item xs={12}><Divider /><Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>Préparation Patient</Typography></Grid>
                    <Grid item xs={12} sm={4}>
                        <FormControlLabel
                            control={<Checkbox checked={formData.fasting_required} onChange={handleChange} name="fasting_required" />}
                            label="Jeûne requis"
                        />
                    </Grid>
                    {formData.fasting_required && (
                        <Grid item xs={12} sm={4}>
                            <TextField fullWidth label="Durée jeûne (heures)" name="fasting_hours" value={formData.fasting_hours} onChange={handleChange} size="small" type="number" />
                        </Grid>
                    )}
                    <Grid item xs={12}>
                        <TextField fullWidth multiline rows={2} label="Instructions de préparation" name="preparation_instructions" value={formData.preparation_instructions} onChange={handleChange} size="small" />
                    </Grid>

                    {/* Traitement */}
                    <Grid item xs={12}><Divider /><Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>Traitement</Typography></Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Délai d'exécution (heures)" name="estimated_turnaround_hours" value={formData.estimated_turnaround_hours} onChange={handleChange} size="small" type="number" />
                    </Grid>
                    <Grid item xs={12} sm={8}>
                        <TextField fullWidth label="Méthodologie" name="methodology" value={formData.methodology} onChange={handleChange} size="small" />
                    </Grid>

                    {/* Options */}
                    <Grid item xs={12}><Divider /></Grid>
                    <Grid item xs={12} sm={4}>
                        <FormControlLabel
                            control={<Checkbox checked={formData.is_active} onChange={handleChange} name="is_active" />}
                            label="Actif"
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <FormControlLabel
                            control={<Checkbox checked={formData.requires_approval} onChange={handleChange} name="requires_approval" />}
                            label="Nécessite approbation"
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={loading}>Annuler</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : (test ? 'Enregistrer' : 'Créer')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default LabTestFormModal;
