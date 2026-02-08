import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, Switch, FormControlLabel,
  FormControl, InputLabel, Select, MenuItem, Button, Grid,
  Alert, CircularProgress, Divider, IconButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Email as EmailIcon,
  Send as SendIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import api from '../../services/api';
import Breadcrumbs from '../../components/navigation/Breadcrumbs';

const WeeklyReportSettings = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/analytics/report-config/');
      setConfig(response.data);
    } catch (error) {
      console.error('Error fetching report config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await api.put('/analytics/report-config/', config);
      setConfig(response.data);
      setMessage({ type: 'success', text: 'Configuration sauvegardee avec succes' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const response = await api.post('/analytics/report-config/test/');
      setMessage({ type: 'success', text: response.data.message });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Erreur lors de l\'envoi test' });
    } finally {
      setTesting(false);
    }
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Breadcrumbs />

      <Box display="flex" alignItems="center" gap={2} mb={4}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <EmailIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight="700">
            Rapports Periodiques
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configurez vos rapports automatiques par email
          </Typography>
        </Box>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        {/* Enable/Disable */}
        <Box mb={3}>
          <FormControlLabel
            control={
              <Switch
                checked={config?.is_active || false}
                onChange={e => handleChange('is_active', e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="subtitle1" fontWeight="600">Activer les rapports periodiques</Typography>
                <Typography variant="body2" color="text.secondary">
                  Recevez un resume de votre activite par email
                </Typography>
              </Box>
            }
          />
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Frequency */}
        <Box mb={3}>
          <FormControl fullWidth size="small" disabled={!config?.is_active}>
            <InputLabel>Frequence</InputLabel>
            <Select
              value={config?.frequency || 'weekly'}
              label="Frequence"
              onChange={e => handleChange('frequency', e.target.value)}
            >
              <MenuItem value="weekly">Hebdomadaire (chaque lundi)</MenuItem>
              <MenuItem value="biweekly">Bi-hebdomadaire (toutes les 2 semaines)</MenuItem>
              <MenuItem value="monthly">Mensuel (debut de mois)</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Sections */}
        <Typography variant="subtitle1" fontWeight="600" mb={2}>Sections du rapport</Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              disabled={!config?.is_active}
              control={
                <Switch
                  checked={config?.include_healthcare || false}
                  onChange={e => handleChange('include_healthcare', e.target.checked)}
                />
              }
              label="Sante & Laboratoire"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              disabled={!config?.is_active}
              control={
                <Switch
                  checked={config?.include_inventory || false}
                  onChange={e => handleChange('include_inventory', e.target.checked)}
                />
              }
              label="Inventaire"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              disabled={!config?.is_active}
              control={
                <Switch
                  checked={config?.include_finance || false}
                  onChange={e => handleChange('include_finance', e.target.checked)}
                />
              }
              label="Finances"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              disabled={!config?.is_active}
              control={
                <Switch
                  checked={config?.include_stock_alerts || false}
                  onChange={e => handleChange('include_stock_alerts', e.target.checked)}
                />
              }
              label="Alertes Stock (lots, ruptures)"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Actions */}
        <Box display="flex" gap={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            startIcon={testing ? <CircularProgress size={18} /> : <SendIcon />}
            onClick={handleTest}
            disabled={testing || saving}
          >
            {testing ? 'Envoi...' : 'Envoyer un test'}
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SettingsIcon />}
            onClick={handleSave}
            disabled={saving || testing}
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default WeeklyReportSettings;
