import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Chip, Paper, Table, TableHead, TableBody, TableRow, TableCell, CircularProgress, Alert,
  Stack, LinearProgress, ToggleButton, ToggleButtonGroup, FormControlLabel, Switch, TextField, MenuItem,
} from '@mui/material';
import crmAPI from '../../services/crmAPI';

/**
 * Parcours patients : l'ordre des factures (tous modules) montre ce qui suit quoi —
 * consultation -> bilan tropical -> soins... — pour repérer ce qui marche et le reproduire.
 */
function Carte({ titre, aide, children }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
      <Typography variant="subtitle1" fontWeight={700}>{titre}</Typography>
      {aide && <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>{aide}</Typography>}
      {children}
    </Paper>
  );
}

const jours = (n) => (n === null || n === undefined ? '—' : n === 0 ? 'le jour même' : `${n} j`);

export default function ParcoursPanel({ periode }) {
  const [niveau, setNiveau] = useState('service');
  const [pharmacie, setPharmacie] = useState(false);
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [depart, setDepart] = useState('');

  useEffect(() => {
    let vivant = true;
    setChargement(true);
    setErreur('');
    crmAPI.getJourney({ ...periode, level: niveau, pharmacy: pharmacie ? '1' : '0' })
      .then((d) => { if (vivant) { setDonnees(d); setDepart(''); } })
      .catch(() => { if (vivant) setErreur('Impossible de charger les parcours.'); })
      .finally(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
  }, [periode, niveau, pharmacie]);

  const depuis = depart || donnees?.steps?.[0] || '';
  const suites = useMemo(
    () => (donnees?.transitions || []).filter((t) => t.from === depuis).slice(0, 10),
    [donnees, depuis],
  );

  return (
    <Stack spacing={2}>
      <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
        <ToggleButtonGroup size="small" exclusive value={niveau} onChange={(_, v) => v && setNiveau(v)}>
          <ToggleButton value="service">Par service</ToggleButton>
          <ToggleButton value="acte">Par acte (bilan, examen, soin…)</ToggleButton>
        </ToggleButtonGroup>
        <FormControlLabel
          control={<Switch size="small" checked={pharmacie} onChange={(e) => setPharmacie(e.target.checked)} />}
          label={<Typography variant="body2">Inclure la pharmacie</Typography>}
        />
      </Box>

      {chargement && <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}
      {erreur && <Alert severity="error">{erreur}</Alert>}
      {!chargement && !erreur && donnees && (
        <>
          <Typography variant="body2" color="text.secondary">
            {donnees.active_patients} patients venus sur la période, dont {donnees.patients_with_next_step} avec
            au moins un enchaînement. Chaque facture est une étape, quel que soit le module (consultation,
            laboratoire, imagerie, soins, maternité, vaccination{pharmacie ? ', pharmacie' : ''}).
          </Typography>

          <Carte titre="Enchaînements les plus fréquents"
            aide="« Part » = parmi les patients qui ont fait l'étape de départ puis autre chose, combien ont fait celle-ci juste après.">
            {donnees.transitions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Pas encore assez de passages sur cette période.</Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Après…</TableCell>
                      <TableCell>… vient</TableCell>
                      <TableCell align="right">Patients</TableCell>
                      <TableCell align="right">Part</TableCell>
                      <TableCell align="right">Délai médian</TableCell>
                      <TableCell align="right">Le jour même</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {donnees.transitions.slice(0, 15).map((t) => (
                      <TableRow key={`${t.from}>${t.to}`} hover>
                        <TableCell sx={{ maxWidth: 240 }}>{t.from}</TableCell>
                        <TableCell sx={{ maxWidth: 240, fontWeight: 600 }}>{t.to}</TableCell>
                        <TableCell align="right">{t.patients}</TableCell>
                        <TableCell align="right">{t.share} %</TableCell>
                        <TableCell align="right">{jours(t.median_days)}</TableCell>
                        <TableCell align="right">{t.same_day_pct} %</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Carte>

          {donnees.steps.length > 0 && (
            <Carte titre="Que font-ils ensuite ?" aide="Choisissez une étape : ce que les patients ont fait juste après.">
              <TextField select size="small" value={depuis} onChange={(e) => setDepart(e.target.value)}
                sx={{ minWidth: 280, mb: 1.5, maxWidth: '100%' }}>
                {donnees.steps.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <Stack spacing={1}>
                {suites.map((t) => (
                  <Box key={t.to}>
                    <Box display="flex" justifyContent="space-between" gap={1}>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ minWidth: 0 }}>{t.to}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                        {t.share} % · {t.patients} pat. · {jours(t.median_days)}
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={Math.min(100, t.share || 0)} sx={{ height: 8, borderRadius: 4 }} />
                  </Box>
                ))}
              </Stack>
            </Carte>
          )}

          <Carte titre="Parcours types (3 étapes à la suite)"
            aide="Les enchaînements complets qui se répètent : ce sont eux qu'on peut chercher à reproduire.">
            {donnees.paths.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Aucun parcours répété sur cette période.</Typography>
            ) : (
              <Stack spacing={1}>
                {donnees.paths.slice(0, 12).map((c) => (
                  <Box key={c.steps.join('>')} display="flex" gap={0.75} alignItems="center" flexWrap="wrap">
                    {c.steps.map((s, i) => (
                      <React.Fragment key={`${s}-${i}`}>
                        {i > 0 && <Typography color="text.secondary">→</Typography>}
                        <Chip size="small" label={s} variant={i === 0 ? 'filled' : 'outlined'} />
                      </React.Fragment>
                    ))}
                    <Typography variant="caption" color="text.secondary">· {c.patients} patients</Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Carte>

          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2}>
            <Carte titre="Porte d'entrée" aide="Première étape des nouveaux patients de la période.">
              <Stack spacing={0.75}>
                {donnees.entries.map((e) => (
                  <Box key={e.step} display="flex" justifyContent="space-between" gap={1}>
                    <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>{e.step}</Typography>
                    <Typography variant="body2" fontWeight={600}>{e.patients}</Typography>
                  </Box>
                ))}
              </Stack>
            </Carte>
            <Carte titre="Revient ensuite ?"
              aide="Après cette étape (il y a au moins 30 jours), part des patients revenus un autre jour.">
              <Stack spacing={1}>
                {donnees.comes_back.slice(0, 10).map((r) => (
                  <Box key={r.step}>
                    <Box display="flex" justifyContent="space-between" gap={1}>
                      <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>{r.step}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                        {r.rate} % · {r.came_back}/{r.patients}
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={Math.min(100, r.rate)} color="success"
                      sx={{ height: 8, borderRadius: 4 }} />
                  </Box>
                ))}
              </Stack>
            </Carte>
          </Box>
        </>
      )}
    </Stack>
  );
}
