import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Card, CardContent, Grid, Typography, Chip, Tabs, Divider, List, Avatar, CircularProgress, useMediaQuery, useTheme } from '@mui/material';
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
    PregnantWoman as MaternityTabIcon,
    Vaccines as VaccinationTabIcon,
    Receipt as PrescriptionIcon,
    Medication as MedicationIcon,
    Dashboard as SummaryIcon,
    TrackChanges as FollowUpIcon,
    ExpandMore as ExpandMoreIcon,
    FiberManualRecord as DotIcon,
    Delete as DeleteIcon,
    MenuBook as JournalIcon,
} from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import { Accordion, AccordionSummary, AccordionDetails, Table, TableBody, TableCell, TableRow, Paper } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import patientAPI from '../../../services/patientAPI';
import maternityAPI from '../../../services/maternityAPI';
import LabOrderHistory from './components/LabOrderHistory';
import PharmacyHistory from './components/PharmacyHistory';
import MedicalSummaryTab from './components/MedicalSummaryTab';
import PatientTimeline from './components/PatientTimeline';
import AdministerCareModal from './components/AdministerCareModal';
import QuickPrescriptionModal from './components/QuickPrescriptionModal';
import PatientFollowUpModal from './components/PatientFollowUpModal';
import PatientJournalTab from './components/PatientJournalTab';
import MaternityHistoryTab from './components/MaternityHistoryTab';
import VaccinationHistoryTab from './components/VaccinationHistoryTab';
import PrintModal from '../../../components/PrintModal';
import BackButton from '../../../components/navigation/BackButton';
import { formatDate } from '../../../utils/formatters';

const PatientDetail = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [patient, setPatient] = useState(null);
    const [summary, setSummary] = useState(null);
    const [history, setHistory] = useState(null);
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(true);
    // Ref to pass summary to MedicalSummaryTab only once (avoids re-render loop)
    const summaryRef = useRef(null);
    const historyLoadedRef = useRef(false);

    // Print Modal State
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    // Care Modal State
    const [careModalOpen, setCareModalOpen] = useState(false);
    const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);

    // Follow-up Modal & data
    const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
    const [followUps, setFollowUps] = useState([]);
    const [editingFollowUp, setEditingFollowUp] = useState(null);
    const [maternityInfo, setMaternityInfo] = useState(null);

    useEffect(() => {
        fetchData();
    }, [id]);

    // Chargement léger pour savoir s'il faut montrer l'onglet Maternité — pas
    // que pour les patientes (genre F) : un nouveau-né enregistré comme
    // patient à part (garçon ou fille) doit aussi voir le lien vers sa mère.
    useEffect(() => {
        if (!id) return;
        maternityAPI.getPatientMaternityInfo(id).then(setMaternityInfo).catch(() => setMaternityInfo(null));
    }, [id]);

    const showMaternityTab = patient?.gender === 'F' || !!maternityInfo?.as_child_of;
    // L'onglet Vaccinations est toujours affiché, en dernier — son index dépend
    // donc de si Maternité (conditionnel, juste avant) est rendu ou non. On ne
    // touche jamais l'index fixe (6) de Maternité, on calcule le nôtre à côté.
    const vaccinationTabIndex = showMaternityTab ? 7 : 6;

    // Lazy-load history only when tabs 3/4/5 are opened
    useEffect(() => {
        if ((tabValue === 3 || tabValue === 4 || tabValue === 5) && !historyLoadedRef.current && patient) {
            historyLoadedRef.current = true;
            patientAPI.getPatientCompleteHistory(id)
                .then(data => setHistory(data))
                .catch(err => console.error('Error fetching history:', err));
        }
    }, [tabValue, patient, id]);

    const canEditOrDelete = (createdAt) => {
        if (!createdAt) return false;
        return (Date.now() - new Date(createdAt).getTime()) < 30 * 60 * 1000;
    };

    const handleEditFollowUp = (fu) => {
        setEditingFollowUp(fu);
        setFollowUpModalOpen(true);
    };

    const handleDeleteFollowUp = async (fu) => {
        if (!window.confirm('Supprimer ce suivi ?')) return;
        try {
            await patientAPI.deleteFollowUp(fu.id);
            setFollowUps(prev => prev.filter(f => f.id !== fu.id));
        } catch (err) {
            const msg = err.response?.data?.detail || 'Erreur lors de la suppression';
            alert(msg);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            historyLoadedRef.current = false;
            // Two parallel lightweight calls
            const [patientData, summaryData] = await Promise.all([
                patientAPI.getPatient(id),
                patientAPI.getMedicalSummary(id),
            ]);
            setPatient(patientData);
            summaryRef.current = summaryData;
            setSummary(summaryData);
            setFollowUps(summaryData.recent_follow_ups || []);
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
            <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: { xs: 1.5, sm: 0 },
                mb: 3,
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                    <BackButton />
                    <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                            fontWeight: 600,
                            fontSize: { xs: '1.4rem', sm: '2.125rem' },
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {patient.name}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, flexShrink: 0 }}>
                    <Button
                        startIcon={<PdfIcon />}
                        onClick={() => setPrintModalOpen(true)}
                        variant="outlined"
                        fullWidth={isMobile}
                        size={isMobile ? 'small' : 'medium'}
                    >
                        Imprimer Dossier
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/healthcare/patients/${id}/edit`)}
                        sx={{ borderRadius: 2 }}
                        fullWidth={isMobile}
                        size={isMobile ? 'small' : 'medium'}
                    >
                        {t('common.edit', 'Modifier')}
                    </Button>
                </Box>
            </Box>

            {/* Quick Action Buttons — rangée de boutons sur tablette/desktop,
                grille compacte icônes-first sur mobile (même liste d'actions,
                juste une présentation plus dense pour petit écran). */}
            <Card sx={{ mb: 3, borderLeft: 4, borderColor: 'primary.main' }}>
                <CardContent sx={{ py: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5 }}>
                        Actions Rapides
                    </Typography>

                    {isMobile ? (
                        <Grid container spacing={1}>
                            {[
                                { label: 'Consultation', icon: <ConsultationIcon />, bg: 'primary.main', onClick: () => navigate(`/healthcare/consultations/new?patientId=${id}`) },
                                { label: 'Labo / Imagerie', icon: <LabIcon />, bg: 'secondary.main', onClick: () => navigate(`/healthcare/imaging/new?patientId=${id}`) },
                                { label: 'Ordonnance', icon: <MedicationIcon />, bg: 'success.dark', onClick: () => setPrescriptionModalOpen(true) },
                                { label: 'Visite', icon: <HospitalIcon />, bg: 'success.main', onClick: () => navigate(`/healthcare/visits/new?patientId=${id}`) },
                                { label: 'Facture', icon: <PrescriptionIcon />, bg: 'info.main', onClick: () => navigate(`/invoices/new?clientId=${id}`) },
                                { label: 'Soin', icon: <HospitalIcon />, bg: 'grey.100', fg: 'primary.main', onClick: () => setCareModalOpen(true) },
                                { label: 'Suivi', icon: <FollowUpIcon />, bg: 'grey.100', fg: 'secondary.main', onClick: () => setFollowUpModalOpen(true) },
                                { label: 'Fiche Soins', icon: <PdfIcon />, bg: 'grey.100', fg: 'primary.main', onClick: () => navigate(`/healthcare/medical-documents/new?patientId=${id}&type=nursing_care`) },
                                { label: 'Document', icon: <FileIcon />, bg: 'grey.100', fg: 'primary.main', onClick: () => navigate(`/healthcare/medical-documents/new?patientId=${id}`) },
                            ].map((action) => (
                                <Grid item xs={4} key={action.label}>
                                    <Box
                                        onClick={action.onClick}
                                        sx={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                                            gap: 0.5, py: 1, borderRadius: 2, cursor: 'pointer',
                                            '&:active': { bgcolor: 'action.selected' },
                                        }}
                                    >
                                        <Avatar sx={{ bgcolor: action.bg, color: action.fg || '#fff', width: 40, height: 40 }}>
                                            {action.icon}
                                        </Avatar>
                                        <Typography variant="caption" sx={{ fontSize: '0.68rem', textAlign: 'center', lineHeight: 1.15 }}>
                                            {action.label}
                                        </Typography>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
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
                                onClick={() => navigate(`/healthcare/imaging/new?patientId=${id}`)}
                                sx={{ borderRadius: 2 }}
                            >
                                Commande Labo / Imagerie
                            </Button>
                            <Button
                                variant="contained"
                                sx={{ borderRadius: 2, bgcolor: 'success.dark', '&:hover': { bgcolor: 'success.main' } }}
                                startIcon={<MedicationIcon />}
                                onClick={() => setPrescriptionModalOpen(true)}
                            >
                                Ordonnance
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
                            <Button
                                variant="outlined"
                                startIcon={<PdfIcon />}
                                onClick={() => navigate(`/healthcare/medical-documents/new?patientId=${id}&type=nursing_care`)}
                                sx={{ borderRadius: 2 }}
                            >
                                Fiche de Soins
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<FileIcon />}
                                onClick={() => navigate(`/healthcare/medical-documents/new?patientId=${id}`)}
                                sx={{ borderRadius: 2 }}
                            >
                                Document Médical
                            </Button>
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Fiche Patient — identité + alertes (groupe sanguin/allergies) fusionnées
                dans une seule carte pleine largeur : l'onglet "Résumé Médical" juste en
                dessous (actif par défaut) réaffichait déjà ces 3 mêmes infos dans un
                encadré dédié — inutile de les dupliquer dans une deuxième carte ici.
                Groupe sanguin + allergies restent visibles au premier coup d'œil,
                sans clic, à côté du nom ; conditions chroniques rejoint la grille
                d'identité ci-dessous. Aucune donnée retirée, juste moins répétée. */}
            <Card sx={{ mb: 4 }}>
                <CardContent>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 2,
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', flexShrink: 0 }}>
                                {patient.name.charAt(0)}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="h6" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {patient.name}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                                    <Chip label={patient.patient_number} size="small" color="primary" variant="outlined" />
                                    {patient.has_privilege_card && (
                                        <Chip
                                            label={`Carte Privilège${patient.privilege_card_number ? ` · ${patient.privilege_card_number}` : ''}`}
                                            size="small" color="secondary"
                                            onClick={() => navigate(`/healthcare/patients/${patient.id}/privilege-card-usages`)}
                                        />
                                    )}
                                </Box>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                            <Chip
                                label={`Groupe ${patient.blood_type || 'N/A'}`}
                                size="small"
                                sx={{ fontWeight: 700, bgcolor: 'grey.900', color: '#fff' }}
                            />
                            <Typography
                                variant="body2"
                                fontWeight={600}
                                color={patient.allergies ? 'error.main' : 'success.main'}
                                sx={{ wordBreak: 'break-word', maxWidth: { xs: '100%', sm: 260 } }}
                            >
                                {patient.allergies ? `⚠ ${patient.allergies}` : 'Aucune allergie connue'}
                            </Typography>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={2}>
                        <Grid item xs={6} sm={4} md={2.4}>
                            <Typography variant="caption" color="text.secondary">Âge / Sexe</Typography>
                            <Typography variant="body2" fontWeight="500">{patient.age} ans / {patient.gender}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={4} md={2.4}>
                            <Typography variant="caption" color="text.secondary">Date de Naissance</Typography>
                            <Typography variant="body2" fontWeight="500">{patient.date_of_birth ? formatDate(patient.date_of_birth) : '-'}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={4} md={2.4}>
                            <Typography variant="caption" color="text.secondary">Téléphone</Typography>
                            <Typography variant="body2" fontWeight="500">{patient.phone || '-'}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={6} md={2.4}>
                            <Typography variant="caption" color="text.secondary">Situation Matrimoniale</Typography>
                            <Typography variant="body2" fontWeight="500">
                                {patient.marital_status === 'single' ? 'Célibataire' :
                                 patient.marital_status === 'married' ? 'Marié(e)' :
                                 patient.marital_status === 'divorced' ? 'Divorcé(e)' :
                                 patient.marital_status === 'widowed' ? 'Veuf/Veuve' : '-'}
                            </Typography>
                        </Grid>
                        <Grid item xs={6} sm={6} md={2.4}>
                            <Typography variant="caption" color="text.secondary">Profession</Typography>
                            <Typography variant="body2" fontWeight="500">{patient.profession || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Adresse</Typography>
                            <Typography variant="body2">{patient.address || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Conditions Chroniques</Typography>
                            <Typography variant="body2" color={patient.chronic_conditions ? 'text.primary' : 'text.secondary'}>
                                {patient.chronic_conditions || 'Aucune'}
                            </Typography>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

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
                        <SafeTab icon={<JournalIcon />} iconPosition="start" label="Carnet de Suivi" />
                        <SafeTab icon={<TimelineIcon />} iconPosition="start" label="Timeline" />
                        <SafeTab icon={<ConsultationIcon />} iconPosition="start" label="Consultations" />
                        <SafeTab icon={<LabIcon />} iconPosition="start" label="Examens Labo" />
                        <SafeTab icon={<PharmacyIcon />} iconPosition="start" label="Pharmacie" />
                        {showMaternityTab && (
                            <SafeTab icon={<MaternityTabIcon />} iconPosition="start" label="Maternité" />
                        )}
                        <SafeTab icon={<VaccinationTabIcon />} iconPosition="start" label="Vaccinations" />
                    </Tabs>
                </Box>

                {/* Tab 0: Medical Summary (default) */}
                <Box role="tabpanel" hidden={tabValue !== 0} sx={{ p: 3 }}>
                    {tabValue === 0 && <MedicalSummaryTab patientId={id} initialSummary={summaryRef.current} />}
                </Box>

                {/* Tab 1: Carnet de Suivi (follow-ups + soins par jour) */}
                <Box role="tabpanel" hidden={tabValue !== 1} sx={{ p: 3 }}>
                    {tabValue === 1 && <PatientJournalTab patientId={id} patientName={patient?.name} />}
                </Box>

                {/* Tab 2: Timeline */}
                <Box role="tabpanel" hidden={tabValue !== 2} sx={{ p: 3 }}>
                    {tabValue === 2 && <PatientTimeline patientId={id} />}
                </Box>

                {/* Tab 3: Consultations - Carnet Médical */}
                <Box role="tabpanel" hidden={tabValue !== 3} sx={{ p: 3 }}>
                    {tabValue === 3 && (
                        <Box>
                            {!history ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : history.consultations && history.consultations.length > 0 ? (
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

                {/* Tab 4: Lab Orders */}
                <Box role="tabpanel" hidden={tabValue !== 4} sx={{ p: 3 }}>
                    {tabValue === 4 && <LabOrderHistory labOrders={history?.lab_orders} />}
                </Box>

                {/* Tab 5: Pharmacy Dispensings */}
                <Box role="tabpanel" hidden={tabValue !== 5} sx={{ p: 3 }}>
                    {tabValue === 5 && <PharmacyHistory dispensings={history?.pharmacy_dispensings} />}
                </Box>

                {/* Tab 6: Maternité (patientes uniquement) */}
                {showMaternityTab && (
                    <Box role="tabpanel" hidden={tabValue !== 6} sx={{ p: 3 }}>
                        {tabValue === 6 && <MaternityHistoryTab patientId={id} initialInfo={maternityInfo} />}
                    </Box>
                )}

                {/* Vaccinations (tous patients) — index dynamique, voir vaccinationTabIndex */}
                <Box role="tabpanel" hidden={tabValue !== vaccinationTabIndex} sx={{ p: 3 }}>
                    {tabValue === vaccinationTabIndex && <VaccinationHistoryTab patientId={id} />}
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
                onSaved={() => fetchData()}
            />

            <QuickPrescriptionModal
                open={prescriptionModalOpen}
                onClose={() => setPrescriptionModalOpen(false)}
                patientId={id}
                patientName={patient?.name}
                onSuccess={() => fetchData()}
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
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        {formatDate(fu.follow_up_date)}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {fu.provided_by_name || '—'}
                                        </Typography>
                                        {canEditOrDelete(fu.created_at) && (
                                            <>
                                                <Tooltip title="Modifier (dans les 30 min)">
                                                    <IconButton size="small" color="primary" onClick={() => handleEditFollowUp(fu)}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Supprimer (dans les 30 min)">
                                                    <IconButton size="small" color="error" onClick={() => handleDeleteFollowUp(fu)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </>
                                        )}
                                    </Box>
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
                onClose={() => { setFollowUpModalOpen(false); setEditingFollowUp(null); }}
                patientId={id}
                patientName={patient?.name}
                followUpId={editingFollowUp?.id || null}
                initialData={editingFollowUp}
                onSaved={(fu) => {
                    if (editingFollowUp) {
                        setFollowUps(prev => prev.map(f => f.id === fu.id ? fu : f));
                    } else {
                        setFollowUps(prev => [fu, ...prev]);
                    }
                    setEditingFollowUp(null);
                }}
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
