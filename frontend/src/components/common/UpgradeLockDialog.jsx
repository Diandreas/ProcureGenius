// Modale d'incitation : s'affiche quand l'utilisateur clique sur un module
// verrouille (non inclus dans son plan). Propose de passer a un plan superieur.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent, DialogActions, Button, Box, Typography,
} from '@mui/material';
import { Lock, ArrowForward } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export default function UpgradeLockDialog({ open, moduleName, onClose }) {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <Box sx={{
        p: 3, textAlign: 'center',
        bgcolor: '#2563eb', color: '#fff',
      }}>
        <Box sx={{
          width: 56, height: 56, mx: 'auto', mb: 1.5, borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Lock sx={{ fontSize: 28 }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {moduleName ? t('common:upgradeLock.unlockModule', { moduleName }) : t('common:upgradeLock.premiumFeature')}
        </Typography>
      </Box>
      <DialogContent sx={{ textAlign: 'center', py: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {t('common:upgradeLock.description')}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, flexDirection: 'column', gap: 1 }}>
        <Button
          fullWidth variant="contained" size="large" endIcon={<ArrowForward />}
          onClick={() => { onClose?.(); navigate('/subscription/plans'); }}
          sx={{ fontWeight: 700, textTransform: 'none', py: 1.2 }}
        >
          {t('common:upgradeLock.seePlans')}
        </Button>
        <Button fullWidth onClick={onClose} sx={{ color: 'text.secondary', textTransform: 'none' }}>
          {t('common:upgradeLock.later')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
