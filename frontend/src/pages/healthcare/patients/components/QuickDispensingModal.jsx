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
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Paper,
    Chip
} from '@mui/material';
import { LocalPharmacy as PharmacyIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import pharmacyAPI from '../../../../services/pharmacyAPI';

const QuickDispensingModal = ({ open, onClose, patientId, patientName, onSuccess }) => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [loadingMedications, setLoadingMedications] = useState(false);
    const [medications, setMedications] = useState([]);

    const [formData, setFormData] = useState({
        items: [], // { medication, quantity, price }
        notes: ''
    });

    useEffect(() => {
        if (open) {
            fetchMedications();
        }
    }, [open]);

    const fetchMedications = async () => {
        setLoadingMedications(true);
        try {
            const response = await pharmacyAPI.getMedications({ page_size: 1000 });
            setMedications(response.results || response || []);
        } catch (error) {
            console.error('Error fetching medications:', error);
            enqueueSnackbar('Erreur lors du chargement des médicaments', { variant: 'error' });
        } finally {
            setLoadingMedications(false);
        }
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { medication: null, quantity: 1, price: 0 }]
        }));
    };

    const removeItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];

        if (field === 'quantity') {
            newItems[index][field] = parseInt(value) || 1;
        } else if (field === 'medication' && value) {
            newItems[index][field] = value;
            // Auto-fill price from medication
            newItems[index].price = parseFloat(value.unit_price) || 0;
        } else {
            newItems[index][field] = value;
        }

        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const calculateTotal = () => {
        return formData.items.reduce((sum, item) => {
            const quantity = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            return sum + (quantity * price);
        }, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.items.length === 0) {
            enqueueSnackbar('Veuillez ajouter au moins un médicament', { variant: 'warning' });
            return;
        }

        // Validate all items have medication selected
        const invalidItems = formData.items.filter(item => !item.medication);
        if (invalidItems.length > 0) {
            enqueueSnackbar('Tous les médicaments doivent être sélectionnés', { variant: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                patient_id: patientId,
                items: formData.items.map(item => ({
                    medication_id: item.medication.id,
                    quantity: parseInt(item.quantity),
                    price: parseFloat(item.price)
                })),
                notes: formData.notes || ''
            };

            const response = await pharmacyAPI.createDispensing(payload);
            enqueueSnackbar('Dispensation enregistrée avec succès', { variant: 'success' });

            if (onSuccess) onSuccess();
            onClose();

            // Navigate to dispensing detail page
            navigate(`/healthcare/pharmacy/dispensing/${response.id}`);
        } catch (error) {
            console.error('Error creating dispensing:', error);
            const errorMessage = error.response?.data?.detail || error.response?.data?.message || 'Erreur lors de la dispensation';
            enqueueSnackbar(errorMessage, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setFormData({
                items: [],
                notes: ''
            });
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PharmacyIcon color="warning" />
                    <Typography variant="h6" component="span">
                        Nouvelle Dispensation Rapide
                    </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Patient: <strong>{patientName}</strong>
                </Typography>
            </DialogTitle>

            <form onSubmit={handleSubmit}>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                    Médicaments à Dispenser
                                </Typography>
                                <Button
                                    startIcon={<AddIcon />}
                                    onClick={addItem}
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                >
                                    Ajouter
                                </Button>
                            </Box>
                        </Grid>

                        {formData.items.length > 0 && (
                            <Grid item xs={12}>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell width="40%">Médicament</TableCell>
                                                <TableCell width="15%">Stock</TableCell>
                                                <TableCell width="15%">Quantité</TableCell>
                                                <TableCell width="20%">Prix Unitaire</TableCell>
                                                <TableCell width="5%"></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {formData.items.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>
                                                        <Autocomplete
                                                            size="small"
                                                            options={medications}
                                                            getOptionLabel={(option) => option.name}
                                                            value={item.medication}
                                                            onChange={(e, value) => handleItemChange(index, 'medication', value)}
                                                            loading={loadingMedications}
                                                            renderInput={(params) => (
                                                                <TextField {...params} placeholder="Sélectionner un médicament..." />
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.medication ? (
                                                            <Chip
                                                                label={`${item.medication.stock_quantity || 0}`}
                                                                size="small"
                                                                color={
                                                                    (item.medication.stock_quantity || 0) < (item.quantity || 0)
                                                                        ? 'error'
                                                                        : (item.medication.stock_quantity || 0) < 10
                                                                        ? 'warning'
                                                                        : 'success'
                                                                }
                                                            />
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                            inputProps={{ min: 1 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            type="number"
                                                            value={item.price}
                                                            onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                                            inputProps={{ min: 0, step: 0.01 }}
                                                            InputProps={{
                                                                endAdornment: <Typography variant="caption">FCFA</Typography>
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <IconButton size="small" onClick={() => removeItem(index)} color="error">
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Grid>
                        )}

                        {formData.items.length > 0 && (
                            <Grid item xs={12}>
                                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            Total à Payer
                                        </Typography>
                                        <Typography variant="h6" fontWeight="bold" color="primary">
                                            {calculateTotal().toLocaleString()} FCFA
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>
                        )}

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="Notes (Optionnel)"
                                name="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Instructions ou remarques pour le patient..."
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 2, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            La dispensation sera enregistrée, le stock sera automatiquement déduit et vous serez redirigé vers les détails.
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
                        color="warning"
                        disabled={loading || formData.items.length === 0}
                        startIcon={loading ? <CircularProgress size={20} /> : <PharmacyIcon />}
                    >
                        {loading ? 'Enregistrement...' : 'Dispenser'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default QuickDispensingModal;
