import React, { useEffect, useState } from 'react';
import {
  Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography,
  Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Box,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useTranslation, Trans } from 'react-i18next';
import accountingAPI from '../../services/accountingAPI';

// Référentiels décrits dans la boîte de dialogue (accounting:chartStandard.about.<référentiel>)
const STANDARDS_ABOUT = ['syscohada', 'pcg', 'skr03', 'us_gaap', 'ca'];

/**
 * Propose de passer au plan comptable du pays de l'organisation (SYSCOHADA, PCG, SKR03…).
 * Affichée seulement si le pays est connu et que le plan actuel est différent.
 * Le passage recode les comptes : les écritures existantes restent attachées aux mêmes comptes.
 */
export default function ChartStandardBanner({ onChanged }) {
  const [info, setInfo] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation(['accounting', 'common']);

  useEffect(() => {
    accountingAPI.getChartStandard().then((r) => setInfo(r.data)).catch(() => setInfo(null));
  }, []);

  if (!info?.switch_available) return null;
  const preview = info.preview || { renames: [], moves: [] };

  const apply = async () => {
    setSaving(true);
    try {
      const r = await accountingAPI.switchChartStandard(info.country_standard);
      enqueueSnackbar(t('accounting:banner.installed', { standard: info.country_standard_label, count: r.data.renamed }), { variant: 'success' });
      setInfo(r.data);
      setOpen(false);
      onChanged?.();
    } catch (e) {
      enqueueSnackbar(e.response?.data?.error || t('accounting:banner.switchError'), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Alert
        severity="warning"
        sx={{ mb: 3, borderRadius: 2 }}
        action={<Button color="inherit" size="small" onClick={() => setOpen(true)}>{t('accounting:banner.viewChange')}</Button>}
      >
        <Trans
          i18nKey="accounting:banner.message"
          values={{ country: info.country, standard: info.country_standard_label, current: info.current_label }}
          components={{ strong: <strong /> }}
        />
      </Alert>

      <Dialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('accounting:banner.switchTo', { standard: info.country_standard_label })}</DialogTitle>
        <DialogContent>
          {STANDARDS_ABOUT.includes(info.country_standard) && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              {t(`accounting:chartStandard.about.${info.country_standard}`)}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t('accounting:banner.dialogText')}
          </Typography>
          {preview.renames.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('accounting:banner.currentAccount')}</TableCell>
                  <TableCell>{t('accounting:banner.becomes')}</TableCell>
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
                {t('accounting:banner.moves', { count: preview.moves.length, from: preview.moves[0].from, to: preview.moves[0].to })}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving}>{t('accounting:common.cancel')}</Button>
          <Button variant="contained" onClick={apply} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : null}>
            {t('accounting:banner.switchTo', { standard: info.country_standard_label })}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
