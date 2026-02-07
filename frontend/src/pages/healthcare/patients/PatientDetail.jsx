import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    Typography,
    Chip,
    Tabs,
    Tab,
    Divider,
    List,
    Avatar
} from '@mui/material';
import {
    Edit as EditIcon,
    Timeline as TimelineIcon,
    LocalHospital as HospitalIcon,
    Description as FileIcon,
    PictureAsPdf as PdfIcon,
    MedicalServices as ConsultationIcon,
    Science as LabIcon,
    LocalPharmacy as PharmacyIcon,
    Receipt as PrescriptionIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import patientAPI from '../../../services/patientAPI';
import VisitHistory from './VisitHistory';
import PatientDocuments from './PatientDocuments';
import PatientCareHistory from './PatientCareHistory';
import LabOrderHistory from './components/LabOrderHistory';
import PharmacyHistory from './components/PharmacyHistory';
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

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [patientData, historyData] = await Promise.all([
                patientAPI.getPatient(id),
                patientAPI.getPatientCompleteHistory(id)  // NOUVEAU: Utilise l'historique complet
            ]);
            setPatient(patientData);
            setHistory(historyData);
            console.log('History Data:', historyData); // Debug
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
                    </Box>
                </CardContent>
            </Card>

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

            <Card>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                        <Tab icon={<TimelineIcon />} iconPosition="start" label="Historique Consultations" />
                        <Tab icon={<HospitalIcon />} iconPosition="start" label="Visites" />
                        <Tab icon={<TimelineIcon />} iconPosition="start" label="Historique des Soins" />
                        <Tab icon={<LabIcon />} iconPosition="start" label="Examens Labo" />
                        <Tab icon={<PharmacyIcon />} iconPosition="start" label="Pharmacie" />
                        <Tab icon={<FileIcon />} iconPosition="start" label="Documents" />
                    </Tabs>
                </Box>

                {/* Tab Panel 0: Consultations */}
                <Box role="tabpanel" hidden={tabValue !== 0} sx={{ p: 3 }}>
                    {tabValue === 0 && (
                        <Box>
                            {history?.consultations && history.consultations.length > 0 ? (
                                <List>
                                    {history.consultations.map((consult) => (
                                        <Card key={consult.id} sx={{ mb: 2, bgcolor: 'background.default', cursor: 'pointer' }}
                                            variant="outlined"
                                            onClick={() => navigate(`/healthcare/consultations/${consult.id}`)}>
                                            <CardContent>
                                                <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                                    Consultation du {formatDate(consult.consultation_date)}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                    Dr. {consult.doctor_name || 'Non assigné'}
                                                </Typography>
                                                <Typography variant="body1" sx={{ mt: 1 }}>
                                                    <strong>Plaintes:</strong> {consult.chief_complaint}
                                                </Typography>
                                                <Typography variant="body1">
                                                    <strong>Diagnostic:</strong> {consult.diagnosis || '-'}
                                                </Typography>
                                                {consult.status && (
                                                    <Chip
                                                        label={consult.status}
                                                        size="small"
                                                        color={consult.status === 'completed' ? 'success' : 'warning'}
                                                        sx={{ mt: 1 }}
                                                    />
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </List>
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

                {/* Tab Panel 1: Visits */}
                <Box role="tabpanel" hidden={tabValue !== 1} sx={{ p: 3 }}>
                    {tabValue === 1 && <VisitHistory patientId={id} />}
                </Box>

                {/* Tab Panel 2: Care History */}
                <Box role="tabpanel" hidden={tabValue !== 2} sx={{ p: 3 }}>
                    {tabValue === 2 && <PatientCareHistory patientId={id} />}
                </Box>

                {/* Tab Panel 3: Lab Orders */}
                <Box role="tabpanel" hidden={tabValue !== 3} sx={{ p: 3 }}>
                    {tabValue === 3 && <LabOrderHistory labOrders={history?.lab_orders} />}
                </Box>

                {/* Tab Panel 4: Pharmacy Dispensings */}
                <Box role="tabpanel" hidden={tabValue !== 4} sx={{ p: 3 }}>
                    {tabValue === 4 && <PharmacyHistory dispensings={history?.pharmacy_dispensings} />}
                </Box>

                {/* Tab Panel 5: Documents */}
                <Box role="tabpanel" hidden={tabValue !== 5} sx={{ p: 3 }}>
                    {tabValue === 5 && <PatientDocuments patientId={id} />}
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
        </Box>
    );
};

export default PatientDetail;
