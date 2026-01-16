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
    Stack
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
    AttachMoney as InvoiceIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';
import patientAPI from '../../../services/patientAPI';
import { invoicesAPI } from '../../../services/api';
import PrintModal from '../../../components/PrintModal';

const LabOrderDetail = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);
    const [results, setResults] = useState({}); // { item_id: { result_value, remarks } }
    const isNewOrder = id === 'new';

    // New order form state
    const [patients, setPatients] = useState([]);
    const [availableTests, setAvailableTests] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [selectedTests, setSelectedTests] = useState([]);
    const [priority, setPriority] = useState('routine');
    const [clinicalNotes, setClinicalNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Print Modal State
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [printModalType, setPrintModalType] = useState(null); // 'receipt', 'report', 'barcodes'
    const [generatingPdf, setGeneratingPdf] = useState(false);

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

            await laboratoryAPI.enterResults(id, { results: itemsToUpdate });
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
            await laboratoryAPI.updateStatus(id, { action: 'verify' });
            enqueueSnackbar('Résultats validés', { variant: 'success' });
            navigate('/healthcare/laboratory');
        } catch (error) {
            console.error('Error validating:', error);
            enqueueSnackbar('Erreur de validation', { variant: 'error' });
        }
    };

    const handleOpenPrintModal = (type) => {
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
            } else if (printModalType === 'barcodes') {
                blob = await laboratoryAPI.getBarcodesPDF(id);
                filename = `barcodes_${order.order_number}.pdf`;
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
                payment_method: 'cash',
                notes: `Paiement pour commande labo ${order.order_number}`
            };
            await invoicesAPI.markPaid(order.lab_invoice.id, paymentData);
            enqueueSnackbar('Facture marquée comme payée', { variant: 'success' });
            fetchOrder(); // Refresh to update invoice status
        } catch (error) {
            console.error('Error marking invoice as paid:', error);
            enqueueSnackbar('Erreur lors du marquage de la facture', { variant: 'error' });
        }
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
                test_ids: selectedTests.map(t => t.id),
                priority: priority,
                clinical_notes: clinicalNotes
            };

            const newOrder = await laboratoryAPI.createOrder(orderData);
            enqueueSnackbar('Commande créée avec succès', { variant: 'success' });
            navigate(`/healthcare/laboratory/${newOrder.id}`);
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
            setSelectedTests([...selectedTests, test]);
        }
    };

    const getTotalPrice = () => {
        return selectedTests.reduce((sum, test) => sum + parseFloat(test.price || 0), 0);
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
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="body2" color="text.secondary">Tests sélectionnés</Typography>
                                                <Typography variant="h6">{selectedTests.length}</Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
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

    const canEdit = ['pending', 'sample_collected', 'received', 'analyzing', 'results_entered', 'completed'].includes(order.status);

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
                    {['results_entered', 'verified', 'results_delivered', 'completed'].includes(order.status) && (
                        <Button variant="outlined" startIcon={<PdfIcon />} onClick={() => handleOpenPrintModal('report')} sx={{ mr: 1 }}>
                            Rapport Complet
                        </Button>
                    )}

                    {!isNewOrder && (
                        <>
                            <Button
                                variant="outlined"
                                color="primary"
                                startIcon={<ReceiptIcon />}
                                onClick={() => handleOpenPrintModal('receipt')}
                                sx={{ mr: 1 }}
                            >
                                Imprimer Reçu
                            </Button>

                            <Button variant="outlined" startIcon={<QrCodeIcon />} onClick={() => handleOpenPrintModal('barcodes')} sx={{ mr: 1 }}>
                                Étiquettes
                            </Button>

                            {order.lab_invoice ? (
                                <>
                                    <Button
                                        variant="outlined"
                                        color="success"
                                        startIcon={<InvoiceIcon />}
                                        onClick={() => navigate(`/invoices/${order.lab_invoice.id}`)}
                                        sx={{ mr: 1 }}
                                    >
                                        Voir Facture
                                    </Button>
                                    {order.lab_invoice.status !== 'paid' && (
                                        <Button
                                            variant="contained"
                                            color="success"
                                            startIcon={<InvoiceIcon />}
                                            onClick={handleMarkInvoicePaid}
                                            sx={{ mr: 1 }}
                                        >
                                            Marquer Payée
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <Button
                                    variant="contained"
                                    color="success"
                                    startIcon={<InvoiceIcon />}
                                    onClick={handleGenerateInvoice}
                                    sx={{ mr: 1 }}
                                >
                                    Générer Facture
                                </Button>
                            )}
                        </>
                    )}

                    {canEdit && (
                        <>
                            <Button variant="contained" startIcon={<SaveIcon />} onClick={saveResults} sx={{ mr: 1 }}>
                                Enregistrer
                            </Button>
                            <Button variant="contained" color="success" startIcon={<VerifyIcon />} onClick={finalizeOrder}>
                                Valider
                            </Button>
                        </>
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
                                        <Chip label={order.status} color="primary" />
                                    </Box>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Priorité</Typography>
                                    <Box sx={{ mt: 0.5 }}>
                                        <Chip label={order.priority} color={order.priority === 'urgent' ? 'error' : 'default'} />
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

            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3 }}>
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
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {order.items?.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell fontWeight="500">{item.test_name}</TableCell>
                                <TableCell>{item.category_name}</TableCell>
                                <TableCell>
                                    {canEdit ? (
                                        <TextField
                                            fullWidth
                                            size="small"
                                            value={results[item.id]?.result_value || ''}
                                            onChange={(e) => handleResultChange(item.id, 'result_value', e.target.value)}
                                            placeholder="Entrer valeur"
                                        />
                                    ) : (
                                        <Typography fontWeight="bold">{item.result_value}</Typography>
                                    )}
                                </TableCell>
                                <TableCell>{item.unit || '-'}</TableCell>
                                <TableCell>
                                    {/* Simplified range display, ideally conditional on gender */}
                                    {item.normal_range || '-'}
                                </TableCell>
                                <TableCell>
                                    {canEdit ? (
                                        <TextField
                                            fullWidth
                                            size="small"
                                            value={results[item.id]?.technician_notes || ''}
                                            onChange={(e) => handleResultChange(item.id, 'technician_notes', e.target.value)}
                                            placeholder="Commentaires du technicien"
                                        />
                                    ) : (
                                        item.technician_notes || '-'
                                    )}
                                </TableCell>
                                <TableCell>
                                    {item.is_abnormal && <Chip label="ANORMAL" color="error" size="small" />}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Print Modal */}
            <PrintModal
                open={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                title={
                    printModalType === 'report' ? 'Rapport Complet' :
                    printModalType === 'receipt' ? 'Reçu Labo' :
                    printModalType === 'barcodes' ? 'Étiquettes Code-Barres' :
                    'Document'
                }
                loading={generatingPdf}
                onPreview={() => handlePrintAction('preview')}
                onPrint={() => handlePrintAction('print')}
                onDownload={() => handlePrintAction('download')}
                helpText="Choisissez une action pour générer le document"
            />
        </Box>
    );
};

export default LabOrderDetail;
