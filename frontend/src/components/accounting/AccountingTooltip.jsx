import React from 'react';
import { Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getAccountingHelp } from '../../constants/accountingHelp';

/**
 * Entoure un terme comptable d'un tooltip explicatif.
 * Usage : <AccountingTooltip term="debit">Débit</AccountingTooltip>
 */
const AccountingTooltip = ({ term, children }) => {
  const { t, i18n } = useTranslation(['accounting', 'common']);
  // Définitions par défaut (SYSCOHADA, FCFA), dans la langue de l'utilisateur
  const terms = React.useMemo(() => getAccountingHelp('syscohada', t, i18n.language).terms, [t, i18n.language]);
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
