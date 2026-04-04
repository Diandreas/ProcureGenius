import React, { createContext, useContext, useState } from 'react';
import AccountingHelpDrawer from '../components/accounting/AccountingHelpDrawer';

const AccountingHelpContext = createContext(null);

export const AccountingHelpProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState('journal_entry');

  const openHelp = (ctx = 'journal_entry') => {
    setContext(ctx);
    setOpen(true);
  };

  const closeHelp = () => setOpen(false);

  return (
    <AccountingHelpContext.Provider value={{ openHelp, closeHelp }}>
      {children}
      <AccountingHelpDrawer open={open} onClose={closeHelp} context={context} />
    </AccountingHelpContext.Provider>
  );
};

export const useAccountingHelp = () => {
  const ctx = useContext(AccountingHelpContext);
  if (!ctx) throw new Error('useAccountingHelp must be used within AccountingHelpProvider');
  return ctx;
};
