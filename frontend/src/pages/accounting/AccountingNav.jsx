import React from 'react';
import {
  Box, Typography, Divider, Tabs, Tab, useMediaQuery, useTheme, IconButton, Tooltip,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Payments as ExpensesIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import BackButton from '../../components/navigation/BackButton';
import { useHeader } from '../../contexts/HeaderContext';
import { useAccountingHelp } from '../../contexts/AccountingHelpContext';
import { useModules } from '../../contexts/ModuleContext';

const PATH_TO_CONTEXT = {
  '/accounting/entries/new': 'journal_entry',
  '/accounting/entries': 'journal_entry',
  '/accounting/chart-of-accounts': 'chart_of_accounts',
  '/accounting/reports/balance-sheet': 'balance_sheet',
  '/accounting/reports/general-ledger': 'general_ledger',
};

// labelKey : clé de traduction accounting:nav.<labelKey>
const NAV_ITEMS = [
  { labelKey: 'dashboard', path: '/accounting', icon: <DashboardIcon />, exact: true },
  { labelKey: 'expenses', path: '/accounting/expenses', icon: <ExpensesIcon /> },
  { labelKey: 'chartOfAccounts', path: '/accounting/chart-of-accounts', icon: <PlanIcon /> },
  { labelKey: 'entries', path: '/accounting/entries', icon: <EntriesIcon /> },
  { labelKey: 'trialBalance', path: '/accounting/reports/trial-balance', icon: <BalanceIcon /> },
  { labelKey: 'generalLedger', path: '/accounting/reports/general-ledger', icon: <LedgerIcon /> },
  { labelKey: 'incomeStatement', path: '/accounting/reports/income-statement', icon: <ResultIcon />, feature: 'accounting_statements' },
  { labelKey: 'balanceSheet', path: '/accounting/reports/balance-sheet', icon: <BilanIcon />, feature: 'accounting_statements' },
  { labelKey: 'sig', path: '/accounting/reports/sig', icon: <SIGIcon />, feature: 'accounting_statements' },
];

export default function AccountingNav({ title, subtitle, action }) {
  const navigate = useNavigate();
  const { t } = useTranslation(['accounting', 'common']);
  const { pathname } = useLocation();
  const { isFeatureLocked } = useModules();
  const lockedItem = (item) => item.feature && isFeatureLocked(item.feature);
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
      title: title || t('accounting:nav.defaultTitle'),
      actions: action || null
    });
  }, [title, action, setPageHeader, t]);

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
            flex: 1,
            minWidth: 0, // sans cela la barre garde la largeur de ses icônes et élargit toute la page sur téléphone
            overflowX: 'auto',
            pb: 0.5,
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': { borderRadius: 2, bgcolor: 'divider' },
          }}
        >
          {NAV_ITEMS.map((item, idx) => {
            const isActive = item.exact ? pathname === item.path : pathname.startsWith(item.path);
            return (
              <Tooltip key={item.path} title={t(`accounting:nav.${item.labelKey}`)} placement="bottom">
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
              label={lockedItem(item)
                ? <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, opacity: 0.6 }}>{t(`accounting:nav.${item.labelKey}`)}<LockIcon sx={{ fontSize: 13 }} /></Box>
                : t(`accounting:nav.${item.labelKey}`)}
              icon={React.cloneElement(item.icon, { fontSize: 'small' })}
              iconPosition="start"
              onClick={() => navigate(item.path)}
            />
          ))}
        </Tabs>
      )}

      <Tooltip title={t('accounting:nav.help')} placement="left">
        <IconButton size="small" onClick={() => openHelp(helpContext)} sx={{ ml: 'auto', flexShrink: 0 }}>
          <HelpIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      </Box>

      <Divider sx={{ mt: 1 }} />
    </Box>
  );
}
