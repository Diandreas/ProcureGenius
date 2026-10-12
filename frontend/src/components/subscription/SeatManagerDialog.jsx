// Dialog de gestion des sièges supplémentaires (prix lu dans Stripe, proratisé).
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
import { useTranslation, Trans } from 'react-i18next';
import subscriptionAPI from '../../services/subscriptionAPI';
import usePlansTarifs from '../../hooks/usePlansTarifs';
import { formatPriceCurrency } from '../../utils/visitorCurrency';



export default function SeatManagerDialog({ open, onClose, status, onUpdated }) {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation(['subscription', 'common']);
  const included = status?.included_users ?? 1;
  const activeUsers = status?.active_users ?? 0;
  const currentExtra = status?.extra_seats ?? 0;
  const planCode = status?.plan_code || status?.subscription?.plan?.code || 'free';
  const isPaid = planCode !== 'free' && Boolean(status?.subscription);

  // Plancher : on ne peut pas descendre sous le nombre de sièges déjà occupés.
  const minExtra = Math.max(0, activeUsers - included);
  const [extra, setExtra] = useState(Math.max(currentExtra, minExtra));
  const [saving, setSaving] = useState(false);
  // Prix d'un siège lu dans Stripe (via le serveur), dans la devise de facturation.
  const { siege } = usePlansTarifs();
  const SEAT_PRICE = siege.prix || 0;
  const prixSiege = (n) => formatPriceCurrency(n, siege.devise);

  const totalSeats = included + extra;
  const monthlyCost = extra * SEAT_PRICE;

  const confirm = async () => {
    setSaving(true);
    try {
      const res = await subscriptionAPI.manageSeats(extra);
      enqueueSnackbar(t('subscription:seats.updated', { total: res.seat_limit }), { variant: 'success' });
      onUpdated?.(res);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.error || t('subscription:seats.updateError');
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Person color="primary" /> {t('subscription:seats.title')}
      </DialogTitle>

      {!isPaid ? (
        <>
          <DialogContent>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Trans t={t} i18nKey="subscription:seats.paidPlanRequired" values={{ price: prixSiege(SEAT_PRICE) }} components={{ strong: <strong /> }} />
            </Alert>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose}>{t('common:buttons.close')}</Button>
            <Button variant="contained" onClick={() => { onClose(); navigate('/subscription/plans'); }}>
              {t('subscription:seats.viewPlans')}
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              <Trans t={t} i18nKey="subscription:seats.intro" count={included} values={{ price: prixSiege(SEAT_PRICE) }} components={{ strong: <strong /> }} />
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
                <Typography variant="caption" color="text.secondary">{t('subscription:seats.extraSeats', { count: extra })}</Typography>
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
                <Typography variant="caption" color="text.secondary">{t('subscription:seats.totalCapacity')}</Typography>
                <Typography sx={{ fontWeight: 700 }}>{t('subscription:seats.totalUsers', { count: totalSeats })}</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">{t('subscription:seats.seatCost')}</Typography>
                <Typography sx={{ fontWeight: 700 }}>{t('subscription:seats.costPerMonth', { price: prixSiege(monthlyCost) })}</Typography>
              </Box>
            </Box>

            {minExtra > 0 && extra <= minExtra && (
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
                {t('subscription:seats.minimum', { min: minExtra })}
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={saving}>{t('common:buttons.cancel')}</Button>
            <Button
              variant="contained" onClick={confirm}
              disabled={saving || extra === currentExtra}
              startIcon={saving ? <CircularProgress size={16} /> : null}
            >
              {saving ? t('subscription:seats.updating') : t('common:buttons.confirm')}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
