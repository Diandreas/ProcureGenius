import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Button, Typography, CircularProgress, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField, Chip,
    InputAdornment, Stack, Alert, Switch, Divider, Checkbox, Tooltip,
    ButtonGroup,
} from '@mui/material';
import {
    Search as SearchIcon,
    Save as SaveIcon,
    Business as BusinessIcon,
    CheckBox as CheckAllIcon,
    IndeterminateCheckBox as IndeterminateIcon,
    AutoFixHigh as DefaultPriceIcon,
    ToggleOn as ActivateIcon,
    ToggleOff as DeactivateIcon,
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
    const [defaultPricesMap, setDefaultPricesMap] = useState({}); // { test_id: price }
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [prices, setPrices] = useState({});
    const [dirty, setDirty] = useState(false);
    const [selected, setSelected] = useState(new Set()); // selected test IDs

    useEffect(() => { fetchData(); }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [data, defaults] = await Promise.all([
                laboratoryAPI.getSubcontractorTests(id),
                laboratoryAPI.getSubcontractorDefaultPrices(),
            ]);
            setSubcontractor(data.subcontractor);
            const allTests = data.tests || [];
            setTests(allTests);

            // Build default prices map
            const defMap = {};
            (Array.isArray(defaults) ? defaults : []).forEach(d => {
                if (d.is_active && d.default_price != null) {
                    defMap[d.id] = d.default_price;
                }
            });
            setDefaultPricesMap(defMap);

            // Initialize prices
            const init = {};
            allTests.forEach(t => {
                if (t.has_subcontractor_price) {
                    init[t.id] = { price: t.subcontractor_price?.toString() || '', turnaround_days: t.turnaround_days || 3, enabled: true };
                } else {
                    init[t.id] = { price: defMap[t.id]?.toString() || '', turnaround_days: 3, enabled: false };
                }
            });
            setPrices(init);
            setDirty(false);
            setSelected(new Set());
        } catch { enqueueSnackbar('Erreur de chargement', { variant: 'error' }); }
        finally { setLoading(false); }
    };

    const setPrice = (testId, field, value) => {
        setPrices(prev => ({ ...prev, [testId]: { ...prev[testId], [field]: value } }));
        setDirty(true);
    };

    // --- Filtered tests ---
    const filtered = useMemo(() =>
        tests.filter(t =>
            !search ||
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.test_code.toLowerCase().includes(search.toLowerCase()) ||
            (t.category || '').toLowerCase().includes(search.toLowerCase())
        ), [tests, search]);

    // --- Selection helpers ---
    const filteredIds = useMemo(() => filtered.map(t => t.id), [filtered]);
    const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selected.has(id));
    const someFilteredSelected = filteredIds.some(id => selected.has(id));

    const toggleSelectAll = () => {
        if (allFilteredSelected) {
            setSelected(prev => { const s = new Set(prev); filteredIds.forEach(id => s.delete(id)); return s; });
        } else {
            setSelected(prev => { const s = new Set(prev); filteredIds.forEach(id => s.add(id)); return s; });
        }
    };

    const toggleSelect = (testId) => {
        setSelected(prev => { const s = new Set(prev); s.has(testId) ? s.delete(testId) : s.add(testId); return s; });
    };

    // --- Bulk actions ---
    const bulkSetEnabled = (enable) => {
        if (selected.size === 0) { enqueueSnackbar('Sélectionnez au moins un examen', { variant: 'warning' }); return; }
        setPrices(prev => {
            const next = { ...prev };
            selected.forEach(testId => {
                next[testId] = {
                    ...next[testId],
                    enabled: enable,
                    // If enabling and no price set, try default
                    price: (enable && !next[testId]?.price && defaultPricesMap[testId])
                        ? defaultPricesMap[testId].toString()
                        : (next[testId]?.price || ''),
                };
            });
            return next;
        });
        setDirty(true);
    };

    const applyDefaultPrices = () => {
        const targets = selected.size > 0 ? [...selected] : tests.map(t => t.id);
        let applied = 0;
        setPrices(prev => {
            const next = { ...prev };
            targets.forEach(testId => {
                if (defaultPricesMap[testId] != null) {
                    next[testId] = { ...next[testId], price: defaultPricesMap[testId].toString() };
                    applied++;
                }
            });
            return next;
        });
        if (applied > 0) {
            setDirty(true);
            enqueueSnackbar(`${applied} tarif(s) par défaut appliqués`, { variant: 'info' });
        } else {
            enqueueSnackbar('Aucun tarif par défaut disponible pour les examens sélectionnés', { variant: 'warning' });
        }
    };

    // --- Save ---
    const handleSave = async () => {
        const toSave = tests
            .filter(t => prices[t.id]?.enabled && prices[t.id]?.price !== '')
            .map(t => ({
                lab_test_id: t.id,
                price: parseFloat(prices[t.id].price),
                turnaround_days: parseInt(prices[t.id].turnaround_days) || 3,
                is_active: true,
                notes: '',
            }));

        // Also deactivate tests that were disabled
        const toDeactivate = tests
            .filter(t => !prices[t.id]?.enabled && t.has_subcontractor_price)
            .map(t => ({
                lab_test_id: t.id,
                price: t.subcontractor_price || 0,
                turnaround_days: t.turnaround_days || 3,
                is_active: false,
                notes: '',
            }));

        const payload = [...toSave, ...toDeactivate];
        if (payload.length === 0) { enqueueSnackbar('Aucun tarif à enregistrer', { variant: 'warning' }); return; }

        setSaving(true);
        try {
            const result = await laboratoryAPI.saveSubcontractorPrices(id, payload);
            const savedCount = result.saved?.length || 0;
            enqueueSnackbar(`${savedCount} tarif(s) enregistrés`, { variant: 'success' });
            setDirty(false);
            fetchData();
        } catch { enqueueSnackbar('Erreur lors de la sauvegarde', { variant: 'error' }); }
        finally { setSaving(false); }
    };

    const configuredCount = tests.filter(t => prices[t.id]?.enabled && prices[t.id]?.price !== '').length;
    const hasDefaults = Object.keys(defaultPricesMap).length > 0;

    if (loading) return <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>;

    return (
        <Box p={3}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <BackButton to="/healthcare/laboratory/subcontractors" />
                    <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <BusinessIcon color="primary" />
                            <Typography variant="h5" fontWeight="700">Tarifs — {subcontractor?.name}</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            {configuredCount} / {tests.length} examens avec tarif configuré
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

            {dirty && <Alert severity="info" sx={{ mb: 2 }}>Des modifications non enregistrées sont en cours.</Alert>}

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                {/* Toolbar */}
                <Box p={2} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                    <TextField
                        size="small"
                        placeholder="Rechercher un examen..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                        sx={{ width: 280 }}
                    />
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        {selected.size > 0 && (
                            <Typography variant="caption" color="primary" sx={{ alignSelf: 'center', fontWeight: 600 }}>
                                {selected.size} sélectionné(s)
                            </Typography>
                        )}
                        <Tooltip title="Activer les examens sélectionnés">
                            <Button size="small" variant="outlined" startIcon={<ActivateIcon />} onClick={() => bulkSetEnabled(true)}>
                                Activer
                            </Button>
                        </Tooltip>
                        <Tooltip title="Désactiver les examens sélectionnés">
                            <Button size="small" variant="outlined" color="warning" startIcon={<DeactivateIcon />} onClick={() => bulkSetEnabled(false)}>
                                Désactiver
                            </Button>
                        </Tooltip>
                        {hasDefaults && (
                            <Tooltip title="Appliquer les tarifs par défaut aux examens sélectionnés (ou tous si rien n'est sélectionné)">
                                <Button size="small" variant="outlined" color="secondary" startIcon={<DefaultPriceIcon />} onClick={applyDefaultPrices}>
                                    Prix par défaut
                                </Button>
                            </Tooltip>
                        )}
                    </Stack>
                </Box>
                <Divider />
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        size="small"
                                        checked={allFilteredSelected}
                                        indeterminate={!allFilteredSelected && someFilteredSelected}
                                        onChange={toggleSelectAll}
                                    />
                                </TableCell>
                                <TableCell width={40}>Actif</TableCell>
                                <TableCell>Code</TableCell>
                                <TableCell>Examen</TableCell>
                                <TableCell>Catégorie</TableCell>
                                <TableCell align="right">Prix standard</TableCell>
                                {hasDefaults && <TableCell align="right">Prix défaut</TableCell>}
                                <TableCell align="right" width={160}>Prix sous-traitance</TableCell>
                                <TableCell align="right" width={110}>Délai (j)</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.map(test => {
                                const p = prices[test.id] || { enabled: false, price: '', turnaround_days: 3 };
                                const isSelected = selected.has(test.id);
                                const defPrice = defaultPricesMap[test.id];
                                return (
                                    <TableRow
                                        key={test.id}
                                        selected={isSelected}
                                        sx={{ opacity: p.enabled ? 1 : 0.55, cursor: 'pointer' }}
                                        onClick={() => toggleSelect(test.id)}
                                    >
                                        <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                                            <Checkbox size="small" checked={isSelected} onChange={() => toggleSelect(test.id)} />
                                        </TableCell>
                                        <TableCell onClick={e => e.stopPropagation()}>
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
                                            <Typography variant="caption" color="text.secondary">{test.category || '—'}</Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" color="text.secondary">
                                                {new Intl.NumberFormat('fr-FR').format(test.standard_price)}
                                            </Typography>
                                        </TableCell>
                                        {hasDefaults && (
                                            <TableCell align="right">
                                                {defPrice != null ? (
                                                    <Typography variant="body2" color="secondary.main" fontWeight="500">
                                                        {new Intl.NumberFormat('fr-FR').format(defPrice)}
                                                    </Typography>
                                                ) : (
                                                    <Typography variant="caption" color="text.disabled">—</Typography>
                                                )}
                                            </TableCell>
                                        )}
                                        <TableCell align="right" onClick={e => e.stopPropagation()}>
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
                                        <TableCell align="right" onClick={e => e.stopPropagation()}>
                                            <TextField
                                                size="small"
                                                type="number"
                                                value={p.turnaround_days || 3}
                                                onChange={e => setPrice(test.id, 'turnaround_days', e.target.value)}
                                                disabled={!p.enabled}
                                                sx={{ width: 85 }}
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
