import React from 'react';
import {
  Box, Typography, Divider, Tabs, Tab, useMediaQuery, useTheme, IconButton, Tooltip,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Dashboard as DashboardIcon,
  AccountTree as PlanIcon,
  Receipt as EntriesIcon,
  Balance as BalanceIcon,
  MenuBook as LedgerIcon,
  TrendingUp as ResultIcon,
  AccountBalance as BilanIcon,
  Insights as SIGIcon,
  HelpOutline as HelpIcon,
} from '@mui/icons-material';
import BackButton from '../../components/navigation/BackButton';
import { useHeader } from '../../contexts/HeaderContext';
import { useAccountingHelp } from '../../contexts/AccountingHelpContext';

const PATH_TO_CONTEXT = {
  '/accounting/entries/new': 'journal_entry',
  '/accounting/entries': 'journal_entry',
  '/accounting/chart-of-accounts': 'chart_of_accounts',
  '/accounting/reports/balance-sheet': 'balance_sheet',
  '/accounting/reports/general-ledger': 'general_ledger',
};

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

  const { setPageHeader } = useHeader();
  const { openHelp } = useAccountingHelp();

  const helpContext = Object.entries(PATH_TO_CONTEXT).find(([path]) =>
    pathname.startsWith(path)
  )?.[1] || 'journal_entry';

  const activeIndex = NAV_ITEMS.findIndex((item) =>
    item.exact ? pathname === item.path : pathname.startsWith(item.path)
  );
  const currentTab = activeIndex === -1 ? false : activeIndex;

  React.useEffect(() => {
    setPageHeader({
      title: title || 'Comptabilité',
      actions: action || null
    });
  }, [title, action, setPageHeader]);

  return (
    <Box mb={2}>
      {/* Navigation tabs + bouton aide */}
      <Box display="flex" alignItems="center" gap={1}>
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

      <Tooltip title="Aide comptabilité" placement="left">
        <IconButton size="small" onClick={() => openHelp(helpContext)} sx={{ ml: 'auto', flexShrink: 0 }}>
          <HelpIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      </Box>

      <Divider sx={{ mt: 1 }} />
    </Box>
  );
}
