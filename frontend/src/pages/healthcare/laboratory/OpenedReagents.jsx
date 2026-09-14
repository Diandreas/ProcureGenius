import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Grid, Alert, Avatar, FormControlLabel, Switch,
    Autocomplete, CircularProgress, LinearProgress, Stack, Tooltip, IconButton,
    RadioGroup, Radio, alpha,
} from '@mui/material';
import {
    Science as ScienceIcon,
    Warning as WarningIcon,
    CheckCircle as OkIcon,
    Error as ExpiredIcon,
    Add as AddIcon,
    Refresh as RefreshIcon,
    LockOpen as OpenIcon,
    Opacity as OpacityIcon,
    Schedule as ScheduleIcon,
    Inventory as InventoryIcon,
    Print as PrintIcon,
    DoNotDisturbOn as CloseLotIcon,
    Link as LinkIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import batchAPI from '../../../services/batchAPI';
import { productsAPI } from '../../../services/api';
import OpenBatchDialog, { imprimerEtiquetteOuverture } from '../../../components/stock/OpenBatchDialog';
import useCurrentUser from '../../../hooks/useCurrentUser';

// Regle du centre : un reactif est un produit dont la categorie contient
// « laboratoire » ou « reactif ».
const CATEGORIE_REACTIF = /labo|r[eé]actif/i;

const MOTIFS_CLOTURE = [
    { value: 'depleted', label: 'Flacon terminé', aide: 'Le réactif a été entièrement utilisé.' },
    { value: 'expired', label: 'Périmé', aide: 'Date limite dépassée : la quantité restante sort du stock en perte.' },
    { value: 'contaminated', label: 'Contaminé / altéré', aide: 'La quantité restante sort du stock en perte.' },
    { value: 'qc_failed', label: 'Contrôle qualité non conforme', aide: 'La quantité restante sort du stock en perte.' },
    { value: 'other', label: 'Autre', aide: 'Précisez la raison dans la note.' },
];

const StatCard = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%', borderRadius: 3, border: `1px solid ${alpha(color, 0.15)}`, background: alpha(color, 0.03) }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2.5, px: 3 }}>
            <Box>
                <Typography color="text.secondary" variant="subtitle2" gutterBottom fontWeight={500}>{title}</Typography>
                <Typography variant="h3" fontWeight="bold" sx={{ color }}>{value ?? 0}</Typography>
            </Box>
            <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>{icon}</Avatar>
        </CardContent>
    </Card>
);

const getDaysProgress = (days, isExpired) => {
    if (isExpired || (days !== null && days !== undefined && days <= 0)) return { percent: 100, color: 'error', label: 'PÉRIMÉ' };
    if (days === null || days === undefined) return { percent: 0, color: 'primary', label: '-' };
    if (days <= 3) return { percent: (1 - days / 14) * 100, color: 'error', label: `${days}j` };
    if (days <= 7) return { percent: (1 - days / 14) * 100, color: 'warning', label: `${days}j` };
    if (days <= 14) return { percent: (1 - days / 30) * 100, color: 'info', label: `${days}j` };
    return { percent: (1 - Math.min(days, 60) / 60) * 100, color: 'success', label: `${days}j` };
};

const formatDate = (s) => (s ? new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-');

const OpenedReagents = () => {
    const { enqueueSnackbar } = useSnackbar();
    // Ouvrir et cloturer : tout le monde. Rattacher un reactif : administrateurs.
    const { isAdmin } = useCurrentUser();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({
        batches: [], total: 0, opened_count: 0, expired_count: 0, expiring_soon_count: 0,
        low_tests_count: 0, untracked: [],
    });
    const [showAll, setShowAll] = useState(false);

    // Liste des reactifs (chargee une fois : ouverture et rattachement)
    const [reactifs, setReactifs] = useState(null);

    // Choix du lot a ouvrir
    const [choixOuvert, setChoixOuvert] = useState(false);
    const [produitChoisi, setProduitChoisi] = useState(null);
    const [lotsDisponibles, setLotsDisponibles] = useState([]);
    const [chargementLots, setChargementLots] = useState(false);
    const [aOuvrir, setAOuvrir] = useState(null); // { batch, product }

    // Cloture
    const [aCloturer, setACloturer] = useState(null);
    const [motif, setMotif] = useState('depleted');
    const [noteCloture, setNoteCloture] = useState('');
    const [cloture, setCloture] = useState(false);

    // Examens sans reactif
    const [examens, setExamens] = useState([]);
    const [chargementExamens, setChargementExamens] = useState(true);
    const [aRattacher, setARattacher] = useState(null);
    const [reactifLie, setReactifLie] = useState(null);
    const [quantiteParTest, setQuantiteParTest] = useState('1');
    const [rattachement, setRattachement] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            setData(await batchAPI.getOpenedReagents(showAll));
        } catch (error) {
            enqueueSnackbar('Erreur lors du chargement', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [showAll, enqueueSnackbar]);

    const fetchExamens = useCallback(async () => {
        setChargementExamens(true);
        try {
            const res = await batchAPI.getTestsWithoutReagents(30);
            setExamens(res.tests || []);
        } catch (error) {
            setExamens([]);
        } finally {
            setChargementExamens(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { fetchExamens(); }, [fetchExamens]);

    const chargerReactifs = async () => {
        if (reactifs) return reactifs;
        try {
            const res = await productsAPI.list({ product_type: 'physical', page_size: 1000 });
            const liste = (res.data?.results || res.data || [])
                .filter((p) => CATEGORIE_REACTIF.test(p.category?.name || ''));
            setReactifs(liste);
            return liste;
        } catch (error) {
            enqueueSnackbar('Erreur lors du chargement des réactifs', { variant: 'error' });
            setReactifs([]);
            return [];
        }
    };

    // ── Ouverture ────────────────────────────────────────────────────────────
    const ouvrirChoix = async () => {
        setProduitChoisi(null);
        setLotsDisponibles([]);
        setChoixOuvert(true);
        await chargerReactifs();
    };

    const choisirProduit = async (produit) => {
        setProduitChoisi(produit);
        setLotsDisponibles([]);
        if (!produit) return;
        setChargementLots(true);
        try {
            const lots = await batchAPI.getProductBatches(produit.id);
            setLotsDisponibles((Array.isArray(lots) ? lots : lots.results || [])
                .filter((b) => b.status === 'available' && b.quantity_remaining > 0));
        } catch (error) {
            enqueueSnackbar('Erreur lors du chargement des lots', { variant: 'error' });
        } finally {
            setChargementLots(false);
        }
    };

    const choisirLot = (lot) => {
        setAOuvrir({ batch: lot, product: produitChoisi });
        setChoixOuvert(false);
    };

    const ouvrirDepuisLigne = (ligne) => {
        setAOuvrir({
            batch: {
                id: ligne.id,
                batch_number: ligne.batch_number,
                expiry_date: ligne.expiry_date,
                shelf_life_after_opening_days: ligne.shelf_life_after_opening_days,
                product_name: ligne.product_name,
            },
            product: {
                name: ligne.product_name,
                default_shelf_life_after_opening: ligne.default_shelf_life,
                storage_conditions: ligne.storage_conditions,
                tests_per_unit: ligne.tests_per_unit,
            },
        });
    };

    // ── Cloture ──────────────────────────────────────────────────────────────
    const demanderCloture = (ligne) => {
        setACloturer(ligne);
        setMotif(ligne.is_expired ? 'expired' : 'depleted');
        setNoteCloture('');
    };

    const confirmerCloture = async () => {
        setCloture(true);
        try {
            await batchAPI.closeBatch(aCloturer.id, { reason: motif, notes: noteCloture });
            enqueueSnackbar(`Lot ${aCloturer.batch_number} clôturé`, { variant: 'success' });
            setACloturer(null);
            fetchData();
        } catch (e) {
            enqueueSnackbar(e.response?.data?.error || 'Échec de la clôture', { variant: 'error' });
        } finally {
            setCloture(false);
        }
    };

    // ── Rattachement reactif -> examen ─────────────────────────────────────────
    const demanderRattachement = async (examen) => {
        setARattacher(examen);
        setReactifLie(null);
        setQuantiteParTest('1');
        await chargerReactifs();
    };

    const confirmerRattachement = async () => {
        const q = parseInt(quantiteParTest, 10);
        if (!reactifLie || !(q > 0)) {
            enqueueSnackbar('Choisissez un réactif et une quantité par examen', { variant: 'warning' });
            return;
        }
        setRattachement(true);
        try {
            await batchAPI.addTestConsumable(aRattacher.id, { product: reactifLie.id, quantity_per_test: q });
            enqueueSnackbar(`${reactifLie.name} rattaché à ${aRattacher.name}`, { variant: 'success' });
            setExamens((prev) => prev.filter((e) => e.id !== aRattacher.id));
            setARattacher(null);
        } catch (e) {
            enqueueSnackbar(e.response?.data?.error || 'Échec du rattachement', { variant: 'error' });
        } finally {
            setRattachement(false);
        }
    };

    const motifCourant = MOTIFS_CLOTURE.find((m) => m.value === motif);
    const examensPratiques = examens.filter((e) => e.volume > 0);

    return (
        <Box>
            {/* En-tete */}
            <Box sx={{
                background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white', py: 3, px: 3, borderRadius: 3, mb: 3,
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                            <ScienceIcon sx={{ fontSize: 40 }} />
                            <Typography variant="h4" fontWeight={700}>Réactifs & Lots</Typography>
                        </Box>
                        <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                            Ouverture, date limite d&apos;utilisation et clôture des réactifs de laboratoire
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                        <FormControlLabel
                            control={<Switch checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />}
                            label={<Typography variant="body2" fontWeight={500}>Tous les lots</Typography>}
                            sx={{ color: 'white', mr: 1 }}
                        />
                        <Button startIcon={<RefreshIcon />} onClick={fetchData} variant="outlined"
                            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}>
                            Actualiser
                        </Button>
                        <Button id="manual-btn-ouvrir-reactif" startIcon={<AddIcon />} onClick={ouvrirChoix} variant="contained"
                            sx={{ bgcolor: 'white', color: 'primary.main', fontWeight: 600, '&:hover': { bgcolor: 'grey.100' } }}>
                            Ouvrir un réactif
                        </Button>
                    </Box>
                </Box>
            </Box>

            {/* Indicateurs */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={3}><StatCard title="Total lots" value={data.total} icon={<InventoryIcon />} color="#1976d2" /></Grid>
                <Grid item xs={6} md={3}><StatCard title="Ouverts" value={data.opened_count} icon={<OpacityIcon />} color="#2e7d32" /></Grid>
                <Grid item xs={6} md={3}><StatCard title="Expirent bientôt" value={data.expiring_soon_count} icon={<ScheduleIcon />} color="#ed6c02" /></Grid>
                <Grid item xs={6} md={3}><StatCard title="Périmés" value={data.expired_count} icon={<ExpiredIcon />} color="#d32f2f" /></Grid>
            </Grid>

            {data.expired_count > 0 && (
                <Alert severity="error" icon={<ExpiredIcon />} sx={{ mb: 2, borderRadius: 2 }}>
                    <strong>{data.expired_count} lot(s) périmé(s)</strong> : clôturez-les pour les sortir du stock.
                </Alert>
            )}
            {data.expiring_soon_count > 0 && data.expired_count === 0 && (
                <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2, borderRadius: 2 }}>
                    <strong>{data.expiring_soon_count} lot(s)</strong> arrivent à leur date limite dans les 3 prochains jours.
                </Alert>
            )}

            {data.low_tests_count > 0 && (
                <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2, borderRadius: 2 }}>
                    <strong>{data.low_tests_count} flacon(s) presque vide(s)</strong> : préparez le flacon suivant.
                </Alert>
            )}
            {(data.untracked || []).length > 0 && (
                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                    <strong>Examens faits sans flacon ouvert</strong> — ils seront décomptés à la prochaine ouverture :{' '}
                    {data.untracked.map((u) => `${u.name} (${u.untracked_tests} test(s))`).join(', ')}
                </Alert>
            )}

            {/* Tableau des lots */}
            <Card sx={{ borderRadius: 3, mb: 3 }}>
                <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell sx={{ fontWeight: 700 }}>Produit</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>N° Lot</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Ouvert le</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>À utiliser avant</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Validité restante</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Qté restante</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow>
                            ) : data.batches.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                                        <ScienceIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                                        <Typography variant="h6" color="text.secondary">
                                            {showAll ? 'Aucun lot disponible' : 'Aucun réactif ouvert'}
                                        </Typography>
                                        {!showAll && (
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                Cliquez sur « Ouvrir un réactif » pour commencer le suivi
                                            </Typography>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ) : data.batches.map((b) => {
                                const progress = getDaysProgress(b.days_until_expiry, b.is_expired);
                                const estOuvert = b.status === 'opened';
                                return (
                                    <TableRow key={b.id} hover sx={{
                                        bgcolor: b.is_expired ? alpha('#d32f2f', 0.06)
                                            : (b.days_until_expiry !== null && b.days_until_expiry <= 3 ? alpha('#ed6c02', 0.06) : 'inherit'),
                                    }}>
                                        <TableCell>
                                            <Typography variant="subtitle2" fontWeight={600}>{b.product_name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{b.product_reference}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>{b.batch_number}</Typography>
                                            {b.lot_number && <Chip label={`Lot : ${b.lot_number}`} size="small" variant="outlined" />}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={estOuvert ? <OpenIcon /> : <OkIcon />}
                                                label={estOuvert ? 'Ouvert' : 'Disponible'}
                                                color={estOuvert ? 'primary' : 'success'}
                                                size="small" sx={{ fontWeight: 600 }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{formatDate(b.opened_at)}</Typography>
                                            {b.opened_by_name && (
                                                <Typography variant="caption" color="text.secondary">par {b.opened_by_name}</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>{formatDate(b.effective_expiry)}</Typography>
                                            {(b.shelf_life_after_opening_days || b.storage_conditions) && (
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    {[b.shelf_life_after_opening_days && `${b.shelf_life_after_opening_days} j après ouverture`, b.storage_conditions]
                                                        .filter(Boolean).join(' · ')}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ minWidth: 150 }}>
                                                <Chip label={progress.label} color={progress.color} size="small" sx={{ fontWeight: 700, mb: 0.5 }} />
                                                <LinearProgress variant="determinate" value={Math.min(progress.percent, 100)}
                                                    color={progress.color} sx={{ height: 6, borderRadius: 3 }} />
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="h6" fontWeight={700} color="primary">{b.quantity_remaining}</Typography>
                                            <Typography variant="caption" color="text.secondary" display="block">/ {b.quantity} total</Typography>
                                            {b.tests_per_unit && estOuvert && (
                                                <Tooltip title="Tests restants dans le flacon en cours · tests disponibles sur tout le lot">
                                                    <Chip
                                                        size="small"
                                                        color={b.low_tests ? 'warning' : 'default'}
                                                        sx={{ mt: 0.5, fontWeight: 600 }}
                                                        label={`${b.tests_remaining ?? b.tests_per_unit}/${b.tests_per_unit} tests · ${b.tests_total_left ?? '-'} au total`}
                                                    />
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                            {estOuvert ? (
                                                <>
                                                    <Tooltip title="Imprimer l'étiquette d'ouverture">
                                                        <IconButton size="small" onClick={() => imprimerEtiquetteOuverture(b.id, enqueueSnackbar)}>
                                                            <PrintIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Clôturer le lot (terminé, périmé, contaminé...)">
                                                        <IconButton size="small" color="error" onClick={() => demanderCloture(b)}>
                                                            <CloseLotIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            ) : (
                                                <Button size="small" variant="outlined" startIcon={<OpenIcon />} onClick={() => ouvrirDepuisLigne(b)}>
                                                    Ouvrir
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            {/* Examens sans reactif rattache */}
            <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <LinkIcon color="primary" />
                        <Typography variant="h6" fontWeight={700}>Examens sans réactif rattaché</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Tant qu&apos;un examen n&apos;a pas de réactif rattaché, sa réalisation ne décompte rien du stock.
                        Les plus pratiqués ces 30 derniers jours sont en tête.
                    </Typography>
                    {chargementExamens ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
                    ) : examensPratiques.length === 0 ? (
                        <Alert severity="success">Tous les examens pratiqués ces 30 derniers jours ont au moins un réactif rattaché.</Alert>
                    ) : (
                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>Examen</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Catégorie</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Réalisés (30 j)</TableCell>
                                        <TableCell align="right" />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {examensPratiques.map((e) => (
                                        <TableRow key={e.id} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>{e.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{e.test_code}</Typography>
                                            </TableCell>
                                            <TableCell>{e.category || '-'}</TableCell>
                                            <TableCell align="right"><Chip size="small" label={e.volume} /></TableCell>
                                            <TableCell align="right">
                                                {isAdmin ? (
                                                    <Button size="small" startIcon={<LinkIcon />} onClick={() => demanderRattachement(e)}>
                                                        Rattacher
                                                    </Button>
                                                ) : (
                                                    <Typography variant="caption" color="text.secondary">Réservé aux administrateurs</Typography>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>

            {/* Choix du lot a ouvrir */}
            <Dialog open={choixOuvert} onClose={() => setChoixOuvert(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Typography variant="h6" fontWeight={700}>Ouvrir un réactif</Typography>
                    <Typography variant="body2" color="text.secondary">Choisissez le réactif, puis le lot ouvert</Typography>
                </DialogTitle>
                <DialogContent dividers>
                    <Autocomplete
                        options={reactifs || []}
                        loading={reactifs === null}
                        getOptionLabel={(o) => `${o.name} (${o.reference})`}
                        value={produitChoisi}
                        onChange={(e, v) => choisirProduit(v)}
                        renderInput={(params) => <TextField {...params} label="Rechercher un réactif" autoFocus sx={{ mb: 2 }} />}
                    />
                    {chargementLots && <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>}
                    {produitChoisi && !chargementLots && lotsDisponibles.length === 0 && (
                        <Alert severity="info">Aucun lot non ouvert disponible pour ce réactif.</Alert>
                    )}
                    {lotsDisponibles.length > 0 && (
                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>N° Lot</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Qté</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Péremption</TableCell>
                                        <TableCell align="right" />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {lotsDisponibles.map((lot) => (
                                        <TableRow key={lot.id} hover>
                                            <TableCell><Typography fontWeight={600}>{lot.batch_number}</Typography></TableCell>
                                            <TableCell><Chip label={lot.quantity_remaining} color="primary" size="small" /></TableCell>
                                            <TableCell>{formatDate(lot.expiry_date)}</TableCell>
                                            <TableCell align="right">
                                                <Button size="small" variant="contained" startIcon={<OpenIcon />} onClick={() => choisirLot(lot)}>
                                                    Ouvrir ce lot
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={() => setChoixOuvert(false)}>Fermer</Button></DialogActions>
            </Dialog>

            <OpenBatchDialog
                open={!!aOuvrir}
                batch={aOuvrir?.batch}
                product={aOuvrir?.product}
                onClose={() => setAOuvrir(null)}
                onOpened={() => fetchData()}
            />

            {/* Cloture */}
            <Dialog open={!!aCloturer} onClose={() => !cloture && setACloturer(null)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Typography variant="h6" fontWeight={700}>Clôturer le lot {aCloturer?.batch_number}</Typography>
                    <Typography variant="body2" color="text.secondary">{aCloturer?.product_name}</Typography>
                </DialogTitle>
                <DialogContent dividers>
                    <RadioGroup value={motif} onChange={(e) => setMotif(e.target.value)}>
                        {MOTIFS_CLOTURE.map((m) => (
                            <FormControlLabel key={m.value} value={m.value} control={<Radio size="small" />}
                                label={<Typography variant="body2" fontWeight={600}>{m.label}</Typography>} />
                        ))}
                    </RadioGroup>
                    {motifCourant && <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>{motifCourant.aide}</Typography>}
                    {aCloturer?.quantity_remaining > 0 && (
                        <Alert severity={motif === 'depleted' ? 'info' : 'warning'} sx={{ mb: 2 }}>
                            Il reste <strong>{aCloturer.quantity_remaining}</strong> unité(s) sur ce lot : elles sortiront du stock
                            {motif === 'depleted' ? ' (ajustement).' : ' en perte tracée.'}
                        </Alert>
                    )}
                    <TextField label="Note (facultatif)" fullWidth multiline minRows={2}
                        value={noteCloture} onChange={(e) => setNoteCloture(e.target.value)} />
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setACloturer(null)} disabled={cloture}>Annuler</Button>
                    <Button variant="contained" color="error" onClick={confirmerCloture} disabled={cloture}
                        startIcon={cloture ? <CircularProgress size={16} /> : <CloseLotIcon />}>
                        Clôturer
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Rattachement */}
            <Dialog open={!!aRattacher} onClose={() => !rattachement && setARattacher(null)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Typography variant="h6" fontWeight={700}>Rattacher un réactif</Typography>
                    <Typography variant="body2" color="text.secondary">{aRattacher?.name}</Typography>
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        <Autocomplete
                            options={reactifs || []}
                            loading={reactifs === null}
                            getOptionLabel={(o) => `${o.name} (${o.reference})`}
                            value={reactifLie}
                            onChange={(e, v) => setReactifLie(v)}
                            renderInput={(params) => <TextField {...params} label="Réactif consommé par cet examen" autoFocus />}
                        />
                        <TextField label="Quantité consommée par examen" type="number" inputProps={{ min: 1 }}
                            value={quantiteParTest} onChange={(e) => setQuantiteParTest(e.target.value)}
                            helperText={reactifLie?.tests_per_unit
                                ? `Ce réactif est compté en tests (${reactifLie.tests_per_unit} par flacon) : indiquez le nombre de tests par examen`
                                : "Ex. 1 cassette par test, 1 bandelette par examen d'urine"} />
                        <Typography variant="caption" color="text.secondary">
                            Vous pourrez rattacher d&apos;autres réactifs à cet examen depuis le catalogue des examens.
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setARattacher(null)} disabled={rattachement}>Annuler</Button>
                    <Button variant="contained" onClick={confirmerRattachement} disabled={rattachement}
                        startIcon={rattachement ? <CircularProgress size={16} /> : <LinkIcon />}>
                        Rattacher
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default OpenedReagents;
