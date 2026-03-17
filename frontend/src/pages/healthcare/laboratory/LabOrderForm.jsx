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
    IconButton,
    MenuItem,
    Autocomplete,
    Divider,
    Stack,
    Chip,
    InputAdornment,
    Tabs,
    Tab,
} from '@mui/material';
import {
    Search as SearchIcon
} from '@mui/icons-material';
import {
    Save as SaveIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';
import patientAPI from '../../../services/patientAPI';
import QuickClientCreateModal from './components/QuickClientCreateModal';
import { buildLabOrderGroup, enqueueGroup } from '../../../db/offlineDb';
import { isOfflineError } from '../../../services/syncEngine';

const LabOrderForm = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(false);
    const [patients, setPatients] = useState([]);
    const [tests, setTests] = useState([]);
    const [panels, setPanels] = useState([]);
    const [prescribers, setPrescribers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [openClientModal, setOpenClientModal] = useState(false);
    const [selectionTab, setSelectionTab] = useState(0); // 0=examens, 1=bilans

    // Import needs to be added at the top, but I can't do it in this chunk easily if I stick to single contiguous block rules strictly without seeing the imports.
    // I will add the handleClientCreated function here though.

    const handleClientCreated = (newPatient) => {
        setPatients(prev => [newPatient, ...prev]);
        setFormData(prev => ({ ...prev, patient: newPatient }));
    };

    const [formData, setFormData] = useState({
        patient: null,
        prescriber: null,
        priority: 'routine',
        tests: [], // Array of test objects
        panels: [], // Array of panel objects (bilans)
        clinical_notes: '',
        payment_method: 'cash'
    });

    useEffect(() => {
        const initializeForm = async () => {
            await fetchOptions();

            // If creating new lab order with preselected patient from URL
            const preselectedPatientId = searchParams.get('patientId');
            if (preselectedPatientId) {
                try {
                    const patientData = await patientAPI.getPatient(preselectedPatientId);
                    setFormData(prev => ({
                        ...prev,
                        patient: patientData
                    }));
                } catch (error) {
                    console.error('Error loading preselected patient:', error);
                }
            }
        };

        initializeForm();
    }, []);

    const fetchOptions = async () => {
        try {
            const [patData, testData, catData, panelData, prescriberData] = await Promise.all([
                patientAPI.getPatients({ page_size: 1000 }),
                laboratoryAPI.getTests({ page_size: 1000 }),
                laboratoryAPI.getCategories(),
                laboratoryAPI.getPanels({ active_only: true }),
                laboratoryAPI.getPrescribers({ active_only: true }),
            ]);
            setPatients(patData.results || patData || []);
            setTests(testData.results || testData || []);
            setCategories(catData.results || catData || []);
            setPanels(Array.isArray(panelData) ? panelData : panelData.results || []);
            setPrescribers(Array.isArray(prescriberData) ? prescriberData : prescriberData.results || []);
        } catch (error) {
            console.error('Error fetching options:', error);
            enqueueSnackbar('Erreur lors du chargement des données', { variant: 'error' });
        }
    };

    // Filter tests based on search term and category
    const filteredTests = tests.filter(test => {
        const matchesSearch = !searchTerm ||
            test.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            test.test_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            test.short_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !categoryFilter || test.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const handleTestToggle = (test) => {
        const isSelected = formData.tests.some(t => t.id === test.id);

        if (isSelected) {
            setFormData(prev => ({
                ...prev,
                tests: prev.tests.filter(t => t.id !== test.id)
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                tests: [...prev.tests, test]
            }));
        }
    };

    const handleDiscountChange = (testId, newDiscount) => {
        setFormData(prev => ({
            ...prev,
            tests: prev.tests.map(t => 
                t.id === testId ? { ...t, discount: newDiscount } : t
            )
        }));
    };

    const handlePanelToggle = (panel) => {
        const isSelected = formData.panels.some(p => p.id === panel.id);
        if (isSelected) {
            setFormData(prev => ({ ...prev, panels: prev.panels.filter(p => p.id !== panel.id) }));
        } else {
            setFormData(prev => ({ ...prev, panels: [...prev.panels, panel] }));
        }
    };

    const calculateTotal = () => {
        const testsTotal = formData.tests.reduce((sum, test) => {
            const price = parseFloat(test.price) || 0;
            const discount = parseFloat(test.discount) || 0;
            return sum + (price - discount);
        }, 0);
        const panelsTotal = formData.panels.reduce((sum, panel) => {
            return sum + (parseFloat(panel.net_price || panel.price) || 0);
        }, 0);
        return testsTotal + panelsTotal + 500; // 500 XAF kit
    };

    const handleSubmit = async () => {
        if (!formData.patient) {
            enqueueSnackbar('Veuillez sélectionner un patient', { variant: 'warning' });
            return;
        }
        if (formData.tests.length === 0 && formData.panels.length === 0) {
            enqueueSnackbar('Veuillez sélectionner au moins un examen ou un bilan', { variant: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                patient_id: formData.patient.id,
                prescriber_id: formData.prescriber?.id || null,
                priority: formData.priority,
                clinical_notes: formData.clinical_notes || '',
                payment_method: formData.payment_method || 'cash',
            };

            if (formData.tests.length > 0) {
                payload.tests_data = formData.tests.map(test => ({
                    test_id: test.id,
                    discount: parseFloat(test.discount) || 0,
                }));
            }

            if (formData.panels.length > 0) {
                payload.panels_data = formData.panels.map(panel => ({
                    panel_id: panel.id,
                }));
            }

            const newOrder = await laboratoryAPI.createOrder(payload);
            enqueueSnackbar('Ordre de laboratoire créé avec succès', { variant: 'success' });
            navigate(`/healthcare/laboratory/${newOrder.id}/dispatch`);

        } catch (error) {
            if (isOfflineError(error)) {
                const group = buildLabOrderGroup({ payload });
                await enqueueGroup(group);
                enqueueSnackbar('Ordre enregistré hors ligne. Synchronisation automatique dès reconnexion.', { variant: 'info' });
                navigate('/healthcare/laboratory');
                return;
            }
            console.error('Error creating lab order:', error);
            const errorMessage = error?.response?.data?.detail || error?.response?.data?.message ||
                error?.response?.data?.error || 'Erreur lors de la création de l\'ordre de laboratoire';
            enqueueSnackbar(errorMessage, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/healthcare/laboratory')}>
                        Retour
                    </Button>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                        Nouvel Ordre de Laboratoire
                    </Typography>
                </Stack>
                <Button
                    data-testid="lab-btn-submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSubmit}
                    disabled={loading}
                    sx={{ borderRadius: 2 }}
                    size="large"
                >
                    Créer l'Ordre
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
                                    renderInput={(params) => <TextField {...params} label="Rechercher Patient" required inputProps={{...params.inputProps, 'data-testid': 'lab-input-patient'}} />}
                                />
                                <Button
                                    variant="outlined"
                                    sx={{ minWidth: 40, width: 40, height: 56, p: 0 }}
                                    onClick={() => setOpenClientModal(true)}
                                >
                                    <AddIcon />
                                </Button>
                            </Box>

                            {formData.patient && (
                                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                                    <Typography variant="body2"><strong>Âge:</strong> {formData.patient.age} ans</Typography>
                                    <Typography variant="body2"><strong>Sexe:</strong> {formData.patient.gender}</Typography>
                                    <Typography variant="body2" color="error"><strong>Allergies:</strong> {formData.patient.allergies || 'Aucune'}</Typography>
                                </Box>
                            )}
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

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="h6" gutterBottom>Priorité</Typography>
                            <TextField
                                fullWidth
                                select
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
                                fullWidth
                                select
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
                                <Typography fontWeight="bold">{formData.tests.length}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography>Bilans sélectionnés:</Typography>
                                <Typography fontWeight="bold">{formData.panels.length}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2">Kit de prélèvement:</Typography>
                                <Typography variant="body2" fontWeight="bold">500 XAF</Typography>
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
                            <Typography variant="h6" gutterBottom>Notes Cliniques</Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                value={formData.clinical_notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, clinical_notes: e.target.value }))}
                                placeholder="Informations cliniques pertinentes, symptômes, diagnostic suspecté..."
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Tabs value={selectionTab} onChange={(_, v) => setSelectionTab(v)} sx={{ mb: 2 }}>
                                <Tab label={`Examens (${formData.tests.length} sélectionnés)`} />
                                <Tab label={`Bilans (${formData.panels.length} sélectionnés)`} />
                            </Tabs>

                            {/* Tab 0: Examens individuels */}
                            {selectionTab === 0 && (<>
                                <Grid container spacing={2} sx={{ mb: 2 }}>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            placeholder="Rechercher un test..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start"><SearchIcon /></InputAdornment>
                                                ),
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            select
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

                                <TableContainer sx={{ maxHeight: 400 }}>
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Nom du Test</TableCell>
                                                <TableCell>Catégorie</TableCell>
                                                <TableCell>Prix</TableCell>
                                                <TableCell>Réduction</TableCell>
                                                <TableCell align="center">Sélection</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredTests.map((test) => {
                                                const isSelected = formData.tests.some(t => t.id === test.id);
                                                return (
                                                    <TableRow
                                                        key={test.id}
                                                        hover
                                                        onClick={() => handleTestToggle(test)}
                                                        sx={{ cursor: 'pointer', backgroundColor: isSelected ? 'action.selected' : 'inherit' }}
                                                    >
                                                        <TableCell>
                                                            <Typography fontWeight={isSelected ? 'bold' : 'normal'}>{test.name}</Typography>
                                                            {test.test_code && (
                                                                <Typography variant="caption" color="text.secondary">{test.test_code}</Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip label={test.category_name || 'N/A'} size="small" variant="outlined" />
                                                        </TableCell>
                                                        <TableCell>{test.price || 0} XAF</TableCell>
                                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                                            {isSelected ? (
                                                                <TextField
                                                                    size="small"
                                                                    type="number"
                                                                    value={formData.tests.find(t => t.id === test.id).discount || 0}
                                                                    onChange={(e) => handleDiscountChange(test.id, e.target.value)}
                                                                    sx={{ width: 100 }}
                                                                    InputProps={{ endAdornment: <InputAdornment position="end">XAF</InputAdornment> }}
                                                                />
                                                            ) : (
                                                                <Typography variant="body2" color="text.secondary">{test.discount || 0} XAF</Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            {isSelected ? <Chip label="✓" color="primary" size="small" /> : <Chip label="+" variant="outlined" size="small" />}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                {filteredTests.length === 0 && (
                                    <Box sx={{ textAlign: 'center', py: 4 }}>
                                        <Typography color="text.secondary">
                                            {tests.length === 0
                                                ? "Aucun test disponible."
                                                : "Aucun test ne correspond aux critères."}
                                        </Typography>
                                    </Box>
                                )}
                            </>)}

                            {/* Tab 1: Bilans */}
                            {selectionTab === 1 && (<>
                                <TableContainer sx={{ maxHeight: 400 }}>
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Bilan</TableCell>
                                                <TableCell>Examens inclus</TableCell>
                                                <TableCell align="right">Prix forfaitaire</TableCell>
                                                <TableCell align="center">Sélection</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {panels.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                        Aucun bilan configuré. Créez des bilans dans le Catalogue Bilans.
                                                    </TableCell>
                                                </TableRow>
                                            ) : panels.map((panel) => {
                                                const isSelected = formData.panels.some(p => p.id === panel.id);
                                                const netPrice = parseFloat(panel.net_price || panel.price) || 0;
                                                return (
                                                    <TableRow
                                                        key={panel.id}
                                                        hover
                                                        onClick={() => handlePanelToggle(panel)}
                                                        sx={{ cursor: 'pointer', backgroundColor: isSelected ? 'action.selected' : 'inherit' }}
                                                    >
                                                        <TableCell>
                                                            <Typography fontWeight={isSelected ? 'bold' : 'normal'}>{panel.name}</Typography>
                                                            <Typography variant="caption" color="text.secondary">{panel.code}</Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Box display="flex" flexWrap="wrap" gap={0.5}>
                                                                {(panel.tests_detail || []).slice(0, 3).map(t => (
                                                                    <Chip key={t.id} label={t.test_code} size="small" variant="outlined" />
                                                                ))}
                                                                {(panel.tests_detail || []).length > 3 && (
                                                                    <Chip label={`+${panel.tests_detail.length - 3}`} size="small" />
                                                                )}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography fontWeight={600} color="primary">
                                                                {netPrice.toLocaleString()} XAF
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            {isSelected ? <Chip label="✓" color="primary" size="small" /> : <Chip label="+" variant="outlined" size="small" />}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </>)}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default LabOrderForm;
