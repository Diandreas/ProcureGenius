import React from 'react';
import {
  Box, Typography, Divider, Tabs, Tab, useMediaQuery, useTheme, IconButton, Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AccountTree as PlanIcon,
  Receipt as EntriesIcon,
  Balance as BalanceIcon,
  MenuBook as LedgerIcon,
  TrendingUp as ResultIcon,
  AccountBalance as BilanIcon,
  Insights as SIGIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import BackButton from '../../components/navigation/BackButton';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/accounting', icon: <DashboardIcon />, exact: true },
  { label: 'Plan comptable', path: '/accounting/chart-of-accounts', icon: <PlanIcon /> },
  { label: 'Écritures', path: '/accounting/entries', icon: <EntriesIcon /> },
  { label: 'Balance', path: '/accounting/reports/trial-balance', icon: <BalanceIcon /> },
  { label: 'Grand livre', path: '/accounting/reports/general-ledger', icon: <LedgerIcon /> },
  { label: 'Résultat', path: '/accounting/reports/income-statement', icon: <ResultIcon /> },
  { label: 'Bilan', path: '/accounting/reports/balance-sheet', icon: <BilanIcon /> },
  { label: 'SIG', path: '/accounting/reports/sig', icon: <SIGIcon /> },
];

export default function AccountingNav({ title, subtitle, action }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const activeIndex = NAV_ITEMS.findIndex((item) =>
    item.exact ? pathname === item.path : pathname.startsWith(item.path)
  );
  const currentTab = activeIndex === -1 ? false : activeIndex;

  return (
    <Box mb={3}>
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={1.5}
        flexWrap="wrap"
        gap={1}
      >
        <Box display="flex" alignItems="center" gap={1} minWidth={0}>
          <BackButton to="/dashboard" tooltip="Retour au tableau de bord" />
          <Box minWidth={0}>
            <Typography
              variant={isMobile ? 'h6' : 'h5'}
              fontWeight={700}
              noWrap
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {action && <Box flexShrink={0}>{action}</Box>}
      </Box>

      {/* Navigation tabs — scroll horizontal sur mobile */}
      {isMobile ? (
        // Mobile : icônes seules dans un scroll horizontal
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            overflowX: 'auto',
            pb: 0.5,
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': { borderRadius: 2, bgcolor: 'divider' },
          }}
        >
          {NAV_ITEMS.map((item, idx) => {
            const isActive = item.exact ? pathname === item.path : pathname.startsWith(item.path);
            return (
              <Tooltip key={item.path} title={item.label} placement="bottom">
                <IconButton
                  size="small"
                  onClick={() => navigate(item.path)}
                  sx={{
                    flexShrink: 0,
                    borderRadius: 2,
                    p: 1,
                    bgcolor: isActive ? 'primary.main' : 'transparent',
                    color: isActive ? 'primary.contrastText' : 'text.secondary',
                    '&:hover': {
                      bgcolor: isActive ? 'primary.dark' : 'action.hover',
                    },
                  }}
                >
                  {React.cloneElement(item.icon, { fontSize: 'small' })}
                </IconButton>
              </Tooltip>
            );
          })}
        </Box>
      ) : (
        // Desktop/tablette : tabs avec labels, scroll si besoin
        <Tabs
          value={currentTab}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 36,
            '& .MuiTab-root': {
              minHeight: 36,
              py: 0.5,
              px: 1.5,
              fontSize: '0.82rem',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2,
              mr: 0.5,
              minWidth: 'unset',
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: 2,
            },
          }}
        >
          {NAV_ITEMS.map((item, idx) => (
            <Tab
              key={item.path}
              label={item.label}
              icon={React.cloneElement(item.icon, { fontSize: 'small' })}
              iconPosition="start"
              onClick={() => navigate(item.path)}
            />
          ))}
        </Tabs>
      )}

      <Divider sx={{ mt: 1 }} />
    </Box>
  );
}
