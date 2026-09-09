import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Paper, TextField, Button, Chip, Stack,
    CircularProgress, Alert, Divider, List, ListItem, ListItemText,
} from '@mui/material';
import {
    QrCodeScanner as ScannerIcon, ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { productsAPI } from '../../services/api';
import { settingsAPI } from '../../services/settingsAPI';
import BackButton from '../../components/navigation/BackButton';

/**
 * Recherche d'un produit par scan.
 *
 * Concu pour une douchette USB, qui se comporte comme un clavier : elle tape
 * le code puis envoie Entree. Le champ reste donc focalise en permanence et
 * valide sur Entree — aucune camera, aucun pilote, et la saisie manuelle
 * marche exactement pareil quand la douchette n'est pas la.
 */
const StockScan = () => {
    const navigate = useNavigate();
    const champRef = useRef(null);

    const [autorise, setAutorise] = useState(null);
    const [code, setCode] = useState('');
    const [recherche, setRecherche] = useState(false);
    const [resultat, setResultat] = useState(null);
    const [erreur, setErreur] = useState('');
    const [historique, setHistorique] = useState([]);

    useEffect(() => {
        settingsAPI.getAll()
            .then((res) => setAutorise(!!res.data?.stockBarcodeEnabled))
            .catch(() => setAutorise(false));
    }, []);

    useEffect(() => {
        if (autorise) champRef.current?.focus();
    }, [autorise]);

    const chercher = async (valeur) => {
        const q = (valeur ?? code).trim();
        if (!q) return;
        setRecherche(true);
        setErreur('');
        try {
            const res = await productsAPI.scanCode(q);
            setResultat(res.data);
            setHistorique((prev) => [
                { code: q, nom: res.data.product.name, stock: res.data.product.stock },
                ...prev,
            ].slice(0, 10));
        } catch (e) {
            setResultat(null);
            setErreur(e.response?.status === 404
                ? `Aucun produit ne correspond au code « ${q} »`
                : 'La recherche a échoué');
        } finally {
            setRecherche(false);
            setCode('');
            champRef.current?.focus();
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

    const produit = resultat?.product;
    const lot = resultat?.batch;

    return (
        <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 760, mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <BackButton />
                <ScannerIcon color="primary" />
                <Typography variant="h5" fontWeight={700}>Scanner un produit</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Scannez l&apos;étiquette avec la douchette, ou tapez le code / la référence
                puis Entrée. Le champ reste actif entre deux scans.
            </Typography>

            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" spacing={1}>
                    <TextField
                        inputRef={champRef} fullWidth autoFocus size="medium"
                        placeholder="Scannez ou saisissez un code..."
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); chercher(); } }}
                        onBlur={() => setTimeout(() => champRef.current?.focus(), 100)}
                    />
                    <Button variant="contained" onClick={() => chercher()} disabled={recherche || !code.trim()}>
                        {recherche ? <CircularProgress size={20} /> : 'Chercher'}
                    </Button>
                </Stack>
            </Paper>

            {erreur && <Alert severity="warning" sx={{ mb: 2 }}>{erreur}</Alert>}

            {produit && (
                <Paper sx={{ p: 2.5, mb: 2 }}>
                    <Typography variant="h6" fontWeight={700}>{produit.name}</Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        {produit.reference}{produit.category ? ` · ${produit.category}` : ''}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ my: 1.5 }} flexWrap="wrap" useFlexGap>
                        <Chip
                            label={`Stock : ${produit.stock}`}
                            color={produit.stock <= 0 ? 'error' : produit.is_low_stock ? 'warning' : 'success'}
                        />
                        {produit.is_low_stock && produit.stock > 0 && (
                            <Chip size="small" color="warning" variant="outlined"
                                label={`Seuil d'alerte : ${produit.low_stock_threshold}`} />
                        )}
                        {lot && (
                            <>
                                <Chip size="small" label={`Lot ${lot.batch_number}`} />
                                <Chip size="small" label={`Reste ${lot.quantity_remaining}`} />
                                <Chip
                                    size="small"
                                    color={lot.is_expired ? 'error' : 'default'}
                                    label={lot.is_expired
                                        ? `Périmé le ${lot.expiry_date}`
                                        : `Péremption ${lot.expiry_date}`}
                                />
                            </>
                        )}
                    </Stack>

                    <Button
                        variant="outlined" endIcon={<ArrowIcon />}
                        onClick={() => navigate(`/products/${produit.id}`)}
                    >
                        Ouvrir la fiche produit
                    </Button>
                </Paper>
            )}

            {historique.length > 0 && (
                <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700}>Derniers scans</Typography>
                    <Divider sx={{ my: 1 }} />
                    <List dense disablePadding>
                        {historique.map((h, i) => (
                            <ListItem key={`${h.code}-${i}`} disableGutters>
                                <ListItemText primary={h.nom} secondary={`${h.code} · stock ${h.stock}`} />
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            )}
        </Box>
    );
};

export default StockScan;
