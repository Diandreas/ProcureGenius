import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Button,
    CircularProgress,
    Collapse,
    IconButton
} from '@mui/material';
import {
    MedicalServices as ConsultIcon,
    Science as LabIcon,
    LocalPharmacy as PharmacyIcon,
    HealthAndSafety as CareIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    ArrowForward as ArrowIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import patientAPI from '../../../../services/patientAPI';
import { formatDate, formatTime } from '../../../../utils/formatters';

const typeConfig = {
    consultation: { icon: <ConsultIcon fontSize="small" />, color: '#2563eb', label: 'Consultation' },
    laboratory: { icon: <LabIcon fontSize="small" />, color: '#f59e0b', label: 'Laboratoire' },
    pharmacy: { icon: <PharmacyIcon fontSize="small" />, color: '#10b981', label: 'Pharmacie' },
    care: { icon: <CareIcon fontSize="small" />, color: '#8b5cf6', label: 'Soin' },
};

const statusColors = {
    completed: 'success',
    in_progress: 'info',
    in_consultation: 'info',
    pending: 'warning',
    cancelled: 'error',
    results_delivered: 'success',
    verified: 'success',
    sample_collected: 'info',
};

const TimelineEvent = ({ event }) => {
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);
    const config = typeConfig[event.type] || typeConfig.care;

    return (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {/* Timeline dot & line */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40 }}>
                <Box sx={{
                    width: 36, height: 36, borderRadius: '50%',
                    bgcolor: config.color, color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    {config.icon}
                </Box>
                <Box sx={{ width: 2, flexGrow: 1, bgcolor: 'divider', mt: 0.5 }} />
            </Box>

            {/* Event card */}
            <Card variant="outlined" sx={{ flex: 1, mb: 1 }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Chip label={config.label} size="small" sx={{ bgcolor: config.color, color: 'white', height: 20, fontSize: '0.7rem' }} />
                                <Chip label={event.status} size="small" color={statusColors[event.status] || 'default'} variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                            </Box>
                            <Typography variant="subtitle2" fontWeight="bold">{event.title}</Typography>
                            {event.summary && (
                                <Typography variant="body2" color="text.secondary">{event.summary}</Typography>
                            )}
                            {event.provider && (
                                <Typography variant="caption" color="text.secondary">Par: {event.provider}</Typography>
                            )}
                        </Box>
                        <Box sx={{ textAlign: 'right', minWidth: 80 }}>
                            <Typography variant="caption" color="text.secondary">
                                {event.date ? formatDate(event.date) : ''}
                            </Typography>
                            <br />
                            <Typography variant="caption" color="text.secondary">
                                {event.date ? formatTime(event.date) : ''}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Expandable detail */}
                    {event.detail && (
                        <>
                            <Box
                                onClick={() => setExpanded(!expanded)}
                                sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', mt: 0.5, color: 'text.secondary' }}
                            >
                                <Typography variant="caption">
                                    {expanded ? 'Masquer les détails' : 'Voir les détails'}
                                </Typography>
                                {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                            </Box>
                            <Collapse in={expanded}>
                                <Typography variant="body2" sx={{ mt: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                                    {event.detail}
                                </Typography>
                            </Collapse>
                        </>
                    )}

                    {/* Link */}
                    {event.link && (
                        <Button
                            size="small"
                            endIcon={<ArrowIcon />}
                            onClick={() => navigate(event.link)}
                            sx={{ mt: 0.5, textTransform: 'none' }}
                        >
                            Voir le détail
                        </Button>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

const PatientTimeline = ({ patientId }) => {
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [hasNext, setHasNext] = useState(false);
    const [filterType, setFilterType] = useState('all');

    const fetchTimeline = useCallback(async (pageNum = 1, append = false) => {
        setLoading(true);
        try {
            const params = { page: pageNum };
            if (filterType !== 'all') params.type = filterType;
            const data = await patientAPI.getTimeline(patientId, params);
            if (append) {
                setEvents(prev => [...prev, ...(data.events || [])]);
            } else {
                setEvents(data.events || []);
            }
            setTotal(data.total || 0);
            setHasNext(data.has_next || false);
            setPage(pageNum);
        } catch (error) {
            console.error('Error fetching timeline:', error);
        } finally {
            setLoading(false);
        }
    }, [patientId, filterType]);

    useEffect(() => {
        fetchTimeline(1, false);
    }, [fetchTimeline]);

    const handleLoadMore = () => {
        fetchTimeline(page + 1, true);
    };

    const filterOptions = [
        { value: 'all', label: 'Tout' },
        { value: 'consultation', label: 'Consultations' },
        { value: 'laboratory', label: 'Laboratoire' },
        { value: 'pharmacy', label: 'Pharmacie' },
        { value: 'care', label: 'Soins' },
    ];

    return (
        <Box>
            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                {filterOptions.map(opt => (
                    <Chip
                        key={opt.value}
                        label={opt.label}
                        onClick={() => setFilterType(opt.value)}
                        color={filterType === opt.value ? 'primary' : 'default'}
                        variant={filterType === opt.value ? 'filled' : 'outlined'}
                    />
                ))}
                <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto', alignSelf: 'center' }}>
                    {total} événement(s)
                </Typography>
            </Box>

            {/* Timeline */}
            {loading && events.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            ) : events.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">Aucun événement trouvé</Typography>
                </Box>
            ) : (
                <>
                    {events.map((event) => (
                        <TimelineEvent key={`${event.type}-${event.id}`} event={event} />
                    ))}

                    {hasNext && (
                        <Box sx={{ textAlign: 'center', mt: 2 }}>
                            <Button onClick={handleLoadMore} disabled={loading} variant="outlined">
                                {loading ? <CircularProgress size={20} /> : 'Charger plus'}
                            </Button>
                        </Box>
                    )}
                </>
            )}
        </Box>
    );
};

export default PatientTimeline;
