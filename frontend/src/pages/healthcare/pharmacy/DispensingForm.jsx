import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    TextField,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    MenuItem,
    Autocomplete,
    Divider,
    Stack
} from '@mui/material';
import {
    Save as SaveIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import pharmacyAPI from '../../../services/pharmacyAPI';
import patientAPI from '../../../services/patientAPI';

const DispensingForm = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(false);
    const [patients, setPatients] = useState([]);
    const [medications, setMedications] = useState([]);

    const [formData, setFormData] = useState({
        patient: null,
        items: [], // { medication, quantity, price }
        notes: ''
    });

    useEffect(() => {
        fetchOptions();
    }, []);

    const fetchOptions = async () => {
        try {
            const [patData, medData] = await Promise.all([
                patientAPI.getPatients({ page_size: 100 }),
                pharmacyAPI.getMedications({ page_size: 100 })
            ]);
            setPatients(patData.results || []);
            setMedications(medData.results || []);
        } catch (error) {
            console.error('Error fetching options:', error);
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
            // Ensure quantity is a number
            newItems[index][field] = parseInt(value) || 1;
        } else {
            newItems[index][field] = value;
        }

        // Update price if medication changes
        if (field === 'medication' && value) {
            newItems[index].price = parseFloat(value.unit_price) || 0;
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

    const handleSubmit = async () => {
        if (formData.items.length === 0) {
            enqueueSnackbar('Veuillez ajouter au moins un médicament', { variant: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                patient_id: formData.patient?.id || null,
                items: formData.items.map(item => ({
                    medication_id: item.medication.id,
                    quantity: parseInt(item.quantity),
                    price: parseFloat(item.price)
                })),
                notes: formData.notes
            };

            await pharmacyAPI.createDispensing(payload);
            enqueueSnackbar('Dispensation enregistrée avec succès', { variant: 'success' });
            navigate('/healthcare/pharmacy/dispensing');

        } catch (error) {
            console.error('Error dispensing:', error);
            enqueueSnackbar('Erreur lors de la dispensation', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/healthcare/pharmacy/dispensing')}>
                        Retour
                    </Button>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                        Nouvelle Dispensation
                    </Typography>
                </Stack>
                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSubmit}
                    disabled={loading}
                    sx={{ borderRadius: 2 }}
                    size="large"
                >
                    Valider Dispensation
                </Button>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Patient (Optionnel)</Typography>
                            <Typography variant="caption" color="text.secondary" gutterBottom display="block" sx={{ mb: 1 }}>
                                Laisser vide pour une vente directe sans patient
                            </Typography>
                            <Autocomplete
                                options={patients}
                                getOptionLabel={(option) => `${option.name} (${option.patient_number})`}
                                value={formData.patient}
                                onChange={(e, v) => setFormData(prev => ({ ...prev, patient: v }))}
                                renderInput={(params) => <TextField {...params} label="Rechercher Patient" />}
                            />

                            {formData.patient && (
                                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                                    <Typography variant="body2"><strong>Âge:</strong> {formData.patient.age} ans</Typography>
                                    <Typography variant="body2"><strong>Sexe:</strong> {formData.patient.gender}</Typography>
                                    <Typography variant="body2" color="error"><strong>Allergies:</strong> {formData.patient.allergies || 'Aucune'}</Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Résumé</Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography>Total Articles:</Typography>
                                <Typography fontWeight="bold">{formData.items.length}</Typography>
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                                <Typography variant="h5">Total à Payer:</Typography>
                                <Typography variant="h5" color="primary" fontWeight="bold">
                                    {new Intl.NumberFormat('fr-FR').format(calculateTotal())} XAF
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6">Médicaments</Typography>
                                <Button startIcon={<AddIcon />} onClick={addItem} variant="outlined">
                                    Ajouter Ligne
                                </Button>
                            </Box>

                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell width="40%">Médicament</TableCell>
                                            <TableCell width="15%">Stock</TableCell>
                                            <TableCell width="15%">Qté</TableCell>
                                            <TableCell width="20%">Prix Unitaire</TableCell>
                                            <TableCell width="10%">Total</TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {formData.items.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <Autocomplete
                                                        options={medications}
                                                        getOptionLabel={(option) => option.name}
                                                        value={item.medication}
                                                        onChange={(e, v) => handleItemChange(index, 'medication', v)}
                                                        renderInput={(params) => <TextField {...params} placeholder="Choisir..." size="small" />}
                                                        disableClearable
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {item.medication ? (
                                                        <Typography color={item.medication.current_stock < item.quantity ? 'error' : 'text.primary'}>
                                                            {item.medication.current_stock}
                                                        </Typography>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        type="number"
                                                        size="small"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                        InputProps={{ inputProps: { min: 1 } }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {(item.price || 0)} XAF
                                                </TableCell>
                                                <TableCell fontWeight="bold">
                                                    {(item.quantity || 0) * (item.price || 0)}
                                                </TableCell>
                                                <TableCell>
                                                    <IconButton color="error" onClick={() => removeItem(index)}>
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {formData.items.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                    Ajoutez des médicaments à la liste
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default DispensingForm;
