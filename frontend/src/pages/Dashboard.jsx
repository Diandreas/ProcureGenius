import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ShoppingCart,
  AttachMoney,
  People,
  Science,
  ArrowForward
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import useCurrency from '../hooks/useCurrency';

function Dashboard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { format: formatCurrency } = useCurrency();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const navigationCards = [
    {
      title: "Laboratoire",
      icon: <Science fontSize="large" />,
      color: '#3B82F6', // Blue
      path: '/healthcare/laboratory/stats',
    },
    {
      title: "Pharmacie",
      icon: <ShoppingCart fontSize="large" />,
      color: '#10B981', // Green
      path: '/healthcare/pharmacy/stats',
    },
    {
      title: "Consultations",
      icon: <People fontSize="large" />,
      color: '#8B5CF6', // Purple
      path: '/healthcare/consultations/stats',
    },
    {
      title: "Facturation",
      icon: <AttachMoney fontSize="large" />,
      color: '#F59E0B', // Amber
      path: '/invoices/stats',
    }
  ];

  return (
    <Box p={isMobile ? 2 : 4}>
      <Typography variant="h4" sx={{ mb: 6, fontWeight: 'bold', color: 'text.primary' }}>
        Tableau de Bord
      </Typography>

      <Grid container spacing={4}>
        {navigationCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                height: '100%',
                borderRadius: 4,
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                border: '1px solid',
                borderColor: 'transparent',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'visible',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.1)',
                  borderColor: card.color
                }
              }}
              onClick={() => window.location.href = card.path}
            >
              <CardContent sx={{
                p: 4,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}>
                <Avatar
                  sx={{
                    bgcolor: `${card.color}10`, // Very light background
                    color: card.color,
                    width: 80,
                    height: 80,
                    mb: 3,
                    boxShadow: `0 8px 16px ${card.color}20`
                  }}
                >
                  {card.icon}
                </Avatar>

                <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
                  {card.title}
                </Typography>

                <Box sx={{
                  mt: 2,
                  display: 'flex',
                  alignItems: 'center',
                  color: card.color,
                  opacity: 0,
                  transform: 'translateY(10px)',
                  transition: 'all 0.3s ease',
                  '.MuiCard-root:hover &': {
                    opacity: 1,
                    transform: 'translateY(0)'
                  }
                }}>
                  <Typography variant="button" sx={{ fontWeight: 'bold', mr: 1 }}>
                    Accéder
                  </Typography>
                  <ArrowForward fontSize="small" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default Dashboard;
