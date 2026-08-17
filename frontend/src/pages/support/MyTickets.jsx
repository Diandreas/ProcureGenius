import React, { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Typography, Chip, Stack, Dialog, DialogTitle,
    DialogContent, DialogActions, Button, Grid, Link as MuiLink,
} from '@mui/material';
import { AccessTime as ClockIcon, CheckCircle as ResolvedIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';
import supportAPI from '../../services/supportAPI';
import LoadingState from '../../components/LoadingState';

dayjs.extend(relativeTime);
dayjs.locale('fr');

const STATUS_LABELS = { open: 'Ouvert', in_progress: 'En cours', resolved: 'Résolu', closed: 'Fermé' };
const STATUS_COLORS = { open: 'error', in_progress: 'warning', resolved: 'success', closed: 'default' };

export default function MyTickets() {
    const { enqueueSnackbar } = useSnackbar();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        supportAPI.getMyTickets().then(data => {
            setTickets(Array.isArray(data) ? data : data.results || []);
        }).catch(() => {
            enqueueSnackbar('Erreur lors du chargement de tes tickets', { variant: 'error' });
        }).finally(() => setLoading(false));
    }, [enqueueSnackbar]);

    if (loading) return <LoadingState />;

    const elapsedLabel = (ticket) => {
        const start = dayjs(ticket.created_at);
        if (ticket.status === 'resolved' || ticket.status === 'closed') {
            const end = dayjs(ticket.resolved_at || ticket.updated_at);
            const hours = end.diff(start, 'hour');
            return `Traité en ${hours < 1 ? '< 1h' : hours < 48 ? `${hours}h` : `${end.diff(start, 'day')} j`}`;
        }
        return `En attente depuis ${start.fromNow(true)}`;
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h5" fontWeight="700" sx={{ mb: 0.5 }}>Mes Tickets Support</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {tickets.length} ticket{tickets.length > 1 ? 's' : ''} envoyé{tickets.length > 1 ? 's' : ''}
            </Typography>

            <Stack spacing={1.5}>
                {tickets.map(t => (
                    <Card key={t.id} sx={{ cursor: 'pointer' }} onClick={() => setSelected(t)}>
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight="700">{t.title}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {t.module_display} · {t.category_display} · {dayjs(t.created_at).format('DD/MM/YYYY HH:mm')}
                                    </Typography>
                                </Box>
                                <Chip size="small" label={STATUS_LABELS[t.status] || t.status} color={STATUS_COLORS[t.status] || 'default'} />
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1 }}>
                                {t.status === 'resolved' || t.status === 'closed' ? (
                                    <ResolvedIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                ) : (
                                    <ClockIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                                )}
                                <Typography variant="caption" color="text.secondary">{elapsedLabel(t)}</Typography>
                            </Stack>
                            {t.admin_response && (
                                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }} color="text.secondary">
                                    Réponse : {t.admin_response}
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                ))}
                {tickets.length === 0 && (
                    <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                        Tu n'as encore envoyé aucun ticket — utilise le bouton support en bas de l'écran pour signaler un problème.
                    </Typography>
                )}
            </Stack>

            <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
                {selected && (
                    <>
                        <DialogTitle>{selected.title}</DialogTitle>
                        <DialogContent dividers>
                            <Stack spacing={1.5}>
                                <Typography variant="body2" color="text.secondary">
                                    {selected.module_display} · {selected.category_display}
                                </Typography>
                                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{selected.description}</Typography>
                                {selected.attachments?.length > 0 && (
                                    <Grid container spacing={1}>
                                        {selected.attachments.map(a => (
                                            <Grid item key={a.id} xs={4}>
                                                <MuiLink href={a.file} target="_blank" rel="noopener">
                                                    <img src={a.file} alt="capture" style={{ width: '100%', borderRadius: 4 }} />
                                                </MuiLink>
                                            </Grid>
                                        ))}
                                    </Grid>
                                )}
                                {selected.admin_response && (
                                    <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 2 }}>
                                        <Typography variant="caption" color="text.secondary">Réponse de l'équipe</Typography>
                                        <Typography variant="body2">{selected.admin_response}</Typography>
                                    </Box>
                                )}
                            </Stack>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setSelected(null)}>Fermer</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
}
