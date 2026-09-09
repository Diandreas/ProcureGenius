import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Button, Chip, Stack, CircularProgress,
    Alert, InputAdornment, MenuItem, Divider,
} from '@mui/material';
import { Search as SearchIcon, Inventory as InventoryIcon, Save as SaveIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { productsAPI } from '../../services/api';
import { settingsAPI } from '../../services/settingsAPI';
import BackButton from '../../components/navigation/BackButton';

const aujourdhui = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
};

/**
 * Inventaire physique : on parcourt les produits, on saisit le stock réellement
 * compté, l'écart s'affiche, et tout est validé en une seule opération tracée.
 *
 * Remplace les corrections manuelles produit par produit (les mouvements
 * « Inventaire du JJ/MM » qu'on retrouve dans l'historique) : ici tout part
 * dans une seule transaction avec une même référence, donc un inventaire ne
 * peut pas rester à moitié appliqué.
 */
const StockInventory = () => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [autorise, setAutorise] = useState(null);
    const [produits, setProduits] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [recherche, setRecherche] = useState('');
    const [categorie, setCategorie] = useState('');
    const [comptes, setComptes] = useState({});
    const [reference, setReference] = useState('INV-' + aujourdhui());
    const [envoi, setEnvoi] = useState(false);

    // La fonction est optionnelle par organisation : on vérifie avant tout.
    useEffect(() => {
        settingsAPI.getAll()
            .then((res) => setAutorise(!!res.data?.stockInventoryEnabled))
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

    const lignesSaisies = useMemo(
        () => Object.entries(comptes)
            .filter(([, v]) => v !== '' && v !== null && v !== undefined)
            .map(([id, v]) => ({ id, counted: parseInt(v, 10) }))
            .filter((l) => Number.isFinite(l.counted) && l.counted >= 0),
        [comptes],
    );

    const avecEcart = useMemo(() => lignesSaisies.filter((l) => {
        const p = produits.find((x) => x.id === l.id);
        return p && l.counted !== (p.stock_quantity ?? 0);
    }), [lignesSaisies, produits]);

    const valider = async () => {
        if (lignesSaisies.length === 0) {
            enqueueSnackbar('Saisissez au moins une quantité comptée', { variant: 'warning' });
            return;
        }
        const msg = avecEcart.length === 0
            ? `Aucun écart sur les ${lignesSaisies.length} produit(s) comptés. Enregistrer quand même l'inventaire ?`
            : `${avecEcart.length} produit(s) présentent un écart et seront ajustés.\n\nAppliquer l'inventaire « ${reference} » ?`;
        if (!window.confirm(msg)) return;

        setEnvoi(true);
        try {
            const res = await productsAPI.applyInventory({
                reference,
                lines: lignesSaisies.map((l) => ({ product_id: l.id, counted: l.counted })),
            });
            const d = res.data;
            enqueueSnackbar(
                `Inventaire appliqué : ${d.applied_count} ajustement(s), ${d.unchanged_count} sans écart`,
                { variant: 'success' },
            );
            setComptes({});
            navigate('/products');
        } catch (e) {
            const d = e.response?.data;
            enqueueSnackbar(d?.error || "Échec de l'application de l'inventaire", { variant: 'error' });
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
                    L&apos;inventaire physique n&apos;est pas activé pour cette structure.
                    Vous pouvez l&apos;activer dans <strong>Paramètres → Général → Stock &amp; Pharmacie</strong>.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <BackButton />
                <InventoryIcon color="primary" />
                <Typography variant="h5" fontWeight={700}>Inventaire physique</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Saisissez le stock réellement compté. Seuls les produits saisis sont pris en compte ;
                tout est appliqué en une seule fois, avec une trace dans l&apos;historique des mouvements.
            </Typography>

            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                        size="small" label="Référence de l'inventaire"
                        value={reference} onChange={(e) => setReference(e.target.value)}
                        sx={{ minWidth: 220 }}
                    />
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
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip size="small" label={`${visibles.length} produit(s) affiché(s)`} />
                    <Chip size="small" color="primary" label={`${lignesSaisies.length} compté(s)`} />
                    <Chip
                        size="small"
                        color={avecEcart.length ? 'warning' : 'success'}
                        label={`${avecEcart.length} écart(s)`}
                    />
                    <Box sx={{ flex: 1 }} />
                    <Button
                        variant="contained" startIcon={envoi ? <CircularProgress size={16} /> : <SaveIcon />}
                        onClick={valider} disabled={envoi || lignesSaisies.length === 0}
                    >
                        Appliquer l&apos;inventaire
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
                                    <TableCell><strong>Produit</strong></TableCell>
                                    <TableCell align="right"><strong>Théorique</strong></TableCell>
                                    <TableCell align="right"><strong>Compté</strong></TableCell>
                                    <TableCell align="right"><strong>Écart</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {visibles.map((p) => {
                                    const theorique = p.stock_quantity ?? 0;
                                    const brut = comptes[p.id];
                                    const compte = brut === '' || brut === undefined ? null : parseInt(brut, 10);
                                    const ecart = compte === null || !Number.isFinite(compte) ? null : compte - theorique;
                                    return (
                                        <TableRow key={p.id} hover>
                                            <TableCell sx={{ fontSize: '0.82rem' }}>
                                                {p.name}
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    {p.reference}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.82rem' }}>{theorique}</TableCell>
                                            <TableCell align="right" sx={{ width: 120 }}>
                                                <TextField
                                                    size="small" type="number" placeholder="—"
                                                    value={brut ?? ''}
                                                    onChange={(e) => setComptes({ ...comptes, [p.id]: e.target.value })}
                                                    inputProps={{ min: 0, style: { textAlign: 'right', padding: '6px 8px' } }}
                                                    sx={{ width: 100 }}
                                                />
                                            </TableCell>
                                            <TableCell align="right" sx={{ width: 90 }}>
                                                {ecart === null ? (
                                                    <Typography variant="caption" color="text.disabled">—</Typography>
                                                ) : (
                                                    <Chip
                                                        size="small"
                                                        label={ecart > 0 ? `+${ecart}` : ecart}
                                                        color={ecart === 0 ? 'success' : ecart > 0 ? 'info' : 'warning'}
                                                        variant={ecart === 0 ? 'outlined' : 'filled'}
                                                        sx={{ height: 22, fontSize: '0.72rem' }}
                                                    />
                                                )}
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

export default StockInventory;
