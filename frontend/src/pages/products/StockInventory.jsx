import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Button, Chip, Stack, CircularProgress,
    Alert, InputAdornment, MenuItem, Divider, IconButton, Tooltip,
} from '@mui/material';
import {
    Search as SearchIcon, Inventory as InventoryIcon, Save as SaveIcon, PhotoCamera as CameraIcon,
    ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { productsAPI } from '../../services/api';
import { settingsAPI } from '../../services/settingsAPI';
import BackButton from '../../components/navigation/BackButton';
import CameraScanner from '../../components/stock/CameraScanner';

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
    const [cameraOuverte, setCameraOuverte] = useState(false);
    const [categorie, setCategorie] = useState('');
    const [comptes, setComptes] = useState({});        // par produit (produit a 0 ou 1 lot)
    const [comptesLots, setComptesLots] = useState({}); // par lot (produit multi-lots)
    const [lots, setLots] = useState({});               // product_id -> lots actifs
    const [deplies, setDeplies] = useState({});
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

    // Les lots actifs de tous les produits, en un seul appel : un produit a
    // plusieurs lots se compte lot par lot, chacun ayant sa peremption.
    useEffect(() => {
        if (!autorise) return;
        productsAPI.getInventoryBatches()
            .then((res) => setLots(res.data?.batches || {}))
            .catch(() => enqueueSnackbar('Impossible de charger les lots', { variant: 'warning' }));
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

    // Pendant le comptage, on scanne la boite qu'on a en main : le tableau se
    // filtre sur ce produit et il ne reste qu'a taper la quantite.
    const filtrerDepuisScan = async (texte) => {
        setCameraOuverte(false);
        try {
            const res = await productsAPI.scanCode(texte);
            setCategorie('');
            setRecherche(res.data.product.reference || res.data.product.name);
        } catch (e) {
            enqueueSnackbar(
                e.response?.status === 404 ? `Aucun produit ne correspond au code « ${texte} »` : 'Lecture du code impossible',
                { variant: 'warning' },
            );
        }
    };

    const lotsDe = (produitId) => lots[produitId] || [];
    const multiLots = (produitId) => lotsDe(produitId).length >= 2;

    // Un produit multi-lots est compte lot par lot ; les autres gardent la
    // saisie globale.
    const lignesSaisies = useMemo(() => {
        const valide = (v) => {
            if (v === '' || v === null || v === undefined) return null;
            const n = parseInt(v, 10);
            return Number.isFinite(n) && n >= 0 ? n : null;
        };
        const lignes = [];
        Object.entries(comptes).forEach(([id, v]) => {
            const n = valide(v);
            if (n !== null && !multiLots(id)) {
                const p = produits.find((x) => x.id === id);
                lignes.push({ product_id: id, counted: n, theorique: p?.stock_quantity ?? 0 });
            }
        });
        Object.entries(comptesLots).forEach(([batchId, v]) => {
            const n = valide(v);
            if (n === null) return;
            const entree = Object.entries(lots).find(([, l]) => l.some((b) => b.id === batchId));
            if (!entree) return;
            const [produitId, liste] = entree;
            const lot = liste.find((b) => b.id === batchId);
            lignes.push({
                product_id: produitId, batch_id: batchId, counted: n,
                theorique: lot.quantity_remaining, batch_number: lot.batch_number,
            });
        });
        return lignes;
    }, [comptes, comptesLots, produits, lots]);

    const avecEcart = useMemo(
        () => lignesSaisies.filter((l) => l.counted !== l.theorique),
        [lignesSaisies],
    );
    const nbLignesLots = lignesSaisies.filter((l) => l.batch_id).length;

    const valider = async () => {
        if (lignesSaisies.length === 0) {
            enqueueSnackbar('Saisissez au moins une quantité comptée', { variant: 'warning' });
            return;
        }
        const msg = avecEcart.length === 0
            ? `Aucun écart sur les ${lignesSaisies.length} ligne(s) comptée(s). Enregistrer quand même l'inventaire ?`
            : `${avecEcart.length} ligne(s) présentent un écart et seront ajustées`
              + `${nbLignesLots ? ` (dont ${nbLignesLots} comptage(s) de lot)` : ''}.`
              + `\n\nAppliquer l'inventaire « ${reference} » ?`;
        if (!window.confirm(msg)) return;

        setEnvoi(true);
        try {
            const res = await productsAPI.applyInventory({
                reference,
                lines: lignesSaisies.map((l) => (
                    l.batch_id
                        ? { product_id: l.product_id, batch_id: l.batch_id, counted: l.counted }
                        : { product_id: l.product_id, counted: l.counted }
                )),
            });
            const d = res.data;
            enqueueSnackbar(
                `Inventaire appliqué : ${d.applied_count} ajustement(s), ${d.unchanged_count} sans écart`,
                { variant: 'success' },
            );
            setComptes({});
            setComptesLots({});
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
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                            endAdornment: (
                                <InputAdornment position="end">
                                    <Tooltip title="Scanner avec la caméra">
                                        <IconButton size="small" edge="end" onClick={() => setCameraOuverte(true)}>
                                            <CameraIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </InputAdornment>
                            ),
                        }}
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
                    <Chip size="small" color="primary" label={`${lignesSaisies.length} ligne(s) comptée(s)`} />
                    {nbLignesLots > 0 && (
                        <Chip size="small" variant="outlined" label={`dont ${nbLignesLots} lot(s)`} />
                    )}
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

            <CameraScanner
                open={cameraOuverte}
                onClose={() => setCameraOuverte(false)}
                onDetected={filtrerDepuisScan}
                title="Scanner le produit à compter"
            />

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
                                    const sesLots = lotsDe(p.id);
                                    const parLot = sesLots.length >= 2;
                                    const deplie = !!deplies[p.id];

                                    // Produit multi-lots : on additionne les lots comptes
                                    // et on montre l'ecart reellement applique.
                                    const comptesDuProduit = sesLots
                                        .map((b) => ({ b, v: comptesLots[b.id] }))
                                        .filter(({ v }) => v !== '' && v !== undefined && v !== null
                                            && Number.isFinite(parseInt(v, 10)));
                                    const sommeComptee = comptesDuProduit
                                        .reduce((s, { v }) => s + parseInt(v, 10), 0);
                                    const ecartLots = comptesDuProduit
                                        .reduce((s, { b, v }) => s + (parseInt(v, 10) - b.quantity_remaining), 0);

                                    const brut = comptes[p.id];
                                    const compte = brut === '' || brut === undefined ? null : parseInt(brut, 10);
                                    const ecart = parLot
                                        ? (comptesDuProduit.length ? ecartLots : null)
                                        : (compte === null || !Number.isFinite(compte) ? null : compte - theorique);

                                    const pastilleEcart = (valeur) => (valeur === null ? (
                                        <Typography variant="caption" color="text.disabled">—</Typography>
                                    ) : (
                                        <Chip
                                            size="small"
                                            label={valeur > 0 ? `+${valeur}` : valeur}
                                            color={valeur === 0 ? 'success' : valeur > 0 ? 'info' : 'warning'}
                                            variant={valeur === 0 ? 'outlined' : 'filled'}
                                            sx={{ height: 22, fontSize: '0.72rem' }}
                                        />
                                    ));

                                    return (
                                        <React.Fragment key={p.id}>
                                            <TableRow hover>
                                                <TableCell sx={{ fontSize: '0.82rem' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        {parLot && (
                                                            <IconButton size="small" sx={{ p: 0.25 }}
                                                                onClick={() => setDeplies({ ...deplies, [p.id]: !deplie })}>
                                                                {deplie ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                                            </IconButton>
                                                        )}
                                                        <Box>
                                                            {p.name}
                                                            <Typography variant="caption" color="text.secondary" display="block">
                                                                {p.reference}
                                                                {parLot && ` · ${sesLots.length} lots`}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.82rem' }}>{theorique}</TableCell>
                                                <TableCell align="right" sx={{ width: 120 }}>
                                                    {parLot ? (
                                                        <Tooltip title="Ce produit a plusieurs lots : comptez-les un par un">
                                                            <Chip
                                                                size="small"
                                                                variant={comptesDuProduit.length ? 'filled' : 'outlined'}
                                                                color={comptesDuProduit.length ? 'primary' : 'default'}
                                                                onClick={() => setDeplies({ ...deplies, [p.id]: !deplie })}
                                                                label={comptesDuProduit.length
                                                                    ? `${sommeComptee} (${comptesDuProduit.length}/${sesLots.length} lots)`
                                                                    : 'Compter par lot'}
                                                                sx={{ height: 22, fontSize: '0.72rem', cursor: 'pointer' }}
                                                            />
                                                        </Tooltip>
                                                    ) : (
                                                        <TextField
                                                            size="small" type="number" placeholder="—"
                                                            value={brut ?? ''}
                                                            onChange={(e) => setComptes({ ...comptes, [p.id]: e.target.value })}
                                                            inputProps={{ min: 0, style: { textAlign: 'right', padding: '6px 8px' } }}
                                                            sx={{ width: 100 }}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell align="right" sx={{ width: 90 }}>{pastilleEcart(ecart)}</TableCell>
                                            </TableRow>

                                            {parLot && deplie && sesLots.map((b) => {
                                                const brutLot = comptesLots[b.id];
                                                const compteLot = brutLot === '' || brutLot === undefined
                                                    ? null : parseInt(brutLot, 10);
                                                const ecartLot = compteLot === null || !Number.isFinite(compteLot)
                                                    ? null : compteLot - b.quantity_remaining;
                                                return (
                                                    <TableRow key={b.id} sx={{ bgcolor: 'action.hover' }}>
                                                        <TableCell sx={{ fontSize: '0.78rem', pl: 5 }}>
                                                            Lot {b.batch_number}
                                                            <Typography variant="caption" color="text.secondary" display="block">
                                                                Péremption {b.expiry_date
                                                                    ? new Date(b.expiry_date).toLocaleDateString('fr-FR')
                                                                    : '—'}
                                                                {b.status === 'opened' && ' · ouvert'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontSize: '0.78rem' }}>{b.quantity_remaining}</TableCell>
                                                        <TableCell align="right">
                                                            <TextField
                                                                size="small" type="number" placeholder="—"
                                                                value={brutLot ?? ''}
                                                                onChange={(e) => setComptesLots({ ...comptesLots, [b.id]: e.target.value })}
                                                                inputProps={{ min: 0, style: { textAlign: 'right', padding: '6px 8px' } }}
                                                                sx={{ width: 100 }}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">{pastilleEcart(ecartLot)}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </React.Fragment>
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
