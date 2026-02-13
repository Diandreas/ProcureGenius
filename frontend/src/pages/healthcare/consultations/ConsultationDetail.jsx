import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    Typography,
    Divider,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Stack,
    Paper
} from '@mui/material';
import {
    Edit as EditIcon,
    PictureAsPdf as PdfIcon,
    ArrowBack as ArrowBackIcon,
    Receipt as ReceiptIcon,
    AttachMoney as InvoiceIcon,
    ArrowForward as ArrowForwardIcon,
    ExpandMore as ExpandMoreIcon,
    Medication as MedicationIcon,
    Science as ScienceIcon,
    Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import consultationAPI from '../../../services/consultationAPI';
import { invoicesAPI } from '../../../services/api';
import PrintModal from '../../../components/PrintModal';
import { formatDate } from '../../../utils/formatters';
import ConsultationTimer from '../../../components/healthcare/ConsultationTimer';

const ConsultationDetail = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(true);
    const [consultation, setConsultation] = useState(null);

    // Print Modal State
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [printModalType, setPrintModalType] = useState(null); // 'report', 'prescription', or 'receipt'
    const [generatingPdf, setGeneratingPdf] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await consultationAPI.getConsultation(id);
            setConsultation(data);
        } catch (error) {
            console.error('Error fetching consultation:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTimerStart = async (timestamp) => {
        try {
            await consultationAPI.updateConsultation(id, { started_at: timestamp });
            // Refresh data to show updated timer
            fetchData();
        } catch (error) {
            console.error('Error updating start time:', error);
        }
    };

    const handleTimerEnd = async (timestamp) => {
        try {
            await consultationAPI.updateConsultation(id, { ended_at: timestamp });
            // Refresh data to show updated timer
            fetchData();
        } catch (error) {
            console.error('Error updating end time:', error);
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
                blob = await consultationAPI.getConsultationReportPDF(id);
                filename = `rapport_consultation_${consultation.consultation_number}.pdf`;
            } else if (printModalType === 'receipt') {
                blob = await consultationAPI.getConsultationReceiptPDF(id);
                filename = `recu_consultation_${consultation.consultation_number}.pdf`;
            } else if (printModalType === 'prescription') {
                if (consultation.prescriptions && consultation.prescriptions.length > 0) {
                    const prescriptionId = consultation.prescriptions[0].id;
                    blob = await consultationAPI.getPrescriptionPDF(prescriptionId);
                    filename = `ordonnance_${consultation.consultation_number}.pdf`;
                } else {
                    alert('Aucune ordonnance trouvée');
                    setGeneratingPdf(false);
                    return;
                }
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
            console.error('Error handling PDF action:', error);
            alert('Erreur lors de la génération du PDF');
        } finally {
            setGeneratingPdf(false);
        }
    };

    const handleNextPatient = async () => {
        try {
            setLoading(true);
            const nextPatient = await consultationAPI.getNextPatient();
            if (nextPatient && nextPatient.id) {
                enqueueSnackbar('✅ Passage au patient suivant...', { variant: 'info' });
                navigate(`/healthcare/consultations/${nextPatient.id}/edit`);
            } else {
                enqueueSnackbar('✅ Plus de patients en attente', { variant: 'success' });
                navigate('/healthcare/consultations');
            }
        } catch (error) {
            console.error('Error getting next patient:', error);
            enqueueSnackbar('Plus de patients en attente', { variant: 'info' });
            navigate('/healthcare/consultations');
        } finally {
            setLoading(false);
        }
    };


    if (loading || !consultation) return <Typography>Chargement...</Typography>;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/healthcare/consultations')} sx={{ mr: 2 }}>
                        Retour
                    </Button>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                        Consultation du {formatDate(consultation.consultation_date)}
                    </Typography>
                </Box>
                <Box>


                    <Button
                        variant="outlined"
                        startIcon={<PdfIcon />}
                        onClick={() => handleOpenPrintModal('report')}
                        sx={{ mr: 1 }}
                    >
                        Rapport Complet
                    </Button>

                    {consultation.prescriptions && consultation.prescriptions.length > 0 && (
                        <Button
                            variant="outlined"
                            startIcon={<PdfIcon />}
                            onClick={() => handleOpenPrintModal('prescription')}
                            sx={{ mr: 1 }}
                        >
                            Ordonnance
                        </Button>
                    )}

                    <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/healthcare/consultations/${id}/edit`)}
                        sx={{ mr: 1 }}
                    >
                        Modifier
                    </Button>
                    <Button
                        variant="contained"
                        endIcon={<ArrowForwardIcon />}
                        onClick={handleNextPatient}
                        color="primary"
                        disabled={loading}
                    >
                        Patient Suivant
                    </Button>
                </Box>
            </Box>

            {/* Timer Component */}
            <Box sx={{ mb: 3 }}>
                <ConsultationTimer
                    onStart={handleTimerStart}
                    onEnd={handleTimerEnd}
                    initialStartTime={consultation.started_at}
                    initialEndTime={consultation.ended_at}
                    compact={true}
                />
            </Box>

            {/* Ultra-Compact Layout with better space usage */}
            <Grid container spacing={1.5}>
                {/* Left Column: Patient Info + Vitals - More compact */}
                <Grid item xs={12} md={3}>
                    <Paper elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <Typography
                            variant="subtitle2"
                            color="primary"
                            sx={{
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '1rem',
                                mb: 0.5,
                                '&:hover': { textDecoration: 'underline' }
                            }}
                            onClick={() => navigate(`/healthcare/patients/${consultation.patient}`)}
                        >
                            {consultation.patient_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            {consultation.patient_number}
                        </Typography>

                        <Divider sx={{ my: 1 }} />

                        {/* Vitals - Super compact grid */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                            <Chip label={`TA: ${consultation.blood_pressure || '-'} mmHg`} size="small" sx={{ fontSize: '0.7rem' }} />
                            <Chip label={`T°: ${consultation.temperature || '-'}°C`} size="small" sx={{ fontSize: '0.7rem' }} />
                            <Chip label={`FC: ${consultation.heart_rate || '-'} pls/min`} size="small" sx={{ fontSize: '0.7rem' }} />
                            <Chip label={`SPO2: ${consultation.oxygen_saturation || '-'}%`} size="small" sx={{ fontSize: '0.7rem' }} />
                            <Chip label={`FR: ${consultation.respiratory_rate || '-'} c/min`} size="small" sx={{ fontSize: '0.7rem' }} />
                            <Chip label={`Gly: ${consultation.blood_glucose || '-'} g/L`} size="small" sx={{ fontSize: '0.7rem' }} />
                            <Chip label={`P: ${consultation.weight || '-'} kg`} size="small" sx={{ fontSize: '0.7rem' }} />
                            <Chip label={`T: ${consultation.height || '-'} cm`} size="small" sx={{ fontSize: '0.7rem' }} />
                        </Box>
                    </Paper>
                </Grid>

                {/* Middle Column: Clinical Info */}
                <Grid item xs={12} md={6}>
                    {/* Motif + Diagnostic - Inline compact */}
                    <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <Stack spacing={1}>
                            <Box>
                                <Typography variant="caption" fontWeight="700" color="text.secondary">MOTIF</Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{consultation.chief_complaint}</Typography>
                            </Box>

                            {consultation.physical_examination && (
                                <Box>
                                    <Typography variant="caption" fontWeight="700" color="text.secondary">EXAMEN</Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{consultation.physical_examination}</Typography>
                                </Box>
                            )}

                            {consultation.diagnosis && (
                                <Box>
                                    <Typography variant="caption" fontWeight="700" color="text.secondary">DIAGNOSTIC</Typography>
                                    <Typography variant="body2" fontWeight="700" color="error.main" sx={{ fontSize: '0.9rem' }}>
                                        {consultation.diagnosis}
                                    </Typography>
                                </Box>
                            )}

                            {consultation.treatment_plan && (
                                <Box>
                                    <Typography variant="caption" fontWeight="700" color="text.secondary">PLAN DE TRAITEMENT</Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{consultation.treatment_plan}</Typography>
                                </Box>
                            )}
                        </Stack>
                    </Paper>

                    {/* Accordions for Prescriptions */}
                    <Accordion defaultExpanded elevation={0} sx={{ border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <MedicationIcon fontSize="small" color="primary" />
                                <Typography variant="body2" fontWeight="700">
                                    Ordonnance ({consultation.prescriptions?.length || 0})
                                </Typography>
                            </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 1.5, pt: 0 }}>
                            {consultation.prescriptions && consultation.prescriptions.length > 0 ? (
                                consultation.prescriptions.map((prescription, idx) => (
                                    <Box key={idx}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                            {prescription.prescription_number}
                                        </Typography>
                                        {prescription.items && prescription.items.length > 0 ? (
                                            <Stack spacing={0.3} sx={{ mt: 0.5 }}>
                                                {prescription.items.map((item, itemIdx) => (
                                                    <Box key={itemIdx} sx={{ pl: 1, borderLeft: '2px solid', borderColor: 'primary.light' }}>
                                                        <Typography variant="body2" fontWeight="600" sx={{ fontSize: '0.8rem' }}>
                                                            {itemIdx + 1}. {item.medication_name}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                                            {item.dosage} - {item.frequency} {item.duration && `(${item.duration})`}
                                                        </Typography>
                                                    </Box>
                                                ))}
                                            </Stack>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">Aucun médicament</Typography>
                                        )}
                                    </Box>
                                ))
                            ) : (
                                <Typography variant="caption" color="text.secondary" fontStyle="italic">
                                    Aucune ordonnance
                                </Typography>
                            )}
                        </AccordionDetails>
                    </Accordion>

                    {/* Lab Tests Accordion */}
                    {consultation.lab_orders_data && consultation.lab_orders_data.length > 0 && (
                        <Accordion defaultExpanded elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mt: 1, '&:before': { display: 'none' } }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <ScienceIcon fontSize="small" color="success" />
                                    <Typography variant="body2" fontWeight="700">
                                        Examens Prescrits ({consultation.lab_orders_data.length})
                                    </Typography>
                                </Stack>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 1.5, pt: 0 }}>
                                {consultation.lab_orders_data.map((order, idx) => (
                                    <Box key={idx}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                            {order.order_number}
                                        </Typography>
                                        {order.tests && order.tests.length > 0 ? (
                                            <Stack spacing={0.3} sx={{ mt: 0.5 }}>
                                                {order.tests.map((test, testIdx) => (
                                                    <Box key={testIdx} sx={{ pl: 1, borderLeft: '2px solid', borderColor: 'success.light' }}>
                                                        <Typography variant="body2" fontWeight="600" sx={{ fontSize: '0.8rem' }}>
                                                            {testIdx + 1}. {test.test_name}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                                            {test.test_code} - {test.price} XAF
                                                        </Typography>
                                                    </Box>
                                                ))}
                                            </Stack>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">Aucun examen</Typography>
                                        )}
                                    </Box>
                                ))}
                            </AccordionDetails>
                        </Accordion>
                    )}
                </Grid>

                {/* Right Column: Notes & Instructions (if any) */}
                <Grid item xs={12} md={3}>
                    {consultation.patient_instructions && (
                        <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, border: '1px solid', borderColor: 'info.light', borderRadius: 2, bgcolor: 'info.lighter' }}>
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
                                <AssignmentIcon fontSize="small" color="info" />
                                <Typography variant="caption" fontWeight="700" color="info.dark">INSTRUCTIONS PATIENT</Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                {consultation.patient_instructions}
                            </Typography>
                        </Paper>
                    )}

                    {consultation.private_notes && (
                        <Paper elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: 'warning.light', borderRadius: 2, bgcolor: 'warning.lighter' }}>
                            <Typography variant="caption" fontWeight="700" color="warning.dark" display="block" sx={{ mb: 0.5 }}>
                                NOTES PRIVÉES
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                {consultation.private_notes}
                            </Typography>
                        </Paper>
                    )}
                </Grid>
            </Grid>

            <PrintModal
                open={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                title={
                    printModalType === 'report' ? "Rapport Complet" :
                        printModalType === 'receipt' ? "Reçu de Consultation" :
                            printModalType === 'prescription' ? "Ordonnance" :
                                "Document"
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

export default ConsultationDetail;
