import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    TextField,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    InputAdornment,
    Paper,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Restaurant as FastingIcon,
    CheckCircle as ActiveIcon,
    Cancel as InactiveIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';
import LabTestFormModal from './LabTestFormModal';

const LabTestCatalog = () => {
    const { t } = useTranslation();
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(false);
    const [tests, setTests] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    // Form modal state
    const [formOpen, setFormOpen] = useState(false);
    const [editingTest, setEditingTest] = useState(null);

    // Delete confirmation
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingTest, setDeletingTest] = useState(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchTests();
    }, [search, categoryFilter]);

    const fetchCategories = async () => {
        try {
            const data = await laboratoryAPI.getCategories();
            setCategories(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchTests = async () => {
        setLoading(true);
        try {
            const params = { search };
            if (categoryFilter) params.category = categoryFilter;
            const data = await laboratoryAPI.getTests(params);
            setTests(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error('Error fetching tests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNewTest = () => {
        setEditingTest(null);
        setFormOpen(true);
    };

    const handleEditTest = (test) => {
        setEditingTest(test);
        setFormOpen(true);
    };

    const handleDeleteClick = (test) => {
        setDeletingTest(test);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deletingTest) return;
        try {
            await laboratoryAPI.deleteTest(deletingTest.id);
            enqueueSnackbar('Test supprimé', { variant: 'success' });
            fetchTests();
        } catch (error) {
            enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
        } finally {
            setDeleteDialogOpen(false);
            setDeletingTest(null);
        }
    };

    const handleFormSaved = () => {
        fetchTests();
        fetchCategories();
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                    Catalogue des Examens
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleNewTest}
                    sx={{ borderRadius: 2 }}
                >
                    Nouveau Test
                </Button>
            </Box>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={8}>
                            <TextField
                                fullWidth
                                placeholder="Rechercher un examen..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth select
                                label="Catégorie"
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                size="small"
                            >
                                <MenuItem value="">Toutes les catégories</MenuItem>
                                {categories.map(cat => (
                                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Code</TableCell>
                            <TableCell>Nom</TableCell>
                            <TableCell>Catégorie</TableCell>
                            <TableCell>Prix (XAF)</TableCell>
                            <TableCell>Échantillon</TableCell>
                            <TableCell align="center">Jeûne</TableCell>
                            <TableCell align="center">Statut</TableCell>
                            <TableCell>Délai</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={9} align="center">Chargement...</TableCell></TableRow>
                        ) : tests.length === 0 ? (
                            <TableRow><TableCell colSpan={9} align="center">Aucun examen trouvé</TableCell></TableRow>
                        ) : (
                            tests.map((test) => (
                                <TableRow key={test.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="600">{test.test_code}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="500">{test.name}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={test.category_name} size="small" />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="600">
                                            {test.price ? new Intl.NumberFormat('fr-FR').format(test.price) : '-'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{test.sample_type || '-'}</Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        {test.fasting_required && (
                                            <FastingIcon color="warning" fontSize="small" titleAccess="Jeûne requis" />
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        {test.is_active ? (
                                            <Chip label="Actif" size="small" color="success" variant="outlined" />
                                        ) : (
                                            <Chip label="Inactif" size="small" color="default" variant="outlined" />
                                        )}
                                    </TableCell>
                                    <TableCell>{test.estimated_turnaround_hours ? `${test.estimated_turnaround_hours}h` : '-'}</TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => handleEditTest(test)} title="Modifier">
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" onClick={() => handleDeleteClick(test)} title="Supprimer" color="error">
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Form Modal */}
            <LabTestFormModal
                open={formOpen}
                onClose={() => setFormOpen(false)}
                test={editingTest}
                onSaved={handleFormSaved}
            />

            {/* Delete Confirmation */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Confirmer la suppression</DialogTitle>
                <DialogContent>
                    <Typography>
                        Voulez-vous vraiment supprimer le test <strong>{deletingTest?.name}</strong> ?
                        Cette action est irréversible.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
                    <Button color="error" variant="contained" onClick={handleDeleteConfirm}>Supprimer</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default LabTestCatalog;
