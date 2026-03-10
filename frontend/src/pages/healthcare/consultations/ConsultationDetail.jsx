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
    Paper,
    CircularProgress
} from '@mui/material';
import {
    Edit as EditIcon,
    PictureAsPdf as PdfIcon,
    ArrowBack as ArrowBackIcon,
    ArrowForward as ArrowForwardIcon,
    ExpandMore as ExpandMoreIcon,
    Medication as MedicationIcon,
    Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import useCurrentUser from '../../../hooks/useCurrentUser';
import consultationAPI from '../../../services/consultationAPI';
import PrintModal from '../../../components/PrintModal';
import { formatDate } from '../../../utils/formatters';
import ConsultationTimer from '../../../components/healthcare/ConsultationTimer';

const ConsultationDetail = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useCurrentUser();
    const { id } = useParams();
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(true);
    const [consultation, setConsultation] = useState(null);
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [printModalType, setPrintModalType] = useState(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await consultationAPI.getConsultation(id);
            setConsultation(data);
        } catch (error) {
            console.error('Fetch error:', error);
            enqueueSnackbar('Erreur lors du chargement de la consultation', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const handleTimerAction = async (timestamp, field) => {
        try {
            await consultationAPI.updateConsultation(id, { [field]: timestamp });
            fetchData();
        } catch (error) {
            console.error('Timer update error:', error);
        }
    };

    const handlePrintAction = async (action) => {
        if (!printModalType) return;
        setGeneratingPdf(true);
        try {
            let blob;
            let filename;
            if (printModalType === 'report') {
                blob = await consultationAPI.getConsultationReportPDF(id);
                filename = `rapport_${consultation.consultation_number}.pdf`;
            } else if (printModalType === 'prescription') {
                if (consultation.prescriptions?.length > 0) {
                    blob = await consultationAPI.getPrescriptionPDF(consultation.prescriptions[0].id);
                    filename = `ordonnance_${consultation.consultation_number}.pdf`;
                } else {
                    enqueueSnackbar('Aucune ordonnance', { variant: 'warning' });
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
            } else {
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
            }
            setPrintModalOpen(false);
        } catch (error) {
            console.error('PDF error:', error);
            enqueueSnackbar('Erreur lors de la génération du PDF', { variant: 'error' });
        } finally {
            setGeneratingPdf(false);
        }
    };

    if (loading || !consultation) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/healthcare/consultations')}>Retour</Button>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 600 }}>{consultation.patient_name}</Typography>
                        {consultation.doctor_name && (
                            <Typography variant="body2" color="text.secondary">
                                Terminé par : <strong>{consultation.doctor_name}</strong>
                            </Typography>
                        )}
                    </Box>
                </Stack>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button data-testid="consult-detail-btn-report" variant="outlined" startIcon={<PdfIcon />} onClick={() => { setPrintModalType('report'); setPrintModalOpen(true); }}>Rapport</Button>
                    {(!consultation.status || consultation.status !== 'completed' || (consultation.completed_by === user?.id)) && (
                        <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/healthcare/consultations/${id}/edit`)}>Modifier</Button>
                    )}
                    <Button variant="contained" onClick={async () => {
                        const next = await consultationAPI.getNextPatient();
                        if (next?.id) navigate(`/healthcare/consultations/${next.id}/edit`);
                        else navigate('/healthcare/consultations');
                    }}>Suivant</Button>
                </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
                <ConsultationTimer
                    onStart={(t) => handleTimerAction(t, 'started_at')}
                    onEnd={(t) => handleTimerAction(t, 'ended_at')}
                    initialStartTime={consultation.started_at}
                    initialEndTime={consultation.ended_at}
                    compact
                />
            </Box>

            <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, borderRadius: 2 }}>
                        <Typography variant="h6" color="primary">{consultation.patient_name}</Typography>
                        <Typography variant="caption" display="block" gutterBottom>{consultation.patient_number}</Typography>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                            <Chip label={`T°: ${consultation.temperature || '-'}`} size="small" />
                            <Chip label={`TA: ${consultation.blood_pressure || '-'}`} size="small" />
                            <Chip label={`FC: ${consultation.heart_rate || '-'}`} size="small" />
                            <Chip label={`IMC: ${consultation.bmi || '-'}`} size="small" color="primary" />
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                        <Stack spacing={2}>
                            <Box><Typography variant="caption" fontWeight={700}>MOTIF</Typography><Typography variant="body2">{consultation.chief_complaint}</Typography></Box>
                            <Box><Typography variant="caption" fontWeight={700}>DIAGNOSTIC</Typography><Typography variant="body2" color="error.main" fontWeight={700}>{consultation.diagnosis}</Typography></Box>
                            <Accordion elevation={0}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="caption" fontWeight={700}>ANTÉCÉDENTS</Typography></AccordionSummary>
                                <AccordionDetails>
                                    <Typography variant="caption" display="block">Médicaux: {consultation.antecedents_medical || '-'}</Typography>
                                    <Typography variant="caption" display="block">Chirurgicaux: {consultation.antecedents_surgical || '-'}</Typography>
                                    <Typography variant="caption" display="block">Allergies: {consultation.antecedents_immuno_allergies || '-'}</Typography>
                                </AccordionDetails>
                            </Accordion>
                            <Box><Typography variant="caption" fontWeight={700}>PLAN DE TRAITEMENT</Typography><Typography variant="body2">{consultation.treatment_plan}</Typography></Box>
                        </Stack>
                    </Paper>

                    <Accordion defaultExpanded elevation={0}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'primary.main', color: 'white', borderRadius: 1 }}>
                            <MedicationIcon sx={{ mr: 1 }} fontSize="small" /><Typography variant="body2" fontWeight={700}>ORDONNANCE</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {consultation.prescriptions?.map((p, i) => (
                                <Box key={i} sx={{ mb: 2 }}>
                                    <Typography variant="caption" fontWeight={700}>Ordonnance N° {p.prescription_number}</Typography>
                                    {p.items?.map((item, idx) => (
                                        <Box key={idx} sx={{ pl: 1, borderLeft: '2px solid', borderColor: 'primary.main', mt: 1 }}>
                                            <Typography variant="body2" fontWeight={700}>{item.medication_name} - {item.dosage}</Typography>
                                            <Typography variant="caption" color="text.secondary">{item.frequency} - {item.duration}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                            ))}
                        </AccordionDetails>
                    </Accordion>

                    {(consultation.prescribed_lab_tests_data?.length > 0 || consultation.complementary_exams || consultation.imaging) && (
                        <Accordion defaultExpanded elevation={0} sx={{ mt: 2 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'info.main', color: 'white', borderRadius: 1 }}>
                                <AssignmentIcon sx={{ mr: 1 }} fontSize="small" /><Typography variant="body2" fontWeight={700}>EXAMENS & ANALYSES</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                {consultation.prescribed_lab_tests_data?.length > 0 && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="caption" fontWeight={700} display="block" gutterBottom>LABORATOIRE</Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            {consultation.prescribed_lab_tests_data.map((test, i) => (
                                                <Chip key={i} label={`${test.test_code} - ${test.name}`} variant="outlined" color="info" size="small" />
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                                {consultation.complementary_exams && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="caption" fontWeight={700} display="block">AUTRES EXAMENS</Typography>
                                        <Typography variant="body2">{consultation.complementary_exams}</Typography>
                                    </Box>
                                )}
                                {consultation.imaging && (
                                    <Box>
                                        <Typography variant="caption" fontWeight={700} display="block">IMAGERIE</Typography>
                                        <Typography variant="body2">{consultation.imaging}</Typography>
                                    </Box>
                                )}
                            </AccordionDetails>
                        </Accordion>
                    )}
                </Grid>

                <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 2 }}>
                        <Typography variant="caption" fontWeight={700} color="info.dark">INSTRUCTIONS</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>{consultation.patient_instructions || 'Aucune instruction'}</Typography>
                    </Paper>
                </Grid>
            </Grid>

            <PrintModal
                open={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                title={printModalType === 'report' ? "Rapport" : "Ordonnance"}
                loading={generatingPdf}
                onPreview={() => handlePrintAction('preview')}
                onPrint={() => handlePrintAction('print')}
                onDownload={() => handlePrintAction('download')}
            />
        </Box>
    );
};

export default ConsultationDetail;
