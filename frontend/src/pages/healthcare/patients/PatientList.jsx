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
    alpha
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
    Female
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { motion } from 'framer-motion';
import patientAPI from '../../../services/patientAPI';
import LoadingState from '../../../components/LoadingState';
import ErrorState from '../../../components/ErrorState';

const PatientList = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [loading, setLoading] = useState(false);
    const [patients, setPatients] = useState([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [quickFilter, setQuickFilter] = useState('');

    useEffect(() => {
        fetchPatients();
    }, [page, search]);

    const fetchPatients = async () => {
        setLoading(true);
        try {
            const response = await patientAPI.getPatients({
                page,
                search,
                page_size: 50 // Increased for grid view
            });
            setPatients(response.results || []);
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
    };

    // Filter Logic
    const filteredPatients = patients.filter(patient => {
        if (!quickFilter) return true;

        switch (quickFilter) {
            case 'active':
                // Assuming active if updated recently or explicitly active field if available
                // For now, let's assume all are active unless marked otherwise
                return true;
            case 'new':
                if (!patient.created_at) return false;
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return new Date(patient.created_at) > weekAgo;
            case 'male':
                return patient.gender === 'M';
            case 'female':
                return patient.gender === 'F';
            default:
                return true;
        }
    });

    // Stats Calculation
    const totalPatients = patients.length;
    const newPatients = patients.filter(p => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(p.created_at) > weekAgo;
    }).length;
    const malePatients = patients.filter(p => p.gender === 'M').length;
    const femalePatients = patients.filter(p => p.gender === 'F').length;

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
                                {patient.updated_at ? new Date(patient.updated_at).toLocaleDateString() : '-'}
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
                            <IconButton size="small" color="info" onClick={() => navigate(`/healthcare/patients/${patient.id}/history`)}>
                                <HistoryIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Modifier">
                            <IconButton size="small" onClick={() => navigate(`/healthcare/patients/${patient.id}/edit`)}>
                                <EditIcon fontSize="small" />
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
        </Box>
    );
};

export default PatientList;
