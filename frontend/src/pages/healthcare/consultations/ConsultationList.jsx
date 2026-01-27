import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    TextField,
    Typography,
    Chip,
    Avatar,
    InputAdornment,
    Stack,
    useTheme,
    useMediaQuery,
    alpha
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    MedicalServices as StethoscopeIcon,
    History as HistoryIcon,
    CalendarMonth as CalendarIcon,
    Person as PersonIcon,
    LocalHospital as HospitalIcon,
    ArrowBack as ArrowBackIcon,
    ArrowForward as ArrowForwardIcon,
    Today as TodayIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import consultationAPI from '../../../services/consultationAPI';

const ConsultationList = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [loading, setLoading] = useState(false);
    const [consultations, setConsultations] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Compute stats
    const stats = {
        all: consultations.length,
        scheduled: consultations.filter(c => ['scheduled', 'checked_in', 'waiting_doctor'].includes(c.status)).length,
        in_progress: consultations.filter(c => c.status === 'in_consultation').length,
        completed: consultations.filter(c => c.status === 'completed').length
    };

    useEffect(() => {
        fetchConsultations();
    }, [search, startDate, endDate]);

    const fetchConsultations = async () => {
        setLoading(true);
        try {
            const params = { search };

            // Date filters
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            const data = await consultationAPI.getConsultations(params);
            setConsultations(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error('Error fetching consultations:', error);
        } finally {
            setLoading(false);
        }
    };

    // Date navigation helpers
    const formatDate = (date) => {
        return date.toISOString().split('T')[0];
    };

    const goToPreviousDay = () => {
        const currentDate = startDate ? new Date(startDate) : new Date();
        currentDate.setDate(currentDate.getDate() - 1);
        const newDate = formatDate(currentDate);
        setStartDate(newDate);
        setEndDate(newDate);
        setStatusFilter('all');
    };

    const goToToday = () => {
        const today = formatDate(new Date());
        setStartDate(today);
        setEndDate(today);
        setStatusFilter('all');
    };

    const goToNextDay = () => {
        const currentDate = startDate ? new Date(startDate) : new Date();
        currentDate.setDate(currentDate.getDate() + 1);
        const newDate = formatDate(currentDate);
        setStartDate(newDate);
        setEndDate(newDate);
        setStatusFilter('all');
    };

    const getStatusChip = (status) => {
        const config = {
            scheduled: { label: 'Prévu', color: 'default', bgColor: alpha(theme.palette.grey[500], 0.1) },
            checked_in: { label: 'Enregistré', color: 'info', bgColor: alpha(theme.palette.info.main, 0.1) },
            waiting_doctor: { label: 'Attente', color: 'warning', bgColor: alpha(theme.palette.warning.main, 0.1) },
            in_consultation: { label: 'En Cours', color: 'primary', bgColor: alpha(theme.palette.primary.main, 0.1) },
            completed: { label: 'Terminé', color: 'success', bgColor: alpha(theme.palette.success.main, 0.1) },
            cancelled: { label: 'Annulé', color: 'error', bgColor: alpha(theme.palette.error.main, 0.1) },
        }[status] || { label: status, color: 'default', bgColor: alpha(theme.palette.grey[500], 0.1) };

        return (
            <Chip
                label={config.label}
                size="small"
                sx={{
                    bgcolor: config.bgColor,
                    color: `${config.color}.main`,
                    fontWeight: 600,
                    fontSize: isMobile ? '0.688rem' : '0.75rem'
                }}
            />
        );
    };

    const filteredConsultations = consultations.filter(c => {
        // Date filter (client-side for additional filtering)
        if (startDate || endDate) {
            const consultDate = new Date(c.consultation_date);
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                if (consultDate < start) return false;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (consultDate > end) return false;
            }
        }

        // Status filter (only if no custom date range)
        if (!startDate && !endDate) {
            if (statusFilter === 'all') return true;
            if (statusFilter === 'scheduled') return ['scheduled', 'checked_in', 'waiting_doctor'].includes(c.status);
            if (statusFilter === 'in_progress') return c.status === 'in_consultation';
            if (statusFilter === 'completed') return c.status === 'completed';
        }

        return true;
    });

    const quickFilterCards = [
        { label: 'Toutes', count: stats.all, filter: 'all', icon: HospitalIcon, color: 'info' },
        { label: 'À Venir', count: stats.scheduled, filter: 'scheduled', icon: CalendarIcon, color: 'grey' },
        { label: 'En Cours', count: stats.in_progress, filter: 'in_progress', icon: StethoscopeIcon, color: 'primary' },
        { label: 'Terminées', count: stats.completed, filter: 'completed', icon: HistoryIcon, color: 'success' }
    ];

    return (
        <Box>
            {/* Header with gradient */}
            <Box
                sx={{
                    mb: isMobile ? 2 : 4,
                    pb: isMobile ? 2 : 3,
                    borderBottom: `2px solid ${alpha(theme.palette.divider, 0.1)}`
                }}
            >
                <Stack
                    direction={isMobile ? 'column' : 'row'}
                    justifyContent="space-between"
                    alignItems={isMobile ? 'stretch' : 'center'}
                    spacing={2}
                >
                    <Typography
                        variant={isMobile ? 'h5' : 'h4'}
                        sx={{
                            fontWeight: 700,
                            background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5
                        }}
                    >
                        <StethoscopeIcon sx={{ fontSize: isMobile ? 28 : 36, color: theme.palette.info.main }} />
                        Consultations Médicales
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/healthcare/consultations/new')}
                        size={isMobile ? 'medium' : 'large'}
                        sx={{
                            py: isMobile ? 1 : 1.5,
                            px: isMobile ? 2 : 3,
                            borderRadius: 2,
                            fontWeight: 600,
                            textTransform: 'none',
                            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                            '&:hover': {
                                boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`
                            }
                        }}
                    >
                        Nouvelle Consultation
                    </Button>
                </Stack>
            </Box>

            {/* Quick Filter Stats */}
            <Grid container spacing={isMobile ? 1.5 : 2} sx={{ mb: 3 }}>
                {quickFilterCards.map((card, index) => {
                    const Icon = card.icon;
                    const isActive = statusFilter === card.filter;
                    return (
                        <Grid item xs={6} sm={3} key={card.filter}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card
                                    onClick={() => setStatusFilter(card.filter)}
                                    sx={{
                                        cursor: 'pointer',
                                        borderRadius: 3,
                                        background: theme => {
                                            const colorPalette = theme.palette[card.color] || theme.palette.text;
                                            return isActive
                                                ? `linear-gradient(135deg, ${alpha(colorPalette.main || '#9e9e9e', 0.15)} 0%, ${alpha(colorPalette.main || '#9e9e9e', 0.08)} 100%)`
                                                : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`;
                                        },
                                        border: theme => {
                                            const colorPalette = theme.palette[card.color] || theme.palette.text;
                                            return `2px solid ${isActive ? (colorPalette.main || '#9e9e9e') : 'transparent'}`;
                                        },
                                        boxShadow: theme => {
                                            const colorPalette = theme.palette[card.color] || theme.palette.text;
                                            return isActive
                                                ? `0 4px 16px ${alpha(colorPalette.main || '#9e9e9e', 0.3)}`
                                                : `0 2px 8px ${alpha(theme.palette.common.black, 0.05)}`;
                                        },
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: theme => {
                                                const colorPalette = theme.palette[card.color] || theme.palette.text;
                                                return `0 8px 24px ${alpha(colorPalette.main || '#9e9e9e', 0.25)}`;
                                            }
                                        }
                                    }}
                                >
                                    <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 2.5 }}>
                                        <Icon
                                            sx={{
                                                fontSize: isMobile ? 28 : 36,
                                                color: theme => {
                                                    const colorPalette = theme.palette[card.color] || theme.palette.text;
                                                    return colorPalette.main || '#9e9e9e';
                                                },
                                                mb: 1
                                            }}
                                        />
                                        <Typography
                                            variant={isMobile ? 'h5' : 'h4'}
                                            sx={{
                                                fontWeight: 700,
                                                mb: 0.5,
                                                background: theme => {
                                                    const colorPalette = theme.palette[card.color] || theme.palette.text;
                                                    const mainColor = colorPalette.main || '#9e9e9e';
                                                    const darkColor = colorPalette.dark || '#616161';
                                                    return `linear-gradient(135deg, ${mainColor}, ${darkColor})`;
                                                },
                                                backgroundClip: 'text',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent'
                                            }}
                                        >
                                            {card.count}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                            {card.label}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Grid>
                    );
                })}
            </Grid>

            {/* Search Bar and Date Filters */}
            <Card sx={{ mb: 3, borderRadius: 3 }}>
                <CardContent sx={{ p: isMobile ? 2 : 2.5 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                placeholder="Rechercher par patient, motif, médecin..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                size={isMobile ? 'small' : 'medium'}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon color="action" />
                                        </InputAdornment>
                                    )
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`
                                        },
                                        '&.Mui-focused': {
                                            boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`
                                        }
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Date de début"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setStatusFilter('all'); // Reset status filter when using custom dates
                                }}
                                size={isMobile ? 'small' : 'medium'}
                                InputLabelProps={{ shrink: true }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Date de fin"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setStatusFilter('all'); // Reset status filter when using custom dates
                                }}
                                size={isMobile ? 'small' : 'medium'}
                                InputLabelProps={{ shrink: true }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    }
                                }}
                            />
                        </Grid>
                    </Grid>
                    <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Stack direction="row" spacing={1}>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ArrowBackIcon />}
                                onClick={goToPreviousDay}
                            >
                                Jour Précédent
                            </Button>
                            <Button
                                size="small"
                                variant={startDate === formatDate(new Date()) && endDate === formatDate(new Date()) ? 'contained' : 'outlined'}
                                startIcon={<TodayIcon />}
                                onClick={goToToday}
                            >
                                Aujourd'hui
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                endIcon={<ArrowForwardIcon />}
                                onClick={goToNextDay}
                            >
                                Jour Suivant
                            </Button>
                        </Stack>
                        {(startDate || endDate) && (
                            <Chip
                                label={`Période: ${startDate || '...'} → ${endDate || '...'}`}
                                onDelete={() => {
                                    setStartDate('');
                                    setEndDate('');
                                }}
                                color="primary"
                                size="small"
                            />
                        )}
                    </Box>
                </CardContent>
            </Card>

            {/* Consultations Grid */}
            {loading ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="body1" color="text.secondary">
                        Chargement des consultations...
                    </Typography>
                </Box>
            ) : filteredConsultations.length === 0 ? (
                <Card
                    sx={{
                        borderRadius: 3,
                        textAlign: 'center',
                        py: 8,
                        background: theme => `linear-gradient(135deg,
                            ${alpha(theme.palette.background.paper, 0.9)} 0%,
                            ${alpha(theme.palette.background.paper, 0.95)} 100%)`
                    }}
                >
                    <StethoscopeIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        Aucune consultation trouvée
                    </Typography>
                </Card>
            ) : (
                <Grid container spacing={isMobile ? 2 : 3}>
                    <AnimatePresence mode="popLayout">
                        {filteredConsultations.map((consult, index) => (
                            <Grid item xs={12} sm={6} md={4} key={consult.id}>
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{
                                        duration: 0.4,
                                        delay: index * 0.05,
                                        ease: [0.6, 0.05, 0.01, 0.9]
                                    }}
                                    style={{ height: '100%' }}
                                >
                                    <Card
                                        onClick={() => {
                                            if (['scheduled', 'checked_in', 'waiting_doctor', 'in_consultation'].includes(consult.status)) {
                                                navigate(`/healthcare/consultations/${consult.id}/edit`);
                                            } else {
                                                navigate(`/healthcare/consultations/${consult.id}`);
                                            }
                                        }}
                                        sx={{
                                            height: '100%',
                                            cursor: 'pointer',
                                            borderRadius: 3,
                                            background: theme => `linear-gradient(135deg,
                                                ${alpha(theme.palette.background.paper, 0.9)} 0%,
                                                ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                                            boxShadow: theme => `0 8px 32px ${alpha(theme.palette.common.black, 0.08)}`,
                                            border: '1px solid',
                                            borderColor: theme => alpha(theme.palette.divider, 0.1),
                                            backdropFilter: 'blur(20px)',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: theme => `0 16px 48px ${alpha(theme.palette.common.black, 0.12)}`
                                            },
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                height: 4,
                                                background: `linear-gradient(90deg, ${theme.palette.info.main}, ${theme.palette.info.light})`,
                                                borderRadius: '12px 12px 0 0'
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ p: isMobile ? 2 : 2.5 }}>
                                            {/* Header with Avatar and Status */}
                                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                                <Stack direction="row" spacing={1.5} alignItems="center" flex={1}>
                                                    <Avatar
                                                        sx={{
                                                            width: isMobile ? 40 : 48,
                                                            height: isMobile ? 40 : 48,
                                                            bgcolor: theme.palette.info.main,
                                                            fontSize: isMobile ? 16 : 18,
                                                            fontWeight: 700
                                                        }}
                                                    >
                                                        {consult.patient_name?.charAt(0) || 'P'}
                                                    </Avatar>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography
                                                            variant="subtitle1"
                                                            fontWeight="700"
                                                            sx={{
                                                                fontSize: isMobile ? '0.938rem' : '1rem',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {consult.patient_name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {consult.patient_number}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                                {getStatusChip(consult.status)}
                                            </Stack>

                                            {/* Date and Time */}
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    mb: 2,
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    bgcolor: theme => alpha(theme.palette.primary.main, 0.05),
                                                    border: '1px solid',
                                                    borderColor: theme => alpha(theme.palette.primary.main, 0.1)
                                                }}
                                            >
                                                <CalendarIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="body2" fontWeight="600">
                                                        {new Date(consult.consultation_date).toLocaleDateString('fr-FR', {
                                                            weekday: 'long',
                                                            day: 'numeric',
                                                            month: 'long'
                                                        })}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {new Date(consult.consultation_date).toLocaleTimeString('fr-FR', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            {/* Chief Complaint */}
                                            {consult.chief_complaint && (
                                                <Box sx={{ mb: 2 }}>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5}>
                                                        Motif de consultation
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}
                                                    >
                                                        {consult.chief_complaint}
                                                    </Typography>
                                                </Box>
                                            )}

                                            {/* Doctor */}
                                            {consult.doctor_name && (
                                                <Stack
                                                    direction="row"
                                                    alignItems="center"
                                                    spacing={1}
                                                    sx={{
                                                        p: 1,
                                                        borderRadius: 1.5,
                                                        bgcolor: theme => alpha(theme.palette.background.default, 0.5)
                                                    }}
                                                >
                                                    <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                                    <Typography variant="body2" color="text.secondary" fontSize={isMobile ? '0.813rem' : '0.875rem'}>
                                                        Dr. {consult.doctor_name}
                                                    </Typography>
                                                </Stack>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </Grid>
                        ))}
                    </AnimatePresence>
                </Grid>
            )}
        </Box>
    );
};

export default ConsultationList;
