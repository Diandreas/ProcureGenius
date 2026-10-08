import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip, TextField, Stack, Button, Link, CircularProgress, InputAdornment } from '@mui/material';
import { TrendingUp as UpIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import crmAPI from '../../services/crmAPI';
import useCrmDisponible from './useCrmDisponible';

export const INFO_VIDE = { upsold: false, came_for: '', planned_amount: '', note: '' };

const fmt = (n) => `${Math.round(n || 0).toLocaleString('fr-FR')} F`;

/**
 * Un petit espace sur la facture pour ce qui compte au suivi : « il venait pour un bilan à
 * 5 000 F, on l'a convaincu d'en prendre un plus complet ».
 *
 * - création de facture : `value` / `onChange` (le parent enregistre après la création) ;
 * - facture existante : `invoiceId` — les modifications s'enregistrent par un bouton.
 * Replié par défaut : un lien discret, pas un champ de plus à remplir.
 */
export default function InvoiceCrmPanel({ invoiceId, value, onChange, total }) {
  const disponible = useCrmDisponible();
  const { enqueueSnackbar } = useSnackbar();
  const [info, setInfo] = useState(INFO_VIDE);
  const [ouvert, setOuvert] = useState(false);
  const [charge, setCharge] = useState(!invoiceId);
  const [envoi, setEnvoi] = useState(false);
  const live = Boolean(invoiceId);
  const courant = live ? info : (value || INFO_VIDE);

  useEffect(() => {
    if (!live || !disponible) return undefined;
    let vivant = true;
    crmAPI.getInvoiceInfo(invoiceId).then((d) => {
      if (!vivant) return;
      setInfo({
        upsold: d.upsold, came_for: d.came_for || '', note: d.note || '',
        planned_amount: d.planned_amount === null || d.planned_amount === undefined ? '' : String(d.planned_amount),
      });
      setOuvert(d.upsold || Boolean(d.came_for) || Boolean(d.note));
      setCharge(true);
    }).catch(() => { if (vivant) setCharge(true); });
    return () => { vivant = false; };
  }, [invoiceId, live, disponible]);

  if (!disponible || !charge) return null;

  const modifier = (patch) => {
    const suivant = { ...courant, ...patch };
    if (live) setInfo(suivant); else onChange?.(suivant);
  };

  const enregistrer = async () => {
    setEnvoi(true);
    try {
      await crmAPI.saveInvoiceInfo(invoiceId, {
        upsold: courant.upsold, came_for: courant.came_for, note: courant.note,
        planned_amount: courant.planned_amount === '' ? null : courant.planned_amount,
      });
      enqueueSnackbar('Info de suivi enregistrée', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(e.response?.data?.error || "Impossible d'enregistrer", { variant: 'error' });
    } finally {
      setEnvoi(false);
    }
  };

  const gain = courant.planned_amount !== '' && total ? Number(total) - Number(courant.planned_amount) : null;

  if (!ouvert) {
    return (
      <Typography variant="caption" color="text.secondary">
        <Link component="button" type="button" underline="always" onClick={() => setOuvert(true)}>
          + Info de suivi (venu pour…, montée en gamme)
        </Link>
      </Typography>
    );
  }

  return (
    <Box sx={{ p: 1.25, border: '1px dashed', borderColor: 'divider', borderRadius: 1.5 }}>
      <Typography variant="caption" color="text.secondary">
        Info de suivi <span style={{ opacity: 0.7 }}>(facultatif)</span>
      </Typography>
      <Stack spacing={1.25} mt={0.75}>
        <Box>
          <Chip
            clickable icon={<UpIcon />} label="Il a pris plus que prévu" onClick={() => modifier({ upsold: !courant.upsold })}
            color={courant.upsold ? 'success' : 'default'} variant={courant.upsold ? 'filled' : 'outlined'}
            sx={{ height: 36, fontWeight: courant.upsold ? 700 : 400 }}
          />
        </Box>
        {(courant.upsold || courant.came_for) && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <TextField
              size="small" fullWidth label="Il venait pour" value={courant.came_for} placeholder="ex. bilan simple"
              inputProps={{ maxLength: 200 }} onChange={(e) => modifier({ came_for: e.target.value })}
            />
            <TextField
              size="small" label="Prix prévu au départ" value={courant.planned_amount} type="number" sx={{ minWidth: 190 }}
              inputProps={{ min: 0, inputMode: 'numeric' }}
              InputProps={{ endAdornment: <InputAdornment position="end">F</InputAdornment> }}
              onChange={(e) => modifier({ planned_amount: e.target.value })}
            />
          </Stack>
        )}
        {gain !== null && courant.upsold && (
          <Typography variant="caption" color={gain > 0 ? 'success.main' : 'text.secondary'}>
            {gain > 0 ? `Gain : ${fmt(gain)} de plus que prévu` : 'Pas de gain par rapport au prix prévu'}
          </Typography>
        )}
        <TextField
          size="small" fullWidth label="Remarque" value={courant.note} inputProps={{ maxLength: 300 }}
          placeholder="Ce qui l'a convaincu, ce qu'il a demandé…" onChange={(e) => modifier({ note: e.target.value })}
        />
        {live && (
          <Box>
            <Button size="small" variant="contained" onClick={enregistrer} disabled={envoi}
              startIcon={envoi ? <CircularProgress size={14} /> : null}>
              Enregistrer
            </Button>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
