import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Table, TableHead, TableBody, TableRow, TableCell, Paper,
  CircularProgress, Stack, LinearProgress, Alert,
} from '@mui/material';
import crmAPI from '../../services/crmAPI';

const moisPrecedent = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const fmt = (n) => `${Math.round(n || 0).toLocaleString('fr-FR')} FCFA`;

function Tableau({ titre, lignes }) {
  const maxPart = Math.max(...lignes.map((l) => l.part), 1);
  return (
    <Paper variant="outlined" sx={{ p: 1.5, overflowX: 'auto' }}>
      <Typography variant="subtitle2" fontWeight={700} mb={1}>{titre}</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell align="right">Patients</TableCell>
            <TableCell align="right">Total payé</TableCell>
            <TableCell sx={{ minWidth: 130 }}>Part du total</TableCell>
            <TableCell align="right">Moyenne / patient</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lignes.map((l) => (
            <TableRow key={l.label}>
              <TableCell>{l.label}</TableCell>
              <TableCell align="right">{l.patients}</TableCell>
              <TableCell align="right">{fmt(l.paye)}</TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <LinearProgress
                    variant="determinate" value={(l.part / maxPart) * 100}
                    sx={{ flex: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" sx={{ minWidth: 38 }}>{l.part} %</Typography>
                </Box>
              </TableCell>
              <TableCell align="right">{fmt(l.moyenne_par_patient)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

/**
 * « Qui dépense ? » : par sexe, par tranche d'âge, et les plus gros dépensiers du mois.
 * Réservé aux administrateurs (montants).
 */
export default function ProfilDepensesPanel() {
  const [mois, setMois] = useState(moisPrecedent());
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let vivant = true;
    setChargement(true);
    setErreur('');
    crmAPI.getSpendingProfile(mois)
      .then((d) => { if (vivant) setDonnees(d); })
      .catch(() => { if (vivant) setErreur('Impossible de charger le profil des dépenses.'); })
      .finally(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
  }, [mois]);

  return (
    <Stack spacing={2}>
      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
        <TextField
          type="month" size="small" label="Mois" value={mois}
          onChange={(e) => e.target.value && setMois(e.target.value)} InputLabelProps={{ shrink: true }}
        />
        {donnees && !chargement && (
          <Typography variant="body2" color="text.secondary">
            {donnees.patients} patients · {fmt(donnees.total_paye)} payés
          </Typography>
        )}
      </Box>

      {chargement && <CircularProgress size={24} />}
      {erreur && <Alert severity="error">{erreur}</Alert>}

      {donnees && !chargement && (donnees.patients === 0 ? (
        <Typography color="text.secondary">Aucune facture ce mois-là.</Typography>
      ) : (
        <>
          <Tableau titre="Hommes et femmes" lignes={donnees.by_gender} />
          <Tableau titre="Par tranche d'âge" lignes={donnees.by_age} />
          <Paper variant="outlined" sx={{ p: 1.5, overflowX: 'auto' }}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>10 plus gros dépensiers</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Patient</TableCell>
                  <TableCell align="right">Âge</TableCell>
                  <TableCell>Sexe</TableCell>
                  <TableCell align="right">Passages</TableCell>
                  <TableCell align="right">Total payé</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {donnees.top.map((p) => (
                  <TableRow key={p.patient_number || p.name}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell align="right">{p.age ?? '—'}</TableCell>
                    <TableCell>{p.gender || '—'}</TableCell>
                    <TableCell align="right">{p.passages}</TableCell>
                    <TableCell align="right">{fmt(p.paye)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      ))}
    </Stack>
  );
}
