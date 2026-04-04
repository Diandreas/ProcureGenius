import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, Divider, CircularProgress,
} from '@mui/material';
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Receipt,
  ShoppingCart,
  FileText,
  Copy,
  Package,
} from 'lucide-react';
import { aiChatAPI } from '../../services/api';

const CATEGORY_ICON = {
  invoices: <Receipt size={15} />,
  purchase_orders: <ShoppingCart size={15} />,
  stock: <Package size={15} />,
};

const TYPE_COLOR = {
  error: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', chip: 'error' },
  warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', chip: 'warning' },
  info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', chip: 'info' },
};

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

const SmartAlertsWidget = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const intervalRef = useRef(null);

  const fetchAlerts = async () => {
    try {
      const res = await aiChatAPI.getSmartAlerts();
      setAlerts(res.data?.alerts || []);
      setError(null);
    } catch (err) {
      setError('Impossible de charger les alertes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    intervalRef.current = setInterval(fetchAlerts, REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, []);

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height="100%" gap={1}>
        <CircularProgress size={20} />
        <Typography variant="caption" color="text.secondary">Analyse en cours...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height="100%">
        <Typography variant="caption" color="error">{error}</Typography>
      </Box>
    );
  }

  if (alerts.length === 0) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" gap={1}>
        <CheckCircle size={36} color="#10b981" />
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          Tout est en ordre
        </Typography>
        <Typography variant="caption" color="text.disabled">
          Aucune action prioritaire pour le moment
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%', overflowY: 'auto', pr: 0.5 }}>
      {alerts.map((alert, idx) => {
        const colors = TYPE_COLOR[alert.type] || TYPE_COLOR.info;
        const icon = alert.type === 'error'
          ? <AlertCircle size={16} color={colors.text} />
          : alert.type === 'warning'
          ? <AlertTriangle size={16} color={colors.text} />
          : <Info size={16} color={colors.text} />;

        return (
          <Box
            key={alert.id || idx}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.5,
              p: 1.25,
              borderRadius: 1.5,
              bgcolor: colors.bg,
              border: `1px solid ${colors.border}`,
            }}
          >
            <Box pt={0.25}>{icon}</Box>

            <Box flex={1} minWidth={0}>
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color={colors.text}
                  sx={{ lineHeight: 1.3 }}
                >
                  {alert.title}
                </Typography>
                {CATEGORY_ICON[alert.category] && (
                  <Box sx={{ color: colors.text, opacity: 0.6, lineHeight: 0 }}>
                    {CATEGORY_ICON[alert.category]}
                  </Box>
                )}
              </Box>

              {alert.detail && (
                <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>
                  {alert.detail}
                </Typography>
              )}
            </Box>

            {alert.action_url && alert.action_label && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => navigate(alert.action_url)}
                sx={{
                  flexShrink: 0,
                  fontSize: '0.7rem',
                  py: 0.3,
                  px: 1,
                  borderColor: colors.border,
                  color: colors.text,
                  '&:hover': { bgcolor: colors.border },
                  whiteSpace: 'nowrap',
                }}
              >
                {alert.action_label}
              </Button>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default SmartAlertsWidget;
