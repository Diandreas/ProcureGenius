import React, { useState, useEffect } from 'react';
import {
    Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, Typography, Stack, Tooltip, IconButton,
    CircularProgress, Alert, Divider, Menu,
} from '@mui/material';
import {
    Add as AddIcon,
    Remove as RemoveIcon,
    ReportProblem as LossIcon,
    MoreVert as MoreIcon,
    LockOpen as OpenIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api, { productsAPI } from '../../services/api';

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
 * Mouvements de stock depuis la fiche produit : entrée, sortie/ajustement,
 * déclaration de perte. Les endpoints existaient déjà côté backend
 * (adjust_stock / report_loss) mais n'étaient reliés à aucun bouton.
 *
 * Deux usages :
 *  - carte Stock  : <StockQuickActions product={p} batches={b} onDone={f} />
 *  - ligne de lot : <StockQuickActions product={p} batch={lot} onDone={f} compact />
 *    (le lot est alors pré-sélectionné et verrouillé)
 */
export const StockQuickActions = ({ product, batches = [], batch = null, onDone, compact = false }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [mode, setMode] = useState(null);
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');
    const [lossReason, setLossReason] = useState('expired');
    const [batchId, setBatchId] = useState('');
    const [saving, setSaving] = useState(false);

    const cfg = mode ? MODES[mode] : null;
    const lotsActifs = batches.filter((b) => ['available', 'opened'].includes(b.status));
    const gereParLots = !batch && lotsActifs.length > 0;

    useEffect(() => {
        if (mode && batch) setBatchId(batch.id);
    }, [mode, batch]);

    const fermer = () => {
        setMode(null); setQuantity(''); setNotes(''); setLossReason('expired');
        setBatchId(batch ? batch.id : '');
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
    // le compteur du produit et la somme des lots divergent (cf. bug du 09/09 :
    // la liste et la fiche affichaient deux nombres différents).
    const lotManquant = gereParLots && !batchId && mode !== 'loss';

    const declencheurs = compact ? (
        <>
            <Tooltip title="Entrée sur ce lot">
                <IconButton size="small" color="success" onClick={() => setMode('in')}>
                    <AddIcon sx={{ fontSize: 16 }} />
                </IconButton>
            </Tooltip>
            <Tooltip title="Sortie sur ce lot">
                <IconButton size="small" color="warning" onClick={() => setMode('out')}>
                    <RemoveIcon sx={{ fontSize: 16 }} />
                </IconButton>
            </Tooltip>
        </>
    ) : (
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button size="small" variant="outlined" color="success" startIcon={<AddIcon />} onClick={() => setMode('in')} sx={{ flex: 1 }}>
                Entrée
            </Button>
            <Button size="small" variant="outlined" color="warning" startIcon={<RemoveIcon />} onClick={() => setMode('out')} sx={{ flex: 1 }}>
                Sortie
            </Button>
            <Tooltip title="Déclarer une perte">
                <Button size="small" variant="outlined" color="error" onClick={() => setMode('loss')} sx={{ minWidth: 40, px: 1 }}>
                    <LossIcon fontSize="small" />
                </Button>
            </Tooltip>
        </Stack>
    );

    return (
        <>
            {declencheurs}

            <Dialog open={!!mode} onClose={fermer} maxWidth="xs" fullWidth>
                {cfg && (
                    <>
                        <DialogTitle sx={{ pb: 1 }}>
                            <Typography variant="h6" fontWeight={700}>{cfg.titre}</Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                                {product.name}
                                {batch ? ' — lot ' + (batch.batch_number || batch.lot_number) : ''}
                            </Typography>
                        </DialogTitle>
                        <DialogContent>
                            <Stack spacing={2} sx={{ mt: 0.5 }}>
                                <Alert severity="info" icon={false} sx={{ py: 0.5 }}>
                                    {batch
                                        ? <>Reste sur ce lot : <strong>{batch.quantity_remaining}</strong></>
                                        : <>Stock actuel : <strong>{product.stock_quantity ?? 0}</strong></>}
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

                                {gereParLots && mode !== 'loss' && (
                                    <TextField
                                        select label="Lot concerné" size="small" fullWidth
                                        value={batchId}
                                        onChange={(e) => setBatchId(e.target.value)}
                                        error={lotManquant}
                                        helperText={lotManquant
                                            ? 'Ce produit est géré par lots : choisissez le lot concerné.'
                                            : ' '}
                                    >
                                        {lotsActifs.map((b) => (
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

/** Menu par lot : ouvrir le lot, ou le retirer du stock actif. */
export const BatchRowMenu = ({ batch, onDone }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [anchor, setAnchor] = useState(null);

    const ouvrirLot = async () => {
        setAnchor(null);
        try {
            await api.post('/batches/' + batch.id + '/open/');
            enqueueSnackbar('Lot marqué comme ouvert', { variant: 'success' });
            onDone?.();
        } catch (e) {
            enqueueSnackbar(e.response?.data?.error || 'Échec', { variant: 'error' });
        }
    };

    return (
        <>
            <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)}>
                <MoreIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
                <MenuItem onClick={ouvrirLot} disabled={batch.status === 'opened'}>
                    <OpenIcon fontSize="small" style={{ marginRight: 8 }} />
                    {batch.status === 'opened' ? 'Lot déjà ouvert' : 'Marquer comme ouvert'}
                </MenuItem>
            </Menu>
        </>
    );
};

/** Création d'un lot depuis la fiche produit. */
export const AddBatchDialog = ({ product, open, onClose, onDone, aDesLots }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [form, setForm] = useState({ batch_number: '', quantity: '', expiry_date: '', notes: '' });
    const [saving, setSaving] = useState(false);

    const maj = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const valider = async () => {
        if (!form.batch_number || !form.quantity || !form.expiry_date) {
            enqueueSnackbar('Numéro de lot, quantité et péremption sont requis', { variant: 'warning' });
            return;
        }
        setSaving(true);
        try {
            await productsAPI.createBatch(product.id, {
                batch_number: form.batch_number,
                quantity: parseInt(form.quantity, 10),
                quantity_remaining: parseInt(form.quantity, 10),
                expiry_date: form.expiry_date,
                notes: form.notes,
            });
            enqueueSnackbar('Lot créé et ajouté au stock', { variant: 'success' });
            setForm({ batch_number: '', quantity: '', expiry_date: '', notes: '' });
            onClose();
            onDone?.();
        } catch (e) {
            const d = e.response?.data;
            enqueueSnackbar(d?.error || (d && JSON.stringify(d)) || 'Échec de la création', { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>
                <Typography variant="h6" fontWeight={700}>Nouveau lot</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>{product.name}</Typography>
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 0.5 }}>
                    {!aDesLots && (
                        <Alert severity="warning" sx={{ py: 0.5 }}>
                            Ce produit n&apos;était pas suivi par lots. Sa quantité actuelle
                            ({product.stock_quantity ?? 0}) n&apos;est rattachée à aucun lot :
                            pensez à la répartir pour garder un suivi de péremption fiable.
                        </Alert>
                    )}
                    <TextField label="Numéro de lot" size="small" fullWidth autoFocus
                        value={form.batch_number} onChange={maj('batch_number')} />
                    <TextField label="Quantité reçue" type="number" size="small" fullWidth
                        value={form.quantity} onChange={maj('quantity')} inputProps={{ min: 1 }} />
                    <TextField label="Date de péremption" type="date" size="small" fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={form.expiry_date} onChange={maj('expiry_date')} />
                    <TextField label="Note" size="small" fullWidth multiline rows={2}
                        value={form.notes} onChange={maj('notes')} />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={saving}>Annuler</Button>
                <Button variant="contained" onClick={valider} disabled={saving}
                    startIcon={saving ? <CircularProgress size={16} /> : null}>
                    Créer le lot
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default StockQuickActions;
