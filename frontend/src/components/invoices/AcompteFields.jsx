import React from 'react';
import {
  Box, FormControlLabel, Switch, TextField, MenuItem, Typography, Stack,
} from '@mui/material';

export const ACOMPTE_VIDE = {
  actif: false,
  montant: '',
  date: new Date().toISOString().slice(0, 10),
  mode: 'cash',
};

const MODES = [
  { value: 'cash', label: 'Espèces' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
  { value: 'check', label: 'Chèque' },
  { value: 'other', label: 'Autre' },
];

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));

/**
 * Acompte versé à la création d'une facture patient : montant, date réelle du versement, mode.
 * La facture est alors créée « à régler » et l'acompte enregistré comme premier paiement ;
 * le reste s'encaisse plus tard depuis la facture (bouton « Encaisser »).
 */
export default function AcompteFields({ value, onChange, total, devise = 'XAF' }) {
  const v = value || ACOMPTE_VIDE;
  const maj = (champ, val) => onChange({ ...v, [champ]: val });
  const montant = parseFloat(v.montant) || 0;
  const reste = Math.max((total || 0) - montant, 0);
  const trop = montant > 0 && montant >= (total || 0);

  return (
    <Box>
      <FormControlLabel
        control={<Switch checked={v.actif} onChange={(e) => maj('actif', e.target.checked)} />}
        label="Le patient verse un acompte"
      />
      {v.actif && (
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <TextField
            fullWidth size="small" type="number" label="Montant de l'acompte"
            value={v.montant} onChange={(e) => maj('montant', e.target.value)}
            inputProps={{ min: 0 }}
            error={trop}
            helperText={trop
              ? "Ce montant couvre toute la facture : désactivez l'acompte, la facture sera payée."
              : montant > 0 ? `Reste à payer : ${fmt(reste)} ${devise}` : 'La facture restera « à régler » pour le reste.'}
          />
          <TextField
            fullWidth size="small" type="date" label="Date du versement"
            value={v.date} onChange={(e) => maj('date', e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: new Date().toISOString().slice(0, 10) }}
          />
          <TextField
            select fullWidth size="small" label="Mode de paiement de l'acompte"
            value={v.mode} onChange={(e) => maj('mode', e.target.value)}
          >
            {MODES.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </TextField>
          <Typography variant="caption" color="text.secondary">
            L'acompte et sa date figurent sur la facture et le reçu imprimés.
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
