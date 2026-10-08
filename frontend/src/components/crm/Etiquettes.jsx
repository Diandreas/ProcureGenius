import React from 'react';
import { Chip, Stack } from '@mui/material';

// Les étiquettes automatiques d'un patient (Nouveau, Fidèle, Dormant, Famille…) : déduites des
// données par le serveur, aucune saisie. `max` limite le nombre affiché dans les listes.
export default function Etiquettes({ tags = [], max }) {
  const liste = max ? tags.slice(0, max) : tags;
  if (!liste.length) return null;
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      {liste.map((t) => (
        <Chip key={t.code} size="small" label={t.label} color={t.color === 'default' ? 'default' : t.color}
          variant={t.color === 'default' ? 'outlined' : 'filled'} sx={{ height: 20, fontSize: '0.68rem' }} />
      ))}
    </Stack>
  );
}
