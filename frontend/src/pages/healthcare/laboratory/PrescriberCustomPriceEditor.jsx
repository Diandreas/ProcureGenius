import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Autocomplete, TextField, Button, Stack, Table, TableBody, TableCell,
    TableHead, TableRow, IconButton, Typography, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';
import imagingAPI from '../../../services/imagingAPI';

export default function PrescriberCustomPriceEditor({ prescriberId }) {
    const { enqueueSnackbar } = useSnackbar();
    const [target, setTarget] = useState('lab_test');
    const [tests, setTests] = useState([]);
    const [examTypes, setExamTypes] = useState([]);
    const [customPrices, setCustomPrices] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [priceInput, setPriceInput] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchCustomPrices = useCallback(async () => {
        try {
            const data = await laboratoryAPI.getPrescriberCustomPrices(prescriberId);
            setCustomPrices(Array.isArray(data) ? data : data.results || []);
        } catch (err) {
            enqueueSnackbar('Erreur lors du chargement des prix personnalisés', { variant: 'error' });
        }
    }, [prescriberId, enqueueSnackbar]);

    useEffect(() => {
        laboratoryAPI.getTests({ page_size: 1000 }).then(data => {
            setTests(Array.isArray(data) ? data : data.results || []);
        });
        imagingAPI.getExamTypes({ page_size: 500 }).then(data => {
            setExamTypes(Array.isArray(data) ? data : data.results || []);
        });
        fetchCustomPrices();
    }, [fetchCustomPrices]);

    const options = target === 'lab_test' ? tests : examTypes;

    const handleAdd = async () => {
        if (!selectedItem || !priceInput) {
            enqueueSnackbar('Sélectionne un élément et indique un prix', { variant: 'warning' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                prescriber: prescriberId,
                custom_price: priceInput,
                lab_test: target === 'lab_test' ? selectedItem.id : null,
                exam_type: target === 'exam_type' ? selectedItem.id : null,
            };
            await laboratoryAPI.createPrescriberCustomPrice(payload);
            enqueueSnackbar('Prix personnalisé ajouté', { variant: 'success' });
            setSelectedItem(null);
            setPriceInput('');
            fetchCustomPrices();
        } catch (err) {
            const msg = err?.response?.data?.non_field_errors?.[0] || "Erreur lors de l'ajout";
            enqueueSnackbar(msg, { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await laboratoryAPI.deletePrescriberCustomPrice(id);
            fetchCustomPrices();
        } catch (err) {
            enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
        }
    };

    return (
        <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Prix personnalisés</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }} alignItems="center">
                <ToggleButtonGroup
                    size="small" exclusive value={target}
                    onChange={(_, v) => { if (v) { setTarget(v); setSelectedItem(null); } }}
                >
                    <ToggleButton value="lab_test">Test labo</ToggleButton>
                    <ToggleButton value="exam_type">Examen imagerie</ToggleButton>
                </ToggleButtonGroup>
                <Autocomplete
                    size="small" options={options}
                    getOptionLabel={(o) => o.name || ''}
                    value={selectedItem}
                    onChange={(_, v) => setSelectedItem(v)}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    renderInput={(params) => <TextField {...params} label="Test / examen" />}
                    sx={{ minWidth: 220 }}
                />
                <TextField
                    size="small" label="Prix (FCFA)" type="number"
                    value={priceInput} onChange={(e) => setPriceInput(e.target.value)}
                    sx={{ width: 140 }}
                />
                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={handleAdd} disabled={saving}>
                    Ajouter
                </Button>
            </Stack>

            {customPrices.length > 0 ? (
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Élément</TableCell>
                            <TableCell align="right">Prix fixé</TableCell>
                            <TableCell />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {customPrices.map(cp => (
                            <TableRow key={cp.id}>
                                <TableCell>{cp.lab_test_name || cp.exam_type_name}</TableCell>
                                <TableCell align="right">{cp.custom_price} FCFA</TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" onClick={() => handleDelete(cp.id)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <Typography variant="caption" color="text.secondary">
                    Aucun prix personnalisé — les tests non listés ici restent au tarif catalogue normal.
                </Typography>
            )}
        </Box>
    );
}
