import React, { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Grid, TextField, Typography, Chip, IconButton,
    InputAdornment, Stack, useTheme, Button,
} from '@mui/material';
import {
    Add as AddIcon, Search as SearchIcon, PregnantWoman as MaternityIcon,
    ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import maternityAPI from '../../../services/maternityAPI';
import LoadingState from '../../../components/LoadingState';
import { formatDate as formatDisplayDate } from '../../../utils/formatters';

dayjs.locale('fr');

const STATUS_LABELS = { ongoing: 'En cours', delivered: 'Accouchée', terminated: 'Interrompue' };
const STATUS_COLORS = { ongoing: 'info', delivered: 'success', terminated: 'default' };

export default function PregnancyList() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const [pregnancies, setPregnancies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        maternityAPI.getPregnancies({ search, page_size: 50 }).then(data => {
            setPregnancies(Array.isArray(data) ? data : data.results || []);
        }).catch(() => {
            enqueueSnackbar('Erreur lors du chargement des dossiers de grossesse', { variant: 'error' });
        }).finally(() => setLoading(false));
    }, [search]);

    if (loading) return <LoadingState />;

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h5" fontWeight="700">Maternité</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {pregnancies.length} dossier{pregnancies.length > 1 ? 's' : ''} de grossesse
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/healthcare/maternity/new')}>
                    Nouveau dossier
                </Button>
            </Stack>

            <TextField
                fullWidth placeholder="Rechercher une patiente..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                sx={{ mb: 3 }}
            />

            <Grid container spacing={2}>
                {pregnancies.map(p => (
                    <Grid item xs={12} sm={6} md={4} key={p.id}>
                        <Card
                            sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
                            onClick={() => navigate(`/healthcare/maternity/${p.id}`)}
                        >
                            <CardContent>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <MaternityIcon sx={{ color: '#ec4899' }} />
                                        <Typography variant="subtitle1" fontWeight="700">
                                            {p.patient_details?.name}
                                        </Typography>
                                    </Stack>
                                    <Chip size="small" label={STATUS_LABELS[p.status] || p.status} color={STATUS_COLORS[p.status] || 'default'} />
                                </Stack>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                    DPA : {p.expected_delivery_date ? formatDisplayDate(p.expected_delivery_date) : 'Non renseignée'}
                                </Typography>
                                {p.last_visit_date && (
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        Dernière CPN : {formatDisplayDate(p.last_visit_date)}
                                    </Typography>
                                )}
                                <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
                                    <IconButton size="small"><ArrowForward fontSize="small" /></IconButton>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
                {pregnancies.length === 0 && (
                    <Grid item xs={12}>
                        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                            Aucun dossier de grossesse pour l'instant.
                        </Typography>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
}
