import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    MenuItem,
    IconButton,
    CircularProgress
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import patientAPI from '../../../../services/patientAPI';

const SERVICE_TYPES = [
    { value: 'nursing_care', label: 'Soin infirmier' },
    { value: 'procedure', label: 'Procédure / Intervention' },
    { value: 'vaccination', label: 'Vaccination' },
    { value: 'imaging', label: 'Imagerie' },
    { value: 'physiotherapy', label: 'Kinésithérapie' },
    { value: 'other', label: 'Autre' },
];

const AdministerCareModal = ({ open, onClose, patientId, onSaved }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        service_type: 'nursing_care',
        service_name: '',
        notes: '',
        quantity: 1,
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.service_name.trim()) {
            enqueueSnackbar('Veuillez saisir le nom du soin', { variant: 'warning' });
            return;
        }

        setLoading(true);
        try {
            await patientAPI.createCareService(patientId, {
                service_type: formData.service_type,
                service_name: formData.service_name,
                notes: formData.notes,
                quantity: parseInt(formData.quantity) || 1,
            });
            enqueueSnackbar('Soin administré avec succès', { variant: 'success' });
            setFormData({ service_type: 'nursing_care', service_name: '', notes: '', quantity: 1 });
            onSaved?.();
            onClose();
        } catch (error) {
            enqueueSnackbar('Erreur lors de l\'enregistrement du soin', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Administrer un Soin
                <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth select required
                            label="Type de soin"
                            name="service_type"
                            value={formData.service_type}
                            onChange={handleChange}
                            size="small"
                        >
                            {SERVICE_TYPES.map(t => (
                                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth required
                            label="Nom du soin"
                            name="service_name"
                            value={formData.service_name}
                            onChange={handleChange}
                            size="small"
                            placeholder="Ex: Pansement, Injection IV, Vaccin BCG..."
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth multiline rows={3}
                            label="Notes / Observations"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            label="Quantité"
                            name="quantity"
                            type="number"
                            value={formData.quantity}
                            onChange={handleChange}
                            size="small"
                            inputProps={{ min: 1 }}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={loading}>Annuler</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : 'Enregistrer'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AdministerCareModal;
