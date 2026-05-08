import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Grid, Chip, IconButton, Divider,
  Alert, CircularProgress, Card, CardContent, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  useTheme, alpha,
} from '@mui/material';
import {
  Add, Cancel, ContentCopy, CheckCircle, AccessTime, Block,
} from '@mui/icons-material';
import api from '../../services/api';

const BASE = '/documents/coupons/';

const STATUS_COLORS = {
  active: 'success',
  used: 'default',
  expired: 'warning',
  cancelled: 'error',
};
const STATUS_LABELS = {
  active: 'Actif',
  used: 'Utilisé',
  expired: 'Expiré',
  cancelled: 'Annulé',
};

function CouponCode({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <Box
      onClick={copy}
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.5,
        fontFamily: 'monospace', fontSize: { xs: '1.4rem', sm: '1.6rem' },
        fontWeight: 900, letterSpacing: '0.12em',
        color: '#1e3a8a', bgcolor: '#eff6ff',
        border: '2px dashed #93c5fd', borderRadius: 2,
        px: 1.5, py: 0.5, cursor: 'pointer',
        userSelect: 'all',
        transition: 'background .15s',
        '&:active': { bgcolor: '#dbeafe' },
      }}
    >
      {code}
      <Tooltip title={copied ? 'Copié !' : 'Copier'}>
        {copied
          ? <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
          : <ContentCopy sx={{ fontSize: 14, color: 'text.disabled' }} />}
      </Tooltip>
    </Box>
  );
}

function CreateDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    label: '', discount_type: 'percent', discount_value: '',
    max_uses: 1, expires_days: '', min_amount: '', max_discount_amount: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.discount_value) { setError('La valeur de remise est requise.'); return; }
    setLoading(true); setError('');
    try {
      const payload = {
        label: form.label,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        max_uses: parseInt(form.max_uses) || 1,
        min_amount: parseFloat(form.min_amount) || 0,
        max_discount_amount: form.max_discount_amount ? parseFloat(form.max_discount_amount) : null,
      };
      if (form.expires_days) {
        const d = new Date();
        d.setDate(d.getDate() + parseInt(form.expires_days));
        payload.expires_at = d.toISOString();
      }
      const res = await api.post(BASE, payload);
      onCreated(res.data);
      onClose();
      setForm({ label: '', discount_type: 'percent', discount_value: '', max_uses: 1, expires_days: '', min_amount: '', max_discount_amount: '' });
    } catch (e) {
      setError(e.response?.data?.detail || JSON.stringify(e.response?.data) || 'Erreur lors de la création.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>🎟 Nouveau coupon</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth label="Libellé (optionnel)"
              placeholder="Ex : Offre Fête des Mères, Fidélité…"
              value={form.label} onChange={e => set('label', e.target.value)} />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Type de remise</InputLabel>
              <Select value={form.discount_type} label="Type de remise"
                onChange={e => set('discount_type', e.target.value)}>
                <MenuItem value="percent">Pourcentage (%)</MenuItem>
                <MenuItem value="fixed">Montant fixe (FCFA)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth required label={form.discount_type === 'percent' ? 'Valeur (%)' : 'Valeur (FCFA)'}
              type="number" inputProps={{ min: 0, step: form.discount_type === 'percent' ? 1 : 100 }}
              placeholder={form.discount_type === 'percent' ? 'Ex: 10' : 'Ex: 5000'}
              value={form.discount_value} onChange={e => set('discount_value', e.target.value)} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="Nb d'utilisations max" type="number"
              inputProps={{ min: 1, max: 9999 }}
              value={form.max_uses} onChange={e => set('max_uses', e.target.value)} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="Expire dans (jours)" type="number"
              inputProps={{ min: 1 }} placeholder="Vide = jamais"
              value={form.expires_days} onChange={e => set('expires_days', e.target.value)} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="Montant minimum (FCFA)" type="number"
              inputProps={{ min: 0, step: 100 }} placeholder="0 = aucun minimum"
              value={form.min_amount} onChange={e => set('min_amount', e.target.value)} />
          </Grid>
          {form.discount_type === 'percent' && (
            <Grid item xs={6}>
              <TextField fullWidth label="Remise max (FCFA)" type="number"
                inputProps={{ min: 0, step: 100 }} placeholder="Vide = illimité"
                value={form.max_discount_amount} onChange={e => set('max_discount_amount', e.target.value)} />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit">Annuler</Button>
        <Button onClick={submit} variant="contained" disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <Add />}
          sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}>
          Générer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CouponCard({ coupon, onCancel }) {
  const theme = useTheme();
  const isActive = coupon.status === 'active';

  return (
    <Card variant="outlined" sx={{
      borderRadius: 3,
      opacity: isActive ? 1 : 0.65,
      border: isActive ? `1.5px solid ${alpha(theme.palette.success.main, 0.4)}` : undefined,
      transition: 'box-shadow .2s',
      '&:hover': isActive ? { boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.12)}` } : {},
    }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1} flexWrap="wrap">
          <CouponCode code={coupon.code} />
          <Chip
            size="small"
            label={STATUS_LABELS[coupon.status] || coupon.status}
            color={STATUS_COLORS[coupon.status] || 'default'}
            sx={{ fontWeight: 700, borderRadius: 1.5 }}
          />
        </Box>

        {coupon.label && (
          <Typography variant="body2" fontWeight={600} mt={1}>{coupon.label}</Typography>
        )}

        <Box display="flex" flexWrap="wrap" gap={0.75} mt={1}>
          <Chip size="small" variant="outlined" color="primary"
            label={coupon.discount_type === 'percent'
              ? `${coupon.discount_value}% de remise`
              : `${parseInt(coupon.discount_value).toLocaleString('fr-FR')} FCFA`}
          />
          <Chip size="small" variant="outlined"
            label={`${coupon.uses_count}/${coupon.max_uses} utilisations`}
            color={coupon.uses_count >= coupon.max_uses ? 'error' : 'default'}
          />
          {coupon.min_amount > 0 && (
            <Chip size="small" variant="outlined"
              label={`Min ${parseInt(coupon.min_amount).toLocaleString('fr-FR')} FCFA`} />
          )}
          {coupon.expires_at && (
            <Chip size="small" variant="outlined" icon={<AccessTime sx={{ fontSize: '14px !important' }} />}
              label={`Expire le ${new Date(coupon.expires_at).toLocaleDateString('fr-FR')}`}
              color={new Date(coupon.expires_at) < new Date() ? 'warning' : 'default'}
            />
          )}
        </Box>

        {isActive && (
          <Box mt={1.5} display="flex" justifyContent="flex-end">
            <Button size="small" color="error" startIcon={<Cancel />}
              onClick={() => onCancel(coupon)}
              sx={{ borderRadius: 2, fontSize: '0.75rem' }}>
              Annuler
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default function CouponManager() {
  const theme = useTheme();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(BASE);
      setCoupons(res.data?.results ?? res.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (coupon) => {
    setSuccessMsg(`Coupon créé : ${coupon.code}`);
    load();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleCancel = async (coupon) => {
    if (!window.confirm(`Annuler le coupon ${coupon.code} ?`)) return;
    try {
      await api.post(`${BASE}${coupon.id}/cancel/`);
      load();
    } catch (e) {
      alert('Erreur lors de l\'annulation.');
    }
  };

  const active = coupons.filter(c => c.status === 'active');
  const history = coupons.filter(c => c.status !== 'active');

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em">
            🎟 Coupons de réduction
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Générez des codes à remettre aux patientes
          </Typography>
        </Box>
        <Button
          variant="contained" startIcon={<Add />}
          onClick={() => setCreateOpen(true)}
          sx={{
            borderRadius: 2.5, fontWeight: 700, px: 3, py: 1.2,
            background: `linear-gradient(135deg, #0d9488, #0f766e)`,
            boxShadow: `0 4px 14px ${alpha('#0d9488', 0.35)}`,
            '&:hover': { background: `linear-gradient(135deg, #0f766e, #115e59)` },
          }}
        >
          Nouveau coupon
        </Button>
      </Box>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}
          icon={<CheckCircle />}>
          {successMsg}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Actifs */}
          <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing="0.08em">
            Coupons actifs ({active.length})
          </Typography>
          {active.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3, my: 1 }}>
              <Typography fontSize="2.5rem">🎟</Typography>
              <Typography color="text.secondary" mt={1}>Aucun coupon actif</Typography>
              <Button variant="outlined" startIcon={<Add />} sx={{ mt: 2, borderRadius: 2 }}
                onClick={() => setCreateOpen(true)}>
                Créer un coupon
              </Button>
            </Paper>
          ) : (
            <Box display="flex" flexDirection="column" gap={1.5} mt={1} mb={3}>
              {active.map(c => <CouponCard key={c.id} coupon={c} onCancel={handleCancel} />)}
            </Box>
          )}

          {/* Historique */}
          {history.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing="0.08em">
                Historique ({history.length})
              </Typography>
              <Box display="flex" flexDirection="column" gap={1.5} mt={1}>
                {history.map(c => <CouponCard key={c.id} coupon={c} onCancel={handleCancel} />)}
              </Box>
            </>
          )}
        </>
      )}

      <CreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </Box>
  );
}
