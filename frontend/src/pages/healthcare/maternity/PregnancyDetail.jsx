import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Card, CardContent, Grid, TextField, Typography, Chip, Button, Stack,
    Dialog, DialogTitle, DialogContent, DialogActions, Divider, MenuItem,
    Table, TableBody, TableCell, TableHead, TableRow, Checkbox, FormControlLabel,
} from '@mui/material';
import { Add as AddIcon, Receipt as ReceiptIcon } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import maternityAPI from '../../../services/maternityAPI';
import LoadingState from '../../../components/LoadingState';
import BackButton from '../../../components/navigation/BackButton';
import { formatDate as formatDisplayDate } from '../../../utils/formatters';

const emptyVisit = {
    visit_date: dayjs().format('YYYY-MM-DDTHH:mm'), gestational_age_weeks: '', weight: '',
    blood_pressure_systolic: '', blood_pressure_diastolic: '', fundal_height: '',
    fetal_heart_rate: '', edema: false, fetal_movements: true, urine_test_results: '', notes: '',
};

const emptyDelivery = {
    delivery_date: dayjs().format('YYYY-MM-DDTHH:mm'), delivery_type: 'vaginal',
    labor_duration_hours: '', complications: '', attending_staff: '', mother_condition_after: '',
    create_linked_stay: true, bed_number: '',
};

export default function PregnancyDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const [pregnancy, setPregnancy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cpnDialogOpen, setCpnDialogOpen] = useState(false);
    const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
    const [cpnForm, setCpnForm] = useState(emptyVisit);
    const [deliveryForm, setDeliveryForm] = useState(emptyDelivery);
    const [saving, setSaving] = useState(false);

    const fetchPregnancy = useCallback(() => {
        maternityAPI.getPregnancy(id).then(setPregnancy).catch(() => {
            enqueueSnackbar('Erreur lors du chargement du dossier', { variant: 'error' });
        }).finally(() => setLoading(false));
    }, [id, enqueueSnackbar]);

    useEffect(() => { fetchPregnancy(); }, [fetchPregnancy]);

    const handleSaveCpn = async () => {
        setSaving(true);
        try {
            const visit = await maternityAPI.createPrenatalVisit({ ...cpnForm, pregnancy: id });
            try {
                await maternityAPI.generatePrenatalVisitInvoice(visit.id);
            } catch (e) { /* facturation optionnelle, ne bloque pas la CPN */ }
            enqueueSnackbar('Consultation prénatale enregistrée', { variant: 'success' });
            setCpnDialogOpen(false);
            setCpnForm(emptyVisit);
            fetchPregnancy();
        } catch (error) {
            enqueueSnackbar("Erreur lors de l'enregistrement de la CPN", { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleSaveDelivery = async () => {
        setSaving(true);
        try {
            const delivery = await maternityAPI.createDelivery({
                ...deliveryForm, pregnancy: id,
            });
            try {
                await maternityAPI.generateDeliveryInvoice(delivery.id);
            } catch (e) { /* facturation optionnelle */ }
            enqueueSnackbar('Accouchement enregistré', { variant: 'success' });
            setDeliveryDialogOpen(false);
            fetchPregnancy();
        } catch (error) {
            enqueueSnackbar("Erreur lors de l'enregistrement de l'accouchement", { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingState />;
    if (!pregnancy) return null;

    const delivery = pregnancy.delivery;

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <BackButton />
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h5" fontWeight="700">{pregnancy.patient_details?.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        DPA : {pregnancy.expected_delivery_date ? formatDisplayDate(pregnancy.expected_delivery_date) : 'Non renseignée'}
                        {' · '}Gravidité {pregnancy.gravidity ?? '-'} / Parité {pregnancy.parity ?? '-'}
                    </Typography>
                </Box>
                <Chip label={pregnancy.status === 'delivered' ? 'Accouchée' : pregnancy.status === 'terminated' ? 'Interrompue' : 'En cours'}
                    color={pregnancy.status === 'delivered' ? 'success' : pregnancy.status === 'terminated' ? 'default' : 'info'} />
            </Stack>

            {/* Suivi prénatal */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="h6">Suivi prénatal (CPN)</Typography>
                        <Button size="small" startIcon={<AddIcon />} onClick={() => setCpnDialogOpen(true)}>
                            Ajouter une CPN
                        </Button>
                    </Stack>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell><TableCell>SA</TableCell><TableCell>Poids</TableCell>
                                <TableCell>Tension</TableCell><TableCell>HU</TableCell><TableCell>BCF</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(pregnancy.prenatal_visits || []).map(v => (
                                <TableRow key={v.id}>
                                    <TableCell>{dayjs(v.visit_date).format('DD/MM/YYYY HH:mm')}</TableCell>
                                    <TableCell>{v.gestational_age_weeks ?? '-'}</TableCell>
                                    <TableCell>{v.weight ?? '-'} kg</TableCell>
                                    <TableCell>{v.blood_pressure_systolic ?? '-'}/{v.blood_pressure_diastolic ?? '-'}</TableCell>
                                    <TableCell>{v.fundal_height ?? '-'} cm</TableCell>
                                    <TableCell>{v.fetal_heart_rate ?? '-'} bpm</TableCell>
                                </TableRow>
                            ))}
                            {(!pregnancy.prenatal_visits || pregnancy.prenatal_visits.length === 0) && (
                                <TableRow><TableCell colSpan={6}><Typography color="text.secondary" variant="body2">Aucune CPN enregistrée</Typography></TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Accouchement */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="h6">Accouchement</Typography>
                        {!delivery && (
                            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setDeliveryDialogOpen(true)}>
                                Enregistrer l'accouchement
                            </Button>
                        )}
                    </Stack>
                    {delivery ? (
                        <Box>
                            <Typography variant="body2">
                                {dayjs(delivery.delivery_date).format('DD/MM/YYYY HH:mm')} — {
                                    { vaginal: 'Voie basse', cesarean: 'Césarienne', instrumental: 'Voie basse instrumentale' }[delivery.delivery_type]
                                }
                            </Typography>
                            {delivery.hospitalization && (
                                <Button
                                    size="small" sx={{ mt: 1 }}
                                    onClick={() => navigate(`/healthcare/hospitalizations/${delivery.hospitalization}`)}
                                >
                                    Voir le séjour d'hospitalisation lié
                                </Button>
                            )}
                            <Typography variant="subtitle2" sx={{ mt: 2 }}>Nouveau-né(s)</Typography>
                            {(delivery.newborns || []).map(n => (
                                <Typography key={n.id} variant="body2">
                                    {n.name || 'Nouveau-né'} — {n.sex === 'M' ? 'Garçon' : 'Fille'}, {n.birth_weight_grams ?? '-'} g, Apgar {n.apgar_score_1min ?? '-'}/{n.apgar_score_5min ?? '-'}
                                </Typography>
                            ))}
                            {(!delivery.newborns || delivery.newborns.length === 0) && (
                                <Typography variant="body2" color="text.secondary">Aucun nouveau-né enregistré pour l'instant.</Typography>
                            )}
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">Accouchement pas encore enregistré.</Typography>
                    )}
                </CardContent>
            </Card>

            {/* Dialog CPN */}
            <Dialog open={cpnDialogOpen} onClose={() => setCpnDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Nouvelle consultation prénatale</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={6}>
                            <TextField fullWidth type="datetime-local" label="Date de visite" InputLabelProps={{ shrink: true }}
                                value={cpnForm.visit_date} onChange={e => setCpnForm(p => ({ ...p, visit_date: e.target.value }))} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth type="number" label="Âge gestationnel (SA)"
                                value={cpnForm.gestational_age_weeks} onChange={e => setCpnForm(p => ({ ...p, gestational_age_weeks: e.target.value }))} />
                        </Grid>
                        <Grid item xs={4}>
                            <TextField fullWidth type="number" label="Poids (kg)"
                                value={cpnForm.weight} onChange={e => setCpnForm(p => ({ ...p, weight: e.target.value }))} />
                        </Grid>
                        <Grid item xs={4}>
                            <TextField fullWidth type="number" label="Tension systolique"
                                value={cpnForm.blood_pressure_systolic} onChange={e => setCpnForm(p => ({ ...p, blood_pressure_systolic: e.target.value }))} />
                        </Grid>
                        <Grid item xs={4}>
                            <TextField fullWidth type="number" label="Tension diastolique"
                                value={cpnForm.blood_pressure_diastolic} onChange={e => setCpnForm(p => ({ ...p, blood_pressure_diastolic: e.target.value }))} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth type="number" label="Hauteur utérine (cm)"
                                value={cpnForm.fundal_height} onChange={e => setCpnForm(p => ({ ...p, fundal_height: e.target.value }))} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth type="number" label="Bruits du cœur fœtal (bpm)"
                                value={cpnForm.fetal_heart_rate} onChange={e => setCpnForm(p => ({ ...p, fetal_heart_rate: e.target.value }))} />
                        </Grid>
                        <Grid item xs={6}>
                            <FormControlLabel control={<Checkbox checked={cpnForm.edema} onChange={e => setCpnForm(p => ({ ...p, edema: e.target.checked }))} />} label="Œdèmes" />
                        </Grid>
                        <Grid item xs={6}>
                            <FormControlLabel control={<Checkbox checked={cpnForm.fetal_movements} onChange={e => setCpnForm(p => ({ ...p, fetal_movements: e.target.checked }))} />} label="Mouvements fœtaux actifs" />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Bandelette urinaire (albumine/glucose)"
                                value={cpnForm.urine_test_results} onChange={e => setCpnForm(p => ({ ...p, urine_test_results: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth multiline minRows={2} label="Notes"
                                value={cpnForm.notes} onChange={e => setCpnForm(p => ({ ...p, notes: e.target.value }))} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCpnDialogOpen(false)}>Annuler</Button>
                    <Button variant="contained" onClick={handleSaveCpn} disabled={saving} startIcon={<ReceiptIcon />}>
                        Enregistrer + Facturer
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Accouchement */}
            <Dialog open={deliveryDialogOpen} onClose={() => setDeliveryDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Enregistrer l'accouchement</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={6}>
                            <TextField fullWidth type="datetime-local" label="Date/heure" InputLabelProps={{ shrink: true }}
                                value={deliveryForm.delivery_date} onChange={e => setDeliveryForm(p => ({ ...p, delivery_date: e.target.value }))} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth select label="Type d'accouchement"
                                value={deliveryForm.delivery_type} onChange={e => setDeliveryForm(p => ({ ...p, delivery_type: e.target.value }))}>
                                <MenuItem value="vaginal">Voie basse</MenuItem>
                                <MenuItem value="cesarean">Césarienne</MenuItem>
                                <MenuItem value="instrumental">Voie basse instrumentale</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth type="number" label="Durée du travail (heures)"
                                value={deliveryForm.labor_duration_hours} onChange={e => setDeliveryForm(p => ({ ...p, labor_duration_hours: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth multiline minRows={2} label="Complications"
                                value={deliveryForm.complications} onChange={e => setDeliveryForm(p => ({ ...p, complications: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Personnel présent"
                                value={deliveryForm.attending_staff} onChange={e => setDeliveryForm(p => ({ ...p, attending_staff: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth multiline minRows={2} label="État de la mère après accouchement"
                                value={deliveryForm.mother_condition_after} onChange={e => setDeliveryForm(p => ({ ...p, mother_condition_after: e.target.value }))} />
                        </Grid>
                        <Divider sx={{ width: '100%', my: 1 }} />
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={<Checkbox checked={deliveryForm.create_linked_stay} onChange={e => setDeliveryForm(p => ({ ...p, create_linked_stay: e.target.checked }))} />}
                                label="Créer un séjour d'hospitalisation lié (mère)"
                            />
                        </Grid>
                        {deliveryForm.create_linked_stay && (
                            <Grid item xs={12}>
                                <TextField fullWidth label="Numéro de lit"
                                    value={deliveryForm.bed_number} onChange={e => setDeliveryForm(p => ({ ...p, bed_number: e.target.value }))} />
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeliveryDialogOpen(false)}>Annuler</Button>
                    <Button variant="contained" onClick={handleSaveDelivery} disabled={saving} startIcon={<ReceiptIcon />}>
                        Enregistrer + Facturer
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
