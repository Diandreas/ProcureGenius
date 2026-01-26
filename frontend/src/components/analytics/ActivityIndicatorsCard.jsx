import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Divider,
  Chip,
  alpha
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
  MedicalServices as MedicalIcon,
  Schedule as ScheduleIcon,
  Timer as TimerIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import healthcareAnalyticsAPI from '../../services/healthcareAnalyticsAPI';

const ActivityIndicatorsCard = ({ dateRange }) => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [indicators, setIndicators] = useState(null);

  useEffect(() => {
    fetchIndicators();
  }, [period, dateRange]);

  const fetchIndicators = async () => {
    setLoading(true);
    try {
      const data = await healthcareAnalyticsAPI.getActivityIndicators({
        period,
        ...dateRange
      });
      setIndicators(data);
    } catch (error) {
      console.error('Error fetching activity indicators:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (event, newPeriod) => {
    if (newPeriod !== null) {
      setPeriod(newPeriod);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(value);
  };

  const IndicatorItem = ({ icon, title, value, subtitle, color }) => (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        background: theme => alpha(color || theme.palette.primary.main, 0.05),
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 2
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box
          sx={{
            p: 1,
            borderRadius: 1.5,
            bgcolor: alpha(color || '#2563eb', 0.1),
            color: color || '#2563eb',
            mr: 1.5
          }}
        >
          {icon}
        </Box>
        <Box flex={1}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h5" fontWeight="700" color="text.primary">
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );

  if (loading) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (!indicators) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="700" gutterBottom>
            Indicateurs de Suivi d'Activité
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vue complète des performances de votre établissement
          </Typography>
        </Box>

        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={handlePeriodChange}
          size="small"
        >
          <ToggleButton value="day">Jour</ToggleButton>
          <ToggleButton value="week">Semaine</ToggleButton>
          <ToggleButton value="month">Mois</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Section 1: Indicateurs d'Activité et de Volume */}
      <Box mb={4}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CalendarIcon sx={{ color: 'primary.main', mr: 1 }} />
          <Typography variant="h6" fontWeight="600">
            Indicateurs d'Activité et de Volume
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <IndicatorItem
              icon={<MedicalIcon />}
              title={`N°1 - Consultations / ${period === 'day' ? 'Jour' : period === 'week' ? 'Semaine' : 'Mois'}`}
              value={indicators.activity_volume.consultations.total}
              color="#10b981"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <IndicatorItem
              icon={<PeopleIcon />}
              title={`N°2 - Nouveaux Patients / ${period === 'day' ? 'Jour' : period === 'week' ? 'Semaine' : 'Mois'}`}
              value={indicators.activity_volume.new_patients.total}
              color="#3b82f6"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <IndicatorItem
              icon={<MedicalIcon />}
              title={`N°3 - Actes Médicaux et Paramédicaux`}
              value={indicators.activity_volume.medical_acts.total}
              subtitle={`${indicators.activity_volume.medical_acts.consultations} consultations + ${indicators.activity_volume.medical_acts.lab_orders} labos + ${indicators.activity_volume.medical_acts.nursing_care} soins`}
              color="#8b5cf6"
            />
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Section 2: Indicateurs de Performance et d'Efficience */}
      <Box mb={4}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TrendingUpIcon sx={{ color: 'success.main', mr: 1 }} />
          <Typography variant="h6" fontWeight="600">
            Indicateurs de Performance et d'Efficience
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <IndicatorItem
              icon={<ScheduleIcon />}
              title="N°4 - Temps d'Attente Moyen"
              value={`${indicators.performance.avg_wait_time_minutes} min`}
              subtitle={`Basé sur ${indicators.performance.total_visits_tracked} visites`}
              color="#f59e0b"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <IndicatorItem
              icon={<TimerIcon />}
              title="N°5 - Durée Moyenne de Consultation"
              value={`${indicators.performance.avg_consultation_duration_minutes} min`}
              color="#06b6d4"
            />
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Section 3: Indicateurs Financiers */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <MoneyIcon sx={{ color: 'error.main', mr: 1 }} />
          <Typography variant="h6" fontWeight="600">
            Indicateurs Financiers
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <IndicatorItem
              icon={<MoneyIcon />}
              title={`N°6 - Chiffre d'Affaires ${period === 'day' ? 'Journalier' : period === 'week' ? 'Hebdomadaire' : 'Mensuel'}`}
              value={formatCurrency(indicators.financial.total_revenue)}
              subtitle={`Consultations: ${formatCurrency(indicators.financial.consultation_revenue)} | Labo: ${formatCurrency(indicators.financial.lab_revenue)}`}
              color="#ef4444"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <IndicatorItem
              icon={<MoneyIcon />}
              title="N°7 - Coût Moyen par Consultation"
              value={formatCurrency(indicators.financial.avg_consultation_cost)}
              color="#ec4899"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <IndicatorItem
              icon={<MoneyIcon />}
              title="Coût Moyen par Acte"
              value={formatCurrency(indicators.financial.avg_cost_per_act)}
              subtitle={`Moyenne globale (consultations + examens)`}
              color="#a855f7"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Period Info */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Chip
          label={`Période: ${indicators.start_date} au ${indicators.end_date}`}
          size="small"
          variant="outlined"
        />
      </Box>
    </Paper>
  );
};

export default ActivityIndicatorsCard;
