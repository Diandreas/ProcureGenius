import React, { useState, useEffect } from 'react';
import {
    Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, Typography, Stack, Tooltip, IconButton,
    CircularProgress, Alert, Divider,
} from '@mui/material';
import {
    Add as AddIcon,
    Remove as RemoveIcon,
    ReportProblem as LossIcon,
    Inventory2 as BatchIcon,
    History as HistoryIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { productsAPI } from '../../services/api';

const LOSS_REASONS = [
    { value: 'damaged', label: 'Produit endommagé' },
    { value: 'expired', label: 'Produit périmé' },
    { value: 'stolen', label: 'Vol' },
    { value: 'lost', label: 'Perte / Égarement' },
    { value: 'quality_issue', label: 'Problème de qualité' },
    { value: 'other', label: 'Autre raison' },
];

const MODES = {
    in: { titre: 'Entrée de stock', verbe: 'Ajouter', couleur: 'success', signe: 1 },
    out: { titre: 'Sortie de stock', verbe: 'Retirer', couleur: 'warning', signe: -1 },
    loss: { titre: 'Déclarer une perte', verbe: 'Déclarer', couleur: 'error', signe: -1 },
};

/**
 * Actions de stock réalisables directement depuis la liste des produits, sans
 * avoir à ouvrir la fiche : entrée, sortie, perte, plus les raccourcis vers les
 * lots et l'historique des mouvements.
 *
 * Les endpoints existaient déjà côté backend (adjust_stock / report_loss), ils
 * n'étaient simplement joignables que depuis la fiche produit.
 */
const StockQuickActions = ({ product, onDone }) => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const [mode, setMode] = useState(null);
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');
    const [lossReason, setLossReason] = useState('expired');
    const [batchId, setBatchId] = useState('');
    const [batches, setBatches] = useState([]);
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [saving, setSaving] = useState(false);

    const cfg = mode ? MODES[mode] : null;

    // Les lots ne sont chargés qu'à l'ouverture de la boîte de dialogue :
    // inutile de faire une requête par produit sur toute la liste.
    useEffect(() => {
        if (!mode) return;
        let annule = false;
        setLoadingBatches(true);
        productsAPI.getBatches(product.id)
            .then((res) => {
                if (annule) return;
                const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
                setBatches(data.filter((b) => ['available', 'opened'].includes(b.status)));
            })
            .catch(() => { if (!annule) setBatches([]); })
            .finally(() => { if (!annule) setLoadingBatches(false); });
        return () => { annule = true; };
    }, [mode, product.id]);

    const fermer = () => {
        setMode(null); setQuantity(''); setNotes(''); setBatchId(''); setLossReason('expired');
    };

    const valider = async () => {
        const qte = parseInt(quantity, 10);
        if (!qte || qte <= 0) {
            enqueueSnackbar('Indiquez une quantité supérieure à 0', { variant: 'warning' });
            return;
        }
        setSaving(true);
        try {
            if (mode === 'loss') {
                await productsAPI.reportLoss(product.id, {
                    quantity: qte,
                    loss_reason: lossReason,
                    loss_description: notes,
                    notes,
                });
            } else {
                await productsAPI.adjustStock(product.id, {
                    quantity: cfg.signe * qte,
                    movement_type: mode === 'in' ? 'reception' : 'adjustment',
                    notes: notes || cfg.titre,
                    ...(batchId ? { batch_id: batchId } : {}),
                });
            }
            enqueueSnackbar(cfg.titre + ' enregistrée', { variant: 'success' });
            fermer();
            onDone?.();
        } catch (e) {
            enqueueSnackbar(e.response?.data?.error || 'Échec de l\'enregistrement', { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // Un produit géré par lots doit voir son mouvement rattaché à un lot, sinon
    // le compteur du produit et la somme des lots divergent (cf. bug de stock
    // corrigé le 09/09 : liste et fiche affichaient deux nombres différents).
    const gereParLots = batches.length > 0;
    const lotManquant = gereParLots && !batchId && mode !== 'loss';

    return (
        <>
            <Box
                sx={{
                    display: 'flex', alignItems: 'center', gap: 0.5,
                    mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <Tooltip title="Entrée de stock">
                    <IconButton size="small" color="success" onClick={() => setMode('in')}>
                        <AddIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Sortie / ajustement">
                    <IconButton size="small" color="warning" onClick={() => setMode('out')}>
                        <RemoveIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Déclarer une perte">
                    <IconButton size="small" color="error" onClick={() => setMode('loss')}>
                        <LossIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Box sx={{ flex: 1 }} />
                <Tooltip title="Lots & péremptions">
                    <IconButton size="small" onClick={() => navigate('/products/' + product.id + '/batches')}>
                        <BatchIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Historique des mouvements">
                    <IconButton size="small" onClick={() => navigate('/products/' + product.id)}>
                        <HistoryIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>

            <Dialog open={!!mode} onClose={fermer} maxWidth="xs" fullWidth onClick={(e) => e.stopPropagation()}>
                {cfg && (
                    <>
                        <DialogTitle sx={{ pb: 1 }}>
                            <Typography variant="h6" fontWeight={700}>{cfg.titre}</Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>{product.name}</Typography>
                        </DialogTitle>
                        <DialogContent>
                            <Stack spacing={2} sx={{ mt: 0.5 }}>
                                <Alert severity="info" icon={false} sx={{ py: 0.5 }}>
                                    Stock actuel : <strong>{product.stock_quantity ?? 0}</strong>
                                </Alert>

                                <TextField
                                    label="Quantité" type="number" size="small" autoFocus fullWidth
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    inputProps={{ min: 1 }}
                                />

                                {mode === 'loss' && (
                                    <TextField
                                        select label="Raison" size="small" fullWidth
                                        value={lossReason}
                                        onChange={(e) => setLossReason(e.target.value)}
                                    >
                                        {LOSS_REASONS.map((r) => (
                                            <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                                        ))}
                                    </TextField>
                                )}

                                {loadingBatches ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                                        <CircularProgress size={20} />
                                    </Box>
                                ) : gereParLots && mode !== 'loss' && (
                                    <TextField
                                        select label="Lot concerné" size="small" fullWidth
                                        value={batchId}
                                        onChange={(e) => setBatchId(e.target.value)}
                                        error={lotManquant}
                                        helperText={lotManquant
                                            ? 'Ce produit est géré par lots : choisissez le lot concerné.'
                                            : ' '}
                                    >
                                        {batches.map((b) => (
                                            <MenuItem key={b.id} value={b.id}>
                                                {b.batch_number} — reste {b.quantity_remaining}
                                                {b.expiry_date ? ' — exp. ' + b.expiry_date : ''}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}

                                <TextField
                                    label={mode === 'loss' ? 'Détail' : 'Motif / note'}
                                    size="small" fullWidth multiline rows={2}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                                <Divider />
                                <Typography variant="caption" color="text.secondary">
                                    L&apos;opération est tracée dans l&apos;historique des mouvements.
                                </Typography>
                            </Stack>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2 }}>
                            <Button onClick={fermer} disabled={saving}>Annuler</Button>
                            <Button
                                variant="contained"
                                color={cfg.couleur}
                                onClick={valider}
                                disabled={saving || lotManquant}
                                startIcon={saving ? <CircularProgress size={16} /> : null}
                            >
                                {cfg.verbe}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </>
    );
};

export default StockQuickActions;
