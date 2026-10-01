import React, { useState, useEffect } from 'react';
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel,
  Typography, Box, Stack, Divider, Alert, CircularProgress,
} from '@mui/material';
import { Download as DownloadIcon, MailOutline as MailIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import crmAPI from '../../services/crmAPI';

const moisPrecedent = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Fichier Excel « patients financiers » du mois : par patient, ce qu'il a dépensé à chaque
 * passage et ce qu'il a acheté, avec l'envoi automatique mensuel par e-mail.
 * Réservé aux administrateurs : le bouton n'apparaît pas pour les autres comptes.
 */
export default function MonthlyReportButton({ size = 'small' }) {
  const { enqueueSnackbar } = useSnackbar();
  const [autorise, setAutorise] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [mois, setMois] = useState(moisPrecedent());
  const [plan, setPlan] = useState(null);
  const [telechargement, setTelechargement] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let vivant = true;
    crmAPI.getReportSchedule()
      .then((p) => { if (vivant) { setPlan(p); setAutorise(true); } })
      .catch(() => { if (vivant) setAutorise(false); });
    return () => { vivant = false; };
  }, []);

  if (!autorise || !plan) return null;

  const telecharger = async () => {
    setTelechargement(true);
    try {
      const blob = await crmAPI.downloadFinancialReport(mois);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = `patients-financiers-${mois}.xlsx`;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      enqueueSnackbar('Impossible de générer le fichier', { variant: 'error' });
    } finally {
      setTelechargement(false);
    }
  };

  const enregistrer = async () => {
    setEnregistrement(true);
    setErreur('');
    try {
      const maj = await crmAPI.saveReportSchedule({
        enabled: plan.enabled, recipients: plan.recipients, day_of_month: plan.day_of_month,
      });
      setPlan(maj);
      enqueueSnackbar(maj.enabled ? 'Envoi mensuel activé' : 'Réglage enregistré', { variant: 'success' });
    } catch (e) {
      setErreur(e.response?.data?.error || "Impossible d'enregistrer");
    } finally {
      setEnregistrement(false);
    }
  };

  return (
    <>
      <Button size={size} variant="outlined" startIcon={<DownloadIcon />} onClick={() => setOuvert(true)}>
        Rapport mensuel
      </Button>
      <Dialog open={ouvert} onClose={() => setOuvert(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Patients financiers — rapport mensuel</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="body2" color="text.secondary" mb={1.5}>
                Pour chaque patient : le montant dépensé à chaque passage et les services ou
                produits achetés (un onglet « par patient », un onglet « par passage »).
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <TextField
                  type="month" size="small" label="Mois" value={mois}
                  onChange={(e) => setMois(e.target.value)} InputLabelProps={{ shrink: true }}
                />
                <Button
                  variant="contained" onClick={telecharger} disabled={telechargement || !mois}
                  startIcon={telechargement ? <CircularProgress size={16} /> : <DownloadIcon />}
                >
                  Télécharger
                </Button>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                <MailIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                Envoi automatique chaque mois par e-mail
              </Typography>
              <FormControlLabel
                control={<Switch checked={!!plan.enabled} onChange={(e) => setPlan({ ...plan, enabled: e.target.checked })} />}
                label={plan.enabled ? 'Activé' : 'Désactivé'}
              />
              <Stack spacing={1.5} mt={1}>
                <TextField
                  size="small" fullWidth label="Destinataires (séparés par une virgule)"
                  value={plan.recipients || ''} onChange={(e) => setPlan({ ...plan, recipients: e.target.value })}
                />
                <TextField
                  size="small" type="number" label="Jour d'envoi du mois" sx={{ width: 200 }}
                  inputProps={{ min: 1, max: 28 }} value={plan.day_of_month}
                  onChange={(e) => setPlan({ ...plan, day_of_month: e.target.value })}
                  helperText="Le fichier du mois écoulé est envoyé ce jour-là."
                />
              </Stack>
              {plan.last_sent_at && (
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                  Dernier envoi : {new Date(plan.last_sent_at).toLocaleDateString('fr-FR')}
                </Typography>
              )}
              {plan.last_error && <Alert severity="warning" sx={{ mt: 1 }}>Dernier envoi échoué : {plan.last_error}</Alert>}
              {erreur && <Typography variant="body2" color="error" mt={1}>{erreur}</Typography>}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOuvert(false)}>Fermer</Button>
          <Button variant="contained" onClick={enregistrer} disabled={enregistrement}>
            Enregistrer l'envoi
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
