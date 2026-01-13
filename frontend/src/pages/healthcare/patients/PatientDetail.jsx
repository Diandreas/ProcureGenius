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
    ListItem,
    ListItemText,
    ListItemIcon,
    Avatar
} from '@mui/material';
import {
    Edit as EditIcon,
    Timeline as TimelineIcon,
    LocalHospital as HospitalIcon,
    Description as FileIcon,
    PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import patientAPI from '../../../services/patientAPI';
// import { DocumentImport } from '../ai-chat/DocumentImport'; // Reuse if needed

const PatientDetail = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();

    const [patient, setPatient] = useState(null);
    const [history, setHistory] = useState(null);
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [patientData, historyData] = await Promise.all([
                patientAPI.getPatient(id),
                patientAPI.getPatientHistory(id)
            ]);
            setPatient(patientData);
            setHistory(historyData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadHistory = async () => {
        try {
            const blob = await patientAPI.getPatientHistoryPDF(id);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `medical_history_${patient.patient_number}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading PDF:', error);
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
                        onClick={handleDownloadHistory}
                        sx={{ mr: 2 }}
                        variant="outlined"
                    >
                        Exporter PDF
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
                        <Tab icon={<FileIcon />} iconPosition="start" label="Documents" />
                    </Tabs>
                </Box>

                {/* Tab Panel 0: Consultations */}
                <Box role="tabpanel" hidden={tabValue !== 0} sx={{ p: 3 }}>
                    {tabValue === 0 && (
                        <List>
                            {history?.recent_consultations?.map((consult) => (
                                <Card key={consult.id} sx={{ mb: 2, bgcolor: 'background.default' }} variant="outlined">
                                    <CardContent>
                                        <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                            Consultation du {new Date(consult.consultation_date).toLocaleDateString()}
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
                                    </CardContent>
                                </Card>
                            ))}
                            {!history?.recent_consultations?.length && (
                                <Typography color="text.secondary">Aucune consultation enregistrée.</Typography>
                            )}
                        </List>
                    )}
                </Box>

                {/* Tab Panel 1: Visits (Placeholder) */}
                <Box role="tabpanel" hidden={tabValue !== 1} sx={{ p: 3 }}>
                    {tabValue === 1 && <Typography>Historique des visites (TODO)</Typography>}
                </Box>

                {/* Tab Panel 2: Docs */}
                <Box role="tabpanel" hidden={tabValue !== 2} sx={{ p: 3 }}>
                    {tabValue === 2 && <Typography>Documents (TODO)</Typography>}
                </Box>
            </Card>

        </Box>
    );
};

export default PatientDetail;
