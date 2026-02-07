
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
    Box,
    Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import patientAPI from '../../../../services/patientAPI';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

// Initialize dayjs locale
dayjs.locale('fr');

const QuickClientCreateModal = ({ open, onClose, onSuccess }) => {
    const { t } = useTranslation();
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        date_of_birth: '',
        gender: 'M',
        phone: '',
        email: '',
        address: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (date) => {
        setFormData(prev => ({
            ...prev,
            date_of_birth: date ? date.format('YYYY-MM-DD') : ''
        }));
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.name || !formData.date_of_birth || !formData.phone) {
            enqueueSnackbar('Veuillez remplir les champs obligatoires (Nom, Date de naissance, Téléphone)', { variant: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const response = await patientAPI.createPatient(formData);
            enqueueSnackbar('Patient créé avec succès', { variant: 'success' });
            if (onSuccess) {
                onSuccess(response);
            }
            onClose();
            // Reset form
            setFormData({
                name: '',
                date_of_birth: '',
                gender: 'M',
                phone: '',
                email: '',
                address: ''
            });
        } catch (error) {
            console.error('Error creating patient:', error);
            const errorMessage = error.response?.data?.detail
                || error.response?.data?.phone?.[0]
                || 'Erreur lors de la création du patient';
            enqueueSnackbar(errorMessage, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Nouveau Patient Rapide</DialogTitle>
            <DialogContent dividers>
                <Box component="form" noValidate sx={{ mt: 1 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                label="Nom complet"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                autoFocus
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
                                <DatePicker
                                    label="Date de Naissance"
                                    value={formData.date_of_birth ? dayjs(formData.date_of_birth) : null}
                                    onChange={handleDateChange}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            required: true,
                                            variant: 'outlined',
                                            size: 'small'
                                        }
                                    }}
                                    format="DD/MM/YYYY"
                                />
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                select
                                fullWidth
                                label="Sexe"
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                            >
                                <MenuItem value="M">Masculin</MenuItem>
                                <MenuItem value="F">Féminin</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                label="Téléphone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Adresse"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                multiline
                                rows={2}
                            />
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Annuler</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    Créer
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default QuickClientCreateModal;
