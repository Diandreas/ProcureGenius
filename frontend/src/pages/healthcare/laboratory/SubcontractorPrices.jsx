import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Button, Typography, CircularProgress, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField, Chip,
    InputAdornment, Grid, Stack, Alert, Switch, FormControlLabel, Divider,
} from '@mui/material';
import {
    Search as SearchIcon,
    Save as SaveIcon,
    Business as BusinessIcon,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';
import BackButton from '../../../components/navigation/BackButton';

const SubcontractorPrices = () => {
    const { id } = useParams();
    const { enqueueSnackbar } = useSnackbar();
    const [subcontractor, setSubcontractor] = useState(null);
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [prices, setPrices] = useState({}); // { test_id: { price, turnaround_days, is_active } }
    const [dirty, setDirty] = useState(false);

    useEffect(() => { fetchData(); }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await laboratoryAPI.getSubcontractorTests(id);
            setSubcontractor(data.subcontractor);
            setTests(data.tests || []);
            // Initialize prices from existing subcontractor prices
            const initialPrices = {};
            (data.tests || []).forEach(t => {
                if (t.has_subcontractor_price) {
                    initialPrices[t.id] = {
                        price: t.subcontractor_price?.toString() || '',
                        turnaround_days: t.turnaround_days || 3,
                        is_active: true,
                        enabled: true,
                    };
                } else {
                    initialPrices[t.id] = { price: '', turnaround_days: 3, is_active: true, enabled: false };
                }
            });
            setPrices(initialPrices);
            setDirty(false);
        } catch { enqueueSnackbar('Erreur de chargement', { variant: 'error' }); }
        finally { setLoading(false); }
    };

    const setPrice = (testId, field, value) => {
        setPrices(prev => ({ ...prev, [testId]: { ...prev[testId], [field]: value } }));
        setDirty(true);
    };

    const handleSave = async () => {
        const toSave = tests
            .filter(t => prices[t.id]?.enabled && prices[t.id]?.price !== '')
            .map(t => ({
                lab_test_id: t.id,
                price: parseFloat(prices[t.id].price),
                turnaround_days: parseInt(prices[t.id].turnaround_days) || 3,
                is_active: prices[t.id].is_active !== false,
                notes: '',
            }));

        if (toSave.length === 0) {
            enqueueSnackbar('Aucun tarif à enregistrer', { variant: 'warning' });
            return;
        }

        setSaving(true);
        try {
            const result = await laboratoryAPI.saveSubcontractorPrices(id, toSave);
            const savedCount = result.saved?.length || 0;
            const errorCount = result.errors?.length || 0;
            enqueueSnackbar(
                `${savedCount} tarif(s) enregistré(s)${errorCount > 0 ? ` — ${errorCount} erreur(s)` : ''}`,
                { variant: errorCount > 0 ? 'warning' : 'success' }
            );
            setDirty(false);
            fetchData();
        } catch { enqueueSnackbar('Erreur lors de la sauvegarde', { variant: 'error' }); }
        finally { setSaving(false); }
    };

    const filtered = useMemo(() =>
        tests.filter(t =>
            !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.test_code.toLowerCase().includes(search.toLowerCase()) ||
            (t.category || '').toLowerCase().includes(search.toLowerCase())
        ), [tests, search]);

    const configuredCount = tests.filter(t => prices[t.id]?.enabled && prices[t.id]?.price !== '').length;

    if (loading) return <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>;

    return (
        <Box p={3}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <BackButton to="/healthcare/laboratory/subcontractors" />
                    <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <BusinessIcon color="primary" />
                            <Typography variant="h5" fontWeight="700">
                                Tarifs — {subcontractor?.name}
                            </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            {configuredCount} / {tests.length} examens avec tarif de sous-traitance configuré
                        </Typography>
                    </Box>
                </Box>
                <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    onClick={handleSave}
                    disabled={saving || !dirty}
                >
                    Enregistrer les tarifs
                </Button>
            </Box>

            {dirty && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Des modifications non enregistrées sont en cours.
                </Alert>
            )}

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Box p={2} display="flex" alignItems="center" justifyContent="space-between">
                    <TextField
                        size="small"
                        placeholder="Rechercher un examen..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                        sx={{ width: 300 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                        Activez les examens que ce sous-traitant peut réaliser et saisissez leurs tarifs
                    </Typography>
                </Box>
                <Divider />
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell width={40}>Actif</TableCell>
                                <TableCell>Code</TableCell>
                                <TableCell>Examen</TableCell>
                                <TableCell>Catégorie</TableCell>
                                <TableCell align="right">Prix standard</TableCell>
                                <TableCell align="right" width={160}>Prix sous-traitance</TableCell>
                                <TableCell align="right" width={120}>Délai (jours)</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.map(test => {
                                const p = prices[test.id] || { enabled: false, price: '', turnaround_days: 3 };
                                return (
                                    <TableRow
                                        key={test.id}
                                        sx={{ opacity: p.enabled ? 1 : 0.5 }}
                                    >
                                        <TableCell>
                                            <Switch
                                                size="small"
                                                checked={!!p.enabled}
                                                onChange={e => setPrice(test.id, 'enabled', e.target.checked)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={test.test_code} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={p.enabled ? '600' : '400'}>
                                                {test.name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {test.category || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" color="text.secondary">
                                                {new Intl.NumberFormat('fr-FR').format(test.standard_price)} XAF
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <TextField
                                                size="small"
                                                type="number"
                                                value={p.price}
                                                onChange={e => setPrice(test.id, 'price', e.target.value)}
                                                disabled={!p.enabled}
                                                InputProps={{ endAdornment: <InputAdornment position="end">XAF</InputAdornment> }}
                                                sx={{ width: 140 }}
                                                inputProps={{ min: 0 }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <TextField
                                                size="small"
                                                type="number"
                                                value={p.turnaround_days || 3}
                                                onChange={e => setPrice(test.id, 'turnaround_days', e.target.value)}
                                                disabled={!p.enabled}
                                                sx={{ width: 100 }}
                                                inputProps={{ min: 1 }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default SubcontractorPrices;
