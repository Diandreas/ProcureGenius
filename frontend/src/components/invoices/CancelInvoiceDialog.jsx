import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Alert,
    CircularProgress,
    Typography,
    Box,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import {
    Warning as WarningIcon,
    CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';

const CancelInvoiceDialog = ({ open, invoice, onClose, onSuccess }) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    const handleCancel = async () => {
        if (!reason.trim()) {
            enqueueSnackbar('La raison d\'annulation est requise', { variant: 'error' });
            return;
        }

        setLoading(true);
        try {
            const response = await api.post(
                `/invoices/${invoice.id}/cancel_with_credit_note/`,
                {
                    reason: reason.trim(),
                    force_cancel: invoice.status === 'paid'
                }
            );

            enqueueSnackbar('Facture annulée avec succès', { variant: 'success' });
            if (onSuccess) {
                onSuccess(response.data);
            }
            handleClose();
        } catch (error) {
            console.error('Error cancelling invoice:', error);
            const errorMessage = error.response?.data?.error || 'Erreur lors de l\'annulation de la facture';
            enqueueSnackbar(errorMessage, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setReason('');
            onClose();
        }
    };

    if (!invoice) return null;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon color="error" />
                    <Typography variant="h6" fontWeight={700}>
                        Annuler la Facture {invoice.invoice_number}
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent>
                <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        Attention : Cette action va :
                    </Typography>
                    <List dense>
                        <ListItem sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                                <CheckIcon fontSize="small" color="warning" />
                            </ListItemIcon>
                            <ListItemText
                                primary="Marquer la facture comme annulée"
                                primaryTypographyProps={{ variant: 'body2' }}
                            />
                        </ListItem>
                        <ListItem sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                                <CheckIcon fontSize="small" color="warning" />
                            </ListItemIcon>
                            <ListItemText
                                primary="Générer un avoir (note de crédit) avec des montants négatifs"
                                primaryTypographyProps={{ variant: 'body2' }}
                            />
                        </ListItem>
                        <ListItem sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                                <CheckIcon fontSize="small" color="warning" />
                            </ListItemIcon>
                            <ListItemText
                                primary="Créer un journal d'audit de l'annulation"
                                primaryTypographyProps={{ variant: 'body2' }}
                            />
                        </ListItem>
                    </List>
                </Alert>

                {invoice.status === 'paid' && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                        <Typography variant="body2">
                            <strong>Cette facture est déjà payée.</strong> L'annulation créera un avoir mais ne remboursera pas automatiquement le client.
                            Vous devrez gérer le remboursement séparément.
                        </Typography>
                    </Alert>
                )}

                <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Raison d'Annulation *"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Expliquez pourquoi cette facture est annulée (ex: facture en double, erreur de montant, demande du client, etc.)"
                    required
                    error={!reason.trim() && reason.length > 0}
                    helperText={!reason.trim() && reason.length > 0 ? 'La raison est requise' : ''}
                    disabled={loading}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                        }
                    }}
                />

                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Détails de la facture :
                    </Typography>
                    <Typography variant="body2">
                        <strong>Numéro :</strong> {invoice.invoice_number}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Client :</strong> {invoice.client_name || 'N/A'}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Montant :</strong> {invoice.total_amount} {invoice.currency || 'CAD'}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Statut :</strong> {invoice.status}
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                <Button
                    onClick={handleClose}
                    disabled={loading}
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                >
                    Annuler
                </Button>
                <Button
                    onClick={handleCancel}
                    variant="contained"
                    color="error"
                    disabled={loading || !reason.trim()}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <WarningIcon />}
                    sx={{ borderRadius: 2 }}
                >
                    {loading ? 'Annulation...' : 'Confirmer l\'Annulation'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CancelInvoiceDialog;
