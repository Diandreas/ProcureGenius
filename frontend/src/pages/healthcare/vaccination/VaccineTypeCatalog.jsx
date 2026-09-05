import React, { useState, useEffect } from 'react';
import {
    Box, Button, Card, CardContent, Grid, TextField, Typography, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, InputAdornment,
    MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox,
} from '@mui/material';
import {
    Add as AddIcon, Search as SearchIcon, Edit as EditIcon, Delete as DeleteIcon,
    CheckCircle as ActiveIcon, Cancel as InactiveIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import vaccinationAPI from '../../../services/vaccinationAPI';

const TARGET_POPULATION_OPTIONS = [
    { value: 'child', label: 'Enfant (PEV)' },
    { value: 'pregnant_woman', label: 'Femme enceinte' },
    { value: 'adult', label: 'Adulte' },
    { value: 'traveler', label: 'Voyageur' },
    { value: 'other', label: 'Autre' },
];

const EMPTY_VACCINE = {
    name: '', code: '', category: '', target_population: 'child',
    is_billable: false, price: '', standard_doses_count: '', dose_interval_days: '',
    description: '', is_active: true,
};

const VaccineTypeCatalog = () => {
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(false);
    const [vaccineTypes, setVaccineTypes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const [formOpen, setFormOpen] = useState(false);
    const [formData, setFormData] = useState(EMPTY_VACCINE);
    const [editingId, setEditingId] = useState(null);

    const [newCategoryName, setNewCategoryName] = useState('');
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingVaccine, setDeletingVaccine] = useState(null);

    useEffect(() => { fetchCategories(); }, []);
    useEffect(() => { fetchVaccineTypes(); }, [search, categoryFilter]);

    const fetchCategories = async () => {
        try {
            const data = await vaccinationAPI.getCategories();
            setCategories(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchVaccineTypes = async () => {
        setLoading(true);
        try {
            const params = { search };
            if (categoryFilter) params.category = categoryFilter;
            const data = await vaccinationAPI.getVaccineTypes(params);
            setVaccineTypes(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error('Error fetching vaccine types:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateForm = () => { setFormData(EMPTY_VACCINE); setEditingId(null); setFormOpen(true); };
    const openEditForm = (vaccine) => {
        setFormData({
            name: vaccine.name, code: vaccine.code || '', category: vaccine.category || '',
            target_population: vaccine.target_population, is_billable: vaccine.is_billable,
            price: vaccine.price, standard_doses_count: vaccine.standard_doses_count || '',
            dose_interval_days: vaccine.dose_interval_days || '',
            description: vaccine.description || '', is_active: vaccine.is_active,
        });
        setEditingId(vaccine.id);
        setFormOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name) {
            enqueueSnackbar('Le nom est requis', { variant: 'warning' });
            return;
        }
        if (formData.is_billable && !formData.price) {
            enqueueSnackbar('Prix requis pour un vaccin facturable', { variant: 'warning' });
            return;
        }
        try {
            const payload = {
                ...formData,
                price: formData.is_billable ? formData.price : 0,
                category: formData.category || null,
                standard_doses_count: formData.standard_doses_count === '' ? null : formData.standard_doses_count,
                dose_interval_days: formData.dose_interval_days === '' ? null : formData.dose_interval_days,
            };
            if (editingId) {
                await vaccinationAPI.updateVaccineType(editingId, payload);
                enqueueSnackbar('Vaccin mis à jour', { variant: 'success' });
            } else {
                await vaccinationAPI.createVaccineType(payload);
                enqueueSnackbar('Vaccin créé', { variant: 'success' });
            }
            setFormOpen(false);
            fetchVaccineTypes();
        } catch (error) {
            console.error('Error saving vaccine type:', error);
            enqueueSnackbar('Erreur lors de l\'enregistrement', { variant: 'error' });
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            const cat = await vaccinationAPI.createCategory({ name: newCategoryName.trim() });
            setCategories(prev => [...prev, cat]);
            setFormData(prev => ({ ...prev, category: cat.id }));
            setNewCategoryName('');
            setCategoryDialogOpen(false);
            enqueueSnackbar('Catégorie créée', { variant: 'success' });
        } catch (error) {
            console.error('Error creating category:', error);
            enqueueSnackbar('Erreur lors de la création de la catégorie', { variant: 'error' });
        }
    };

    const confirmDelete = (vaccine) => { setDeletingVaccine(vaccine); setDeleteDialogOpen(true); };
    const handleDelete = async () => {
        try {
            await vaccinationAPI.deleteVaccineType(deletingVaccine.id);
            enqueueSnackbar('Vaccin supprimé', { variant: 'success' });
            setDeleteDialogOpen(false);
            fetchVaccineTypes();
        } catch (error) {
            const msg = error?.response?.data?.detail || 'Erreur lors de la suppression';
            enqueueSnackbar(msg, { variant: 'error' });
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Typography variant="h4" fontWeight={700}>Catalogue Vaccins</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>Nouveau Vaccin</Button>
            </Box>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth size="small" placeholder="Rechercher un vaccin..."
                                value={search} onChange={(e) => setSearch(e.target.value)}
                                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth size="small" select label="Catégorie"
                                value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                <MenuItem value="">Toutes les catégories</MenuItem>
                                {categories.map((cat) => <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>)}
                            </TextField>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <TableContainer component={Card}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nom</TableCell>
                            <TableCell>Population</TableCell>
                            <TableCell>Catégorie</TableCell>
                            <TableCell>Facturation</TableCell>
                            <TableCell>Statut</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {vaccineTypes.map((vaccine) => (
                            <TableRow key={vaccine.id} hover>
                                <TableCell>{vaccine.name}</TableCell>
                                <TableCell><Chip label={vaccine.target_population_display} size="small" variant="outlined" /></TableCell>
                                <TableCell>{vaccine.category_name || '—'}</TableCell>
                                <TableCell>{vaccine.is_billable ? `${vaccine.price} XAF` : 'Gratuit'}</TableCell>
                                <TableCell>
                                    <Chip
                                        icon={vaccine.is_active ? <ActiveIcon /> : <InactiveIcon />}
                                        label={vaccine.is_active ? 'Actif' : 'Inactif'}
                                        color={vaccine.is_active ? 'success' : 'default'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" onClick={() => openEditForm(vaccine)}><EditIcon fontSize="small" /></IconButton>
                                    <IconButton size="small" color="error" onClick={() => confirmDelete(vaccine)}><DeleteIcon fontSize="small" /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!loading && vaccineTypes.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    Aucun vaccin. Créez-en un pour commencer.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Formulaire création/édition */}
            <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingId ? 'Modifier le vaccin' : 'Nouveau vaccin'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Nom du vaccin *" value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth label="Code" value={formData.code}
                                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth select label="Population cible" value={formData.target_population}
                                onChange={(e) => setFormData(prev => ({ ...prev, target_population: e.target.value }))}>
                                {TARGET_POPULATION_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid item xs={8}>
                            <TextField fullWidth select label="Catégorie" value={formData.category}
                                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}>
                                <MenuItem value="">Aucune</MenuItem>
                                {categories.map((cat) => <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid item xs={4}>
                            <Button fullWidth variant="outlined" sx={{ height: '100%' }} onClick={() => setCategoryDialogOpen(true)}>
                                + Catégorie
                            </Button>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={formData.is_billable}
                                        onChange={(e) => setFormData(prev => ({ ...prev, is_billable: e.target.checked }))}
                                    />
                                }
                                label="Vaccin facturable (décoché = gratuit, ex: PEV officiel)"
                            />
                        </Grid>
                        {formData.is_billable && (
                            <Grid item xs={6}>
                                <TextField fullWidth type="number" label="Prix (XAF) *" value={formData.price}
                                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))} />
                            </Grid>
                        )}
                        <Grid item xs={formData.is_billable ? 6 : 12} sm={6}>
                            <TextField fullWidth type="number" label="Nombre de doses du schéma" value={formData.standard_doses_count}
                                onChange={(e) => setFormData(prev => ({ ...prev, standard_doses_count: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth type="number" label="Intervalle entre doses (jours)" value={formData.dose_interval_days}
                                onChange={(e) => setFormData(prev => ({ ...prev, dose_interval_days: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth multiline rows={2} label="Description" value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFormOpen(false)}>Annuler</Button>
                    <Button variant="contained" onClick={handleSave}>Enregistrer</Button>
                </DialogActions>
            </Dialog>

            {/* Création rapide de catégorie */}
            <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Nouvelle catégorie</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth autoFocus label="Nom de la catégorie" value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)} sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCategoryDialogOpen(false)}>Annuler</Button>
                    <Button variant="contained" onClick={handleCreateCategory}>Créer</Button>
                </DialogActions>
            </Dialog>

            {/* Confirmation suppression */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Supprimer le vaccin</DialogTitle>
                <DialogContent>
                    <Typography>Confirmer la suppression de "{deletingVaccine?.name}" ?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
                    <Button color="error" variant="contained" onClick={handleDelete}>Supprimer</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default VaccineTypeCatalog;
