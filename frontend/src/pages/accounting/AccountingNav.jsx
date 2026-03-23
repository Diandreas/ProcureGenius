import React from 'react';
import { Box, Button, Typography, Divider } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AccountTree as PlanIcon,
  Receipt as EntriesIcon,
  Balance as BalanceIcon,
  MenuBook as LedgerIcon,
  TrendingUp as ResultIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import BackButton from '../../components/navigation/BackButton';

const NAV_ITEMS = [
  { label: 'Tableau de bord', path: '/accounting', icon: <DashboardIcon fontSize="small" />, exact: true },
  { label: 'Plan comptable', path: '/accounting/chart-of-accounts', icon: <PlanIcon fontSize="small" /> },
  { label: 'Écritures', path: '/accounting/entries', icon: <EntriesIcon fontSize="small" /> },
  { label: 'Balance', path: '/accounting/reports/trial-balance', icon: <BalanceIcon fontSize="small" /> },
  { label: 'Grand livre', path: '/accounting/reports/general-ledger', icon: <LedgerIcon fontSize="small" /> },
  { label: 'Compte de résultat', path: '/accounting/reports/income-statement', icon: <ResultIcon fontSize="small" /> },
];

export default function AccountingNav({ title, subtitle, action }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (item) =>
    item.exact ? pathname === item.path : pathname.startsWith(item.path);

  return (
    <Box mb={3}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Box display="flex" alignItems="center" gap={1}>
          <BackButton to="/dashboard" tooltip="Retour au tableau de bord" />
          <Box>
            <Typography variant="h5" fontWeight={700}>{title}</Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
            )}
          </Box>
        </Box>
        {action && <Box>{action}</Box>}
      </Box>

      {/* Navigation inter-pages */}
      <Box display="flex" gap={1} flexWrap="wrap">
        {NAV_ITEMS.map((item) => (
          <Button
            key={item.path}
            size="small"
            variant={isActive(item) ? 'contained' : 'outlined'}
            startIcon={item.icon}
            onClick={() => navigate(item.path)}
            sx={{ borderRadius: 2 }}
          >
            {item.label}
          </Button>
        ))}
      </Box>
      <Divider sx={{ mt: 1.5 }} />
    </Box>
  );
}
