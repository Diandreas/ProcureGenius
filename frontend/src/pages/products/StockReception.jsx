import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Button, Chip, Stack, CircularProgress,
    Alert, IconButton, Autocomplete, Divider, Tooltip,
} from '@mui/material';
import {
    LocalShipping as ShippingIcon, Save as SaveIcon,
    Add as AddIcon, DeleteOutline as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { productsAPI } from '../../services/api';
import { settingsAPI } from '../../services/settingsAPI';
import BackButton from '../../components/navigation/BackButton';

const ligneVide = () => ({
    cle: Math.random().toString(36).slice(2),
    produit: null,
    quantity: '',
    batch_number: '',
    expiry_date: '',
});

/**
 * Reception de marchandise : tout ce qui arrive avec un bon de livraison est
 * saisi en une fois — quantite, numero de lot et peremption par ligne — puis
 * enregistre en une seule transaction.
 *
 * Remplace l'ajout de lots un produit a la fois depuis chaque fiche produit,
 * qui obligeait a ouvrir 15 pages pour une seule livraison.
 */
const StockReception = () => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [autorise, setAutorise] = useState(null);
    const [produits, setProduits] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');
    const [lignes, setLignes] = useState([ligneVide()]);
    const [envoi, setEnvoi] = useState(false);

    useEffect(() => {
        settingsAPI.getAll()
            .then((res) => setAutorise(!!res.data?.stockReceptionEnabled))
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

    const majLigne = (cle, champ, valeur) => {
        setLignes((prev) => prev.map((l) => (l.cle === cle ? { ...l, [champ]: valeur } : l)));
    };

    const ajouterLigne = () => setLignes((prev) => [...prev, ligneVide()]);
    const retirerLigne = (cle) => setLignes((prev) => (
        prev.length === 1 ? [ligneVide()] : prev.filter((l) => l.cle !== cle)
    ));

    // Une ligne est prete si le produit et la quantite sont la, et si le lot
    // est renseigne quand le produit est deja suivi par lots.
    const ligneComplete = (l) => {
        if (!l.produit) return false;
        const q = parseInt(l.quantity, 10);
        if (!Number.isFinite(q) || q <= 0) return false;
        if (l.produit.has_batches && !(l.batch_number.trim() && l.expiry_date)) return false;
        if (l.batch_number.trim() && !l.expiry_date) return false;
        return true;
    };

    const pretes = useMemo(() => lignes.filter(ligneComplete), [lignes]);
    const incompletes = useMemo(
        () => lignes.filter((l) => l.produit && !ligneComplete(l)),
        [lignes],
    );

    const valider = async () => {
        if (pretes.length === 0) {
            enqueueSnackbar('Aucune ligne complete a enregistrer', { variant: 'warning' });
            return;
        }
        if (incompletes.length > 0) {
            enqueueSnackbar(
                `${incompletes.length} ligne(s) incomplete(s) : completez-les ou retirez-les`,
                { variant: 'warning' },
            );
            return;
        }
        setEnvoi(true);
        try {
            const res = await productsAPI.receiveGoods({
                reference,
                notes,
                lines: pretes.map((l) => ({
                    product_id: l.produit.id,
                    quantity: parseInt(l.quantity, 10),
                    batch_number: l.batch_number.trim() || null,
                    expiry_date: l.expiry_date || null,
                })),
            });
            enqueueSnackbar(
                `Reception enregistree : ${res.data.received_count} ligne(s) ajoutee(s) au stock`,
                { variant: 'success' },
            );
            navigate('/products');
        } catch (e) {
            const d = e.response?.data;
            const detail = Array.isArray(d?.details) && d.details.length
                ? ` (ligne ${d.details[0].ligne} : ${d.details[0].error})`
                : '';
            enqueueSnackbar((d?.error || "Echec de l'enregistrement") + detail, { variant: 'error' });
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
                    La réception de marchandise n&apos;est pas activée pour cette structure.
                    Vous pouvez l&apos;activer dans <strong>Paramètres → Général → Stock &amp; Pharmacie</strong>.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <BackButton />
                <ShippingIcon color="primary" />
                <Typography variant="h5" fontWeight={700}>Réception de marchandise</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Saisissez tout ce qui arrive avec un bon de livraison. Les produits déjà suivis
                par lots exigent un numéro de lot et une date de péremption.
            </Typography>

            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                        size="small" label="N° de bon de livraison" sx={{ minWidth: 240 }}
                        value={reference} onChange={(e) => setReference(e.target.value)}
                    />
                    <TextField
                        size="small" label="Note (fournisseur, remarque...)" fullWidth
                        value={notes} onChange={(e) => setNotes(e.target.value)}
                    />
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip size="small" color="primary" label={`${pretes.length} ligne(s) prête(s)`} />
                    {incompletes.length > 0 && (
                        <Chip size="small" color="warning" label={`${incompletes.length} incomplète(s)`} />
                    )}
                    <Box sx={{ flex: 1 }} />
                    <Button size="small" startIcon={<AddIcon />} onClick={ajouterLigne}>
                        Ajouter une ligne
                    </Button>
                    <Button
                        variant="contained" startIcon={envoi ? <CircularProgress size={16} /> : <SaveIcon />}
                        onClick={valider} disabled={envoi || pretes.length === 0}
                    >
                        Enregistrer la réception
                    </Button>
                </Stack>
            </Paper>

            {chargement ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : (
                <Paper>
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ minWidth: 260 }}><strong>Produit</strong></TableCell>
                                    <TableCell align="right" sx={{ width: 110 }}><strong>Stock actuel</strong></TableCell>
                                    <TableCell sx={{ width: 110 }}><strong>Quantité</strong></TableCell>
                                    <TableCell sx={{ width: 160 }}><strong>N° de lot</strong></TableCell>
                                    <TableCell sx={{ width: 170 }}><strong>Péremption</strong></TableCell>
                                    <TableCell sx={{ width: 48 }} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {lignes.map((l) => {
                                    const lotRequis = !!l.produit?.has_batches;
                                    return (
                                        <TableRow key={l.cle} hover>
                                            <TableCell>
                                                <Autocomplete
                                                    size="small"
                                                    options={produits}
                                                    value={l.produit}
                                                    onChange={(e, v) => majLigne(l.cle, 'produit', v)}
                                                    getOptionLabel={(o) => o?.name || ''}
                                                    isOptionEqualToValue={(o, v) => o.id === v?.id}
                                                    renderInput={(params) => (
                                                        <TextField {...params} placeholder="Choisir un produit..." />
                                                    )}
                                                    renderOption={(props, o) => (
                                                        <li {...props} key={o.id}>
                                                            <Box>
                                                                <Typography variant="body2">{o.name}</Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {o.reference}
                                                                </Typography>
                                                            </Box>
                                                        </li>
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.82rem' }}>
                                                {l.produit ? (l.produit.stock_quantity ?? 0) : '—'}
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    size="small" type="number" placeholder="0"
                                                    value={l.quantity}
                                                    onChange={(e) => majLigne(l.cle, 'quantity', e.target.value)}
                                                    inputProps={{ min: 1, style: { textAlign: 'right', padding: '6px 8px' } }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title={lotRequis ? 'Ce produit est suivi par lots : obligatoire' : ''}>
                                                    <TextField
                                                        size="small"
                                                        placeholder={lotRequis ? 'Obligatoire' : 'Optionnel'}
                                                        value={l.batch_number}
                                                        error={lotRequis && !l.batch_number.trim()}
                                                        onChange={(e) => majLigne(l.cle, 'batch_number', e.target.value)}
                                                        inputProps={{ style: { padding: '6px 8px' } }}
                                                    />
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    size="small" type="date"
                                                    value={l.expiry_date}
                                                    error={(lotRequis || !!l.batch_number.trim()) && !l.expiry_date}
                                                    onChange={(e) => majLigne(l.cle, 'expiry_date', e.target.value)}
                                                    inputProps={{ style: { padding: '6px 8px' } }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <IconButton size="small" onClick={() => retirerLigne(l.cle)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
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

export default StockReception;
