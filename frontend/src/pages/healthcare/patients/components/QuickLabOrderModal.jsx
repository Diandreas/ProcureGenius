import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    CircularProgress,
    Autocomplete,
    Chip,
    MenuItem,
    Grid
} from '@mui/material';
import { Science as LabIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../../services/laboratoryAPI';

const QuickLabOrderModal = ({ open, onClose, patientId, patientName, onSuccess }) => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [loadingTests, setLoadingTests] = useState(false);
    const [tests, setTests] = useState([]);

    const [formData, setFormData] = useState({
        selectedTests: [],
        priority: 'routine',
        clinical_notes: ''
    });

    useEffect(() => {
        if (open) {
            fetchTests();
        }
    }, [open]);

    const fetchTests = async () => {
        setLoadingTests(true);
        try {
            const response = await laboratoryAPI.getTests({ page_size: 1000 });
            setTests(response.results || response || []);
        } catch (error) {
            console.error('Error fetching tests:', error);
            enqueueSnackbar('Erreur lors du chargement des tests', { variant: 'error' });
        } finally {
            setLoadingTests(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const calculateTotal = () => {
        return formData.selectedTests.reduce((sum, test) => sum + (parseFloat(test.price) || 0), 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.selectedTests.length === 0) {
            enqueueSnackbar('Veuillez sélectionner au moins un test', { variant: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                patient_id: patientId,
                test_ids: formData.selectedTests.map(test => test.id),
                priority: formData.priority,
                clinical_notes: formData.clinical_notes || ''
            };

            const response = await laboratoryAPI.createOrder(payload);
            enqueueSnackbar('Ordonnance de laboratoire créée avec succès', { variant: 'success' });

            if (onSuccess) onSuccess();
            onClose();

            // Navigate to lab order detail page
            navigate(`/healthcare/laboratory/${response.id}`);
        } catch (error) {
            console.error('Error creating lab order:', error);
            const errorMessage = error.response?.data?.detail || error.response?.data?.message || 'Erreur lors de la création';
            enqueueSnackbar(errorMessage, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setFormData({
                selectedTests: [],
                priority: 'routine',
                clinical_notes: ''
            });
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LabIcon color="secondary" />
                    <Typography variant="h6" component="span">
                        Nouvelle Ordonnance de Laboratoire
                    </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Patient: <strong>{patientName}</strong>
                </Typography>
            </DialogTitle>

            <form onSubmit={handleSubmit}>
                <DialogContent dividers>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Autocomplete
                                multiple
                                options={tests}
                                getOptionLabel={(option) => `${option.test_code} - ${option.name}`}
                                value={formData.selectedTests}
                                onChange={(e, newValue) => setFormData(prev => ({ ...prev, selectedTests: newValue }))}
                                loading={loadingTests}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Tests de Laboratoire"
                                        placeholder="Rechercher et sélectionner des tests..."
                                        helperText="Tapez pour rechercher par code ou nom de test"
                                    />
                                )}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                        <Chip
                                            key={option.id}
                                            label={`${option.test_code} - ${option.short_name || option.name}`}
                                            {...getTagProps({ index })}
                                            color="secondary"
                                        />
                                    ))
                                }
                            />
                        </Grid>

                        {formData.selectedTests.length > 0 && (
                            <Grid item xs={12}>
                                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Tests Sélectionnés ({formData.selectedTests.length})
                                    </Typography>
                                    {formData.selectedTests.map((test, idx) => (
                                        <Box key={test.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                                            <Typography variant="body2">
                                                {idx + 1}. {test.test_code} - {test.name}
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                {test.price?.toLocaleString()} FCFA
                                            </Typography>
                                        </Box>
                                    ))}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            Total
                                        </Typography>
                                        <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                            {calculateTotal().toLocaleString()} FCFA
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>
                        )}

                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="Priorité"
                                name="priority"
                                value={formData.priority}
                                onChange={handleChange}
                            >
                                <MenuItem value="routine">Routine</MenuItem>
                                <MenuItem value="urgent">Urgent</MenuItem>
                                <MenuItem value="stat">STAT (Immédiat)</MenuItem>
                            </TextField>
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="Notes Cliniques (Optionnel)"
                                name="clinical_notes"
                                value={formData.clinical_notes}
                                onChange={handleChange}
                                placeholder="Informations cliniques pertinentes pour le laboratoire..."
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 2, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            L'ordonnance sera créée et vous serez redirigé vers la page de détails du laboratoire.
                        </Typography>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={handleClose} disabled={loading}>
                        Annuler
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="secondary"
                        disabled={loading || formData.selectedTests.length === 0}
                        startIcon={loading ? <CircularProgress size={20} /> : <LabIcon />}
                    >
                        {loading ? 'Création...' : 'Créer Ordonnance'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default QuickLabOrderModal;
