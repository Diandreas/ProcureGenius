import React from 'react';
import { Tooltip } from '@mui/material';
import { ACCOUNTING_TERMS } from '../../constants/accountingHelp';

/**
 * Entoure un terme comptable d'un tooltip explicatif.
 * Usage : <AccountingTooltip term="debit">Débit</AccountingTooltip>
 */
const AccountingTooltip = ({ term, children }) => {
  const definition = ACCOUNTING_TERMS[term];
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
