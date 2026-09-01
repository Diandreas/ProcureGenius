import React, { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Grid, TextField, Typography, Autocomplete, Button, Stack,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import maternityAPI from '../../../services/maternityAPI';
import patientAPI from '../../../services/patientAPI';
import BackButton from '../../../components/navigation/BackButton';

export default function PregnancyForm() {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const [patients, setPatients] = useState([]);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        patient: null,
        lmp_date: '',
        expected_delivery_date: '',
        gravidity: '',
        parity: '',
        risk_factors: '',
    });

    useEffect(() => {
        patientAPI.getPatients({ page_size: 200 }).then(data => {
            setPatients(Array.isArray(data) ? data : data.results || []);
        }).catch(() => {});
    }, []);

    const handleSubmit = async () => {
        if (!formData.patient) {
            enqueueSnackbar('Sélectionne une patiente', { variant: 'warning' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                patient: formData.patient.id,
                lmp_date: formData.lmp_date || null,
                expected_delivery_date: formData.expected_delivery_date || null,
                gravidity: formData.gravidity || null,
                parity: formData.parity || null,
                risk_factors: formData.risk_factors,
            };
            const created = await maternityAPI.createPregnancy(payload);
            enqueueSnackbar('Dossier de grossesse créé', { variant: 'success' });
            navigate(`/healthcare/maternity/${created.id}`);
        } catch (error) {
            enqueueSnackbar(error.response?.data?.detail || "Erreur lors de la création du dossier", { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 700, mx: 'auto' }}>
            <BackButton />
            <Typography variant="h5" fontWeight="700" sx={{ mb: 2 }}>Nouveau dossier de grossesse</Typography>

            <Card>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Autocomplete
                                options={patients}
                                getOptionLabel={(o) => `${o.name} (${o.patient_number || ''})`}
                                value={formData.patient}
                                onChange={(e, v) => setFormData(prev => ({ ...prev, patient: v }))}
                                renderInput={(params) => <TextField {...params} label="Patiente *" />}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth type="date" label="Date des dernières règles (DDR)"
                                InputLabelProps={{ shrink: true }}
                                value={formData.lmp_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, lmp_date: e.target.value }))}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth type="date" label="Date prévue d'accouchement (DPA)"
                                InputLabelProps={{ shrink: true }}
                                value={formData.expected_delivery_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth type="number" label="Gravidité"
                                value={formData.gravidity}
                                onChange={(e) => setFormData(prev => ({ ...prev, gravidity: e.target.value }))}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth type="number" label="Parité"
                                value={formData.parity}
                                onChange={(e) => setFormData(prev => ({ ...prev, parity: e.target.value }))}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth multiline minRows={2} label="Facteurs de risque"
                                placeholder="Ex: HTA, diabète gestationnel, grossesse multiple..."
                                value={formData.risk_factors}
                                onChange={(e) => setFormData(prev => ({ ...prev, risk_factors: e.target.value }))}
                            />
                        </Grid>
                    </Grid>
                    <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
                        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit} disabled={saving}>
                            {saving ? 'Enregistrement...' : 'Créer le dossier'}
                        </Button>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}
