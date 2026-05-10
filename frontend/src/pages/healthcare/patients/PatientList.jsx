import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    TextField,
    Typography,
    Chip,
    IconButton,
    InputAdornment,
    Tooltip,
    Stack,
    Avatar,
    useTheme,
    useMediaQuery,
    Button,
    alpha,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Autocomplete,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    Edit as EditIcon,
    History as HistoryIcon,
    LocalHospital as VisitIcon,
    Person as PersonIcon,
    CheckCircle,
    Block,
    FiberNew,
    Male,
    Female,
    MergeType as MergeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { motion } from 'framer-motion';
import patientAPI from '../../../services/patientAPI';
import api from '../../../services/api';
import LoadingState from '../../../components/LoadingState';
import ErrorState from '../../../components/ErrorState';
import { formatDate } from '../../../utils/formatters';

const PatientList = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [loading, setLoading] = useState(false);
    const [patients, setPatients] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        newLast7Days: 0,
        male: 0,
        female: 0,
    });
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [quickFilter, setQuickFilter] = useState('');

    // Debounce 500ms — stats ne se rechargent qu'à l'init (search vide)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search.length >= 2 ? search : search.length === 0 ? '' : debouncedSearch);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchPatients();
    }, [page, debouncedSearch, quickFilter]);

    const fetchPatients = async () => {
        setLoading(true);
        try {
            const params = { page, page_size: 50 };
            if (debouncedSearch) params.search = debouncedSearch;
            if (quickFilter === 'male') params.gender = 'M';
            if (quickFilter === 'female') params.gender = 'F';
            if (quickFilter === 'new') {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                params.created_after = d.toISOString().slice(0, 10);
            }

            const listResponse = await patientAPI.getPatients(params);
            setPatients(listResponse.results || []);

            // Stats globales uniquement au premier chargement (sans filtre)
            if (!debouncedSearch && !quickFilter && page === 1) {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
                const [totalResponse, newResponse, maleResponse, femaleResponse] = await Promise.all([
                    patientAPI.getPatients({ page: 1, page_size: 1 }),
                    patientAPI.getPatients({ page: 1, page_size: 1, created_after: sevenDaysAgoStr }),
                    patientAPI.getPatients({ page: 1, page_size: 1, gender: 'M' }),
                    patientAPI.getPatients({ page: 1, page_size: 1, gender: 'F' }),
                ]);
                setStats({
                    total: totalResponse.count || 0,
                    newLast7Days: newResponse.count || 0,
                    male: maleResponse.count || 0,
                    female: femaleResponse.count || 0,
                });
            }
        } catch (error) {
            console.error('Error fetching patients:', error);
            enqueueSnackbar(t('common.error'), { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const handleQuickFilterClick = (filterValue) => {
        setQuickFilter(quickFilter === filterValue ? '' : filterValue);
        setPage(1);
    };

    // === Merge patients dialog ===
    const [mergeDialog, setMergeDialog] = useState({ open: false, primary: null });
    const [mergeSecondary, setMergeSecondary] = useState(null);
    const [mergeSearch, setMergeSearch] = useState('');
    const [mergeOptions, setMergeOptions] = useState([]);
    const [mergeSaving, setMergeSaving] = useState(false);

    useEffect(() => {
        if (!mergeDialog.open) return;
        const timer = setTimeout(async () => {
            try {
                const data = await patientAPI.getPatients({ search: mergeSearch, page_size: 20 });
                setMergeOptions((data.results || []).filter(p => p.id !== mergeDialog.primary?.id));
            } catch {}
        }, 300);
        return () => clearTimeout(timer);
    }, [mergeSearch, mergeDialog.open, mergeDialog.primary]);

    const handleMergeSubmit = async () => {
        if (!mergeDialog.primary || !mergeSecondary) return;
        if (!window.confirm(
            `Fusionner "${mergeSecondary.name}" → "${mergeDialog.primary.name}" ?\n\nToutes les factures, commandes labo et consultations seront transférées. Le doublon sera désactivé. Cette action est irréversible.`
        )) return;
        setMergeSaving(true);
        try {
            await api.post(`/healthcare/patients/${mergeDialog.primary.id}/merge/`, {
                secondary_patient_id: mergeSecondary.id
            });
            enqueueSnackbar(`Fusion réussie : "${mergeSecondary.name}" fusionné dans "${mergeDialog.primary.name}"`, { variant: 'success' });
            setMergeDialog({ open: false, primary: null });
            setMergeSecondary(null);
            fetchPatients();
        } catch (err) {
            const msg = err.response?.data?.error || 'Erreur lors de la fusion';
            enqueueSnackbar(msg, { variant: 'error' });
        } finally {
            setMergeSaving(false);
        }
    };

    // Filtrage géré côté API — patients est déjà filtré
    const filteredPatients = patients;

    // Stats Calculation (global backend counts)
    const totalPatients = stats.total;
    const newPatients = stats.newLast7Days;
    const malePatients = stats.male;
    const femalePatients = stats.female;

    // Loading & Error States
    if (loading && patients.length === 0) return <LoadingState message={t('patients.loading', 'Chargement des patients...')} />;

    // Patient Card Component
    const PatientCard = ({ patient, index }) => (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
        >
            <Card
                sx={{
                    borderRadius: 3,
                    height: '100%',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    background: theme => `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: `0 12px 24px -10px ${alpha(theme.palette.primary.main, 0.2)}`,
                        borderColor: 'primary.main',
                        '& .action-buttons': { opacity: 1, transform: 'translateY(0)' }
                    }
                }}
                onClick={() => navigate(`/healthcare/patients/${patient.id}`)}
            >
                {/* Status Indicator Bar */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: theme => `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`
                    }}
                />

                <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                        <Avatar
                            sx={{
                                width: 56,
                                height: 56,
                                background: theme => patient.gender === 'M'
                                    ? `linear-gradient(135deg, ${theme.palette.info.main}, ${theme.palette.info.dark})`
                                    : `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                                boxShadow: theme => `0 4px 12px ${alpha(patient.gender === 'M' ? theme.palette.info.main : theme.palette.secondary.main, 0.3)}`
                            }}
                        >
                            {patient.name?.charAt(0)}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="h6" noWrap sx={{ fontWeight: 700, fontSize: '1rem' }}>
                                {patient.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                                ID: {patient.patient_number}
                            </Typography>
                            {patient.date_of_birth && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Né le {formatDate(patient.date_of_birth)}
                                </Typography>
                            )}
                            <Stack direction="row" spacing={1} mt={0.5}>
                                <Chip
                                    label={`${patient.age} ans`}
                                    size="small"
                                    sx={{ height: 20, fontSize: '0.7rem', bgcolor: alpha(theme.palette.grey[500], 0.1) }}
                                />
                                <Chip
                                    icon={patient.gender === 'M' ? <Male sx={{ fontSize: '12px !important' }} /> : <Female sx={{ fontSize: '12px !important' }} />}
                                    label={patient.gender === 'M' ? 'Homme' : 'Femme'}
                                    size="small"
                                    color={patient.gender === 'M' ? 'info' : 'secondary'}
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                            </Stack>
                        </Box>
                    </Stack>

                    <Stack spacing={1} mb={2}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Contact</Typography>
                            <Typography variant="body2" fontWeight="500">{patient.phone || '-'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Dernière visite</Typography>
                            <Typography variant="body2" fontWeight="500">
                                {patient.updated_at ? formatDate(patient.updated_at) : '-'}
                            </Typography>
                        </Box>
                    </Stack>

                    {/* Action Buttons (Hover Reveal) */}
                    <Stack
                        direction="row"
                        spacing={1}
                        className="action-buttons"
                        sx={{
                            pt: 1,
                            borderTop: '1px solid',
                            borderColor: 'divider',
                            opacity: { xs: 1, md: 0 },
                            transform: { xs: 'none', md: 'translateY(10px)' },
                            transition: 'all 0.3s ease',
                            justifyContent: 'flex-end'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Tooltip title="Nouvelle Visite">
                            <IconButton size="small" color="success" onClick={() => navigate(`/healthcare/visits/new?patient=${patient.id}`)}>
                                <VisitIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Dossier Médical">
                            <IconButton size="small" color="info" onClick={() => navigate(`/healthcare/patients/${patient.id}`)}>
                                <HistoryIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Modifier">
                            <IconButton size="small" onClick={() => navigate(`/healthcare/patients/${patient.id}/edit`)}>
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Fusionner avec un doublon">
                            <IconButton size="small" color="warning" onClick={() => { setMergeDialog({ open: true, primary: patient }); setMergeSecondary(null); setMergeSearch(''); }}>
                                <MergeIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </CardContent>
            </Card>
        </motion.div>
    );

    const StatCard = ({ title, count, icon: Icon, color, filterKey }) => (
        <Card
            onClick={() => handleQuickFilterClick(filterKey)}
            sx={{
                cursor: 'pointer',
                borderRadius: 2.5,
                height: '100%',
                background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
                border: '1.5px solid',
                borderColor: quickFilter === filterKey ? color : 'transparent',
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    borderColor: color,
                    boxShadow: `0 8px 20px ${alpha(color, 0.15)}`
                }
            }}
        >
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Icon sx={{ fontSize: 32, color: color, mb: 1 }} />
                <Typography variant="h4" fontWeight="700" color={color} sx={{ mb: 0.5 }}>
                    {count}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight="500">
                    {title}
                </Typography>
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100vh', bgcolor: 'background.default' }}>

            {/* Header & Title */}
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="700" sx={{ background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`, backgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>
                        {t('patients.title', 'Patients Manager')}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Gestion complète des dossiers patients
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/healthcare/patients/new')}
                    sx={{
                        borderRadius: 3,
                        px: 3,
                        py: 1.5,
                        background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                        boxShadow: theme => `0 8px 20px -4px ${alpha(theme.palette.primary.main, 0.5)}`,
                        '&:hover': { boxShadow: theme => `0 12px 24px -6px ${alpha(theme.palette.primary.main, 0.6)}` }
                    }}
                >
                    {t('patients.new', 'Nouveau Patient')}
                </Button>
            </Stack>

            {/* Stat Cards Grid */}
            <Grid container spacing={2} mb={4}>
                <Grid item xs={6} md={3}>
                    <StatCard title="Total Patients" count={totalPatients} icon={PersonIcon} color={theme.palette.primary.main} filterKey="" />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard title="Nouveaux (7j)" count={newPatients} icon={FiberNew} color={theme.palette.success.main} filterKey="new" />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard title="Hommes" count={malePatients} icon={Male} color={theme.palette.info.main} filterKey="male" />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard title="Femmes" count={femalePatients} icon={Female} color={theme.palette.secondary.main} filterKey="female" />
                </Grid>
            </Grid>

            {/* Search Bar */}
            <Paper
                elevation={0}
                sx={{
                    p: 1,
                    mb: 4,
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper'
                }}
            >
                <InputAdornment position="start" sx={{ pl: 1 }}>
                    <SearchIcon color="action" />
                </InputAdornment>
                <TextField
                    fullWidth
                    variant="standard"
                    placeholder={t('common.search', 'Rechercher par nom, ID ou téléphone...')}
                    value={search}
                    onChange={handleSearchChange}
                    InputProps={{ disableUnderline: true }}
                />
            </Paper>

            {/* Patient Grid */}
            <Grid container spacing={2.5}>
                {filteredPatients.map((patient, index) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={patient.id}>
                        <PatientCard patient={patient} index={index} />
                    </Grid>
                ))}
            </Grid>

            {/* Empty State */}
            {!loading && filteredPatients.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h6" color="text.secondary">Aucun patient trouvé</Typography>
                    <Button variant="text" onClick={() => { setSearch(''); setQuickFilter(''); }}>
                        Effacer les filtres
                    </Button>
                </Box>
            )}

            {/* Merge Dialog */}
            <Dialog open={mergeDialog.open} onClose={() => setMergeDialog({ open: false, primary: null })} maxWidth="sm" fullWidth>
                <DialogTitle>Fusionner un doublon patient</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Toutes les données du doublon (factures, labo, consultations) seront transférées vers le patient principal. Le doublon sera désactivé.
                    </Alert>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        <strong>Patient principal (conservé) :</strong> {mergeDialog.primary?.name}
                    </Typography>
                    <Autocomplete
                        options={mergeOptions}
                        getOptionLabel={p => p.name || ''}
                        value={mergeSecondary}
                        onChange={(_, v) => setMergeSecondary(v)}
                        onInputChange={(_, v) => setMergeSearch(v)}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        renderInput={params => (
                            <TextField {...params} label="Doublon à fusionner *" size="small" fullWidth
                                helperText="Recherchez le doublon — il sera désactivé après fusion"
                            />
                        )}
                        noOptionsText="Aucun patient trouvé"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMergeDialog({ open: false, primary: null })}>Annuler</Button>
                    <Button
                        variant="contained"
                        color="warning"
                        onClick={handleMergeSubmit}
                        disabled={!mergeSecondary || mergeSaving}
                        startIcon={mergeSaving ? <CircularProgress size={16} /> : <MergeIcon />}
                    >
                        Fusionner
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PatientList;
