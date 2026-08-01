import React, { useState, useEffect } from 'react';
import {
    Box, Button, Card, CardContent, Grid, TextField, Typography,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    MenuItem, Autocomplete, Divider, Stack, Chip, InputAdornment,
} from '@mui/material';
import { Search as SearchIcon, Save as SaveIcon, Add as AddIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import imagingAPI from '../../../services/imagingAPI';
import laboratoryAPI from '../../../services/laboratoryAPI';
import patientAPI from '../../../services/patientAPI';
import QuickClientCreateModal from '../laboratory/components/QuickClientCreateModal';

const ImagingOrderForm = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(false);
    const [patients, setPatients] = useState([]);
    const [examTypes, setExamTypes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [prescribers, setPrescribers] = useState([]);
    const [subcontractors, setSubcontractors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [openClientModal, setOpenClientModal] = useState(false);

    const [formData, setFormData] = useState({
        patient: null,
        prescriber: null,
        subcontractor: null,
        priority: 'routine',
        exam_types: [],
        clinical_notes: '',
        payment_method: 'cash',
    });

    useEffect(() => {
        const initializeForm = async () => {
            await fetchOptions();
            const preselectedPatientId = searchParams.get('patientId');
            if (preselectedPatientId) {
                try {
                    const patientData = await patientAPI.getPatient(preselectedPatientId);
                    setFormData(prev => ({ ...prev, patient: patientData }));
                } catch (error) {
                    console.error('Error loading preselected patient:', error);
                }
            }
        };
        initializeForm();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchOptions = async () => {
        try {
            const [patData, examData, catData, prescriberData, subData] = await Promise.all([
                patientAPI.getPatients({ page_size: 1000 }),
                imagingAPI.getExamTypes({ page_size: 1000 }),
                imagingAPI.getCategories(),
                laboratoryAPI.getPrescribers({ active_only: true }),
                laboratoryAPI.getSubcontractors({ active_only: 'true' }),
            ]);
            setPatients(patData.results || patData || []);
            setExamTypes(examData.results || examData || []);
            setCategories(catData.results || catData || []);
            setPrescribers(Array.isArray(prescriberData) ? prescriberData : prescriberData.results || []);
            setSubcontractors(Array.isArray(subData) ? subData : subData.results || []);
        } catch (error) {
            console.error('Error fetching options:', error);
            enqueueSnackbar('Erreur lors du chargement des données', { variant: 'error' });
        }
    };

    const handleClientCreated = (newPatient) => {
        setPatients(prev => [newPatient, ...prev]);
        setFormData(prev => ({ ...prev, patient: newPatient }));
    };

    const filteredExamTypes = examTypes.filter(exam => {
        const matchesSearch = !searchTerm ||
            exam.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exam.exam_code?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !categoryFilter || exam.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const handleExamToggle = (exam) => {
        const isSelected = formData.exam_types.some(e => e.id === exam.id);
        if (isSelected) {
            setFormData(prev => ({ ...prev, exam_types: prev.exam_types.filter(e => e.id !== exam.id) }));
        } else {
            setFormData(prev => ({ ...prev, exam_types: [...prev.exam_types, exam] }));
        }
    };

    const calculateTotal = () => {
        return formData.exam_types.reduce((sum, e) => sum + (parseFloat(e.price) || 0) - (parseFloat(e.discount) || 0), 0);
    };

    const handleSubmit = async () => {
        if (!formData.patient) {
            enqueueSnackbar('Veuillez sélectionner un patient', { variant: 'warning' });
            return;
        }
        if (formData.exam_types.length === 0) {
            enqueueSnackbar('Veuillez sélectionner au moins un examen', { variant: 'warning' });
            return;
        }

        // Les commandes sous-traitées passent par le dépôt groupé (facture consolidée automatique)
        if (formData.subcontractor?.id) {
            enqueueSnackbar(
                'Pour une commande sous-traitée, utilisez la page "Dépôt sous-traitance" afin que la facture soit générée automatiquement.',
                { variant: 'warning', autoHideDuration: 6000 }
            );
            navigate('/healthcare/imaging/subcontractors/batch-order');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                patient_id: formData.patient.id,
                prescriber_id: formData.prescriber?.id || null,
                subcontractor_id: null,
                priority: formData.priority,
                clinical_notes: formData.clinical_notes || '',
                payment_method: formData.payment_method || 'cash',
                exam_type_ids: formData.exam_types.map(e => e.id),
            };

            const newOrder = await imagingAPI.createOrder(payload);
            enqueueSnackbar('Commande d\'imagerie créée avec succès', { variant: 'success' });
            navigate(`/healthcare/imaging/${newOrder.id}`);
        } catch (error) {
            console.error('Error creating imaging order:', error);
            const errorMessage = error?.response?.data?.detail || error?.response?.data?.error ||
                'Erreur lors de la création de la commande d\'imagerie';
            enqueueSnackbar(errorMessage, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/healthcare/imaging')}>
                        Retour
                    </Button>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                        Nouvelle Commande d'Imagerie
                    </Typography>
                </Stack>
                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSubmit}
                    disabled={loading}
                    sx={{ borderRadius: 2 }}
                    size="large"
                >
                    Créer la Commande
                </Button>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Autocomplete
                                    fullWidth
                                    options={patients}
                                    getOptionLabel={(option) => `${option.name} (${option.patient_number})`}
                                    value={formData.patient}
                                    onChange={(e, v) => setFormData(prev => ({ ...prev, patient: v }))}
                                    renderInput={(params) => <TextField {...params} label="Rechercher Patient" required />}
                                />
                                <Button
                                    variant="outlined"
                                    sx={{ minWidth: 40, width: 40, height: 56, p: 0 }}
                                    onClick={() => setOpenClientModal(true)}
                                >
                                    <AddIcon />
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>

                    <QuickClientCreateModal
                        open={openClientModal}
                        onClose={() => setOpenClientModal(false)}
                        onSuccess={handleClientCreated}
                    />

                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Prescripteur</Typography>
                            <Autocomplete
                                options={prescribers}
                                getOptionLabel={(option) =>
                                    `${option.full_name || `Dr ${option.last_name} ${option.first_name}`}${option.clinic_name ? ` – ${option.clinic_name}` : ''}`
                                }
                                value={formData.prescriber}
                                onChange={(_, v) => setFormData(prev => ({ ...prev, prescriber: v }))}
                                renderInput={(params) => (
                                    <TextField {...params} label="Prescripteur (optionnel)" size="small" fullWidth />
                                )}
                                isOptionEqualToValue={(a, b) => a.id === b.id}
                            />

                            {subcontractors.length > 0 && (
                                <>
                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="h6" gutterBottom>Sous-traitance</Typography>
                                    <Autocomplete
                                        options={[{ id: null, name: 'Réalisé en interne' }, ...subcontractors]}
                                        getOptionLabel={(option) => option.name}
                                        value={formData.subcontractor || { id: null, name: 'Réalisé en interne' }}
                                        onChange={(_, v) => setFormData(prev => ({ ...prev, subcontractor: v?.id ? v : null }))}
                                        renderInput={(params) => (
                                            <TextField {...params} label="Partenaire imagerie" size="small" fullWidth
                                                helperText="Optionnel — laisser vide pour examen interne" />
                                        )}
                                        isOptionEqualToValue={(a, b) => a.id === b.id}
                                    />
                                    {formData.subcontractor && (
                                        <Chip size="small" label={`Sous-traité à ${formData.subcontractor.name}`} color="warning" sx={{ mt: 1 }} />
                                    )}
                                </>
                            )}

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="h6" gutterBottom>Priorité</Typography>
                            <TextField
                                fullWidth select
                                value={formData.priority}
                                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                            >
                                <MenuItem value="routine">Routine</MenuItem>
                                <MenuItem value="urgent">Urgente</MenuItem>
                                <MenuItem value="stat">STAT (Immédiat)</MenuItem>
                            </TextField>

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="h6" gutterBottom>Méthode de Paiement</Typography>
                            <TextField
                                fullWidth select
                                value={formData.payment_method}
                                onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                            >
                                <MenuItem value="cash">Espèces</MenuItem>
                                <MenuItem value="mobile_money">Mobile Money</MenuItem>
                                <MenuItem value="card">Carte Bancaire</MenuItem>
                                <MenuItem value="insurance">Assurance</MenuItem>
                                <MenuItem value="other">Autre</MenuItem>
                            </TextField>

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="h6" gutterBottom>Résumé</Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography>Examens sélectionnés:</Typography>
                                <Typography fontWeight="bold">{formData.exam_types.length}</Typography>
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                                <Typography variant="h6">Total:</Typography>
                                <Typography variant="h6" color="primary" fontWeight="bold">
                                    {new Intl.NumberFormat('fr-FR').format(calculateTotal())} XAF
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Indication clinique</Typography>
                            <TextField
                                fullWidth multiline rows={3}
                                value={formData.clinical_notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, clinical_notes: e.target.value }))}
                                placeholder="Motif de l'examen, contexte clinique..."
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Examens ({formData.exam_types.length} sélectionnés)</Typography>

                            <Grid container spacing={2} sx={{ mb: 2 }}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth size="small"
                                        placeholder="Rechercher un examen..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth size="small" select
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        label="Catégorie"
                                    >
                                        <MenuItem value="">Toutes les catégories</MenuItem>
                                        {categories.map((cat) => (
                                            <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                            </Grid>

                            <TableContainer sx={{ maxHeight: 450 }}>
                                <Table stickyHeader size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Examen</TableCell>
                                            <TableCell>Modalité</TableCell>
                                            <TableCell>Prix</TableCell>
                                            <TableCell align="center">Sélection</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredExamTypes.map((exam) => {
                                            const isSelected = formData.exam_types.some(e => e.id === exam.id);
                                            return (
                                                <TableRow
                                                    key={exam.id}
                                                    hover
                                                    onClick={() => handleExamToggle(exam)}
                                                    sx={{ cursor: 'pointer', backgroundColor: isSelected ? 'action.selected' : 'inherit' }}
                                                >
                                                    <TableCell>
                                                        <Typography fontWeight={isSelected ? 'bold' : 'normal'}>{exam.name}</Typography>
                                                        {exam.exam_code && (
                                                            <Typography variant="caption" color="text.secondary">{exam.exam_code}</Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip label={exam.modality_display || exam.modality} size="small" variant="outlined" />
                                                    </TableCell>
                                                    <TableCell>{exam.price} XAF</TableCell>
                                                    <TableCell align="center">
                                                        {isSelected ? <Chip label="✓" color="primary" size="small" /> : <Chip label="+" variant="outlined" size="small" />}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            {filteredExamTypes.length === 0 && (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography color="text.secondary">
                                        {examTypes.length === 0
                                            ? "Aucun examen disponible. Créez-en dans le Catalogue Examens Imagerie."
                                            : "Aucun examen ne correspond aux critères."}
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ImagingOrderForm;
