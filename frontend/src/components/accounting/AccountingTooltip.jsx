import React from 'react';
import { Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getAccountingHelp } from '../../constants/accountingHelp';
import accountingAPI from '../../services/accountingAPI';

// Référentiel de l'organisation (SYSCOHADA, PCG, SKR03…), demandé une seule fois pour tous les tooltips
let standardPromise = null;
let standardToken = null;
const loadStandard = () => {
  const token = localStorage.getItem('authToken');
  if (token !== standardToken) { standardPromise = null; standardToken = token; }
  if (!standardPromise) {
    standardPromise = accountingAPI.getChartStandard()
      .then((r) => r.data?.current || 'syscohada')
      .catch(() => { standardPromise = null; return 'syscohada'; });
  }
  return standardPromise;
};

/**
 * Entoure un terme comptable d'un tooltip explicatif.
 * Usage : <AccountingTooltip term="debit">Débit</AccountingTooltip>
 */
const AccountingTooltip = ({ term, children }) => {
  const { t, i18n } = useTranslation(['accounting', 'common']);
  // Définitions avec les comptes et la devise du plan de l'organisation (SYSCOHADA par défaut)
  const [standard, setStandard] = React.useState('syscohada');
  React.useEffect(() => {
    let actif = true;
    loadStandard().then((s) => { if (actif) setStandard(s); });
    return () => { actif = false; };
  }, []);
  const terms = React.useMemo(() => getAccountingHelp(standard, t, i18n.language).terms, [standard, t, i18n.language]);
  const definition = terms[term];
  if (!definition) return children;

  return (
    <Tooltip title={definition} arrow placement="top" enterDelay={200}>
      <span style={{ borderBottom: '1px dotted currentColor', cursor: 'help' }}>
        {children}
      </span>
    </Tooltip>
  );
};

export default AccountingTooltip;
