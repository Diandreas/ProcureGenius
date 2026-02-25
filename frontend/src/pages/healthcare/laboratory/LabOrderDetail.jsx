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
    Paper,
    Divider,
    Alert,
    Autocomplete,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Checkbox,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Stepper,
    Step,
    StepLabel
} from '@mui/material';
import {
    Save as SaveIcon,
    CheckCircle as VerifyIcon,
    PictureAsPdf as PdfIcon,
    ArrowBack as ArrowBackIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    Print as PrintIcon,
    QrCode as QrCodeIcon,
    Receipt as ReceiptIcon,
    AttachMoney as InvoiceIcon,
    History as HistoryIcon,
    Science as ScienceIcon,
    Colorize as ColorizeIcon,
    Send as SendIcon,
    Check as CheckIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';
import patientAPI from '../../../services/patientAPI';
import { invoicesAPI } from '../../../services/api';
import PrintModal from '../../../components/PrintModal';
import RichTextEditor from '../../../components/RichTextEditor';
import { formatDate, formatTime } from '../../../utils/formatters';
import useCurrentUser from '../../../hooks/useCurrentUser';

// Status display labels
const getStatusLabel = (status) => {
    const labels = {
        pending: 'En attente',
        sample_collected: 'Échantillon prélevé',
        in_progress: 'En cours d\'analyse',
        completed: 'Résultats saisis',
        results_ready: 'Résultats validés',
        results_delivered: 'Résultats remis',
        cancelled: 'Annulé',
    };
    return labels[status] || status;
};

const getStatusColor = (status) => {
    const colors = {
        pending: 'warning',
        sample_collected: 'info',
        in_progress: 'info',
        completed: 'primary',
        results_ready: 'success',
        results_delivered: 'default',
        cancelled: 'error',
    };
    return colors[status] || 'default';
};

const getPriorityLabel = (priority) => {
    const labels = {
        routine: 'Routine',
        urgent: 'Urgent',
        stat: 'STAT (Immédiat)',
    };
    return labels[priority] || priority;
};

const getPriorityColor = (priority) => {
    const colors = {
        routine: 'default',
        urgent: 'error',
        stat: 'error',
    };
    return colors[priority] || 'default';
};

// Workflow steps for the stepper
const WORKFLOW_STEPS = [
    { status: 'pending', label: 'En attente' },
    { status: 'sample_collected', label: 'Prélevé' },
    { status: 'in_progress', label: 'En analyse' },
    { status: 'completed', label: 'Résultats saisis' },
    { status: 'results_ready', label: 'Validé' },
    { status: 'results_delivered', label: 'Remis' },
];

const getActiveStep = (status) => {
    if (status === 'cancelled') return -1;
    const idx = WORKFLOW_STEPS.findIndex(s => s.status === status);
    return idx >= 0 ? idx : 0;
};

const LabOrderDetail = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const { enqueueSnackbar } = useSnackbar();
    const { isAdmin } = useCurrentUser();

    const [loading, setLoading] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [order, setOrder] = useState(null);
    const [results, setResults] = useState({}); // { item_id: { result_value, remarks } }
    const [biologistDiagnosis, setBiologistDiagnosis] = useState('');
    const isNewOrder = id === 'new';

    // New order form state
    const [patients, setPatients] = useState([]);
    const [availableTests, setAvailableTests] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [selectedTests, setSelectedTests] = useState([]);
    const [priority, setPriority] = useState('routine');
    const [payment_method, setPaymentMethodState] = useState('cash');
    const [clinicalNotes, setClinicalNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Print Modal State
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [printModalType, setPrintModalType] = useState(null); // 'receipt', 'report', 'tube_labels'
    const [generatingPdf, setGeneratingPdf] = useState(false);

    // History Modal State
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [historyData, setHistoryData] = useState(null);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Payment Modal State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');

    // Tube Labels Quantity Modal
    const [tubeLabelsModalOpen, setTubeLabelsModalOpen] = useState(false);
    const [tubeLabelsQuantity, setTubeLabelsQuantity] = useState(1);

    // WYSIWYG Expand Modal
    const [wysiwygModal, setWysiwygModal] = useState({
        open: false, itemId: null, field: null, label: '', value: ''
    });

    useEffect(() => {
        if (!isNewOrder) {
            fetchOrder();
        } else {
            fetchPatientsAndTests();
        }
    }, [id, isNewOrder]);

    const fetchPatientsAndTests = async () => {
        setLoading(true);
        try {
            const [patientsData, testsData] = await Promise.all([
                patientAPI.getPatients({ page_size: 1000 }),
                laboratoryAPI.getTests({ is_active: true, page_size: 1000 })
            ]);
            setPatients(Array.isArray(patientsData) ? patientsData : patientsData.results || []);
            setAvailableTests(Array.isArray(testsData) ? testsData : testsData.results || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            enqueueSnackbar('Erreur de chargement des données', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const data = await laboratoryAPI.getOrder(id);
            setOrder(data);

            // Initialize results state
            const initialResults = {};
            if (data.items) {
                data.items.forEach(item => {
                    initialResults[item.id] = {
                        result_value: item.result_value || '',
                        technician_notes: item.technician_notes || ''
                    };
                });
            }
            setResults(initialResults);

            // Initialize biologist diagnosis
            setBiologistDiagnosis(data.biologist_diagnosis || '');

        } catch (error) {
            console.error('Error fetching order:', error);
            enqueueSnackbar('Erreur de chargement', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleResultChange = (itemId, field, value) => {
        setResults(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                [field]: value
            }
        }));
    };

    const saveResults = async () => {
        try {
            const itemsToUpdate = Object.keys(results).map(itemId => ({
                item_id: itemId,
                ...results[itemId]
            }));

            await laboratoryAPI.enterResults(id, {
                results: itemsToUpdate,
                biologist_diagnosis: biologistDiagnosis
            });
            enqueueSnackbar('Résultats enregistrés', { variant: 'success' });
            fetchOrder(); // Refresh to update status/flags
        } catch (error) {
            console.error('Error saving results:', error);
            enqueueSnackbar('Erreur de sauvegarde', { variant: 'error' });
        }
    };

    const finalizeOrder = async () => {
        try {
            if (!window.confirm('Voulez-vous valider ces résultats ? Cette action est définitive.')) return;

            await saveResults(); // Save first
            // Note: verification logic is handled by updateStatus('verify')
            await laboratoryAPI.updateStatus(id, { action: 'verify' });
            enqueueSnackbar('Résultats validés', { variant: 'success' });
            fetchOrder(); // Refresh to update status
        } catch (error) {
            console.error('Error validating:', error);
            enqueueSnackbar('Erreur de validation', { variant: 'error' });
        }
    };

    const invalidateOrder = async () => {
        try {
            if (!window.confirm('Êtes-vous sûr de vouloir invalider ces résultats ? Cela permettra de les modifier à nouveau.')) return;

            await laboratoryAPI.updateStatus(id, { action: 'invalidate' });
            enqueueSnackbar('Résultats invalidés', { variant: 'success' });
            fetchOrder();
        } catch (error) {
            console.error('Error invalidating:', error);
            enqueueSnackbar('Erreur lors de l\'invalidation', { variant: 'error' });
        }
    };

    const handleStatusUpdate = async (action) => {
        try {
            await laboratoryAPI.updateStatus(id, { action });
            enqueueSnackbar('Statut mis à jour', { variant: 'success' });
            fetchOrder();
        } catch (error) {
            console.error('Error updating status:', error);
            enqueueSnackbar('Erreur de mise à jour', { variant: 'error' });
        }
    };

    const handleOpenPrintModal = (type) => {
        if (type === 'tube_labels') {
            setTubeLabelsModalOpen(true);
            return;
        }
        setPrintModalType(type);
        setPrintModalOpen(true);
    };

    const handlePrintAction = async (action) => {
        if (!printModalType) return;

        setGeneratingPdf(true);
        try {
            let blob;
            let filename;

            if (printModalType === 'report') {
                blob = await laboratoryAPI.getResultsPDF(id);
                filename = `lab_result_${order.order_number}.pdf`;
            } else if (printModalType === 'receipt') {
                blob = await laboratoryAPI.getReceiptPDF(id);
                filename = `recu_labo_${order.order_number}.pdf`;
            } else if (printModalType === 'tube_labels' || (!printModalType && tubeLabelsModalOpen)) {
                blob = await laboratoryAPI.getTubeLabelsPDF(id, { quantity: tubeLabelsQuantity });
                filename = `etiquettes_tubes_${order.order_number}.pdf`;
            }

            if (action === 'download') {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => window.URL.revokeObjectURL(url), 100);
            } else if (action === 'preview' || action === 'print') {
                const url = window.URL.createObjectURL(blob);
                const printWindow = window.open(url, '_blank');

                if (printWindow && action === 'print') {
                    printWindow.onload = () => {
                        printWindow.print();
                    };
                }
            }

            setPrintModalOpen(false);
        } catch (error) {
            console.error('Error handling print action:', error);
            enqueueSnackbar('Erreur lors de la génération du document', { variant: 'error' });
        } finally {
            setGeneratingPdf(false);
        }
    };

    const handleGenerateInvoice = async () => {
        try {
            enqueueSnackbar('Génération de la facture...', { variant: 'info' });
            const response = await laboratoryAPI.generateInvoice(id);
            enqueueSnackbar(`Facture ${response.invoice_number} créée avec succès!`, { variant: 'success' });
            // Recharger les données de la commande pour afficher la facture
            fetchOrder();
        } catch (error) {
            console.error('Error generating invoice:', error);
            const errorMsg = error.response?.data?.error || 'Erreur lors de la génération de la facture';
            enqueueSnackbar(errorMsg, { variant: 'error' });
        }
    };

    const handleMarkInvoicePaid = async () => {
        if (!order.lab_invoice) return;

        try {
            const paymentData = {
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: paymentMethod,
                notes: `Paiement pour commande labo ${order.order_number}`
            };
            await invoicesAPI.markPaid(order.lab_invoice.id, paymentData);
            enqueueSnackbar('Facture marquée comme payée', { variant: 'success' });
            setPaymentModalOpen(false);
            fetchOrder(); // Refresh to update invoice status
        } catch (error) {
            console.error('Error marking invoice as paid:', error);
            enqueueSnackbar('Erreur lors du marquage de la facture', { variant: 'error' });
        }
    };

    const handleShowHistory = async (item) => {
        setSelectedItem(item);
        setHistoryModalOpen(true);
        setLoadingHistory(true);

        try {
            const data = await laboratoryAPI.getItemHistory(item.id);
            setHistoryData(data);
        } catch (error) {
            console.error('Error loading history:', error);
            enqueueSnackbar('Erreur de chargement de l\'historique', { variant: 'error' });
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleCloseHistory = () => {
        setHistoryModalOpen(false);
        setHistoryData(null);
        setSelectedItem(null);
    };

    // ─── WYSIWYG modal helpers ───────────────────────────────────────────────
    const openWysiwygModal = (itemId, field, label) => {
        const currentValue =
            field === 'biologist_diagnosis'
                ? biologistDiagnosis
                : (results[itemId]?.[field] || '');
        setWysiwygModal({ open: true, itemId, field, label, value: currentValue });
    };

    const handleModalChange = (newValue) => {
        setWysiwygModal(prev => ({ ...prev, value: newValue }));
    };

    const saveAndCloseModal = () => {
        const { itemId, field, value } = wysiwygModal;
        if (field === 'biologist_diagnosis') {
            setBiologistDiagnosis(value);
        } else {
            handleResultChange(itemId, field, value);
        }
        setWysiwygModal({ open: false, itemId: null, field: null, label: '', value: '' });
    };


    const handleCreateOrder = async () => {
        if (!selectedPatient) {
            enqueueSnackbar('Veuillez sélectionner un patient', { variant: 'warning' });
            return;
        }
        if (selectedTests.length === 0) {
            enqueueSnackbar('Veuillez sélectionner au moins un test', { variant: 'warning' });
            return;
        }

        setSubmitting(true);
        try {
            const orderData = {
                patient_id: selectedPatient.id,
                tests_data: selectedTests.map(t => ({
                    test_id: t.id,
                    discount: parseFloat(t.discount) || 0
                })),
                priority: priority,
                payment_method: payment_method,
                clinical_notes: clinicalNotes
            };

            const newOrder = await laboratoryAPI.createOrder(orderData);
            enqueueSnackbar('Commande créée avec succès', { variant: 'success' });

            navigate(`/healthcare/laboratory/${newOrder.id}/dispatch`);
        } catch (error) {
            console.error('Error creating order:', error);
            enqueueSnackbar('Erreur lors de la création de la commande', { variant: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleTestToggle = (test) => {
        const exists = selectedTests.find(t => t.id === test.id);
        if (exists) {
            setSelectedTests(selectedTests.filter(t => t.id !== test.id));
        } else {
            // Initialize with default test discount
            setSelectedTests([...selectedTests, { ...test, discount: test.discount || 0 }]);
        }
    };

    const handleDiscountChange = (testId, newDiscount) => {
        setSelectedTests(prev => prev.map(t => 
            t.id === testId ? { ...t, discount: newDiscount } : t
        ));
    };

    const getTotalPrice = () => {
        const testsTotal = selectedTests.reduce((sum, test) => {
            const price = parseFloat(test.price) || 0;
            const discount = parseFloat(test.discount) || 0;
            return sum + (price - discount);
        }, 0);
        return testsTotal + 500; // Kit fee
    };

    if (loading) return <Typography>Chargement...</Typography>;
    if (!order && !isNewOrder) return <Typography>Commande introuvable</Typography>;

    // Handle new order creation
    if (isNewOrder) {
        return (
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/healthcare/laboratory')} sx={{ mr: 2 }}>
                            Retour
                        </Button>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                            Nouvelle Commande de Laboratoire
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<SaveIcon />}
                        onClick={handleCreateOrder}
                        disabled={submitting || !selectedPatient || selectedTests.length === 0}
                    >
                        {submitting ? 'Création...' : 'Créer la commande'}
                    </Button>
                </Box>

                <Grid container spacing={3}>
                    {/* Patient Selection */}
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Informations Patient</Typography>
                                <Autocomplete
                                    options={patients}
                                    getOptionLabel={(option) => `${option.name} ${option.patient_number ? `(${option.patient_number})` : ''}`}
                                    value={selectedPatient}
                                    onChange={(e, newValue) => setSelectedPatient(newValue)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Sélectionner un patient"
                                            required
                                            fullWidth
                                        />
                                    )}
                                    sx={{ mb: 2 }}
                                />

                                {selectedPatient && (
                                    <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                                        <Typography variant="body2"><strong>Nom:</strong> {selectedPatient.name}</Typography>
                                        <Typography variant="body2"><strong>Âge:</strong> {selectedPatient.age || 'N/A'}</Typography>
                                        <Typography variant="body2"><strong>Genre:</strong> {selectedPatient.gender || 'N/A'}</Typography>
                                        {selectedPatient.patient_number && (
                                            <Typography variant="body2"><strong>N° Patient:</strong> {selectedPatient.patient_number}</Typography>
                                        )}
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Order Details */}
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Détails de la Commande</Typography>

                                <FormControl fullWidth sx={{ mb: 2 }}>
                                    <InputLabel>Priorité</InputLabel>
                                    <Select
                                        value={priority}
                                        label="Priorité"
                                        onChange={(e) => setPriority(e.target.value)}
                                    >
                                        <MenuItem value="routine">Routine</MenuItem>
                                        <MenuItem value="urgent">Urgent</MenuItem>
                                        <MenuItem value="stat">STAT (Immédiat)</MenuItem>
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth sx={{ mb: 2 }}>
                                    <InputLabel>Méthode de Paiement</InputLabel>
                                    <Select
                                        value={payment_method}
                                        label="Méthode de Paiement"
                                        onChange={(e) => setPaymentMethodState(e.target.value)}
                                    >
                                        <MenuItem value="cash">Espèces</MenuItem>
                                        <MenuItem value="mobile_money">Mobile Money</MenuItem>
                                        <MenuItem value="card">Carte Bancaire</MenuItem>
                                        <MenuItem value="insurance">Assurance</MenuItem>
                                        <MenuItem value="other">Autre</MenuItem>
                                    </Select>
                                </FormControl>

                                <TextField
                                    fullWidth
                                    multiline
                                    rows={4}
                                    label="Notes cliniques"
                                    value={clinicalNotes}
                                    onChange={(e) => setClinicalNotes(e.target.value)}
                                    placeholder="Informations pertinentes pour le laboratoire..."
                                />
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Test Selection */}
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6">Sélection des Tests</Typography>
                                    <Chip
                                        label={`${selectedTests.length} test(s) sélectionné(s)`}
                                        color="primary"
                                        variant="outlined"
                                    />
                                </Box>

                                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell padding="checkbox">Sélection</TableCell>
                                                <TableCell>Code</TableCell>
                                                <TableCell>Nom du Test</TableCell>
                                                <TableCell>Catégorie</TableCell>
                                                <TableCell>Prix</TableCell>
                                                <TableCell>Réduction</TableCell>
                                                <TableCell>À jeun requis</TableCell>
                                                <TableCell>Délai estimé</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {availableTests.map((test) => {
                                                const isSelected = selectedTests.some(t => t.id === test.id);
                                                return (
                                                    <TableRow
                                                        key={test.id}
                                                        hover
                                                        selected={isSelected}
                                                        onClick={() => handleTestToggle(test)}
                                                        sx={{ cursor: 'pointer' }}
                                                    >
                                                        <TableCell padding="checkbox">
                                                            <Checkbox checked={isSelected} />
                                                        </TableCell>
                                                        <TableCell>{test.test_code}</TableCell>
                                                        <TableCell><strong>{test.name}</strong></TableCell>
                                                        <TableCell>{test.category_name || '-'}</TableCell>
                                                        <TableCell>{test.price} FCFA</TableCell>
                                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                                            {isSelected ? (
                                                                <TextField
                                                                    size="small"
                                                                    type="number"
                                                                    value={selectedTests.find(t => t.id === test.id).discount || 0}
                                                                    onChange={(e) => handleDiscountChange(test.id, e.target.value)}
                                                                    sx={{ width: 100 }}
                                                                />
                                                            ) : (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    {test.discount || 0} FCFA
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {test.fasting_required ? (
                                                                <Chip label="Oui" size="small" color="warning" />
                                                            ) : (
                                                                <Chip label="Non" size="small" />
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{test.estimated_turnaround_hours}h</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            {availableTests.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={7} align="center">
                                                        <Typography color="text.secondary">Aucun test disponible</Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                {/* Summary */}
                                {selectedTests.length > 0 && (
                                    <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} sm={4}>
                                                <Typography variant="body2" color="text.secondary">Tests sélectionnés</Typography>
                                                <Typography variant="h6">{selectedTests.length}</Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <Typography variant="body2" color="text.secondary">Kit de prélèvement</Typography>
                                                <Typography variant="h6">500 FCFA</Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <Typography variant="body2" color="text.secondary">Prix total estimé</Typography>
                                                <Typography variant="h6">{getTotalPrice().toFixed(0)} FCFA</Typography>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        );
    }

    // canEdit: allow entering/editing results when analysis is in progress or results just entered (not yet validated)
    const canEdit = ['in_progress', 'completed'].includes(order.status);

    const handleDeleteOrder = async () => {
        try {
            await laboratoryAPI.deleteOrder(order.id);
            enqueueSnackbar('Commande supprimée', { variant: 'success' });
            navigate('/healthcare/laboratory');
        } catch {
            enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
        }
        setDeleteDialogOpen(false);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/healthcare/laboratory')} sx={{ mr: 2 }}>
                        Retour
                    </Button>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                        Commande #{order.order_number}
                    </Typography>
                </Box>
                <Box>
                    {isAdmin && (
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => setDeleteDialogOpen(true)}
                            sx={{ mr: 1 }}
                        >
                            Supprimer
                        </Button>
                    )}
                    {['completed', 'results_ready', 'results_delivered'].includes(order.status) && (
                        <Button data-testid="lab-detail-btn-report" variant="outlined" startIcon={<PdfIcon />} onClick={() => handleOpenPrintModal('report')} sx={{ mr: 1 }}>
                            Rapport Complet
                        </Button>
                    )}

                    {!isNewOrder && (
                        <>
                            <Button
                                data-testid="lab-detail-btn-receipt"
                                variant="outlined"
                                color="primary"
                                startIcon={<ReceiptIcon />}
                                onClick={() => handleOpenPrintModal('receipt')}
                                sx={{ mr: 1 }}
                            >
                                Imprimer Reçu
                            </Button>

                            <Button data-testid="lab-detail-btn-labels" variant="outlined" startIcon={<PrintIcon />} onClick={() => handleOpenPrintModal('tube_labels')} sx={{ mr: 1 }}>
                                Étiquettes Thermiques
                            </Button>

                            {order.lab_invoice && (
                                <Button
                                    variant="outlined"
                                    color="success"
                                    startIcon={<InvoiceIcon />}
                                    onClick={() => navigate(`/invoices/${order.lab_invoice.id}`)}
                                    sx={{ mr: 1 }}
                                >
                                    Voir Facture
                                </Button>
                            )}
                        </>
                    )}

                    {/* Workflow Actions */}
                    {order.status === 'pending' && (
                        <Button
                            data-testid="lab-detail-btn-collect"
                            variant="contained"
                            color="warning"
                            startIcon={<ColorizeIcon />}
                            onClick={() => handleStatusUpdate('collect_sample')}
                            sx={{ mr: 1 }}
                        >
                            Prélèvement
                        </Button>
                    )}

                    {order.status === 'sample_collected' && (
                        <Button
                            data-testid="lab-detail-btn-analyze"
                            variant="contained"
                            color="info"
                            startIcon={<ScienceIcon />}
                            onClick={() => handleStatusUpdate('start_processing')}
                            sx={{ mr: 1 }}
                        >
                            Analyser
                        </Button>
                    )}

                    {canEdit && (
                        <Button data-testid="lab-detail-btn-save-results" variant="contained" startIcon={<SaveIcon />} onClick={saveResults} sx={{ mr: 1 }}>
                            Enregistrer
                        </Button>
                    )}

                    {canEdit && (
                        <Button data-testid="lab-detail-btn-validate-results" variant="contained" color="success" startIcon={<VerifyIcon />} onClick={finalizeOrder} sx={{ mr: 1 }}>
                            Valider
                        </Button>
                    )}

                    {order.status === 'results_ready' && (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<SendIcon />}
                            onClick={() => handleStatusUpdate('deliver')}
                            sx={{ mr: 1 }}
                        >
                            Remettre Résultats
                        </Button>
                    )}

                    {/* Invalidate Button - Show only if results_ready to allow re-editing */}
                    {order.status === 'results_ready' && (
                        <Button variant="outlined" color="warning" onClick={invalidateOrder} sx={{ ml: 1 }}>
                            Invalider
                        </Button>
                    )}
                </Box>
            </Box>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Patient</Typography>
                            <Typography variant="body1" fontWeight="bold">{order.patient_name}</Typography>
                            <Typography variant="body2">{order.patient?.age} ans / {order.patient?.gender}</Typography>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="caption" color="text.secondary">Prescripteur</Typography>
                            <Typography variant="body2">{order.ordered_by_name || '-'}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Statut & Priorité</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Statut Actuel</Typography>
                                    <Box sx={{ mt: 0.5 }}>
                                        <Chip label={getStatusLabel(order.status)} color={getStatusColor(order.status)} />
                                    </Box>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Priorité</Typography>
                                    <Box sx={{ mt: 0.5 }}>
                                        <Chip label={getPriorityLabel(order.priority)} color={getPriorityColor(order.priority)} />
                                    </Box>
                                </Grid>
                                {order.clinical_notes && (
                                    <Grid item xs={12}>
                                        <Alert severity="info" sx={{ mt: 1 }}>
                                            <strong>Notes Cliniques:</strong> {order.clinical_notes}
                                        </Alert>
                                    </Grid>
                                )}
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Workflow Progress Stepper */}
            {order.status !== 'cancelled' ? (
                <Card sx={{ mb: 3 }}>
                    <CardContent sx={{ py: 2 }}>
                        <Stepper activeStep={getActiveStep(order.status)} alternativeLabel>
                            {WORKFLOW_STEPS.map((step) => (
                                <Step key={step.status} completed={getActiveStep(order.status) > WORKFLOW_STEPS.findIndex(s => s.status === step.status)}>
                                    <StepLabel>{step.label}</StepLabel>
                                </Step>
                            ))}
                        </Stepper>
                    </CardContent>
                </Card>
            ) : (
                <Alert severity="error" sx={{ mb: 3 }}>
                    Cette commande a été annulée.
                </Alert>
            )}

            {/* Workflow guidance message */}
            {order.status === 'pending' && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    <strong>Étape 1 :</strong> Le prélèvement n'a pas encore été effectué. Cliquez sur "Prélèvement" pour confirmer la collecte de l'échantillon.
                </Alert>
            )}
            {order.status === 'sample_collected' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    <strong>Étape 2 :</strong> L'échantillon a été prélevé. Cliquez sur "Analyser" pour démarrer l'analyse et pouvoir saisir les résultats.
                </Alert>
            )}
            {order.status === 'in_progress' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    <strong>Étape 3 :</strong> Analyse en cours. Saisissez les résultats ci-dessous puis cliquez sur "Enregistrer" pour sauvegarder ou "Valider" pour finaliser.
                </Alert>
            )}
            {order.status === 'completed' && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    <strong>Étape 4 :</strong> Résultats saisis. Vous pouvez encore les modifier. Cliquez sur "Valider" pour les finaliser.
                </Alert>
            )}
            {order.status === 'results_ready' && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    <strong>Étape 5 :</strong> Résultats validés et prêts. Cliquez sur "Remettre Résultats" pour marquer comme remis au patient. Vous pouvez aussi "Invalider" pour revenir en mode édition.
                </Alert>
            )}
            {order.status === 'results_delivered' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Résultats remis au patient. Cette commande est terminée.
                </Alert>
            )}

            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, mb: 3 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Test / Examen</TableCell>
                            <TableCell>Catégorie</TableCell>
                            <TableCell width="20%">Résultat</TableCell>
                            <TableCell>Unités</TableCell>
                            <TableCell>Valeurs de Référence</TableCell>
                            <TableCell>Commentaires / Notes</TableCell>
                            <TableCell>Flag</TableCell>
                            <TableCell width="80px">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {order.items?.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell fontWeight="500">{item.test_name}</TableCell>
                                <TableCell>{item.category_name}</TableCell>
                                <TableCell>
                                    {canEdit ? (
                                        <Box>
                                            <RichTextEditor
                                                value={results[item.id]?.result_value || ''}
                                                onChange={(val) => handleResultChange(item.id, 'result_value', val)}
                                                placeholder="Entrer valeur"
                                                minHeight={60}
                                                onExpand={() => openWysiwygModal(item.id, 'result_value', `Résultat — ${item.test_name}`)}
                                            />
                                            {item.result_template && (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="secondary"
                                                    sx={{ mt: 0.5, fontSize: '0.7rem', py: 0.3 }}
                                                    onClick={() => {
                                                        const html = item.result_template
                                                            .split('\n')
                                                            .map(line => `<p>${line.trim() || '<br>'}</p>`)
                                                            .join('');
                                                        handleResultChange(item.id, 'result_value', html);
                                                    }}
                                                >
                                                    Pré-remplir
                                                </Button>
                                            )}
                                        </Box>
                                    ) : (
                                        <Typography
                                            fontWeight="bold"
                                            component="div"
                                            dangerouslySetInnerHTML={{ __html: item.result_value || '-' }}
                                            sx={{ '& ul, & ol': { pl: 2 }, '& p': { my: 0 } }}
                                        />
                                    )}
                                </TableCell>
                                <TableCell>{item.result_unit || item.unit || '-'}</TableCell>
                                <TableCell sx={{ fontSize: '0.75rem', whiteSpace: 'pre-line', verticalAlign: 'top', maxWidth: 180 }}>
                                    {(() => {
                                        const gender = order.patient_gender;
                                        if (gender === 'M') {
                                            return item.normal_range_male || item.normal_range_general || '-';
                                        } else if (gender === 'F') {
                                            return item.normal_range_female || item.normal_range_general || '-';
                                        }
                                        return item.normal_range_general || item.normal_range_male || '-';
                                    })()}
                                </TableCell>
                                <TableCell>
                                    {canEdit ? (
                                        <RichTextEditor
                                            value={results[item.id]?.technician_notes || ''}
                                            onChange={(val) => handleResultChange(item.id, 'technician_notes', val)}
                                            placeholder="Commentaires du technicien"
                                            minHeight={60}
                                            onExpand={() => openWysiwygModal(item.id, 'technician_notes', `Notes — ${item.test_name}`)}
                                        />
                                    ) : (
                                        <Box>
                                            {item.technician_notes ? (
                                                <Typography
                                                    variant="body2"
                                                    component="div"
                                                    dangerouslySetInnerHTML={{ __html: item.technician_notes }}
                                                    sx={{ mb: 0.5, '& ul, & ol': { pl: 2 }, '& p': { my: 0 } }}
                                                />
                                            ) : !item.interpretation ? '-' : null}
                                            {item.interpretation && (
                                                <Alert severity="info" sx={{ mt: 1, py: 0 }}>
                                                    <Typography variant="caption">
                                                        <strong>Interprétation:</strong> {item.interpretation}
                                                    </Typography>
                                                </Alert>
                                            )}
                                        </Box>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {item.is_abnormal && <Chip label="ANORMAL" color="error" size="small" />}
                                </TableCell>
                                <TableCell>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleShowHistory(item)}
                                        title="Afficher l'historique des valeurs"
                                        color="primary"
                                    >
                                        <HistoryIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Biologist Diagnosis Section */}
            <Card sx={{ mb: 3, bgcolor: '#f8f9fa', border: '2px solid #2563eb' }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                            Diagnostic du Biologiste
                        </Typography>
                        {order.diagnosed_by_name && (
                            <Chip
                                label={`Par: ${order.diagnosed_by_name}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ ml: 2 }}
                            />
                        )}
                        {order.diagnosed_at && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                                {formatDate(order.diagnosed_at)}
                            </Typography>
                        )}
                    </Box>

                    <RichTextEditor
                        value={biologistDiagnosis}
                        onChange={setBiologistDiagnosis}
                        disabled={!canEdit}
                        placeholder="Interprétation globale des résultats par le biologiste superviseur..."
                        minHeight={120}
                        onExpand={canEdit ? () => openWysiwygModal(null, 'biologist_diagnosis', 'Diagnostic du Biologiste') : null}
                    />
                </CardContent>
            </Card>

            {/* Print Modal */}
            <PrintModal
                open={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                title={
                    printModalType === 'report' ? 'Rapport Complet' :
                        printModalType === 'receipt' ? 'Reçu Labo' :
                            'Document'
                }
                loading={generatingPdf}
                onPreview={() => handlePrintAction('preview')}
                onPrint={() => handlePrintAction('print')}
                onDownload={() => handlePrintAction('download')}
                helpText="Choisissez une action pour générer le document"
            />

            {/* Tube Labels Quantity Modal */}
            <Dialog open={tubeLabelsModalOpen} onClose={() => setTubeLabelsModalOpen(false)}>
                <DialogTitle>Impression Étiquettes Thermiques</DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Format:</strong> 100.5mm × 63.5mm (Paysage) - GAP 2mm
                        </Typography>
                        <Typography variant="body2">
                            <strong>💡 Regroupement intelligent:</strong> Les tests utilisant le même type de tube sont regroupés sur une seule étiquette (max 5 tests/tube)
                        </Typography>
                    </Alert>
                    <Typography gutterBottom sx={{ mb: 2 }}>
                        Combien d'exemplaires de chaque étiquette souhaitez-vous imprimer ?
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Nombre de copies"
                        type="number"
                        fullWidth
                        variant="outlined"
                        value={tubeLabelsQuantity}
                        onChange={(e) => setTubeLabelsQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        InputProps={{ inputProps: { min: 1, max: 10 } }}
                        helperText="Une étiquette est générée par tube (plusieurs examens peuvent être sur le même tube)"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTubeLabelsModalOpen(false)}>Annuler</Button>
                    <Button
                        onClick={() => {
                            setTubeLabelsModalOpen(false);
                            setPrintModalType('tube_labels');
                            setPrintModalOpen(true);
                        }}
                        variant="contained"
                    >
                        Valider
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Payment Modal */}
            <Dialog open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)}>
                <DialogTitle>Paiement de la Facture</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom sx={{ mb: 2 }}>
                        Veuillez sélectionner le mode de paiement pour marquer cette facture comme payée.
                    </Typography>
                    <FormControl fullWidth>
                        <InputLabel>Mode de Paiement</InputLabel>
                        <Select
                            value={paymentMethod}
                            label="Mode de Paiement"
                            onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                            <MenuItem value="cash">Espèces (Cash)</MenuItem>
                            <MenuItem value="mobile_money">Mobile Money</MenuItem>
                            <MenuItem value="card">Carte Bancaire</MenuItem>
                            <MenuItem value="insurance">Assurance</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPaymentModalOpen(false)}>Annuler</Button>
                    <Button onClick={handleMarkInvoicePaid} variant="contained" color="primary">
                        Confirmer le Paiement
                    </Button>
                </DialogActions>
            </Dialog>

            {/* WYSIWYG Expand Modal */}
            <Dialog
                open={wysiwygModal.open}
                onClose={() => setWysiwygModal(prev => ({ ...prev, open: false }))}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { minHeight: '70vh' } }}
            >
                <DialogTitle sx={{ fontWeight: 600 }}>{wysiwygModal.label}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', pt: 1 }}>
                    <RichTextEditor
                        value={wysiwygModal.value}
                        onChange={handleModalChange}
                        minHeight={400}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setWysiwygModal(prev => ({ ...prev, open: false }))}>
                        Annuler
                    </Button>
                    <Button onClick={saveAndCloseModal} variant="contained" startIcon={<CheckIcon />}>
                        Enregistrer
                    </Button>
                </DialogActions>
            </Dialog>

            {/* History Modal */}
            <Dialog
                open={historyModalOpen}
                onClose={handleCloseHistory}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HistoryIcon color="primary" />
                        <Typography variant="h6">
                            Historique des Valeurs
                        </Typography>
                    </Box>
                    {historyData && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {historyData.test_name} ({historyData.test_code}) - {historyData.patient_name}
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent>
                    {loadingHistory ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : historyData?.previous_results?.length > 0 ? (
                        <>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                {historyData.total_previous} résultat(s) antérieur(s) trouvé(s)
                            </Alert>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Date</TableCell>
                                            <TableCell>Commande</TableCell>
                                            <TableCell>Résultat</TableCell>
                                            <TableCell>Unité</TableCell>
                                            <TableCell>Référence</TableCell>
                                            <TableCell>Statut</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {historyData.previous_results.map((result, index) => (
                                            <TableRow
                                                key={result.id}
                                                sx={{
                                                    bgcolor: index === 0 ? 'action.hover' : 'inherit'
                                                }}
                                            >
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {formatDate(result.result_entered_at)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {formatTime(result.result_entered_at)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={index === 0 ? 'bold' : 'normal'}>
                                                        {result.order_number}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight="bold"
                                                        color={result.is_abnormal ? 'error.main' : 'inherit'}
                                                    >
                                                        {result.result_value}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {result.result_unit || '-'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {result.reference_range || '-'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {result.is_abnormal ? (
                                                        <Chip
                                                            label={result.abnormality_type || 'Anormal'}
                                                            size="small"
                                                            color="error"
                                                        />
                                                    ) : (
                                                        <Chip label="Normal" size="small" color="success" />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    ) : (
                        <Alert severity="info">
                            Aucun résultat antérieur trouvé pour ce test
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseHistory}>Fermer</Button>
                </DialogActions>
            </Dialog>

            {/* Dialog confirmation suppression — admin only */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Supprimer la commande</DialogTitle>
                <DialogContent>
                    <Typography>
                        Supprimer la commande <strong>#{order?.order_number}</strong> pour{' '}
                        <strong>{order?.patient_name}</strong> ?
                    </Typography>
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                        Cette action est irréversible.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
                    <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={handleDeleteOrder}>
                        Supprimer
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default LabOrderDetail;
