// Garde de fonctionnalité : affiche le contenu si le plan inclut la feature,
// sinon un écran d'upsell (réservé Business). Empêche l'accès direct par URL.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { Lock, ArrowForward } from '@mui/icons-material';
import { useModules } from '../../contexts/ModuleContext';

export default function FeatureGate({ feature, title, description, children }) {
  const navigate = useNavigate();
  const { hasFeature, loading } = useModules();

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  }
  if (hasFeature(feature)) return children;

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', textAlign: 'center', py: { xs: 6, md: 10 }, px: 3 }}>
      <Box sx={{
        width: 72, height: 72, mx: 'auto', mb: 2, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
        boxShadow: '0 12px 30px -10px rgba(124,58,237,0.5)',
      }}>
        <Lock sx={{ fontSize: 32 }} />
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
        {title || 'Fonctionnalité Business'}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {description || "Cette fonctionnalité est incluse dans le plan Business. Passez à Business pour y accéder — essai 30 jours offert, sans carte."}
      </Typography>
      <Button
        variant="contained" size="large" endIcon={<ArrowForward />}
        onClick={() => navigate('/subscription/plans')}
        sx={{ fontWeight: 700, textTransform: 'none', px: 4, py: 1.2 }}
      >
        Découvrir Business
      </Button>
    </Box>
  );
}
