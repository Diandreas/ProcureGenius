import React, { useState, useEffect } from 'react';
import {
    Box, Button, Card, CardContent, Grid, TextField, Typography, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, InputAdornment,
    MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Divider,
} from '@mui/material';
import {
    Add as AddIcon, Search as SearchIcon, Edit as EditIcon, Delete as DeleteIcon,
    CheckCircle as ActiveIcon, Cancel as InactiveIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import imagingAPI from '../../../services/imagingAPI';

const MODALITY_OPTIONS = [
    { value: 'xray', label: 'Radio' },
    { value: 'ultrasound', label: 'Échographie' },
    { value: 'ct', label: 'Scanner' },
    { value: 'mri', label: 'IRM' },
    { value: 'other', label: 'Autre' },
];

const EMPTY_EXAM = { name: '', exam_code: '', short_name: '', category: '', modality: 'other', price: '', discount: 0, description: '', is_active: true };

const ImagingExamCatalog = () => {
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(false);
    const [examTypes, setExamTypes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const [formOpen, setFormOpen] = useState(false);
    const [formData, setFormData] = useState(EMPTY_EXAM);
    const [editingId, setEditingId] = useState(null);

    const [newCategoryName, setNewCategoryName] = useState('');
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingExam, setDeletingExam] = useState(null);

    useEffect(() => { fetchCategories(); }, []);
    useEffect(() => { fetchExamTypes(); }, [search, categoryFilter]);

    const fetchCategories = async () => {
        try {
            const data = await imagingAPI.getCategories();
            setCategories(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchExamTypes = async () => {
        setLoading(true);
        try {
            const params = { search };
            if (categoryFilter) params.category = categoryFilter;
            const data = await imagingAPI.getExamTypes(params);
            setExamTypes(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error('Error fetching exam types:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateForm = () => { setFormData(EMPTY_EXAM); setEditingId(null); setFormOpen(true); };
    const openEditForm = (exam) => {
        setFormData({
            name: exam.name, exam_code: exam.exam_code || '', short_name: exam.short_name || '',
            category: exam.category || '', modality: exam.modality, price: exam.price,
            discount: exam.discount || 0, description: exam.description || '', is_active: exam.is_active,
        });
        setEditingId(exam.id);
        setFormOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.price) {
            enqueueSnackbar('Nom et prix sont requis', { variant: 'warning' });
            return;
        }
        try {
            if (editingId) {
                await imagingAPI.updateExamType(editingId, formData);
                enqueueSnackbar('Examen mis à jour', { variant: 'success' });
            } else {
                await imagingAPI.createExamType(formData);
                enqueueSnackbar('Examen créé', { variant: 'success' });
            }
            setFormOpen(false);
            fetchExamTypes();
        } catch (error) {
            console.error('Error saving exam type:', error);
            enqueueSnackbar('Erreur lors de l\'enregistrement', { variant: 'error' });
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            const cat = await imagingAPI.createCategory({ name: newCategoryName.trim() });
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

    const confirmDelete = (exam) => { setDeletingExam(exam); setDeleteDialogOpen(true); };
    const handleDelete = async () => {
        try {
            await imagingAPI.deleteExamType(deletingExam.id);
            enqueueSnackbar('Examen supprimé', { variant: 'success' });
            setDeleteDialogOpen(false);
            fetchExamTypes();
        } catch (error) {
            const msg = error?.response?.data?.detail || 'Erreur lors de la suppression';
            enqueueSnackbar(msg, { variant: 'error' });
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Typography variant="h4" fontWeight={700}>Catalogue Examens d'Imagerie</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>Nouvel Examen</Button>
            </Box>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth size="small" placeholder="Rechercher un examen..."
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
                            <TableCell>Code</TableCell>
                            <TableCell>Modalité</TableCell>
                            <TableCell>Catégorie</TableCell>
                            <TableCell>Prix</TableCell>
                            <TableCell>Statut</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {examTypes.map((exam) => (
                            <TableRow key={exam.id} hover>
                                <TableCell>{exam.name}</TableCell>
                                <TableCell>{exam.exam_code || '—'}</TableCell>
                                <TableCell><Chip label={exam.modality_display || exam.modality} size="small" variant="outlined" /></TableCell>
                                <TableCell>{exam.category_name || '—'}</TableCell>
                                <TableCell>{exam.price} XAF</TableCell>
                                <TableCell>
                                    <Chip
                                        icon={exam.is_active ? <ActiveIcon /> : <InactiveIcon />}
                                        label={exam.is_active ? 'Actif' : 'Inactif'}
                                        color={exam.is_active ? 'success' : 'default'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" onClick={() => openEditForm(exam)}><EditIcon fontSize="small" /></IconButton>
                                    <IconButton size="small" color="error" onClick={() => confirmDelete(exam)}><DeleteIcon fontSize="small" /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!loading && examTypes.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    Aucun examen. Créez-en un pour commencer.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Formulaire création/édition */}
            <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingId ? 'Modifier l\'examen' : 'Nouvel examen d\'imagerie'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Nom de l'examen *" value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth label="Code" value={formData.exam_code}
                                onChange={(e) => setFormData(prev => ({ ...prev, exam_code: e.target.value }))} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth select label="Modalité" value={formData.modality}
                                onChange={(e) => setFormData(prev => ({ ...prev, modality: e.target.value }))}>
                                {MODALITY_OPTIONS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
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
                        <Grid item xs={6}>
                            <TextField fullWidth type="number" label="Prix (XAF) *" value={formData.price}
                                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth type="number" label="Réduction (XAF)" value={formData.discount}
                                onChange={(e) => setFormData(prev => ({ ...prev, discount: e.target.value }))} />
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
                <DialogTitle>Supprimer l'examen</DialogTitle>
                <DialogContent>
                    <Typography>Confirmer la suppression de "{deletingExam?.name}" ?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
                    <Button color="error" variant="contained" onClick={handleDelete}>Supprimer</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ImagingExamCatalog;
