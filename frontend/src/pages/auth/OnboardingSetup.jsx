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
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import { CloudUpload, LocationOn, CheckCircle, Receipt, ShoppingCart, Inventory, Business, People, ExpandMore, Tune } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';

const steps = ['Votre entreprise', 'Votre activité', 'Votre formule'];

const TAX_REGIONS = [
  { value: 'international', label: 'International' },
  { value: 'cameroon', label: 'Cameroun (OHADA)' },
  { value: 'ohada', label: 'Zone OHADA' },
  { value: 'eu', label: 'Union Européenne' },
  { value: 'usa', label: 'États-Unis' },
  { value: 'canada', label: 'Canada' },
];

// Cas d'usage métier : on demande ce que l'utilisateur veut FAIRE (langage
// simple) et on en déduit les modules techniques. Evite d'exposer 11 modules.
const USE_CASES = [
  {
    id: 'sell',
    title: 'Vendre & facturer',
    desc: 'Clients, devis, factures, paiements',
    icon: <Receipt sx={{ fontSize: 24 }} />,
    color: '#2563eb',
    modules: ['clients', 'invoices', 'products'],
  },
  {
    id: 'buy',
    title: 'Acheter & fournisseurs',
    desc: 'Fournisseurs, bons de commande, contrats',
    icon: <ShoppingCart sx={{ fontSize: 24 }} />,
    color: '#7c3aed',
    modules: ['suppliers', 'purchase-orders', 'contracts'],
  },
  {
    id: 'stock',
    title: 'Gérer mon stock',
    desc: 'Catalogue produits et niveaux de stock',
    icon: <Inventory sx={{ fontSize: 24 }} />,
    color: '#059669',
    modules: ['products'],
  },
  {
    id: 'all',
    title: 'Tout gérer',
    desc: "L'entreprise complète : ventes, achats, stock, compta",
    icon: <Business sx={{ fontSize: 24 }} />,
    color: '#f59e0b',
    modules: ['clients', 'invoices', 'products', 'suppliers', 'purchase-orders', 'contracts', 'accounting', 'analytics'],
  },
];

// Déduit la liste de modules à partir des cas d'usage choisis.
const modulesFromUseCases = (ids) => {
  const set = new Set(['dashboard']); // toujours présent
  USE_CASES.filter((u) => ids.includes(u.id)).forEach((u) => u.modules.forEach((m) => set.add(m)));
  return Array.from(set);
};

// Formules en langage métier (pas de codes module). Le plan régit quotas,
// nombre d'utilisateurs et fonctionnalités premium.
const PLANS = [
  {
    code: 'free',
    name: 'Gratuit',
    tag: 'Pour démarrer',
    tagColor: 'text.secondary',
    seats: '1 utilisateur',
    features: ['Clients & produits', 'Facturation de base', 'Tableau de bord'],
    cta: 'Rester en gratuit (sans essai)',
  },
  {
    code: 'pro',
    name: 'Pro',
    tag: '30 jours offerts',
    tagColor: 'success.main',
    popular: true,
    seats: "Jusqu'à 5 utilisateurs",
    features: ['Tout le Gratuit', 'Fournisseurs & bons de commande', 'Comptabilité, IA & analytics'],
    cta: "Démarrer l'essai Pro",
  },
  {
    code: 'business',
    name: 'Business',
    tag: '30 jours offerts',
    tagColor: 'success.main',
    seats: 'Utilisateurs illimités',
    features: ['Tout le Pro', "E-Sourcing (appels d'offres)", 'Support prioritaire'],
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
  const [selectedUseCases, setSelectedUseCases] = useState(['sell']); // au moins un
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [submitting, setSubmitting] = useState(false);

  const toggleUseCase = (id) => {
    setSelectedUseCases((prev) => {
      if (id === 'all') return prev.includes('all') ? [] : ['all'];
      const next = prev.filter((x) => x !== 'all'); // 'all' exclusif
      return next.includes(id) ? next.filter((x) => x !== id) : [...next, id];
    });
  };
  const [logoPreview, setLogoPreview] = useState(null);
  const [formData, setFormData] = useState({
    companyName: prefillName,
    address: '',
    logo: null,
    defaultCurrency: 'XAF',
    // Champs optionnels (section repliee) — non bloquants.
    email: '',
    phone: '',
    website: '',
    brandColor: '#2563eb',
    taxRegion: 'international',
    taxNumber: '',
    bankName: '',
    bankAccount: '',
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

  const goToActivity = () => {
    if (!formData.companyName.trim()) {
      enqueueSnackbar("Le nom de l'entreprise est requis", { variant: 'error' });
      return;
    }
    setActiveStep(1);
  };

  const goToPlan = () => {
    if (selectedUseCases.length === 0) {
      enqueueSnackbar('Choisissez au moins une activité', { variant: 'error' });
      return;
    }
    setActiveStep(2);
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
      // Champs optionnels (section repliee) : envoyes seulement si renseignes.
      if (formData.address) settings.append('company_address', formData.address);
      if (formData.email) settings.append('company_email', formData.email);
      if (formData.phone) settings.append('company_phone', formData.phone);
      if (formData.website) settings.append('company_website', formData.website);
      if (formData.taxRegion) settings.append('tax_region', formData.taxRegion);
      if (formData.taxNumber) settings.append('company_tax_number', formData.taxNumber);
      await api.post('/accounts/organization/settings/', settings, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Modules déduits des cas d'usage choisis.
      const enabledModules = modulesFromUseCases(selectedUseCases);

      // 2. Onboarding terminé + modules choisis.
      await api.put('/accounts/preferences/', {
        enabled_modules: enabledModules,
        onboarding_completed: true,
        onboarding_data: {
          completed_at: new Date().toISOString(),
          company_name: formData.companyName,
          plan: selectedPlan,
          use_cases: selectedUseCases,
        },
      });

      // 3. Démarrer le plan/essai choisi (quotas, utilisateurs, premium).
      try {
        await api.post('/subscriptions/start-trial/', { plan_code: selectedPlan });
      } catch (e) {
        console.warn('start-trial:', e?.response?.data || e?.message);
      }

      // 4. Aligner les modules de l'organisation sur le choix d'usage
      //    (après start-trial, pour que la sélection d'usage prime).
      try {
        const orgModules = new FormData();
        orgModules.append('enabled_modules', JSON.stringify(enabledModules));
        await api.post('/accounts/organization/settings/', orgModules, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } catch (e) {
        console.warn('sync modules:', e?.response?.data || e?.message);
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
    <Box sx={{
      minHeight: '100vh', py: { xs: 4, sm: 6 },
      background: (theme) => theme.palette.mode === 'dark'
        ? 'radial-gradient(1200px 600px at 50% -10%, rgba(37,99,235,0.18), transparent), #111827'
        : 'radial-gradient(1200px 600px at 50% -10%, rgba(37,99,235,0.10), transparent), #eef1f6',
    }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            width: 72, height: 72, mx: 'auto', mb: 1.5, borderRadius: '50%',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: '#fff',
            boxShadow: '0 10px 30px -8px rgba(37,99,235,0.45)',
          }}>
            <Box component="img" src="/icon-512.png" alt="Procura"
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.style.display = 'none'; }} />
          </Box>
          <Typography variant="h4" sx={{
            fontWeight: 800, mb: 0.5,
            background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Bienvenue sur Procura
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quelques étapes rapides pour configurer votre espace
          </Typography>
        </Box>

        {/* Progress */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Étape {activeStep + 1} sur {steps.length} — {steps[activeStep]}
            </Typography>
            <Typography variant="body2" color="primary" sx={{ fontWeight: 700 }}>
              {progressPercent}%
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={progressPercent}
            sx={{
              borderRadius: 4, height: 8,
              bgcolor: 'rgba(37,99,235,0.10)',
              '& .MuiLinearProgress-bar': { borderRadius: 4, background: 'linear-gradient(90deg, #2563eb, #7c3aed)' },
            }} />
        </Box>

        <Card sx={{
          borderRadius: 4, border: 'none',
          boxShadow: '0 18px 50px -20px rgba(15,23,42,0.25)',
          overflow: 'hidden',
        }}>
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

                {/* Plus d'informations — repliees, non envahissantes. Tout est
                    optionnel et modifiable plus tard dans les Parametres. */}
                <Accordion
                  disableGutters
                  elevation={0}
                  sx={{
                    mt: 2.5, border: '1px solid', borderColor: 'divider',
                    borderRadius: 2, '&:before': { display: 'none' },
                    bgcolor: 'transparent',
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Tune sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Plus d'informations <Typography component="span" variant="caption" color="text.secondary">(optionnel)</Typography>
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 2, pb: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth size="small" label="Email" type="email"
                          value={formData.email} onChange={(e) => handleChange('email', e.target.value)}
                          placeholder="contact@entreprise.com" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth size="small" label="Téléphone"
                          value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)}
                          placeholder="+237 6XX XX XX XX" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth size="small" label="Site web"
                          value={formData.website} onChange={(e) => handleChange('website', e.target.value)}
                          placeholder="https://..." />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Région fiscale</InputLabel>
                          <Select value={formData.taxRegion} label="Région fiscale" onChange={(e) => handleChange('taxRegion', e.target.value)}>
                            {TAX_REGIONS.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth size="small" label="Numéro fiscal (TIN)"
                          value={formData.taxNumber} onChange={(e) => handleChange('taxNumber', e.target.value)} />
                      </Grid>
                    </Grid>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                      Tout ceci est modifiable à tout moment dans les Paramètres.
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}

            {/* ── Étape 2 : Activité (cas d'usage → modules) ── */}
            {activeStep === 1 && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Qu'allez-vous gérer ?</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Choisissez ce qui vous concerne — on active les bonnes fonctionnalités. Modifiable à tout moment.
                </Typography>

                <Grid container spacing={1.5}>
                  {USE_CASES.map((u) => {
                    const sel = selectedUseCases.includes(u.id);
                    return (
                      <Grid item xs={12} sm={6} key={u.id}>
                        <Paper
                          onClick={() => toggleUseCase(u.id)}
                          variant="outlined"
                          sx={{
                            p: 2, borderRadius: 3, cursor: 'pointer', height: '100%',
                            display: 'flex', alignItems: 'flex-start', gap: 1.5,
                            transition: 'all 0.18s',
                            borderColor: sel ? u.color : 'divider', borderWidth: sel ? 2 : 1,
                            bgcolor: sel ? `${u.color}0d` : 'background.paper',
                            boxShadow: sel ? `0 10px 24px -12px ${u.color}80` : 'none',
                            position: 'relative',
                          }}
                        >
                          <Box sx={{
                            width: 44, height: 44, borderRadius: 2, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: sel ? '#fff' : u.color,
                            bgcolor: sel ? u.color : `${u.color}14`,
                            transition: 'all 0.18s',
                          }}>
                            {u.icon}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{u.title}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                              {u.desc}
                            </Typography>
                          </Box>
                          {sel && <CheckCircle sx={{ color: u.color, fontSize: 20, position: 'absolute', top: 10, right: 10 }} />}
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            )}

            {/* ── Étape 3 : Formule ── */}
            {activeStep === 2 && (
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
                          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, color: sel ? 'primary.main' : 'text.secondary' }}>
                            <People sx={{ fontSize: 16 }} />
                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{p.seats}</Typography>
                          </Box>
                          <Box sx={{ mt: 1.25, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
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
          {activeStep === 0 && (
            <>
              <Button onClick={() => { setActiveStep(2); }} color="inherit" sx={{ color: 'text.secondary' }}>
                Passer
              </Button>
              <Button variant="contained" onClick={goToActivity} sx={{ minWidth: 140 }}>
                Continuer
              </Button>
            </>
          )}
          {activeStep === 1 && (
            <>
              <Button onClick={() => setActiveStep(0)} variant="outlined" sx={{ minWidth: 100 }}>
                Retour
              </Button>
              <Button variant="contained" onClick={goToPlan} sx={{ minWidth: 140 }}>
                Continuer
              </Button>
            </>
          )}
          {activeStep === 2 && (
            <>
              <Button onClick={() => setActiveStep(1)} variant="outlined" disabled={submitting} sx={{ minWidth: 100 }}>
                Retour
              </Button>
              <Button variant="contained" size="large" onClick={handleFinish} disabled={submitting} sx={{ minWidth: 220, fontWeight: 700, textTransform: 'none' }}>
                {submitting ? 'Activation…' : (PLANS.find((p) => p.code === selectedPlan)?.cta || 'Démarrer')}
              </Button>
            </>
          )}
        </Box>
        {activeStep === 2 && (
          <Typography variant="caption" color="text.secondary" display="block" textAlign="center" sx={{ mt: 1.5 }}>
            Aucune carte bancaire requise. Annulation à tout moment.
          </Typography>
        )}
      </Container>
    </Box>
  );
}

export default OnboardingSetup;
