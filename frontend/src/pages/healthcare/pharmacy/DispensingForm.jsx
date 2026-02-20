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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import pharmacyAPI from '../../../services/pharmacyAPI';
import patientAPI from '../../../services/patientAPI';
import batchAPI from '../../../services/batchAPI';
import dayjs from 'dayjs';

const DispensingForm = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(false);
    const [patients, setPatients] = useState([]);
    const [medications, setMedications] = useState([]);
    const [medicationBatches, setMedicationBatches] = useState({}); // { medicationId: [batches] }

    const [formData, setFormData] = useState({
        patient: null,
        items: [], // { medication, quantity, price, batch }
        notes: ''
    });

    useEffect(() => {
        const initializeForm = async () => {
            await fetchOptions();

            // If creating new dispensing with preselected patient from URL
            const preselectedPatientId = searchParams.get('patientId');
            if (preselectedPatientId) {
                try {
                    const patientData = await patientAPI.getPatient(preselectedPatientId);
                    setFormData(prev => ({
                        ...prev,
                        patient: { id: patientData.id, name: patientData.name }
                    }));
                } catch (error) {
                    console.error('Error loading preselected patient:', error);
                }
            }
        };

        initializeForm();
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
            items: [...prev.items, { medication: null, quantity: 1, unit: 'sell', price: 0, batch: null }]
        }));
    };

    const removeItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleItemChange = async (index, field, value) => {
        const newItems = [...formData.items];

        if (field === 'quantity') {
            newItems[index][field] = parseFloat(value) || 0;
        } else if (field === 'unit') {
            newItems[index][field] = value;
            // Update price based on unit
            if (newItems[index].medication) {
                const med = newItems[index].medication;
                if (value === 'sell') {
                    newItems[index].price = parseFloat(med.price) || 0;
                } else {
                    const priceBase = parseFloat(med.price) / (parseFloat(med.conversion_factor) || 1);
                    newItems[index].price = priceBase;
                }
            }
        } else if (field === 'medication') {
            newItems[index][field] = value;
            if (value) {
                newItems[index].unit = 'sell';
                newItems[index].price = parseFloat(value.price) || 0;
                newItems[index].quantity = 1;
                newItems[index].batch = null;

                // Fetch batches for this medication
                try {
                    const batches = await batchAPI.getProductBatches(value.id);
                    // Filter available batches and sort by expiry (FEFO)
                    const availableBatches = batches
                        .filter(b => b.status !== 'depleted' && b.quantity_remaining > 0)
                        .sort((a, b) => dayjs(a.expiry_date).diff(dayjs(b.expiry_date)));
                    
                    setMedicationBatches(prev => ({
                        ...prev,
                        [value.id]: availableBatches
                    }));
                } catch (error) {
                    console.error('Error fetching batches:', error);
                }
            }
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
                    batch_id: item.batch?.id || null,
                    quantity: item.quantity,
                    unit: item.unit,
                    price: item.price
                })),
                notes: formData.notes
            };

            const response = await pharmacyAPI.createDispensing(payload);
            enqueueSnackbar('Dispensation enregistrée avec succès', { variant: 'success' });

            // Redirect to the automatically generated invoice if it exists
            if (response.pharmacy_invoice && response.pharmacy_invoice.id) {
                enqueueSnackbar('Redirection vers la facture...', { variant: 'info' });
                navigate(`/invoices/${response.pharmacy_invoice.id}`);
            } else {
                navigate('/healthcare/pharmacy/dispensing');
            }

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
                                isOptionEqualToValue={(option, value) => option.id === value?.id}
                                renderOption={(props, option) => (
                                    <Box component="li" {...props} key={option.id}>
                                        {option.name} ({option.patient_number})
                                    </Box>
                                )}
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
                                            <TableCell width="25%">Médicament</TableCell>
                                            <TableCell width="20%">Lot / Péremption</TableCell>
                                            <TableCell width="12%">Stock</TableCell>
                                            <TableCell width="12%">Unité</TableCell>
                                            <TableCell width="10%">Qté</TableCell>
                                            <TableCell width="12%">Prix Unitaire</TableCell>
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
                                                        isOptionEqualToValue={(option, value) => option.id === value?.id}
                                                        renderOption={(props, option) => (
                                                            <Box component="li" {...props} key={option.id}>
                                                                {option.name}
                                                            </Box>
                                                        )}
                                                        value={item.medication}
                                                        onChange={(e, v) => handleItemChange(index, 'medication', v)}
                                                        renderInput={(params) => <TextField {...params} placeholder="Choisir..." size="small" />}
                                                        disableClearable
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {item.medication ? (
                                                        <Autocomplete
                                                            options={medicationBatches[item.medication.id] || []}
                                                            getOptionLabel={(option) => `${option.batch_number} (${dayjs(option.expiry_date).format('DD/MM/YY')})`}
                                                            value={item.batch}
                                                            onChange={(e, v) => handleItemChange(index, 'batch', v)}
                                                            renderInput={(params) => (
                                                                <TextField 
                                                                    {...params} 
                                                                    placeholder="Sélectionner lot..." 
                                                                    size="small" 
                                                                    error={item.batch && dayjs(item.batch.expiry_date).isBefore(dayjs().add(1, 'month'))}
                                                                    helperText={item.batch && dayjs(item.batch.expiry_date).isBefore(dayjs().add(1, 'month')) ? 'Expire bientôt' : ''}
                                                                />
                                                            )}
                                                            renderOption={(props, option) => {
                                                                const isExpiringSoon = dayjs(option.expiry_date).isBefore(dayjs().add(3, 'month'));
                                                                const isExpired = dayjs(option.expiry_date).isBefore(dayjs());
                                                                return (
                                                                    <Box component="li" {...props} sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                                                        <Typography variant="body2">{option.batch_number}</Typography>
                                                                        <Chip 
                                                                            label={dayjs(option.expiry_date).format('MMM YYYY')} 
                                                                            size="small" 
                                                                            color={isExpired ? 'error' : isExpiringSoon ? 'warning' : 'default'}
                                                                            sx={{ fontSize: '0.7rem' }}
                                                                        />
                                                                    </Box>
                                                                );
                                                            }}
                                                        />
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {item.medication ? (
                                                        <Box>
                                                            <Typography 
                                                                variant="body2" 
                                                                color={(item.unit === 'sell' ? ((item.batch?.quantity_remaining || item.medication.current_stock) / item.medication.conversion_factor) : (item.batch?.quantity_remaining || item.medication.current_stock)) < item.quantity ? 'error' : 'text.primary'}
                                                                fontWeight="bold"
                                                            >
                                                                {item.unit === 'sell' 
                                                                    ? `${((item.batch?.quantity_remaining || item.medication.current_stock) / item.medication.conversion_factor).toFixed(1)} ${item.medication.sell_unit || 'Box'}`
                                                                    : `${(item.batch?.quantity_remaining || item.medication.current_stock)} ${item.medication.base_unit || 'Unit'}`
                                                                }
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {item.batch ? 'Stock Lot' : 'Stock Global'}
                                                            </Typography>
                                                        </Box>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        select
                                                        size="small"
                                                        fullWidth
                                                        value={item.unit}
                                                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                                        disabled={!item.medication}
                                                    >
                                                        <MenuItem value="sell">{item.medication?.sell_unit || 'Vente'}</MenuItem>
                                                        <MenuItem value="base">{item.medication?.base_unit || 'Base'}</MenuItem>
                                                    </TextField>
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        type="number"
                                                        size="small"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                        InputProps={{ inputProps: { min: 0.0001, step: "any" } }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {new Intl.NumberFormat('fr-FR').format(item.price)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        XAF / {item.unit === 'sell' ? item.medication?.sell_unit : item.medication?.base_unit}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>
                                                    {new Intl.NumberFormat('fr-FR').format(item.quantity * item.price)}
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
