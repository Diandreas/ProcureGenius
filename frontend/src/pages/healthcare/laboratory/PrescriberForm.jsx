import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Grid, Switch, FormControlLabel,
    CircularProgress,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';

const emptyForm = {
    first_name: '',
    last_name: '',
    specialty: '',
    clinic_name: '',
    phone: '',
    email: '',
    address: '',
    commission_rate: '0.00',
    notes: '',
    is_active: true,
};

export default function PrescriberForm({ open, onClose, onSaved, prescriber }) {
    const { enqueueSnackbar } = useSnackbar();
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (prescriber) {
            setForm({
                first_name: prescriber.first_name || '',
                last_name: prescriber.last_name || '',
                specialty: prescriber.specialty || '',
                clinic_name: prescriber.clinic_name || '',
                phone: prescriber.phone || '',
                email: prescriber.email || '',
                address: prescriber.address || '',
                commission_rate: prescriber.commission_rate ?? '0.00',
                notes: prescriber.notes || '',
                is_active: prescriber.is_active ?? true,
            });
        } else {
            setForm(emptyForm);
        }
    }, [prescriber, open]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.first_name.trim() || !form.last_name.trim()) {
            enqueueSnackbar('Prénom et Nom sont requis', { variant: 'warning' });
            return;
        }
        setSaving(true);
        try {
            let saved;
            if (prescriber) {
                saved = await laboratoryAPI.updatePrescriber(prescriber.id, form);
                enqueueSnackbar('Prescripteur mis à jour', { variant: 'success' });
            } else {
                saved = await laboratoryAPI.createPrescriber(form);
                enqueueSnackbar('Prescripteur créé', { variant: 'success' });
            }
            onSaved(saved);
            onClose();
        } catch (err) {
            const msg = err?.response?.data?.detail || 'Erreur lors de la sauvegarde';
            enqueueSnackbar(msg, { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>{prescriber ? 'Modifier le prescripteur' : 'Nouveau prescripteur'}</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ pt: 1 }}>
                        <Grid item xs={6}>
                            <TextField
                                label="Prénom *"
                                name="first_name"
                                value={form.first_name}
                                onChange={handleChange}
                                fullWidth
                                size="small"
                                required
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Nom *"
                                name="last_name"
                                value={form.last_name}
                                onChange={handleChange}
                                fullWidth
                                size="small"
                                required
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Spécialité"
                                name="specialty"
                                value={form.specialty}
                                onChange={handleChange}
                                fullWidth
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Cabinet / Structure"
                                name="clinic_name"
                                value={form.clinic_name}
                                onChange={handleChange}
                                fullWidth
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Téléphone"
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                                fullWidth
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Email"
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleChange}
                                fullWidth
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Adresse"
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                fullWidth
                                size="small"
                                multiline
                                rows={2}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Taux de commission (%)"
                                name="commission_rate"
                                type="number"
                                inputProps={{ min: 0, max: 100, step: 0.01 }}
                                value={form.commission_rate}
                                onChange={handleChange}
                                fullWidth
                                size="small"
                                helperText="% sur les factures de labo"
                            />
                        </Grid>
                        <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center' }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        name="is_active"
                                        checked={form.is_active}
                                        onChange={handleChange}
                                    />
                                }
                                label="Actif"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Notes"
                                name="notes"
                                value={form.notes}
                                onChange={handleChange}
                                fullWidth
                                size="small"
                                multiline
                                rows={2}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={saving}>Annuler</Button>
                    <Button type="submit" variant="contained" disabled={saving}>
                        {saving ? <CircularProgress size={18} /> : 'Enregistrer'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
