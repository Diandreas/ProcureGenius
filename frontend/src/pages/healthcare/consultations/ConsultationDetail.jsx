import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Divider,
    Paper
} from '@mui/material';
import {
    Edit as EditIcon,
    PictureAsPdf as PdfIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import consultationAPI from '../../../services/consultationAPI';

const ConsultationDetail = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();

    const [loading, setLoading] = useState(true);
    const [consultation, setConsultation] = useState(null);

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

    const downloadPrescription = async () => {
        try {
            // Assuming prescription ID is linked or we use consultation ID endpoint
            const blob = await consultationAPI.getPrescriptionPDF(id);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `prescription_${consultation.patient_name}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading prescription:', error);
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
                    <Button variant="outlined" startIcon={<PdfIcon />} onClick={downloadPrescription} sx={{ mr: 1 }}>
                        Ordonnance PDF
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/healthcare/consultations/${id}/edit`)}
                    >
                        Modifier / Compléter
                    </Button>
                </Box>
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
                            {/* We need to fetch prescriptions linked to this consult or embedded in serializer */}
                            {/* For now assuming basic list available or TODO */}
                            <Typography color="text.secondary" fontStyle="italic">
                                Voir la section modification pour les détails des médicaments.
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ConsultationDetail;
