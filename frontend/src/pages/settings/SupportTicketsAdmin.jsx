import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, MenuItem, TextField, Stack, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Link as MuiLink,
    Grid,
} from '@mui/material';
import { OpenInNew as OpenIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import supportAPI from '../../services/supportAPI';
import LoadingState from '../../components/LoadingState';
import BackButton from '../../components/navigation/BackButton';

const STATUS_COLORS = { open: 'error', in_progress: 'warning', resolved: 'success', closed: 'default' };
const PRIORITY_COLORS = { low: 'default', normal: 'info', high: 'error' };

export default function SupportTicketsAdmin() {
    const { enqueueSnackbar } = useSnackbar();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [moduleFilter, setModuleFilter] = useState('');
    const [selected, setSelected] = useState(null);
    const [responseText, setResponseText] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            if (moduleFilter) params.module = moduleFilter;
            const data = await supportAPI.getTickets(params);
            setTickets(Array.isArray(data) ? data : data.results || []);
        } catch (err) {
            enqueueSnackbar('Erreur lors du chargement des tickets', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [statusFilter, moduleFilter, enqueueSnackbar]);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    const openTicket = (ticket) => {
        setSelected(ticket);
        setResponseText(ticket.admin_response || '');
    };

    const handleStatusChange = async (ticket, newStatus) => {
        try {
            await supportAPI.updateTicket(ticket.id, { status: newStatus });
            enqueueSnackbar('Statut mis à jour', { variant: 'success' });
            fetchTickets();
            if (selected?.id === ticket.id) setSelected(prev => ({ ...prev, status: newStatus }));
        } catch (err) {
            enqueueSnackbar('Erreur lors de la mise à jour', { variant: 'error' });
        }
    };

    const handleSaveResponse = async () => {
        if (!selected) return;
        setSaving(true);
        try {
            await supportAPI.updateTicket(selected.id, { admin_response: responseText });
            enqueueSnackbar('Réponse enregistrée', { variant: 'success' });
            fetchTickets();
            setSelected(null);
        } catch (err) {
            enqueueSnackbar("Erreur lors de l'enregistrement", { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <BackButton />
            <Typography variant="h5" fontWeight="700" sx={{ mb: 2, mt: 1 }}>Tickets Support (SAV)</Typography>

            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField select size="small" label="Statut" value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 160 }}>
                    <MenuItem value="">Tous</MenuItem>
                    <MenuItem value="open">Ouvert</MenuItem>
                    <MenuItem value="in_progress">En cours</MenuItem>
                    <MenuItem value="resolved">Résolu</MenuItem>
                    <MenuItem value="closed">Fermé</MenuItem>
                </TextField>
                <TextField size="small" label="Module" value={moduleFilter}
                    onChange={(e) => setModuleFilter(e.target.value)} sx={{ minWidth: 160 }}
                    placeholder="ex: laboratory" />
            </Stack>

            {loading ? (
                <LoadingState />
            ) : (
                <Card>
                    <CardContent sx={{ p: 0 }}>
                        <TableContainer component={Paper} elevation={0}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Titre</TableCell>
                                        <TableCell>Module</TableCell>
                                        <TableCell>Catégorie</TableCell>
                                        <TableCell>Signalé par</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Priorité</TableCell>
                                        <TableCell>Statut</TableCell>
                                        <TableCell />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tickets.map(t => (
                                        <TableRow key={t.id} hover>
                                            <TableCell>{t.title}</TableCell>
                                            <TableCell>{t.module_display}</TableCell>
                                            <TableCell>{t.category_display}</TableCell>
                                            <TableCell>{t.reported_by_name || '—'}</TableCell>
                                            <TableCell>{dayjs(t.created_at).format('DD/MM/YYYY HH:mm')}</TableCell>
                                            <TableCell>
                                                <Chip size="small" label={t.priority} color={PRIORITY_COLORS[t.priority] || 'default'} />
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    select size="small" value={t.status}
                                                    onChange={(e) => handleStatusChange(t, e.target.value)}
                                                    sx={{ minWidth: 130 }}
                                                >
                                                    <MenuItem value="open">Ouvert</MenuItem>
                                                    <MenuItem value="in_progress">En cours</MenuItem>
                                                    <MenuItem value="resolved">Résolu</MenuItem>
                                                    <MenuItem value="closed">Fermé</MenuItem>
                                                </TextField>
                                            </TableCell>
                                            <TableCell>
                                                <IconButton size="small" onClick={() => openTicket(t)}>
                                                    <OpenIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {tickets.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center">
                                                <Typography color="text.secondary" sx={{ py: 3 }}>Aucun ticket</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}

            <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
                {selected && (
                    <>
                        <DialogTitle>{selected.title}</DialogTitle>
                        <DialogContent dividers>
                            <Stack spacing={1.5}>
                                <Typography variant="body2" color="text.secondary">
                                    {selected.module_display} · {selected.category_display} · signalé par {selected.reported_by_name || '—'}
                                </Typography>
                                {selected.page_url && (
                                    <Typography variant="caption" color="text.secondary">Page : {selected.page_url}</Typography>
                                )}
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
                                <TextField
                                    label="Réponse / notes internes"
                                    multiline minRows={3} fullWidth
                                    value={responseText}
                                    onChange={(e) => setResponseText(e.target.value)}
                                />
                            </Stack>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setSelected(null)}>Fermer</Button>
                            <Button onClick={handleSaveResponse} variant="contained" disabled={saving}>Enregistrer</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
}
