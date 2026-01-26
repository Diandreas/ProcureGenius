import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    Typography,
    Divider
} from '@mui/material';
import {
    Edit as EditIcon,
    PictureAsPdf as PdfIcon,
    ArrowBack as ArrowBackIcon,
    Receipt as ReceiptIcon,
    AttachMoney as InvoiceIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import consultationAPI from '../../../services/consultationAPI';
import { invoicesAPI } from '../../../services/api';
import PrintModal from '../../../components/PrintModal';
import ConsultationTimer from '../../../components/healthcare/ConsultationTimer';

const ConsultationDetail = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();

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


    if (loading || !consultation) return <Typography>Chargement...</Typography>;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/healthcare/consultations')} sx={{ mr: 2 }}>
                        Retour
                    </Button>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                        Consultation du {new Date(consultation.consultation_date).toLocaleDateString()}
                    </Typography>
                </Box>
                <Box>
                    <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<ReceiptIcon />}
                        onClick={() => handleOpenPrintModal('receipt')}
                        sx={{ mr: 1 }}
                    >
                        Imprimer Reçu
                    </Button>

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
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/healthcare/consultations/${id}/edit`)}
                    >
                        Modifier / Compléter
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
                />
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Patient</Typography>
                            <Typography variant="h5" color="primary">{consultation.patient_name}</Typography>
                            <Typography variant="body2">{consultation.patient_number}</Typography>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="caption">Signes Vitaux</Typography>
                            <Grid container spacing={1} sx={{ mt: 1 }}>
                                <Grid item xs={6}><Typography variant="body2"><strong>TA:</strong> {consultation.blood_pressure || '-'}</Typography></Grid>
                                <Grid item xs={6}><Typography variant="body2"><strong>T°:</strong> {consultation.temperature || '-'} °C</Typography></Grid>
                                <Grid item xs={6}><Typography variant="body2"><strong>Poids:</strong> {consultation.weight || '-'} kg</Typography></Grid>
                                <Grid item xs={6}><Typography variant="body2"><strong>Pls:</strong> {consultation.heart_rate || '-'} bpm</Typography></Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Notes Médicales</Typography>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary">Motif</Typography>
                                <Typography variant="body1">{consultation.chief_complaint}</Typography>
                            </Box>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary">Examen Physique</Typography>
                                <Typography variant="body1">{consultation.physical_examination || '-'}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Diagnostic</Typography>
                                <Typography variant="body1" fontWeight="bold">{consultation.diagnosis || '-'}</Typography>
                            </Box>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Prescription (Ordonnance)</Typography>
                            <Typography color="text.secondary" fontStyle="italic">
                                Voir la section modification pour les détails des médicaments.
                            </Typography>
                        </CardContent>
                    </Card>
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
