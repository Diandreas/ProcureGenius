import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Button, Typography, CircularProgress, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField,
    Chip, Stack, Alert, Divider, InputAdornment, Checkbox,
} from '@mui/material';
import { Search as SearchIcon, Save as SaveIcon, AutoFixHigh as DefaultIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';
import BackButton from '../../../components/navigation/BackButton';

const SubcontractorDefaultPrices = () => {
    const { enqueueSnackbar } = useSnackbar();
    const [rows, setRows] = useState([]); // { id, test_code, name, category, standard_price, default_price, is_active, default_price_id }
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [edits, setEdits] = useState({}); // { test_id: { price, is_active } }
    const [dirty, setDirty] = useState(false);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(new Set());

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await laboratoryAPI.getSubcontractorDefaultPrices();
            setRows(Array.isArray(data) ? data : []);
            setEdits({});
            setDirty(false);
        } catch { enqueueSnackbar('Erreur de chargement', { variant: 'error' }); }
        finally { setLoading(false); }
    };

    const getRow = (row) => {
        const e = edits[row.id] || {};
        return {
            price: e.price !== undefined ? e.price : (row.default_price?.toString() || ''),
            is_active: e.is_active !== undefined ? e.is_active : row.is_active,
        };
    };

    const setEdit = (testId, field, value) => {
        setEdits(prev => ({ ...prev, [testId]: { ...(prev[testId] || {}), [field]: value } }));
        setDirty(true);
    };

    const filtered = useMemo(() =>
        rows.filter(r => !search ||
            r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.test_code.toLowerCase().includes(search.toLowerCase()) ||
            (r.category || '').toLowerCase().includes(search.toLowerCase())
        ), [rows, search]);

    const filteredIds = useMemo(() => filtered.map(r => r.id), [filtered]);
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selected.has(id));
    const someSelected = filteredIds.some(id => selected.has(id));

    const toggleSelectAll = () => {
        if (allSelected) setSelected(prev => { const s = new Set(prev); filteredIds.forEach(id => s.delete(id)); return s; });
        else setSelected(prev => { const s = new Set(prev); filteredIds.forEach(id => s.add(id)); return s; });
    };

    const toggleSelect = (id) => {
        setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    };

    const bulkSetActive = (active) => {
        const targets = selected.size > 0 ? [...selected] : filteredIds;
        setEdits(prev => {
            const next = { ...prev };
            targets.forEach(id => { next[id] = { ...(next[id] || {}), is_active: active }; });
            return next;
        });
        setDirty(true);
    };

    const handleSave = async () => {
        const toSave = rows
            .filter(r => {
                const e = edits[r.id];
                if (!e) return false;
                const p = e.price !== undefined ? e.price : r.default_price?.toString() || '';
                return p !== '' && parseFloat(p) >= 0;
            })
            .map(r => {
                const e = edits[r.id] || {};
                return {
                    lab_test_id: r.id,
                    price: parseFloat(e.price !== undefined ? e.price : r.default_price || 0),
                    is_active: e.is_active !== undefined ? e.is_active : r.is_active,
                };
            });

        if (toSave.length === 0) { enqueueSnackbar('Aucune modification à enregistrer', { variant: 'warning' }); return; }

        setSaving(true);
        try {
            const result = await laboratoryAPI.saveSubcontractorDefaultPrices(toSave);
            enqueueSnackbar(`${result.saved} tarif(s) par défaut enregistrés`, { variant: 'success' });
            setDirty(false);
            fetchData();
        } catch { enqueueSnackbar('Erreur lors de la sauvegarde', { variant: 'error' }); }
        finally { setSaving(false); }
    };

    const configuredCount = rows.filter(r => r.default_price != null && r.is_active).length;

    if (loading) return <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>;

    return (
        <Box p={3}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <BackButton to="/healthcare/laboratory/subcontractors" />
                    <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <DefaultIcon color="primary" />
                            <Typography variant="h5" fontWeight="700">Tarifs par défaut de sous-traitance</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            {configuredCount} / {rows.length} examens — Ces tarifs pré-remplissent les nouveaux sous-traitants
                        </Typography>
                    </Box>
                </Box>
                <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    onClick={handleSave}
                    disabled={saving || !dirty}
                >
                    Enregistrer
                </Button>
            </Box>

            {dirty && <Alert severity="info" sx={{ mb: 2 }}>Des modifications non enregistrées sont en cours.</Alert>}

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Box p={2} display="flex" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap">
                    <TextField
                        size="small"
                        placeholder="Rechercher un examen…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                        sx={{ width: 300 }}
                    />
                    <Stack direction="row" spacing={1}>
                        {selected.size > 0 && (
                            <Typography variant="caption" color="primary" sx={{ alignSelf: 'center', fontWeight: 600 }}>
                                {selected.size} sélectionné(s)
                            </Typography>
                        )}
                        <Button size="small" variant="outlined" onClick={() => bulkSetActive(true)}>Activer</Button>
                        <Button size="small" variant="outlined" color="warning" onClick={() => bulkSetActive(false)}>Désactiver</Button>
                    </Stack>
                </Box>
                <Divider />
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell padding="checkbox">
                                    <Checkbox size="small" checked={allSelected} indeterminate={!allSelected && someSelected} onChange={toggleSelectAll} />
                                </TableCell>
                                <TableCell>Code</TableCell>
                                <TableCell>Examen</TableCell>
                                <TableCell>Catégorie</TableCell>
                                <TableCell align="right">Prix standard</TableCell>
                                <TableCell align="right" width={160}>Prix par défaut</TableCell>
                                <TableCell align="center" width={80}>Actif</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.map(row => {
                                const e = getRow(row);
                                const isSelected = selected.has(row.id);
                                return (
                                    <TableRow key={row.id} selected={isSelected} hover sx={{ cursor: 'pointer' }} onClick={() => toggleSelect(row.id)}>
                                        <TableCell padding="checkbox" onClick={ev => ev.stopPropagation()}>
                                            <Checkbox size="small" checked={isSelected} onChange={() => toggleSelect(row.id)} />
                                        </TableCell>
                                        <TableCell><Chip label={row.test_code} size="small" variant="outlined" /></TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={e.is_active ? '600' : '400'} color={e.is_active ? 'text.primary' : 'text.disabled'}>
                                                {row.name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell><Typography variant="caption" color="text.secondary">{row.category || '—'}</Typography></TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" color="text.secondary">
                                                {new Intl.NumberFormat('fr-FR').format(row.standard_price)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right" onClick={ev => ev.stopPropagation()}>
                                            <TextField
                                                size="small"
                                                type="number"
                                                value={e.price}
                                                onChange={ev => setEdit(row.id, 'price', ev.target.value)}
                                                InputProps={{ endAdornment: <InputAdornment position="end">XAF</InputAdornment> }}
                                                sx={{ width: 140 }}
                                                inputProps={{ min: 0 }}
                                            />
                                        </TableCell>
                                        <TableCell align="center" onClick={ev => ev.stopPropagation()}>
                                            <Checkbox
                                                size="small"
                                                checked={!!e.is_active}
                                                onChange={ev => setEdit(row.id, 'is_active', ev.target.checked)}
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

export default SubcontractorDefaultPrices;
