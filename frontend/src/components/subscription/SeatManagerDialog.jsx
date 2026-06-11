// Dialog de gestion des sièges supplémentaires (+5€/siège, proratisé via Stripe).
// - Plan payant : stepper pour choisir le total de sièges supplémentaires.
// - Plan gratuit / sans abonnement payant : invite à passer à un plan payant.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  IconButton, CircularProgress, Alert,
} from '@mui/material';
import { Add, Remove, Person } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import subscriptionAPI from '../../services/subscriptionAPI';

const SEAT_PRICE = 5; // €/mois par siège supplémentaire

export default function SeatManagerDialog({ open, onClose, status, onUpdated }) {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const included = status?.included_users ?? 1;
  const activeUsers = status?.active_users ?? 0;
  const currentExtra = status?.extra_seats ?? 0;
  const planCode = status?.plan_code || status?.subscription?.plan?.code || 'free';
  const isPaid = planCode !== 'free' && Boolean(status?.subscription);

  // Plancher : on ne peut pas descendre sous le nombre de sièges déjà occupés.
  const minExtra = Math.max(0, activeUsers - included);
  const [extra, setExtra] = useState(Math.max(currentExtra, minExtra));
  const [saving, setSaving] = useState(false);

  const totalSeats = included + extra;
  const monthlyCost = extra * SEAT_PRICE;

  const confirm = async () => {
    setSaving(true);
    try {
      const res = await subscriptionAPI.manageSeats(extra);
      enqueueSnackbar(`Sièges mis à jour : ${res.seat_limit} au total.`, { variant: 'success' });
      onUpdated?.(res);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.error || 'Impossible de mettre à jour les sièges.';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Person color="primary" /> Gérer les sièges
      </DialogTitle>

      {!isPaid ? (
        <>
          <DialogContent>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              L'ajout de sièges nécessite un plan payant. Passez à <strong>Pro</strong> ou
              <strong> Business</strong> pour inviter votre équipe (puis ajoutez des sièges à 5€/utilisateur).
            </Alert>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose}>Fermer</Button>
            <Button variant="contained" onClick={() => { onClose(); navigate('/subscription/plans'); }}>
              Voir les formules
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Votre formule inclut <strong>{included}</strong> utilisateur(s). Ajoutez des sièges
              supplémentaires à <strong>{SEAT_PRICE}€/mois</strong> chacun (facturation proratisée).
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, my: 2 }}>
              <IconButton
                onClick={() => setExtra((v) => Math.max(minExtra, v - 1))}
                disabled={extra <= minExtra}
                sx={{ border: '1px solid', borderColor: 'divider' }}
              >
                <Remove />
              </IconButton>
              <Box sx={{ textAlign: 'center', minWidth: 90 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '2rem', lineHeight: 1 }}>{extra}</Typography>
                <Typography variant="caption" color="text.secondary">siège(s) en plus</Typography>
              </Box>
              <IconButton
                onClick={() => setExtra((v) => v + 1)}
                sx={{ border: '1px solid', borderColor: 'divider' }}
              >
                <Add />
              </IconButton>
            </Box>

            <Box sx={{ p: 1.75, borderRadius: 2, bgcolor: 'action.hover', display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Capacité totale</Typography>
                <Typography sx={{ fontWeight: 700 }}>{totalSeats} utilisateurs</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">Coût des sièges</Typography>
                <Typography sx={{ fontWeight: 700 }}>+{monthlyCost}€/mois</Typography>
              </Box>
            </Box>

            {minExtra > 0 && extra <= minExtra && (
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
                Minimum {minExtra} (sièges déjà occupés). Désactivez des utilisateurs pour réduire.
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={saving}>Annuler</Button>
            <Button
              variant="contained" onClick={confirm}
              disabled={saving || extra === currentExtra}
              startIcon={saving ? <CircularProgress size={16} /> : null}
            >
              {saving ? 'Mise à jour…' : 'Confirmer'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
