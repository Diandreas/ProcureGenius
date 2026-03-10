import React from 'react';
import { Box, Tooltip } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { useSyncStatus } from '../hooks/useSyncStatus';

/**
 * Petit voyant fixe en bas à droite.
 * - Gris avec WifiOff  → hors ligne
 * - Bleu animé         → synchronisation en cours
 * - Invisible          → tout est OK
 */
export default function OfflineIndicator() {
  const { isOffline, isSyncing } = useSyncStatus();

  if (!isOffline && !isSyncing) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: '50%',
        bgcolor: isSyncing ? 'primary.main' : 'grey.500',
        boxShadow: 3,
        cursor: 'default',
        '@keyframes spin': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      }}
    >
      <Tooltip
        title={isSyncing ? 'Synchronisation en cours...' : 'Hors ligne — synchronisation automatique dès reconnexion'}
        placement="left"
      >
        <Box
          sx={{
            display: 'flex',
            animation: isSyncing ? 'spin 1.2s linear infinite' : 'none',
          }}
        >
          {isSyncing
            ? <CloudSyncIcon sx={{ color: 'white', fontSize: 20 }} />
            : <WifiOffIcon sx={{ color: 'white', fontSize: 20 }} />
          }
        </Box>
      </Tooltip>
    </Box>
  );
}
