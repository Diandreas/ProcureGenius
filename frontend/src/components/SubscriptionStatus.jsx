/**
 * SubscriptionStatus Component
 * Displays current subscription status, quota warnings, and upgrade prompts
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Alert,
  Button,
  Chip,
  Grid,
  Divider,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Warning,
  CheckCircle,
  Upgrade,
  Info,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import subscriptionAPI from '../services/subscriptionAPI';

const SubscriptionStatus = ({ compact = false }) => {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [quotas, setQuotas] = useState({});
  const [features, setFeatures] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const data = await subscriptionAPI.getStatus();
      setSubscription(data.subscription);
      setQuotas(data.quotas || {});
      setFeatures(data.features || {});
      setWarnings(data.warnings || []);
    } catch (err) {
      console.error('Error fetching subscription status:', err);
    } finally {
      setLoading(false);
    }
  };

  const getQuotaColor = (percentage) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 80) return 'warning';
    return 'success';
  };

  const getQuotaStatus = (quota) => {
    if (!quota) return null;

    const { can_proceed, used, limit, percentage } = quota;

    if (limit === null || limit === undefined) return null;
    if (limit === -1) return { text: 'Illimité', color: 'success', percentage: 0 };

    return {
      text: `${used} / ${limit}`,
      color: getQuotaColor(percentage),
      percentage: percentage || 0,
    };
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info" action={
            <Button color="inherit" size="small" onClick={handleUpgrade}>
              Voir les plans
            </Button>
          }>
            Aucun abonnement actif
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Compact view - just warnings
  if (compact) {
    const criticalQuotas = Object.entries(quotas).filter(
      ([_, quota]) => quota.percentage >= 80 && quota.limit !== -1 && quota.limit !== null
    );

    if (criticalQuotas.length === 0 && !subscription.is_trial) {
      return null; // Nothing to show
    }

    return (
      <Box mb={2}>
        {subscription.is_trial && (
          <Alert severity="info" icon={<Info />} sx={{ mb: 1 }}>
            Période d'essai - {subscription.trial_days_remaining} jours restants
            <Button size="small" onClick={handleUpgrade} sx={{ ml: 2 }}>
              S'abonner
            </Button>
          </Alert>
        )}

        {criticalQuotas.map(([key, quota]) => (
          <Alert
            key={key}
            severity={quota.percentage >= 90 ? 'error' : 'warning'}
            icon={<Warning />}
            action={
              <Button size="small" onClick={handleUpgrade}>
                Passer au plan supérieur
              </Button>
            }
            sx={{ mb: 1 }}
          >
            {quota.percentage >= 90 ? 'Quota presque atteint' : 'Attention au quota'}: {quota.used}/{quota.limit} {key}
          </Alert>
        ))}
      </Box>
    );
  }

  // Full view
  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Abonnement {subscription.plan.name}
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Chip
                label={subscription.status}
                color={subscription.is_active_or_trial ? 'success' : 'default'}
                size="small"
              />
              {subscription.is_trial && (
                <Chip
                  label={`Essai - ${subscription.trial_days_remaining}j restants`}
                  color="info"
                  size="small"
                />
              )}
              <Chip
                label={subscription.billing_period === 'monthly' ? 'Mensuel' : 'Annuel'}
                variant="outlined"
                size="small"
              />
            </Box>
          </Box>

          {subscription.plan.code !== 'premium' && (
            <Button
              variant="contained"
              startIcon={<Upgrade />}
              onClick={handleUpgrade}
              size="small"
            >
              Passer au plan supérieur
            </Button>
          )}
        </Box>

        {warnings.length > 0 && (
          <Alert severity="warning" icon={<Warning />} sx={{ mb: 2 }}>
            {warnings.length} quota(s) proche(s) de la limite
          </Alert>
        )}

        {/* Quick summary */}
        <Grid container spacing={2} mb={2}>
          {Object.entries(quotas).slice(0, 3).map(([key, quota]) => {
            const status = getQuotaStatus(quota);
            if (!status) return null;

            return (
              <Grid item xs={12} sm={4} key={key}>
                <Box>
                  <Typography variant="caption" color="text.secondary" textTransform="capitalize">
                    {key.replace(/_/g, ' ')}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" fontWeight={600}>
                      {status.text}
                    </Typography>
                    <CheckCircle fontSize="small" color={status.color} />
                  </Box>
                  {status.percentage > 0 && (
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(status.percentage, 100)}
                      color={status.color}
                      sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                    />
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>

        {/* Expandable detailed view */}
        {Object.keys(quotas).length > 3 && (
          <>
            <Button
              size="small"
              onClick={() => setExpanded(!expanded)}
              endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
            >
              {expanded ? 'Voir moins' : 'Voir tous les quotas'}
            </Button>

            <Collapse in={expanded}>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                {Object.entries(quotas).map(([key, quota]) => {
                  const status = getQuotaStatus(quota);
                  if (!status) return null;

                  return (
                    <Grid item xs={12} sm={6} md={4} key={key}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" textTransform="capitalize">
                          {key.replace(/_/g, ' ')}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight={600}>
                            {status.text}
                          </Typography>
                          <CheckCircle fontSize="small" color={status.color} />
                        </Box>
                        {status.percentage > 0 && (
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(status.percentage, 100)}
                            color={status.color}
                            sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                          />
                        )}
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Collapse>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionStatus;
