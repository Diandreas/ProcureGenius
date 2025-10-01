import React from 'react';
import { Box, Button, Grid, Paper, Typography } from '@mui/material';
import {
  AddBusiness,
  Receipt,
  ShoppingCart,
  Search,
  BarChart,
  Assessment,
} from '@mui/icons-material';

const QuickActionsPanel = ({ onActionClick, disabled = false }) => {
  const quickActions = [
    {
      label: 'Créer fournisseur',
      icon: <AddBusiness />,
      prompt: 'Je veux créer un nouveau fournisseur',
      color: 'primary',
    },
    {
      label: 'Rechercher fournisseur',
      icon: <Search />,
      prompt: 'Recherche un fournisseur',
      color: 'info',
    },
    {
      label: 'Créer facture',
      icon: <Receipt />,
      prompt: 'Je veux créer une nouvelle facture',
      color: 'success',
    },
    {
      label: 'Bon de commande',
      icon: <ShoppingCart />,
      prompt: 'Je veux créer un bon de commande',
      color: 'warning',
    },
    {
      label: 'Statistiques',
      icon: <BarChart />,
      prompt: 'Affiche-moi les statistiques',
      color: 'secondary',
    },
    {
      label: 'Rapport mensuel',
      icon: <Assessment />,
      prompt: 'Génère un rapport mensuel',
      color: 'error',
    },
  ];

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 1.5 }}>
        Actions rapides
      </Typography>
      <Grid container spacing={1}>
        {quickActions.map((action, index) => (
          <Grid item xs={6} key={index}>
            <Button
              fullWidth
              variant="outlined"
              color={action.color}
              startIcon={action.icon}
              onClick={() => onActionClick(action.prompt)}
              disabled={disabled}
              sx={{
                justifyContent: 'flex-start',
                py: 1,
                textTransform: 'none',
                fontSize: '0.875rem',
              }}
            >
              {action.label}
            </Button>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default QuickActionsPanel;
