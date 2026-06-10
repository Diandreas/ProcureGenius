/**
 * Onboarding allégé — 2 étapes, piloté par le PLAN (pas par une sélection
 * technique de modules que les utilisateurs ne comprennent pas).
 *   Étape 1 : Votre entreprise (nom requis, ville/logo/devise optionnels)
 *   Étape 2 : Votre formule (Gratuit / Pro essai 30j / Business essai 30j)
 * Le plan choisi débloque les modules côté backend (start-trial).
 * Le fiscal détaillé (NIU, TVA, NEQ…) est désormais dans les Paramètres.
 */
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box, Container, Button, Typography, TextField, Card, CardContent, Grid,
  FormControl, InputLabel, Select, MenuItem, Paper, LinearProgress,
} from '@mui/material';
import { CloudUpload, LocationOn, CheckCircle } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';

const steps = ['Votre entreprise', 'Votre formule'];

// Formules en langage métier (pas de codes module). Le plan débloque les
// modules automatiquement côté serveur.
const PLANS = [
  {
    code: 'free',
    name: 'Gratuit',
    tag: 'Pour démarrer',
    tagColor: 'text.secondary',
    features: ['Clients & produits', 'Facturation de base', 'Tableau de bord'],
    cta: 'Rester en gratuit (sans essai)',
  },
  {
    code: 'pro',
    name: 'Pro',
    tag: '30 jours offerts',
    tagColor: 'success.main',
    popular: true,
    features: ['Tout le Gratuit', 'Fournisseurs & bons de commande', 'Comptabilité, IA & analytics'],
    cta: "Démarrer l'essai Pro",
  },
  {
    code: 'business',
    name: 'Business',
    tag: '30 jours offerts',
    tagColor: 'success.main',
    features: ['Tout le Pro', 'E-Sourcing (appels d\'offres)', 'Support prioritaire'],
    cta: "Démarrer l'essai Business",
  },
];

function OnboardingSetup() {
  const { enqueueSnackbar } = useSnackbar();

  const reduxCompanyName = useSelector(
    (state) =>
      state?.settings?.companyName ||
      state?.auth?.user?.organization?.name ||
      state?.auth?.user?.organization_name ||
      ''
  );
  const registeredCompanyName = localStorage.getItem('onboarding_company_name') || '';
  const prefillName = reduxCompanyName || registeredCompanyName;

  const [activeStep, setActiveStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [submitting, setSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [formData, setFormData] = useState({
    companyName: prefillName,
    address: '',
    logo: null,
    defaultCurrency: 'XAF',
  });

  const handleChange = (field, value) => setFormData((p) => ({ ...p, [field]: value }));

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setFormData((p) => ({ ...p, logo: file }));
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const goToPlan = () => {
    if (!formData.companyName.trim()) {
      enqueueSnackbar("Le nom de l'entreprise est requis", { variant: 'error' });
      return;
    }
    setActiveStep(1);
  };

  // Finalise : enregistre les paramètres (sans modules — le plan s'en charge),
  // marque l'onboarding terminé, démarre l'essai/plan choisi, puis dashboard.
  const handleFinish = async () => {
    setSubmitting(true);
    try {
      // 1. Paramètres organisation (logo, devise). Région par défaut: à régler
      //    plus finement dans les Paramètres.
      const settings = new FormData();
      settings.append('company_name', formData.companyName);
      settings.append('default_currency', formData.defaultCurrency);
      if (formData.logo) settings.append('company_logo', formData.logo);
      await api.post('/accounts/organization/settings/', settings, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // 2. Onboarding terminé.
      await api.put('/accounts/preferences/', {
        onboarding_completed: true,
        onboarding_data: {
          completed_at: new Date().toISOString(),
          company_name: formData.companyName,
          plan: selectedPlan,
        },
      });

      // 3. Démarrer le plan/essai choisi (débloque les modules côté serveur).
      try {
        await api.post('/subscriptions/start-trial/', { plan_code: selectedPlan });
      } catch (e) {
        console.warn('start-trial:', e?.response?.data || e?.message);
      }

      localStorage.removeItem('onboarding_company_name');
      window.location.href = '/dashboard';
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.detail || error.message || 'Erreur inconnue';
      enqueueSnackbar(`Erreur : ${msg}`, { variant: 'error' });
      setSubmitting(false);
    }
  };

  const progressPercent = Math.round(((activeStep + 1) / steps.length) * 100);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 4, sm: 6 } }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            Bienvenue sur Procura
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Deux étapes rapides pour démarrer
          </Typography>
        </Box>

        {/* Progress */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Étape {activeStep + 1} sur {steps.length} — {steps[activeStep]}
            </Typography>
            <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
              {progressPercent}%
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={progressPercent} sx={{ borderRadius: 4, height: 6 }} />
        </Box>

        <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
            {/* ── Étape 1 : Entreprise ── */}
            {activeStep === 0 && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Votre entreprise</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Ces informations apparaîtront sur vos factures et documents.
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <input accept="image/*" style={{ display: 'none' }} id="logo-upload" type="file" onChange={handleLogoUpload} />
                    <label htmlFor="logo-upload" style={{ display: 'block', width: 'fit-content' }}>
                      <Box sx={{
                        width: 160, height: 110, border: '2px dashed',
                        borderColor: logoPreview ? 'primary.main' : 'divider', borderRadius: 2,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', overflow: 'hidden', bgcolor: logoPreview ? 'transparent' : 'action.hover',
                      }}>
                        {logoPreview
                          ? <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          : <><CloudUpload sx={{ fontSize: 30, color: 'text.disabled', mb: 0.5 }} /><Typography variant="caption" color="text.secondary">Logo (optionnel)</Typography></>}
                      </Box>
                    </label>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      required fullWidth label="Nom de l'entreprise"
                      value={formData.companyName}
                      onChange={(e) => handleChange('companyName', e.target.value)}
                      placeholder="Ex : ACME SARL"
                      helperText={prefillName ? 'Pré-rempli depuis votre inscription' : ''}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth label="Ville / Pays (optionnel)"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="Ex : Douala, Cameroun"
                      InputProps={{ startAdornment: <LocationOn sx={{ color: 'text.disabled', mr: 0.5, fontSize: 20 }} /> }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Devise</InputLabel>
                      <Select value={formData.defaultCurrency} label="Devise" onChange={(e) => handleChange('defaultCurrency', e.target.value)}>
                        <MenuItem value="XAF">XAF — Franc CFA (Afrique centrale)</MenuItem>
                        <MenuItem value="XOF">XOF — Franc CFA (Afrique de l'Ouest)</MenuItem>
                        <MenuItem value="EUR">EUR — Euro</MenuItem>
                        <MenuItem value="USD">USD — Dollar américain</MenuItem>
                        <MenuItem value="CAD">CAD — Dollar canadien</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* ── Étape 2 : Formule ── */}
            {activeStep === 1 && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Votre formule</Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 1.5, mb: 3, borderRadius: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                  <CheckCircle sx={{ color: 'success.main', fontSize: 20, mt: 0.2 }} />
                  <Typography variant="body2" color="text.secondary">
                    <strong>30 jours d'essai Pro offerts</strong>, sans carte bancaire. Vous pouvez aussi
                    rester en <strong>Gratuit</strong> — changement possible à tout moment.
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  {PLANS.map((p) => {
                    const sel = selectedPlan === p.code;
                    return (
                      <Grid item xs={12} sm={4} key={p.code}>
                        <Paper
                          onClick={() => setSelectedPlan(p.code)}
                          variant="outlined"
                          sx={{
                            p: 2, borderRadius: 3, cursor: 'pointer', height: '100%', position: 'relative',
                            transition: 'all 0.2s',
                            borderColor: sel ? 'primary.main' : 'divider', borderWidth: sel ? 2 : 1,
                            boxShadow: sel ? '0 12px 30px -10px rgba(37,99,235,0.35)' : 'none',
                            bgcolor: sel ? 'rgba(37,99,235,0.04)' : 'background.paper',
                          }}
                        >
                          {p.popular && (
                            <Box sx={{ position: 'absolute', top: -10, right: 12, bgcolor: '#f59e0b', color: '#0f172a', fontWeight: 800, fontSize: 11, px: 1, py: 0.25, borderRadius: 1 }}>
                              Recommandé
                            </Box>
                          )}
                          <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>{p.name}</Typography>
                          <Typography variant="caption" sx={{ color: p.tagColor, fontWeight: 700 }}>{p.tag}</Typography>
                          <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                            {p.features.map((f, i) => (
                              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <CheckCircle sx={{ fontSize: 15, color: sel ? 'primary.main' : 'text.disabled' }} />
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>{f}</Typography>
                              </Box>
                            ))}
                          </Box>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
          {activeStep === 0 ? (
            <>
              <Button onClick={() => { setSelectedPlan('pro'); setActiveStep(1); }} color="inherit" sx={{ color: 'text.secondary' }}>
                Passer
              </Button>
              <Button variant="contained" onClick={goToPlan} sx={{ minWidth: 140 }}>
                Continuer
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setActiveStep(0)} variant="outlined" disabled={submitting} sx={{ minWidth: 100 }}>
                Retour
              </Button>
              <Button variant="contained" size="large" onClick={handleFinish} disabled={submitting} sx={{ minWidth: 220, fontWeight: 700, textTransform: 'none' }}>
                {submitting ? 'Activation…' : (PLANS.find((p) => p.code === selectedPlan)?.cta || 'Démarrer')}
              </Button>
            </>
          )}
        </Box>
        {activeStep === 1 && (
          <Typography variant="caption" color="text.secondary" display="block" textAlign="center" sx={{ mt: 1.5 }}>
            Aucune carte bancaire requise. Annulation à tout moment.
          </Typography>
        )}
      </Container>
    </Box>
  );
}

export default OnboardingSetup;
