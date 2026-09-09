import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Button, Chip, Stack, CircularProgress,
    Alert, InputAdornment, MenuItem, Divider, Checkbox, ToggleButton,
    ToggleButtonGroup, Tooltip,
} from '@mui/material';
import {
    Search as SearchIcon, QrCode2 as QrCodeIcon, Print as PrintIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { productsAPI } from '../../services/api';
import { settingsAPI } from '../../services/settingsAPI';
import BackButton from '../../components/navigation/BackButton';

/**
 * Planche d'etiquettes QR a imprimer.
 *
 * Le QR encode la reference du produit (et le numero de lot quand on imprime
 * l'etiquette d'un lot) : c'est ce que la page Scanner sait relire, donc une
 * etiquette collee aujourd'hui reste lisible plus tard.
 */
const StockLabels = () => {
    const { enqueueSnackbar } = useSnackbar();

    const [autorise, setAutorise] = useState(null);
    const [produits, setProduits] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [recherche, setRecherche] = useState('');
    const [categorie, setCategorie] = useState('');
    const [selection, setSelection] = useState({}); // { productId: copies }
    const [taille, setTaille] = useState('grande');
    const [envoi, setEnvoi] = useState(false);

    useEffect(() => {
        settingsAPI.getAll()
            .then((res) => setAutorise(!!res.data?.stockBarcodeEnabled))
            .catch(() => setAutorise(false));
    }, []);

    useEffect(() => {
        if (!autorise) return;
        setChargement(true);
        productsAPI.list({ page_size: 1000, product_type: 'physical' })
            .then((res) => {
                const data = res.data?.results || res.data || [];
                setProduits(data.filter((p) => p.product_type === 'physical'));
            })
            .catch(() => enqueueSnackbar('Impossible de charger les produits', { variant: 'error' }))
            .finally(() => setChargement(false));
    }, [autorise, enqueueSnackbar]);

    const categories = useMemo(() => {
        const noms = new Set();
        produits.forEach((p) => { if (p.category?.name) noms.add(p.category.name); });
        return Array.from(noms).sort();
    }, [produits]);

    const visibles = useMemo(() => {
        const q = recherche.trim().toLowerCase();
        return produits.filter((p) => {
            if (categorie && p.category?.name !== categorie) return false;
            if (!q) return true;
            return (p.name || '').toLowerCase().includes(q)
                || (p.reference || '').toLowerCase().includes(q);
        });
    }, [produits, recherche, categorie]);

    const choisis = useMemo(
        () => Object.entries(selection).filter(([, c]) => c > 0),
        [selection],
    );
    const totalEtiquettes = choisis.reduce((n, [, c]) => n + c, 0);

    const basculer = (id) => setSelection((prev) => {
        const copie = { ...prev };
        if (copie[id]) delete copie[id];
        else copie[id] = 1;
        return copie;
    });

    const majCopies = (id, valeur) => setSelection((prev) => {
        const n = parseInt(valeur, 10);
        const copie = { ...prev };
        if (!Number.isFinite(n) || n <= 0) delete copie[id];
        else copie[id] = Math.min(n, 200);
        return copie;
    });

    const imprimer = async () => {
        if (choisis.length === 0) {
            enqueueSnackbar('Choisissez au moins un produit', { variant: 'warning' });
            return;
        }
        setEnvoi(true);
        try {
            const res = await productsAPI.printLabels({
                size: taille,
                items: choisis.map(([id, copies]) => ({ product_id: id, copies })),
            });
            // Le PDF s'ouvre dans un onglet : l'utilisateur imprime depuis
            // la visionneuse, avec ses propres reglages d'imprimante.
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            window.open(url, '_blank');
            setTimeout(() => window.URL.revokeObjectURL(url), 60000);
        } catch (e) {
            enqueueSnackbar("Echec de la generation des etiquettes", { variant: 'error' });
        } finally {
            setEnvoi(false);
        }
    };

    if (autorise === null) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
    }

    if (!autorise) {
        return (
            <Box sx={{ p: 3 }}>
                <BackButton />
                <Alert severity="info" sx={{ mt: 2 }}>
                    Les codes-barres / QR ne sont pas activés pour cette structure.
                    Vous pouvez les activer dans <strong>Paramètres → Général → Stock &amp; Pharmacie</strong>.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <BackButton />
                <QrCodeIcon color="primary" />
                <Typography variant="h5" fontWeight={700}>Étiquettes QR</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Cochez les produits à étiqueter et indiquez le nombre d&apos;étiquettes.
                Le PDF s&apos;ouvre dans un nouvel onglet, prêt à imprimer sur planche A4.
            </Typography>

            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                        size="small" placeholder="Rechercher un produit..." fullWidth
                        value={recherche} onChange={(e) => setRecherche(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                    />
                    <TextField
                        select size="small" label="Catégorie" sx={{ minWidth: 200 }}
                        value={categorie} onChange={(e) => setCategorie(e.target.value)}
                    >
                        <MenuItem value="">Toutes</MenuItem>
                        {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </TextField>
                    <ToggleButtonGroup
                        size="small" exclusive value={taille}
                        onChange={(e, v) => v && setTaille(v)}
                    >
                        <ToggleButton value="grande">
                            <Tooltip title="63,5 × 38 mm — 24 par page (planche standard 3 × 8)"><span>Grande</span></Tooltip>
                        </ToggleButton>
                        <ToggleButton value="petite">
                            <Tooltip title="38 × 21 mm — 65 par page (planche standard 5 × 13)"><span>Petite</span></Tooltip>
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip size="small" label={`${visibles.length} produit(s) affiché(s)`} />
                    <Chip size="small" color="primary" label={`${choisis.length} produit(s) choisi(s)`} />
                    <Chip size="small" color="secondary" label={`${totalEtiquettes} étiquette(s)`} />
                    <Box sx={{ flex: 1 }} />
                    <Button
                        variant="contained" startIcon={envoi ? <CircularProgress size={16} /> : <PrintIcon />}
                        onClick={imprimer} disabled={envoi || choisis.length === 0}
                    >
                        Générer le PDF
                    </Button>
                </Stack>
            </Paper>

            {chargement ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : (
                <Paper>
                    <TableContainer sx={{ maxHeight: '60vh', overflowX: 'auto' }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell padding="checkbox" />
                                    <TableCell><strong>Produit</strong></TableCell>
                                    <TableCell align="right"><strong>Stock</strong></TableCell>
                                    <TableCell align="right" sx={{ width: 130 }}><strong>Étiquettes</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {visibles.map((p) => {
                                    const coche = !!selection[p.id];
                                    return (
                                        <TableRow key={p.id} hover selected={coche}>
                                            <TableCell padding="checkbox">
                                                <Checkbox size="small" checked={coche} onChange={() => basculer(p.id)} />
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.82rem' }}>
                                                {p.name}
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    {p.reference}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.82rem' }}>
                                                {p.stock_quantity ?? 0}
                                            </TableCell>
                                            <TableCell align="right">
                                                <TextField
                                                    size="small" type="number" disabled={!coche}
                                                    value={selection[p.id] ?? ''}
                                                    onChange={(e) => majCopies(p.id, e.target.value)}
                                                    inputProps={{ min: 1, max: 200, style: { textAlign: 'right', padding: '6px 8px' } }}
                                                    sx={{ width: 90 }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}
        </Box>
    );
};

export default StockLabels;
