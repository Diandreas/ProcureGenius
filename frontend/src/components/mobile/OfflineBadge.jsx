// Petit badge "en attente de synchro" a afficher sur un enregistrement cree ou
// modifie hors-ligne (objet portant _offline). Indique a l'utilisateur que la
// donnee sera envoyee au serveur a la prochaine connexion.

import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { CloudQueue } from '@mui/icons-material';

/**
 * @param {object} record  l'enregistrement (affiche le badge si record._offline)
 * @param {boolean} compact  version icone seule
 */
export default function OfflineBadge({ record, compact = false }) {
  if (!record || !record._offline) return null;

  const label = record._pending === 'update' ? 'Modif. en attente' : 'À synchroniser';

  return (
    <Tooltip title="Sera synchronisé à la prochaine connexion" arrow>
      <Chip
        size="small"
        icon={<CloudQueue sx={{ fontSize: 14 }} />}
        label={compact ? undefined : label}
        sx={{
          height: 22,
          bgcolor: '#fff3cd',
          color: '#8a6d00',
          fontWeight: 600,
          fontSize: '0.65rem',
          border: '1px solid #ffe69c',
          '& .MuiChip-icon': { color: '#b8860b', ml: compact ? 0.5 : undefined },
          '& .MuiChip-label': { px: compact ? 0 : 0.75 },
        }}
      />
    </Tooltip>
  );
}
