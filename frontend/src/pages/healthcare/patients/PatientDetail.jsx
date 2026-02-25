import React, { useState, useEffect } from 'react';
import { Box, Button, Card, CardContent, Grid, Typography, Chip, Tabs, Divider, List, Avatar } from '@mui/material';
import { SafeTab } from '../../../components/safe';
import {
    Edit as EditIcon,
    Timeline as TimelineIcon,
    LocalHospital as HospitalIcon,
    Description as FileIcon,
    PictureAsPdf as PdfIcon,
    MedicalServices as ConsultationIcon,
    Science as LabIcon,
    LocalPharmacy as PharmacyIcon,
    Receipt as PrescriptionIcon,
    Dashboard as SummaryIcon,
    TrackChanges as FollowUpIcon,
    ExpandMore as ExpandMoreIcon,
    FiberManualRecord as DotIcon,
} from '@mui/icons-material';
import { Accordion, AccordionSummary, AccordionDetails, Table, TableBody, TableCell, TableRow, Paper } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import patientAPI from '../../../services/patientAPI';
import LabOrderHistory from './components/LabOrderHistory';
import PharmacyHistory from './components/PharmacyHistory';
import MedicalSummaryTab from './components/MedicalSummaryTab';
import PatientTimeline from './components/PatientTimeline';
import AdministerCareModal from './components/AdministerCareModal';
import PatientFollowUpModal from './components/PatientFollowUpModal';
import PrintModal from '../../../components/PrintModal';
import { formatDate } from '../../../utils/formatters';

const PatientDetail = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();

    const [patient, setPatient] = useState(null);
    const [history, setHistory] = useState(null);
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(true);

    // Print Modal State
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    // Care Modal State
    const [careModalOpen, setCareModalOpen] = useState(false);

    // Follow-up Modal & data
    const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
    const [followUps, setFollowUps] = useState([]);

    useEffect(() => {
        fetchData();
        fetchFollowUps();
    }, [id]);

    const fetchFollowUps = async () => {
        try {
            const data = await patientAPI.getFollowUps(id);
            setFollowUps(Array.isArray(data) ? data : data.results || []);
        } catch (e) {
            console.error('Error fetching follow-ups', e);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [patientData, historyData] = await Promise.all([
                patientAPI.getPatient(id),
                patientAPI.getPatientCompleteHistory(id)
            ]);
            setPatient(patientData);
            setHistory(historyData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrintAction = async (action) => {
        setGeneratingPdf(true);
        try {
            const blob = await patientAPI.getPatientSummaryPDF(id);
            const filename = `dossier_medical_${patient.patient_number}.pdf`;

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
            console.error('Error downloading PDF:', error);
            alert('Erreur lors de la génération du PDF');
        } finally {
            setGeneratingPdf(false);
        }
    };

    if (loading || !patient) {
        return <Typography>{t('common.loading', 'Chargement...')}</Typography>;
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                    {patient.name}
                </Typography>
                <Box>
                    <Button
                        startIcon={<PdfIcon />}
                        onClick={() => setPrintModalOpen(true)}
                        sx={{ mr: 2 }}
                        variant="outlined"
                    >
                        Imprimer Dossier
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/healthcare/patients/${id}/edit`)}
                        sx={{ borderRadius: 2 }}
                    >
                        {t('common.edit', 'Modifier')}
                    </Button>
                </Box>
            </Box>

            {/* Quick Action Buttons */}
            <Card sx={{ mb: 3, bgcolor: 'primary.50', borderLeft: 4, borderColor: 'primary.main' }}>
                <CardContent sx={{ py: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5 }}>
                        Actions Rapides
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                            variant="contained"
                            startIcon={<ConsultationIcon />}
                            onClick={() => navigate(`/healthcare/consultations/new?patientId=${id}`)}
                            sx={{ borderRadius: 2 }}
                        >
                            Nouvelle Consultation
                        </Button>
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<LabIcon />}
                            onClick={() => navigate(`/healthcare/laboratory/new?patientId=${id}`)}
                            sx={{ borderRadius: 2 }}
                        >
                            Ordonnance Labo
                        </Button>
                        <Button
                            variant="contained"
                            color="warning"
                            startIcon={<PharmacyIcon />}
                            onClick={() => navigate(`/healthcare/pharmacy/dispense/new?patientId=${id}`)}
                            sx={{ borderRadius: 2 }}
                        >
                            Dispensation
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<HospitalIcon />}
                            onClick={() => navigate(`/healthcare/visits/new?patientId=${id}`)}
                            sx={{ borderRadius: 2 }}
                        >
                            Nouvelle Visite
                        </Button>
                        <Button
                            variant="contained"
                            color="info"
                            startIcon={<PrescriptionIcon />}
                            onClick={() => navigate(`/invoices/new?clientId=${id}`)}
                            sx={{ borderRadius: 2 }}
                        >
                            Nouvelle Facture
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<HospitalIcon />}
                            onClick={() => setCareModalOpen(true)}
                            sx={{ borderRadius: 2 }}
                        >
                            Administrer un Soin
                        </Button>
                        <Button
                            variant="outlined"
                            color="secondary"
                            startIcon={<FollowUpIcon />}
                            onClick={() => setFollowUpModalOpen(true)}
                            sx={{ borderRadius: 2 }}
                        >
                            Suivi
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            {/* Patient Info Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Avatar sx={{ width: 64, height: 64, mr: 2, bgcolor: 'primary.main' }}>
                                    {patient.name.charAt(0)}
                                </Avatar>
                                <Box>
                                    <Typography variant="h6">{patient.name}</Typography>
                                    <Chip label={patient.patient_number} size="small" color="primary" variant="outlined" />
                                </Box>
                            </Box>
                            <Divider sx={{ my: 2 }} />
                            <Grid container spacing={1}>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Âge / Sexe</Typography>
                                    <Typography variant="body2" fontWeight="500">{patient.age} ans / {patient.gender}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Date de Naissance</Typography>
                                    <Typography variant="body2" fontWeight="500">{patient.date_of_birth ? formatDate(patient.date_of_birth) : '-'}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Téléphone</Typography>
                                    <Typography variant="body2" fontWeight="500">{patient.phone || '-'}</Typography>
                                </Grid>
                                <Grid item xs={12} sx={{ mt: 1 }}>
                                    <Typography variant="caption" color="text.secondary">Adresse</Typography>
                                    <Typography variant="body2">{patient.address || '-'}</Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom color="error.main">Alertes Médicales</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Groupe Sanguin</Typography>
                                    <Typography variant="h5" fontWeight="bold">{patient.blood_type || 'N/A'}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Allergies</Typography>
                                    <Typography variant="body1" color="error">{patient.allergies || 'Aucune'}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="caption" color="text.secondary">Conditions Chroniques</Typography>
                                    <Typography variant="body1">{patient.chronic_conditions || 'Aucune'}</Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Tabs - New structure */}
            <Card>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        value={tabValue}
                        onChange={(e, v) => setTabValue(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                    >
                        <SafeTab icon={<SummaryIcon />} iconPosition="start" label="Résumé Médical" />
                        <SafeTab icon={<TimelineIcon />} iconPosition="start" label="Timeline" />
                        <SafeTab icon={<ConsultationIcon />} iconPosition="start" label="Consultations" />
                        <SafeTab icon={<LabIcon />} iconPosition="start" label="Examens Labo" />
                        <SafeTab icon={<PharmacyIcon />} iconPosition="start" label="Pharmacie" />
                    </Tabs>
                </Box>

                {/* Tab 0: Medical Summary (default) */}
                <Box role="tabpanel" hidden={tabValue !== 0} sx={{ p: 3 }}>
                    {tabValue === 0 && <MedicalSummaryTab patientId={id} patient={patient} />}
                </Box>

                {/* Tab 1: Timeline */}
                <Box role="tabpanel" hidden={tabValue !== 1} sx={{ p: 3 }}>
                    {tabValue === 1 && <PatientTimeline patientId={id} />}
                </Box>

                {/* Tab 2: Consultations - Carnet Médical */}
                <Box role="tabpanel" hidden={tabValue !== 2} sx={{ p: 3 }}>
                    {tabValue === 2 && (
                        <Box>
                            {history?.consultations && history.consultations.length > 0 ? (
                                history.consultations.map((consult) => (
                                    <Card key={consult.id} variant="outlined" sx={{ mb: 3, borderLeft: 4, borderColor: consult.status === 'completed' ? 'success.main' : 'warning.main' }}>
                                        <CardContent sx={{ pb: '12px !important' }}>
                                            {/* Header */}
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                                        {formatDate(consult.consultation_date)}
                                                    </Typography>
                                                    <Chip
                                                        label={consult.status_display || consult.status}
                                                        size="small"
                                                        color={consult.status === 'completed' ? 'success' : consult.status === 'in_consultation' ? 'info' : 'warning'}
                                                        variant="outlined"
                                                    />
                                                    <Typography variant="caption" color="text.secondary">
                                                        N° {consult.consultation_number}
                                                    </Typography>
                                                </Box>
                                                <Button
                                                    size="small"
                                                    variant="text"
                                                    onClick={() => navigate(`/healthcare/consultations/${consult.id}`)}
                                                >
                                                    Voir détails
                                                </Button>
                                            </Box>

                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                                Dr. {consult.doctor_name || 'Non assigné'}
                                            </Typography>

                                            <Divider sx={{ mb: 1.5 }} />

                                            {/* Vitals row */}
                                            {(consult.blood_pressure || consult.temperature || consult.heart_rate || consult.oxygen_saturation) && (
                                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                                                    {consult.blood_pressure && <Chip label={`TA: ${consult.blood_pressure} mmHg`} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />}
                                                    {consult.temperature && <Chip label={`T°: ${consult.temperature}°C`} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />}
                                                    {consult.heart_rate && <Chip label={`FC: ${consult.heart_rate} pls/min`} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />}
                                                    {consult.oxygen_saturation && <Chip label={`SPO2: ${consult.oxygen_saturation}%`} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />}
                                                    {consult.respiratory_rate && <Chip label={`FR: ${consult.respiratory_rate} c/min`} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />}
                                                    {consult.blood_glucose && <Chip label={`Gly: ${consult.blood_glucose} g/L`} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />}
                                                    {consult.weight && <Chip label={`${consult.weight} kg`} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />}
                                                </Box>
                                            )}

                                            {/* Clinical info */}
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} md={6}>
                                                    <Typography variant="caption" fontWeight="700" color="text.secondary">MOTIF</Typography>
                                                    <Typography variant="body2">{consult.chief_complaint || '-'}</Typography>
                                                </Grid>
                                                {consult.physical_examination && (
                                                    <Grid item xs={12} md={6}>
                                                        <Typography variant="caption" fontWeight="700" color="text.secondary">EXAMEN PHYSIQUE</Typography>
                                                        <Typography variant="body2">{consult.physical_examination}</Typography>
                                                    </Grid>
                                                )}
                                                {consult.diagnosis && (
                                                    <Grid item xs={12} md={6}>
                                                        <Typography variant="caption" fontWeight="700" color="text.secondary">DIAGNOSTIC</Typography>
                                                        <Typography variant="body2" fontWeight="600" color="error.main">{consult.diagnosis}</Typography>
                                                    </Grid>
                                                )}
                                                {consult.treatment_plan && (
                                                    <Grid item xs={12} md={6}>
                                                        <Typography variant="caption" fontWeight="700" color="text.secondary">PLAN DE TRAITEMENT</Typography>
                                                        <Typography variant="body2">{consult.treatment_plan}</Typography>
                                                    </Grid>
                                                )}
                                            </Grid>

                                            {/* Prescriptions */}
                                            {consult.prescriptions_data && consult.prescriptions_data.length > 0 && (
                                                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'primary.50', borderRadius: 1 }}>
                                                    <Typography variant="caption" fontWeight="700" color="primary.main" sx={{ mb: 0.5, display: 'block' }}>
                                                        ORDONNANCE
                                                    </Typography>
                                                    {consult.prescriptions_data.map((rx, rxIdx) => (
                                                        <Box key={rxIdx}>
                                                            {rx.items?.map((item, i) => (
                                                                <Typography key={i} variant="body2" sx={{ pl: 1, borderLeft: '2px solid', borderColor: 'primary.light', mb: 0.3 }}>
                                                                    <strong>{i + 1}. {item.medication_name}</strong>
                                                                    {' — '}{item.dosage || ''} {item.frequency ? `- ${item.frequency}` : ''} {item.duration ? `(${item.duration})` : ''}
                                                                </Typography>
                                                            ))}
                                                        </Box>
                                                    ))}
                                                </Box>
                                            )}

                                            {/* Lab Orders */}
                                            {consult.lab_orders_data && consult.lab_orders_data.length > 0 && (
                                                <Box sx={{ mt: 1, p: 1.5, bgcolor: 'success.50', borderRadius: 1 }}>
                                                    <Typography variant="caption" fontWeight="700" color="success.main" sx={{ mb: 0.5, display: 'block' }}>
                                                        EXAMENS PRESCRITS
                                                    </Typography>
                                                    {consult.lab_orders_data.map((order, oIdx) => (
                                                        <Box key={oIdx}>
                                                            {order.tests?.map((test, i) => (
                                                                <Typography key={i} variant="body2" sx={{ pl: 1, borderLeft: '2px solid', borderColor: 'success.light', mb: 0.3 }}>
                                                                    {i + 1}. {test.test_name} <Typography component="span" variant="caption" color="text.secondary">({test.test_code})</Typography>
                                                                </Typography>
                                                            ))}
                                                        </Box>
                                                    ))}
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography color="text.secondary" gutterBottom>
                                        Aucune consultation enregistrée pour ce patient.
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        startIcon={<ConsultationIcon />}
                                        onClick={() => navigate(`/healthcare/consultations/new?patientId=${id}`)}
                                        sx={{ mt: 2 }}
                                    >
                                        Créer une Consultation
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    )}
                </Box>

                {/* Tab 3: Lab Orders */}
                <Box role="tabpanel" hidden={tabValue !== 3} sx={{ p: 3 }}>
                    {tabValue === 3 && <LabOrderHistory labOrders={history?.lab_orders} />}
                </Box>

                {/* Tab 4: Pharmacy Dispensings */}
                <Box role="tabpanel" hidden={tabValue !== 4} sx={{ p: 3 }}>
                    {tabValue === 4 && <PharmacyHistory dispensings={history?.pharmacy_dispensings} />}
                </Box>

            </Card>

            <PrintModal
                open={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                title="Imprimer Dossier Patient"
                loading={generatingPdf}
                onPreview={() => handlePrintAction('preview')}
                onPrint={() => handlePrintAction('print')}
                onDownload={() => handlePrintAction('download')}
                helpText="Générer le dossier médical complet du patient (résumé, historique, etc)."
            />

            <AdministerCareModal
                open={careModalOpen}
                onClose={() => setCareModalOpen(false)}
                patientId={id}
                onSaved={fetchData}
            />

            {/* ── Bloc Suivis ─────────────────────────────────────────── */}
            {followUps.length > 0 && (
                <Accordion sx={{ mt: 3 }} defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FollowUpIcon color="secondary" fontSize="small" />
                            <Typography fontWeight={700}>
                                Suivis du patient ({followUps.length})
                            </Typography>
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                        {followUps.map((fu, idx) => (
                            <Paper
                                key={fu.id}
                                variant="outlined"
                                sx={{ m: 2, p: 2, borderLeft: 4, borderColor: 'secondary.main' }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        {formatDate(fu.follow_up_date)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {fu.provided_by_name || '—'}
                                    </Typography>
                                </Box>

                                {/* Vitaux résumés */}
                                {(fu.blood_pressure || fu.temperature || fu.heart_rate || fu.oxygen_saturation) && (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1 }}>
                                        {fu.blood_pressure && <VitalBadge label="TA" value={`${fu.blood_pressure} mmHg`} />}
                                        {fu.temperature && <VitalBadge label="T°" value={`${fu.temperature} °C`} />}
                                        {fu.heart_rate && <VitalBadge label="FC" value={`${fu.heart_rate} bpm`} />}
                                        {fu.oxygen_saturation && <VitalBadge label="SpO2" value={`${fu.oxygen_saturation}%`} />}
                                        {fu.weight && <VitalBadge label="Poids" value={`${fu.weight} kg`} />}
                                        {fu.blood_glucose && <VitalBadge label="Glycémie" value={`${fu.blood_glucose} mg/dL`} />}
                                    </Box>
                                )}

                                <Table size="small">
                                    <TableBody>
                                        {fu.chief_complaint && <FuRow label="Plaintes du jour" value={fu.chief_complaint} />}
                                        {fu.physical_examination && <FuRow label="Examen physique" value={fu.physical_examination} />}
                                        {fu.diagnosis && <FuRow label="Diagnostic" value={fu.diagnosis} />}
                                        {fu.evolution && <FuRow label="Évolution" value={fu.evolution} />}
                                        {fu.treatment && <FuRow label="Traitement / Examens" value={fu.treatment} />}
                                        {fu.notes && <FuRow label="Notes" value={fu.notes} />}
                                    </TableBody>
                                </Table>
                            </Paper>
                        ))}
                    </AccordionDetails>
                </Accordion>
            )}

            <PatientFollowUpModal
                open={followUpModalOpen}
                onClose={() => setFollowUpModalOpen(false)}
                patientId={id}
                patientName={patient?.name}
                onSaved={(fu) => setFollowUps(prev => [fu, ...prev])}
            />
        </Box>
    );
};

// ── Sous-composants affichage ─────────────────────────────────────────────────
const VitalBadge = ({ label, value }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'grey.100', borderRadius: 1, px: 1, py: 0.25 }}>
        <Typography variant="caption" color="text.secondary">{label}:</Typography>
        <Typography variant="caption" fontWeight={700}>{value}</Typography>
    </Box>
);

const FuRow = ({ label, value }) => (
    <TableRow>
        <TableCell sx={{ fontWeight: 600, width: 160, verticalAlign: 'top', py: 0.5, color: 'text.secondary', fontSize: '0.78rem' }}>
            {label}
        </TableCell>
        <TableCell sx={{ py: 0.5, fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{value}</TableCell>
    </TableRow>
);

export default PatientDetail;
