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
    Tooltip,
    Checkbox,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Stepper,
    Step,
    StepLabel,
    Popover,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemText,
    ListItemButton
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
    Check as CheckIcon,
    Settings as SettingsIcon,
    Edit as EditIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';
import patientAPI from '../../../services/patientAPI';
import { invoicesAPI } from '../../../services/api';
import PrintModal from '../../../components/PrintModal';
import LabTestFormModal from './LabTestFormModal';
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

/**
 * Quick Configuration Selector Component (Complete demographic control)
 */
const QuickConfigSelector = ({ item, parameter, onConfigChanged, canEdit, patientGender }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const { enqueueSnackbar } = useSnackbar();
    const [activeTab, setActiveTab] = useState(0);

    // Full state for all demographic fields
    const [config, setConfig] = useState({
        unit: '',
        h_min: '', h_max: '',
        f_min: '', f_max: '',
        c_min: '', c_max: '',
        g_min: '', g_max: '',
        simple_ref: '' // For non-structured tests
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (anchorEl) {
            if (parameter) {
                setConfig({
                    unit: parameter.unit || '',
                    h_min: parameter.adult_ref_min_male ?? '', h_max: parameter.adult_ref_max_male ?? '',
                    f_min: parameter.adult_ref_min_female ?? '', f_max: parameter.adult_ref_max_female ?? '',
                    c_min: parameter.child_ref_min ?? '', c_max: parameter.child_ref_max ?? '',
                    g_min: parameter.adult_ref_min_general ?? '', g_max: parameter.adult_ref_max_general ?? '',
                });
                // Default tab based on current patient
                if (patientGender === 'M') setActiveTab(0);
                else if (patientGender === 'F') setActiveTab(1);
                else setActiveTab(3); // General
            } else {
                setConfig({
                    unit: item.result_unit || '',
                    simple_ref: item.reference_range || ''
                });
            }
        }
    }, [anchorEl, parameter, item, patientGender]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                test_id: parameter ? null : item.lab_test,
                parameter_id: parameter ? parameter.id : null,
                unit: config.unit,
            };

            if (parameter) {
                payload.adult_ref_min_male = config.h_min; payload.adult_ref_max_male = config.h_max;
                payload.adult_ref_min_female = config.f_min; payload.adult_ref_max_female = config.f_max;
                payload.child_ref_min = config.c_min; payload.child_ref_max = config.c_max;
                payload.adult_ref_min_general = config.g_min; payload.adult_ref_max_general = config.g_max;
            } else {
                payload.normal_range_general = config.simple_ref;
                // Update all simple ranges to keep consistency
                payload.normal_range_male = config.simple_ref;
                payload.normal_range_female = config.simple_ref;
            }

            await laboratoryAPI.quickUpdateUnit(payload);
            enqueueSnackbar('Configuration globale mise a jour', { variant: 'success' });
            handleClose();
            onConfigChanged({
                type: parameter ? 'parameter' : 'test',
                id: parameter ? parameter.id : item.lab_test,
                ...config
            }); 
        } catch (error) {
            enqueueSnackbar('Erreur lors de l\'enregistrement', { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => setAnchorEl(null);
    const handleClick = (e) => canEdit && setAnchorEl(e.currentTarget);
    const open = Boolean(anchorEl);

    return (
        <>
            <Tooltip title="Changer l'unite ou les references (tous genres)">
                <Chip 
                    label={parameter ? (parameter.unit || '—') : (item.result_unit || '—')} 
                    size="small" onClick={handleClick} variant="outlined"
                    sx={{ cursor: canEdit ? 'pointer' : 'default', fontSize: '0.7rem', height: 20, borderColor: 'primary.light' }}
                />
            </Tooltip>
            <Popover open={open} anchorEl={anchorEl} onClose={handleClose} PaperProps={{ sx: { p: 2, width: 280 } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Configuration Rapide</Typography>
                <TextField label="Unite" size="small" value={config.unit} onChange={e => setConfig({...config, unit: e.target.value})} fullWidth sx={{ mb: 2 }} />
                
                {parameter ? (
                    <>
                        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} size="small" sx={{ minHeight: 30, mb: 1 }}>
                            <Tab label="H" sx={{ minWidth: 50, p: 0 }} />
                            <Tab label="F" sx={{ minWidth: 50, p: 0 }} />
                            <Tab label="Enf" sx={{ minWidth: 50, p: 0 }} />
                            <Tab label="Gen" sx={{ minWidth: 50, p: 0 }} />
                        </Tabs>
                        <Box sx={{ py: 1 }}>
                            {activeTab === 0 && <Stack direction="row" spacing={1}><TextField label="Min H" type="number" size="small" value={config.h_min} onChange={e => setConfig({...config, h_min: e.target.value})} /><TextField label="Max H" type="number" size="small" value={config.h_max} onChange={e => setConfig({...config, h_max: e.target.value})} /></Stack>}
                            {activeTab === 1 && <Stack direction="row" spacing={1}><TextField label="Min F" type="number" size="small" value={config.f_min} onChange={e => setConfig({...config, f_min: e.target.value})} /><TextField label="Max F" type="number" size="small" value={config.f_max} onChange={e => setConfig({...config, f_max: e.target.value})} /></Stack>}
                            {activeTab === 2 && <Stack direction="row" spacing={1}><TextField label="Min Enf" type="number" size="small" value={config.c_min} onChange={e => setConfig({...config, c_min: e.target.value})} /><TextField label="Max Enf" type="number" size="small" value={config.c_max} onChange={e => setConfig({...config, c_max: e.target.value})} /></Stack>}
                            {activeTab === 3 && <Stack direction="row" spacing={1}><TextField label="Min Gen" type="number" size="small" value={config.g_min} onChange={e => setConfig({...config, g_min: e.target.value})} /><TextField label="Max Gen" type="number" size="small" value={config.g_max} onChange={e => setConfig({...config, g_max: e.target.value})} /></Stack>}
                        </Box>
                    </>
                ) : (
                    <TextField label="Plage de reference" size="small" value={config.simple_ref} onChange={e => setConfig({...config, simple_ref: e.target.value})} fullWidth placeholder="ex: 4.5 - 11.0" />
                )}
                
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
                    <Button size="small" onClick={handleClose}>Annuler</Button>
                    <Button size="small" variant="contained" onClick={handleSave} disabled={saving}>{saving ? <CircularProgress size={16} /> : 'Enregistrer Tout'}</Button>
                </Box>
            </Popover>
        </>
    );
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
    const [parameterValues, setParameterValues] = useState({}); // { item_id: { param_id: { result_numeric, result_text } } }
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

    const handleSaveAsTemplate = async (itemId) => {
        try {
            await laboratoryAPI.saveTestAsTemplate(itemId);
            enqueueSnackbar('Modèle de résultat enregistré pour ce test', { variant: 'success' });
            // Pas besoin de recharger toute la commande car le modèle est pour le test catalogue, 
            // pas forcément pour l'item actuel déjà en cours, mais on peut le faire pour être sûr.
            fetchOrder();
        } catch (error) {
            enqueueSnackbar('Erreur lors de l\'enregistrement du modèle', { variant: 'error' });
        }
    };

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

    // Test Configuration Modal State
    const [testModalOpen, setTestModalOpen] = useState(false);
    const [selectedTestForEdit, setSelectedTestForEdit] = useState(null);

    const handleEditTest = async (testId) => {
        try {
            const testData = await laboratoryAPI.getTest(testId);
            setSelectedTestForEdit(testData);
            setTestModalOpen(true);
        } catch (error) {
            enqueueSnackbar('Erreur lors du chargement des donnees du test', { variant: 'error' });
        }
    };

    const onTestSaved = (updatedData) => {
        // SURGICAL UPDATE: Update only the specific test/parameter in the local state
        if (updatedData && order) {
            setOrder(prevOrder => {
                const newItems = prevOrder.items.map(item => {
                    // If it's a test update (Simple Test)
                    if (updatedData.type === 'test' && item.lab_test === updatedData.id) {
                        return { 
                            ...item, 
                            result_unit: updatedData.unit,
                            reference_range: updatedData.simple_ref || item.reference_range,
                            lab_test_data: { 
                                ...item.lab_test_data, 
                                unit_of_measurement: updatedData.unit, 
                                normal_range_general: updatedData.simple_ref || item.lab_test_data.normal_range_general,
                                normal_range_male: updatedData.simple_ref || item.lab_test_data.normal_range_male,
                                normal_range_female: updatedData.simple_ref || item.lab_test_data.normal_range_female
                            }
                        };
                    }
                    // If it's a parameter update (Compound Test)
                    if (updatedData.type === 'parameter' && item.parameters) {
                        const newParams = item.parameters.map(p => {
                            if (p.id === updatedData.id) {
                                // Normalize empty strings to null
                                const norm = (v) => (v === '' || v === undefined) ? null : v;
                                return { 
                                    ...p, 
                                    unit: updatedData.unit,
                                    adult_ref_min_male: norm(updatedData.h_min), adult_ref_max_male: norm(updatedData.h_max),
                                    adult_ref_min_female: norm(updatedData.f_min), adult_ref_max_female: norm(updatedData.f_max),
                                    child_ref_min: norm(updatedData.c_min), child_ref_max: norm(updatedData.c_max),
                                    adult_ref_min_general: norm(updatedData.g_min), adult_ref_max_general: norm(updatedData.g_max)
                                };
                            }
                            return p;
                        });
                        return { ...item, parameters: newParams };
                    }
                    return item;
                });
                return { ...prevOrder, items: newItems };
            });
        } else {
            fetchOrder(); 
        }
        enqueueSnackbar('Configuration mise a jour', { variant: 'success' });
    };

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
            const initialParamValues = {};
            if (data.items) {
                data.items.forEach(item => {
                    initialResults[item.id] = {
                        result_value: item.result_value || '',
                        technician_notes: item.technician_notes || ''
                    };
                    // Initialize structured parameter values from existing results
                    if (item.parameter_results && item.parameter_results.length > 0) {
                        initialParamValues[item.id] = {};
                        item.parameter_results.forEach(pv => {
                            initialParamValues[item.id][pv.parameter] = {
                                result_numeric: pv.result_numeric !== null ? String(pv.result_numeric) : '',
                                result_text: pv.result_text || ''
                            };
                        });
                    }
                });
            }
            setResults(initialResults);
            setParameterValues(initialParamValues);

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

    const handleParameterValueChange = (itemId, paramId, field, value) => {
        setParameterValues(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                [paramId]: {
                    ...(prev[itemId]?.[paramId] || {}),
                    [field]: value
                }
            }
        }));
    };

    /**
     * Compute H / L / H* / L* / N flag for a numeric value against a parameter's reference ranges.
     * Returns '' if value is empty.
     */
    const computeFlag = (numValue, param, patientGender, patientAge) => {
        if (numValue === '' || numValue === null || numValue === undefined) return '';
        const v = parseFloat(numValue);
        if (isNaN(v)) return '';

        const isChild = patientAge !== null && patientAge !== undefined && v < (param.child_age_max_years || 17);

        let refMin, refMax;
        if (isChild) {
            refMin = param.child_ref_min;
            refMax = param.child_ref_max;
        } else if (patientGender === 'M') {
            refMin = param.adult_ref_min_male ?? param.adult_ref_min_general;
            refMax = param.adult_ref_max_male ?? param.adult_ref_max_general;
        } else if (patientGender === 'F') {
            refMin = param.adult_ref_min_female ?? param.adult_ref_min_general;
            refMax = param.adult_ref_max_female ?? param.adult_ref_max_general;
        } else {
            refMin = param.adult_ref_min_general;
            refMax = param.adult_ref_max_general;
        }

        if (param.critical_low !== null && param.critical_low !== undefined && v <= parseFloat(param.critical_low)) return 'L*';
        if (param.critical_high !== null && param.critical_high !== undefined && v >= parseFloat(param.critical_high)) return 'H*';
        if (refMin !== null && refMin !== undefined && v < parseFloat(refMin)) return 'L';
        if (refMax !== null && refMax !== undefined && v > parseFloat(refMax)) return 'H';
        return 'N';
    };

    const saveResults = async () => {
        try {
            const itemsToUpdate = Object.keys(results).map(itemId => {
                const entry = { item_id: itemId, ...results[itemId] };
                // Include structured parameter values if this is a compound test
                const pvMap = parameterValues[itemId];
                if (pvMap && Object.keys(pvMap).length > 0) {
                    entry.parameter_values = Object.entries(pvMap)
                        .filter(([, val]) => val.result_numeric !== '' || val.result_text)
                        .map(([paramId, val]) => ({
                            parameter_id: paramId,
                            result_numeric: val.result_numeric !== '' ? val.result_numeric : null,
                            result_text: val.result_text || ''
                        }));
                }
                return entry;
            });

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
                    {order.status === 'in_progress' && (
                        <Button data-testid="lab-detail-btn-report-provisional" variant="outlined" color="warning" startIcon={<PdfIcon />} onClick={() => handleOpenPrintModal('report')} sx={{ mr: 1 }}>
                            Rapport Provisoire
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
                            <TableCell>EXAMEN / TEST</TableCell>
                            <TableCell width="25%">RÉSULTAT</TableCell>
                            <TableCell>UNITÉS</TableCell>
                            <TableCell>VALEURS DE RÉFÉRENCE</TableCell>
                            <TableCell>ANTÉRIEUR</TableCell>
                            <TableCell>FLAG</TableCell>
                            <TableCell width="80px">ACTIONS</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {order.items?.map((item) => {
                            const patientGender = order.patient_gender;
                            const patientAge = order.patient?.age ?? null;

                            // ─── COMPOUND TEST (e.g. NFS) ───────────────────────────────────────────
                            if (item.has_parameters && item.parameters?.length > 0) {
                                // Group parameters by group_name
                                const groups = {};
                                item.parameters.forEach(param => {
                                    const g = param.group_name || 'Paramètres';
                                    if (!groups[g]) groups[g] = [];
                                    groups[g].push(param);
                                });

                                const getRefDisplay = (param) => {
                                    let refMin, refMax;
                                    if (patientGender === 'M') {
                                        refMin = param.adult_ref_min_male ?? param.adult_ref_min_general;
                                        refMax = param.adult_ref_max_male ?? param.adult_ref_max_general;
                                    } else if (patientGender === 'F') {
                                        refMin = param.adult_ref_min_female ?? param.adult_ref_min_general;
                                        refMax = param.adult_ref_max_female ?? param.adult_ref_max_general;
                                    } else {
                                        refMin = param.adult_ref_min_general;
                                        refMax = param.adult_ref_max_general;
                                    }

                                    const minVal = (refMin !== null && refMin !== undefined && refMin !== '') ? parseFloat(refMin) : null;
                                    const maxVal = (refMax !== null && refMax !== undefined && refMax !== '') ? parseFloat(refMax) : null;

                                    if (minVal !== null && maxVal !== null) return `${minVal} – ${maxVal}`;
                                    if (minVal !== null) return `≥ ${minVal}`;
                                    if (maxVal !== null) return `≤ ${maxVal}`;
                                    return '—';
                                };

                                const getFlagStyle = (flag) => {
                                    if (flag === 'H' || flag === 'H*') return { color: '#dc2626', fontWeight: 700 };
                                    if (flag === 'L' || flag === 'L*') return { color: '#2563eb', fontWeight: 700 };
                                    return {};
                                };

                                return (
                                    <TableRow key={item.id} sx={{ verticalAlign: 'top' }}>
                                        <TableCell colSpan={7} sx={{ p: 0 }}>
                                            <Box sx={{ p: 1.5 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Typography variant="subtitle2" fontWeight={700} sx={{ mr: 1 }}>{item.test_name}</Typography>
                                                        <Tooltip title="Configurer l'unite et le facteur de conversion">
                                                            <IconButton size="small" onClick={() => handleEditTest(item.lab_test)} color="secondary">
                                                                <SettingsIcon sx={{ fontSize: 16 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                    <IconButton size="small" onClick={() => handleShowHistory(item)} title="Historique" color="primary">
                                                        <HistoryIcon fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                                {Object.entries(groups).map(([groupName, params]) => (
                                                    <Box key={groupName} sx={{ mb: 1 }}>
                                                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', bgcolor: '#eff6ff', px: 1, py: 0.3, borderRadius: 0.5, mb: 0.5 }}>
                                                            {groupName}
                                                        </Typography>
                                                        <Table size="small" sx={{ '& td': { py: 0.3, px: 0.8 } }}>
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell sx={{ width: '10%', fontWeight: 700, fontSize: '0.7rem', color: '#6b7280' }}>Code</TableCell>
                                                                    <TableCell sx={{ width: '28%', fontWeight: 700, fontSize: '0.7rem', color: '#6b7280' }}>Paramètre</TableCell>
                                                                    <TableCell sx={{ width: '18%', fontWeight: 700, fontSize: '0.7rem', color: '#6b7280' }}>Résultat</TableCell>
                                                                    <TableCell sx={{ width: '6%', fontWeight: 700, fontSize: '0.7rem', color: '#6b7280' }}>Flag</TableCell>
                                                                    <TableCell sx={{ width: '14%', fontWeight: 700, fontSize: '0.7rem', color: '#6b7280' }}>Unité</TableCell>
                                                                    <TableCell sx={{ width: '24%', fontWeight: 700, fontSize: '0.7rem', color: '#6b7280' }}>Plage réf.</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {params.map(param => {
                                                                    const isNumeric = param.value_type === 'numeric';
                                                                    const isPosNeg = param.value_type === 'pos_neg';

                                                                    // Read current value from the right field based on value_type
                                                                    const pvState = parameterValues[item.id]?.[param.id] || {};
                                                                    const currentVal = isNumeric
                                                                        ? (pvState.result_numeric ?? '')
                                                                        : (pvState.result_text ?? '');

                                                                    const existingResult = item.parameter_results?.find(pr => pr.parameter === param.id);
                                                                    const displayVal = canEdit
                                                                        ? currentVal
                                                                        : (isNumeric
                                                                            ? (existingResult?.result_numeric ?? '')
                                                                            : (existingResult?.result_text ?? ''));

                                                                    // Flag only makes sense for numeric parameters
                                                                    const flag = isNumeric
                                                                        ? (canEdit
                                                                            ? computeFlag(currentVal, param, patientGender, patientAge)
                                                                            : (existingResult?.flag || ''))
                                                                        : '';
                                                                    const flagStyle = getFlagStyle(flag);
                                                                    const isCritical = flag === 'H*' || flag === 'L*';

                                                                    // Reference range only shown for numeric params
                                                                    const refDisplay = isNumeric ? getRefDisplay(param) : '';

                                                                    return (
                                                                        <TableRow key={param.id} sx={isCritical ? { bgcolor: '#fef9c3' } : {}}>
                                                                            <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{param.code}</TableCell>
                                                                            <TableCell sx={{ fontSize: '0.75rem', color: '#374151' }}>{param.name}</TableCell>
                                                                            <TableCell>
                                                                                {canEdit ? (
                                                                                    isNumeric ? (
                                                                                        <TextField
                                                                                            size="small"
                                                                                            type="number"
                                                                                            value={currentVal}
                                                                                            onChange={(e) => handleParameterValueChange(item.id, param.id, 'result_numeric', e.target.value)}
                                                                                            inputProps={{ step: 'any' }}
                                                                                            sx={{ width: 90, '& input': { fontSize: '0.8rem', py: 0.4, ...flagStyle } }}
                                                                                        />
                                                                                    ) : isPosNeg ? (
                                                                                        <Select
                                                                                            size="small"
                                                                                            value={currentVal}
                                                                                            onChange={(e) => handleParameterValueChange(item.id, param.id, 'result_text', e.target.value)}
                                                                                            displayEmpty
                                                                                            sx={{ fontSize: '0.8rem', minWidth: 120 }}
                                                                                        >
                                                                                            <MenuItem value=""><em>—</em></MenuItem>
                                                                                            <MenuItem value="Négatif">Négatif</MenuItem>
                                                                                            <MenuItem value="Positif">Positif</MenuItem>
                                                                                        </Select>
                                                                                    ) : (
                                                                                        /* text type — free text input (e.g. stool culture, morphology descriptions) */
                                                                                        <TextField
                                                                                            size="small"
                                                                                            value={currentVal}
                                                                                            onChange={(e) => handleParameterValueChange(item.id, param.id, 'result_text', e.target.value)}
                                                                                            placeholder="Résultat"
                                                                                            sx={{ minWidth: 160, '& input': { fontSize: '0.8rem', py: 0.4 } }}
                                                                                        />
                                                                                    )
                                                                                ) : (
                                                                                    <Typography variant="body2" fontWeight={isNumeric ? 700 : 400} sx={flagStyle}>
                                                                                        {displayVal !== '' && displayVal !== null ? String(displayVal) : '—'}
                                                                                    </Typography>
                                                                                )}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {/* Flag arrow only for numeric out-of-range results */}
                                                                                {flag && flag !== 'N' && (
                                                                                    <Typography variant="caption" sx={{ ...flagStyle, bgcolor: isCritical ? '#fef9c3' : 'transparent', px: 0.5, borderRadius: 0.5 }}>
                                                                                        {flag === 'H' ? '↑' : flag === 'L' ? '↓' : flag === 'H*' ? '↑↑' : '↓↓'}
                                                                                    </Typography>
                                                                                )}
                                                                            </TableCell>
                                                                            {/* Unit — hidden when not applicable */}
                                                                            <TableCell sx={{ py: 0.3 }}>
                                                                                <QuickConfigSelector 
                                                                                    item={item} 
                                                                                    parameter={param} 
                                                                                    onConfigChanged={onTestSaved} 
                                                                                    canEdit={canEdit}
                                                                                    currentValues={parameterValues}
                                                                                    updateValue={handleParameterValueChange}
                                                                                    patientGender={order.patient_gender}
                                                                                />
                                                                            </TableCell>
                                                                            {/* Ref range — only shown for numeric parameters */}
                                                                            <TableCell sx={{ fontSize: '0.72rem', color: '#6b7280' }}>{refDisplay}</TableCell>
                                                                        </TableRow>
                                                                    );
                                                                })}
                                                            </TableBody>
                                                        </Table>
                                                    </Box>
                                                ))}
                                                {/* Optional notes for compound tests */}
                                                {canEdit && (
                                                    <RichTextEditor
                                                        value={results[item.id]?.technician_notes || ''}
                                                        onChange={(val) => handleResultChange(item.id, 'technician_notes', val)}
                                                        placeholder="Commentaires du technicien (optionnel)"
                                                        minHeight={40}
                                                        onExpand={() => openWysiwygModal(item.id, 'technician_notes', `Notes — ${item.test_name}`)}
                                                    />
                                                )}
                                                {!canEdit && item.technician_notes && (
                                                    <Typography variant="body2" component="div" dangerouslySetInnerHTML={{ __html: item.technician_notes }} sx={{ mt: 1, fontSize: '0.75rem', color: '#4b5563', '& p': { my: 0 } }} />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {item.is_abnormal && <Chip label="ANORMAL" color="error" size="small" />}
                                        </TableCell>
                                    </TableRow>
                                );
                            }

                            // ─── SIMPLE TEST ─────────────────────────────────────────────────────────
                            const useLargeLayout = item.lab_test_data?.use_large_layout;

                            if (useLargeLayout) {
                                return (
                                    <TableRow key={item.id}>
                                        <TableCell colSpan={7} sx={{ p: 2 }}>
                                            <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 2, bgcolor: '#f9fafb' }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mr: 1, color: '#111827' }}>
                                                            {item.test_name}
                                                        </Typography>
                                                        <Chip label={item.category_name} size="small" variant="outlined" sx={{ mr: 1 }} />
                                                        <Tooltip title="Configurer l'unite et le facteur de conversion">
                                                            <IconButton size="small" onClick={() => handleEditTest(item.lab_test)} color="secondary">
                                                                <SettingsIcon sx={{ fontSize: 16 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                    <Box>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleShowHistory(item)}
                                                            title="Historique"
                                                            color="primary"
                                                            sx={{ mr: 1 }}
                                                        >
                                                            <HistoryIcon fontSize="small" />
                                                        </IconButton>
                                                        {item.is_abnormal && <Chip label="ANORMAL" color="error" size="small" />}
                                                    </Box>
                                                </Box>

                                                <Grid container spacing={2}>
                                                    <Grid item xs={12} md={9}>
                                                        <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>RÉSULTAT</Typography>
                                                        {canEdit ? (
                                                            <Box>
                                                                <RichTextEditor
                                                                    value={results[item.id]?.result_value || ''}
                                                                    onChange={(val) => handleResultChange(item.id, 'result_value', val)}
                                                                    placeholder="Saisir le rapport détaillé..."
                                                                    minHeight={250}
                                                                    onExpand={() => openWysiwygModal(item.id, 'result_value', `Résultat — ${item.test_name}`)}
                                                                />
                                                                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                                                    {item.result_template && (
                                                                        <Button
                                                                            size="small"
                                                                            variant="outlined"
                                                                            color="secondary"
                                                                            onClick={() => {
                                                                                const html = item.result_template
                                                                                    .split('\n')
                                                                                    .map(line => `<p>${line.trim() || '<br>'}</p>`)
                                                                                    .join('');
                                                                                handleResultChange(item.id, 'result_value', html);
                                                                            }}
                                                                        >
                                                                            Charger le modèle
                                                                        </Button>
                                                                    )}
                                                                    <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        color="primary"
                                                                        onClick={() => handleSaveAsTemplate(item.id)}
                                                                        disabled={!results[item.id]?.result_value}
                                                                    >
                                                                        Définir comme modèle par défaut
                                                                    </Button>
                                                                </Box>
                                                            </Box>
                                                        ) : (
                                                            <Paper variant="outlined" sx={{ p: 2, minHeight: 100, bgcolor: 'white' }}>
                                                                <Typography
                                                                    component="div"
                                                                    dangerouslySetInnerHTML={{ __html: item.result_value || '<em style="color:#9ca3af">Aucun résultat saisi</em>' }}
                                                                    sx={{ '& ul, & ol': { pl: 2 }, '& p': { my: 0 } }}
                                                                />
                                                            </Paper>
                                                        )}
                                                    </Grid>
                                                    <Grid item xs={12} md={3}>
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                            <Box>
                                                                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>UNITÉ & RÉFÉRENCE</Typography>
                                                                <Box sx={{ mb: 1 }}>
                                                                    <QuickConfigSelector 
                                                                        item={item} 
                                                                        onConfigChanged={onTestSaved} 
                                                                        canEdit={canEdit}
                                                                        currentValues={results}
                                                                        updateValue={handleResultChange}
                                                                        patientGender={order.patient_gender}
                                                                    />
                                                                </Box>
                                                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                                    Ref: {(() => {
                                                                        const gender = order.patient_gender;
                                                                        if (gender === 'M') return item.normal_range_male || item.normal_range_general || 'N/A';
                                                                        if (gender === 'F') return item.normal_range_female || item.normal_range_general || 'N/A';
                                                                        return item.normal_range_general || 'N/A';
                                                                    })()}
                                                                </Typography>
                                                            </Box>

                                                            <Box>
                                                                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>NOTES TECHNIQUES</Typography>
                                                                {canEdit ? (
                                                                    <RichTextEditor
                                                                        value={results[item.id]?.technician_notes || ''}
                                                                        onChange={(val) => handleResultChange(item.id, 'technician_notes', val)}
                                                                        placeholder="Notes..."
                                                                        minHeight={80}
                                                                    />
                                                                ) : (
                                                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                                        {item.technician_notes ? (
                                                                            <div dangerouslySetInnerHTML={{ __html: item.technician_notes }} />
                                                                        ) : 'Aucune note'}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    </Grid>
                                                </Grid>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                            }

                            return (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Typography variant="body2" fontWeight="bold" sx={{ mr: 1 }}>{item.test_name}</Typography>
                                            <Tooltip title="Configurer l'unite et le facteur de conversion">
                                                <IconButton size="small" onClick={() => handleEditTest(item.lab_test)} color="secondary">
                                                    <SettingsIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
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
                                                <Box sx={{ mt: 0.5, display: 'flex', gap: 1 }}>
                                                    {item.result_template && (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            color="secondary"
                                                            sx={{ fontSize: '0.7rem', py: 0.3 }}
                                                            onClick={() => {
                                                                const html = item.result_template
                                                                    .split('\n')
                                                                    .map(line => `<p>${line.trim() || '<br>'}</p>`)
                                                                    .join('');
                                                                handleResultChange(item.id, 'result_value', html);
                                                            }}
                                                        >
                                                            Modèle
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="small"
                                                        variant="text"
                                                        color="primary"
                                                        sx={{ fontSize: '0.7rem', py: 0.3 }}
                                                        onClick={() => handleSaveAsTemplate(item.id)}
                                                        disabled={!results[item.id]?.result_value}
                                                    >
                                                        Enr. Modèle
                                                    </Button>
                                                </Box>
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
                                    <TableCell>
                                        <QuickConfigSelector 
                                            item={item} 
                                            onConfigChanged={onTestSaved} 
                                            canEdit={canEdit}
                                            currentValues={results}
                                            updateValue={handleResultChange}
                                            patientGender={order.patient_gender}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.75rem', whiteSpace: 'pre-line', verticalAlign: 'top', maxWidth: 180, color: '#6b7280' }}>
                                        {(() => {
                                            const gender = order.patient_gender;
                                            if (gender === 'M') {
                                                return item.normal_range_male || item.normal_range_general || '';
                                            } else if (gender === 'F') {
                                                return item.normal_range_female || item.normal_range_general || '';
                                            }
                                            return item.normal_range_general || item.normal_range_male || '';
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
                            );
                        })}
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

            <LabTestFormModal
                open={testModalOpen}
                onClose={() => setTestModalOpen(false)}
                test={selectedTestForEdit}
                onSaved={onTestSaved}
            />
        </Box>
    );
};

export default LabOrderDetail;
