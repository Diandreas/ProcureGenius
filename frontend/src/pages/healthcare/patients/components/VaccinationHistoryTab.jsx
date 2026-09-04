import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Card, CardContent, Typography, Chip, Stack, Button, Alert, Table, TableBody,
    TableCell, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField, MenuItem,
} from '@mui/material';
import { Add as AddIcon, Vaccines as VaccinesIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import vaccinationAPI from '../../../../services/vaccinationAPI';

const emptyForm = {
    vaccine_type: '', dose_number: '', administered_date: dayjs().format('YYYY-MM-DDTHH:mm'),
    next_dose_due_date: '', batch_number: '', notes: '',
};

const VaccinationHistoryTab = ({ patientId }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [records, setRecords] = useState([]);
    const [vaccineTypes, setVaccineTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const fetchHistory = useCallback(() => {
        if (!patientId) return;
        vaccinationAPI.getPatientHistory(patientId)
            .then(data => setRecords(data.records || []))
            .catch(() => setRecords([]))
            .finally(() => setLoading(false));
    }, [patientId]);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);
    useEffect(() => {
        vaccinationAPI.getVaccineTypes({ is_active: true }).then(data => {
            setVaccineTypes(Array.isArray(data) ? data : data.results || []);
        }).catch(() => {});
    }, []);

    const handleSave = async () => {
        if (!form.vaccine_type) {
            enqueueSnackbar('Sélectionne un vaccin', { variant: 'warning' });
            return;
        }
        setSaving(true);
        try {
            const record = await vaccinationAPI.createRecord({ ...form, patient: patientId });
            try {
                await vaccinationAPI.generateRecordInvoice(record.id);
            } catch (e) { /* facturation optionnelle, ne bloque pas l'enregistrement */ }
            enqueueSnackbar('Vaccination enregistrée', { variant: 'success' });
            setDialogOpen(false);
            setForm(emptyForm);
            fetchHistory();
        } catch (error) {
            enqueueSnackbar("Erreur lors de l'enregistrement de la vaccination", { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return null;

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight="700">Historique vaccinal</Typography>
                <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
                    Ajouter une vaccination
                </Button>
            </Stack>

            {records.length === 0 ? (
                <Alert severity="info">Aucune vaccination enregistrée pour ce patient.</Alert>
            ) : (
                <Card>
                    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Vaccin</TableCell>
                                    <TableCell>Dose</TableCell>
                                    <TableCell>Administré par</TableCell>
                                    <TableCell>Prochaine dose</TableCell>
                                    <TableCell>Facturation</TableCell>
                                    <TableCell>Origine</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {records.map(r => (
                                    <TableRow key={r.id}>
                                        <TableCell>{dayjs(r.administered_date).format('DD/MM/YYYY HH:mm')}</TableCell>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                                <VaccinesIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                                <Typography variant="body2">{r.vaccine_type_detail?.name}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>{r.dose_number ?? '-'}</TableCell>
                                        <TableCell>{r.administered_by_name || '-'}</TableCell>
                                        <TableCell>{r.next_dose_due_date ? dayjs(r.next_dose_due_date).format('DD/MM/YYYY') : '-'}</TableCell>
                                        <TableCell>
                                            {r.invoice_detail ? (
                                                <Chip size="small" color="success" label={`Facturé — ${r.invoice_detail.total_amount} XAF`} />
                                            ) : (
                                                <Chip size="small" variant="outlined" label="Gratuit" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {r.pregnancy ? <Chip size="small" color="secondary" label="Anténatal" /> : <Chip size="small" label="Général" />}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Nouvelle vaccination</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12}>
                            <TextField fullWidth select label="Vaccin *" value={form.vaccine_type}
                                onChange={e => setForm(p => ({ ...p, vaccine_type: e.target.value }))}>
                                {vaccineTypes.map(v => (
                                    <MenuItem key={v.id} value={v.id}>
                                        {v.name} {v.is_billable ? `(${v.price} XAF)` : '(Gratuit)'}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth type="number" label="Numéro de dose"
                                value={form.dose_number} onChange={e => setForm(p => ({ ...p, dose_number: e.target.value }))} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth type="datetime-local" label="Date d'administration" InputLabelProps={{ shrink: true }}
                                value={form.administered_date} onChange={e => setForm(p => ({ ...p, administered_date: e.target.value }))} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth type="date" label="Prochaine dose due" InputLabelProps={{ shrink: true }}
                                value={form.next_dose_due_date} onChange={e => setForm(p => ({ ...p, next_dose_due_date: e.target.value }))} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth label="Numéro de lot"
                                value={form.batch_number} onChange={e => setForm(p => ({ ...p, batch_number: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth multiline minRows={2} label="Notes"
                                value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>Enregistrer</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default VaccinationHistoryTab;
