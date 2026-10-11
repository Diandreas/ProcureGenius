import React, { useEffect, useState } from 'react';
import {
  Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography,
  Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Box,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import accountingAPI from '../../services/accountingAPI';

/**
 * Propose de passer au plan comptable du pays de l'organisation (SYSCOHADA, PCG…).
 * Affichée seulement si le pays est connu et que le plan actuel est différent.
 * Le passage recode les comptes : les écritures existantes restent attachées aux mêmes comptes.
 */
export default function ChartStandardBanner({ onChanged }) {
  const [info, setInfo] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    accountingAPI.getChartStandard().then((r) => setInfo(r.data)).catch(() => setInfo(null));
  }, []);

  if (!info?.switch_available) return null;
  const preview = info.preview || { renames: [], moves: [] };

  const apply = async () => {
    setSaving(true);
    try {
      const r = await accountingAPI.switchChartStandard(info.country_standard);
      enqueueSnackbar(`Plan ${info.country_standard_label} installé (${r.data.renamed} comptes recodés).`, { variant: 'success' });
      setInfo(r.data);
      setOpen(false);
      onChanged?.();
    } catch (e) {
      enqueueSnackbar(e.response?.data?.error || 'Changement de plan impossible', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Alert
        severity="warning"
        sx={{ mb: 3, borderRadius: 2 }}
        action={<Button color="inherit" size="small" onClick={() => setOpen(true)}>Voir le changement</Button>}
      >
        Votre entreprise est au <strong>{info.country}</strong> : le plan comptable officiel est
        <strong> {info.country_standard_label}</strong>. Vous utilisez encore le {info.current_label}.
      </Alert>

      <Dialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Passer au plan {info.country_standard_label}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Vos comptes sont recodés selon le plan officiel. Les écritures déjà passées restent sur les
            mêmes comptes : l'historique et les soldes ne changent pas. Les comptes manquants du nouveau
            plan sont ajoutés. Rien n'est supprimé.
          </Typography>
          {preview.renames.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Compte actuel</TableCell>
                  <TableCell>Devient</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.renames.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.from} — {r.old_name}</TableCell>
                    <TableCell><strong>{r.to}</strong> — {r.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {preview.moves.length > 0 && (
            <Box mt={2}>
              <Typography variant="caption" color="text.secondary">
                {preview.moves.length} compte(s) de l'ancien plan sont gardés avec le préfixe X
                (ex. {preview.moves[0].from} → {preview.moves[0].to}) car leur numéro est utilisé par le nouveau plan.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
          <Button variant="contained" onClick={apply} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : null}>
            Passer au plan {info.country_standard_label}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
