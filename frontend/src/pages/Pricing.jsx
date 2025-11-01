/**
 * Pricing Page - Display subscription plans
 * Shows Free, Standard, and Premium plans with features and pricing
 */
import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Star,
  Rocket,
  TrendingUp,
  Bolt,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import subscriptionAPI from '../services/subscriptionAPI';

const Pricing = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [currentSubscription, setCurrentSubscription] = useState(null);

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await subscriptionAPI.getPlans();
      setPlans(data.plans || []);
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError('Impossible de charger les plans. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const data = await subscriptionAPI.getStatus();
      setCurrentSubscription(data.subscription);
    } catch (err) {
      // User might not be authenticated or have no subscription
      console.log('No current subscription');
    }
  };

  const handleSubscribe = async (planCode) => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      // Redirect to login with return URL
      navigate(`/login?return=/pricing&plan=${planCode}`);
      return;
    }

    try {
      // For now, just navigate to checkout/payment page
      // TODO: Implement PayPal integration
      navigate(`/subscribe/${planCode}?period=${billingPeriod}`);
    } catch (err) {
      console.error('Error subscribing:', err);
      alert('Erreur lors de la souscription. Veuillez réessayer.');
    }
  };

  const handleChangePlan = async (planCode) => {
    try {
      await subscriptionAPI.changePlan({
        new_plan_code: planCode,
        billing_period: billingPeriod,
        immediately: false,
      });
      alert('Plan modifié avec succès!');
      fetchCurrentSubscription();
    } catch (err) {
      console.error('Error changing plan:', err);
      alert('Erreur lors du changement de plan. Veuillez réessayer.');
    }
  };

  const getPlanIcon = (planCode) => {
    switch (planCode) {
      case 'free':
        return <Star sx={{ fontSize: 40, color: '#757575' }} />;
      case 'standard':
        return <TrendingUp sx={{ fontSize: 40, color: '#1976d2' }} />;
      case 'premium':
        return <Rocket sx={{ fontSize: 40, color: '#9c27b0' }} />;
      default:
        return <Star sx={{ fontSize: 40 }} />;
    }
  };

  const getPlanColor = (planCode) => {
    switch (planCode) {
      case 'free':
        return { primary: '#757575', light: '#f5f5f5' };
      case 'standard':
        return { primary: '#1976d2', light: '#e3f2fd' };
      case 'premium':
        return { primary: '#9c27b0', light: '#f3e5f5' };
      default:
        return { primary: '#757575', light: '#f5f5f5' };
    }
  };

  const formatPrice = (plan) => {
    const price = billingPeriod === 'monthly' ? plan.price_monthly : plan.price_yearly;
    if (price === 0) return 'Gratuit';

    if (billingPeriod === 'yearly') {
      const monthlyEquivalent = (price / 12).toFixed(2);
      return (
        <>
          <Typography variant="h3" component="span" sx={{ fontWeight: 700 }}>
            {price}€
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            soit {monthlyEquivalent}€/mois
          </Typography>
        </>
      );
    }

    return (
      <Typography variant="h3" component="span" sx={{ fontWeight: 700 }}>
        {price}€<Typography component="span" variant="h6">/mois</Typography>
      </Typography>
    );
  };

  const getFeatureList = (plan) => {
    const features = [];

    // Core features
    features.push({
      included: true,
      text: `${plan.quotas.invoices_per_month || 'Illimité'} factures/mois`,
    });
    features.push({
      included: true,
      text: `${plan.quotas.clients || 'Illimité'} clients`,
    });
    features.push({
      included: true,
      text: `${plan.quotas.products || 'Illimité'} produits`,
    });

    // Purchase orders & suppliers
    if (plan.features.has_purchase_orders) {
      features.push({
        included: true,
        text: `${plan.quotas.purchase_orders_per_month || 'Illimité'} bons de commande/mois`,
      });
      features.push({
        included: true,
        text: `${plan.quotas.suppliers || 'Illimité'} fournisseurs`,
      });
    } else {
      features.push({
        included: false,
        text: 'Bons de commande',
      });
      features.push({
        included: false,
        text: 'Fournisseurs',
      });
    }

    // AI Assistant
    if (plan.features.has_ai_assistant) {
      const aiQuota = plan.quotas.ai_requests_per_month;
      const aiText = aiQuota === -1 ? 'IA illimitée' : `${aiQuota} requêtes IA/mois`;
      features.push({
        included: true,
        text: aiText,
        highlight: true,
      });
    } else {
      features.push({
        included: false,
        text: 'Assistant IA',
      });
    }

    // E-Sourcing
    features.push({
      included: plan.features.has_e_sourcing,
      text: 'E-Sourcing',
    });

    // Contracts
    features.push({
      included: plan.features.has_contracts,
      text: 'Gestion des contrats',
    });

    // Analytics
    features.push({
      included: plan.features.has_analytics,
      text: 'Analytics avancés',
    });

    // Storage
    const storageMB = plan.quotas.storage_mb;
    const storageText = storageMB >= 1024
      ? `${(storageMB / 1024).toFixed(0)} GB de stockage`
      : `${storageMB} MB de stockage`;
    features.push({
      included: true,
      text: storageText,
    });

    // Ads
    if (plan.features.has_ads) {
      features.push({
        included: false,
        text: 'Publicités',
        isNegative: true,
      });
    } else {
      features.push({
        included: true,
        text: 'Sans publicité',
      });
    }

    return features;
  };

  const isCurrentPlan = (planCode) => {
    return currentSubscription?.plan?.code === planCode;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Header */}
      <Box textAlign="center" mb={6}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
          Choisissez votre plan
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          Commencez gratuitement, passez à un plan supérieur quand vous en avez besoin
        </Typography>

        {/* Billing Period Toggle */}
        <Box display="flex" justifyContent="center" mt={4}>
          <ToggleButtonGroup
            value={billingPeriod}
            exclusive
            onChange={(e, newValue) => newValue && setBillingPeriod(newValue)}
            aria-label="billing period"
          >
            <ToggleButton value="monthly" aria-label="monthly">
              Mensuel
            </ToggleButton>
            <ToggleButton value="yearly" aria-label="yearly">
              Annuel
              <Chip
                label="Économisez 17%"
                size="small"
                color="success"
                sx={{ ml: 1 }}
              />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Plans Grid */}
      <Grid container spacing={4} alignItems="stretch">
        {plans.map((plan) => {
          const colors = getPlanColor(plan.code);
          const isPopular = plan.code === 'standard';
          const isCurrent = isCurrentPlan(plan.code);

          return (
            <Grid item xs={12} md={4} key={plan.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  border: isPopular ? `2px solid ${colors.primary}` : '1px solid #e0e0e0',
                  transform: isPopular ? 'scale(1.05)' : 'scale(1)',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: isPopular ? 'scale(1.07)' : 'scale(1.02)',
                  },
                }}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <Chip
                    icon={<Bolt />}
                    label="Plus populaire"
                    color="primary"
                    sx={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontWeight: 600,
                    }}
                  />
                )}

                {/* Current Plan Badge */}
                {isCurrent && (
                  <Chip
                    label="Plan actuel"
                    color="success"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                    }}
                  />
                )}

                <CardContent sx={{ flexGrow: 1, pt: 4 }}>
                  {/* Plan Icon & Name */}
                  <Box display="flex" alignItems="center" mb={2}>
                    {getPlanIcon(plan.code)}
                    <Box ml={2}>
                      <Typography variant="h5" component="h2" fontWeight={600}>
                        {plan.name}
                      </Typography>
                      {plan.trial_days > 0 && (
                        <Chip
                          label={`${plan.trial_days} jours d'essai gratuit`}
                          size="small"
                          color="info"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </Box>
                  </Box>

                  {/* Price */}
                  <Box mb={3}>
                    {formatPrice(plan)}
                    {billingPeriod === 'yearly' && plan.savings_yearly && (
                      <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                        Économisez {plan.savings_yearly.amount}€ par an
                      </Typography>
                    )}
                  </Box>

                  {/* Description */}
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {plan.description}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  {/* Features List */}
                  <List dense>
                    {getFeatureList(plan).map((feature, index) => (
                      <ListItem key={index} disableGutters>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {feature.included ? (
                            <CheckCircle color="success" fontSize="small" />
                          ) : (
                            <Cancel color="disabled" fontSize="small" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={feature.text}
                          sx={{
                            textDecoration: !feature.included ? 'line-through' : 'none',
                            color: feature.highlight
                              ? 'primary.main'
                              : feature.isNegative
                              ? 'error.main'
                              : 'text.primary',
                            fontWeight: feature.highlight ? 600 : 400,
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  {isCurrent ? (
                    <Button
                      fullWidth
                      variant="outlined"
                      disabled
                      sx={{ py: 1.5 }}
                    >
                      Plan actuel
                    </Button>
                  ) : currentSubscription ? (
                    <Button
                      fullWidth
                      variant={isPopular ? 'contained' : 'outlined'}
                      color="primary"
                      onClick={() => handleChangePlan(plan.code)}
                      sx={{ py: 1.5 }}
                    >
                      Changer de plan
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant={isPopular ? 'contained' : 'outlined'}
                      color="primary"
                      onClick={() => handleSubscribe(plan.code)}
                      sx={{ py: 1.5 }}
                    >
                      {plan.code === 'free' ? 'Commencer gratuitement' : 'Commencer l\'essai'}
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* FAQ or Additional Info */}
      <Box mt={8} textAlign="center">
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Des questions ?
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Contactez notre équipe pour trouver le plan qui correspond le mieux à vos besoins.
        </Typography>
        <Button variant="outlined" size="large" sx={{ mt: 2 }}>
          Contactez-nous
        </Button>
      </Box>
    </Container>
  );
};

export default Pricing;
