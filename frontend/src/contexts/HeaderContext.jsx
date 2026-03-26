import React, { createContext, useContext, useState, useCallback } from 'react';

const HeaderContext = createContext({
  headerConfig: { title: '', icon: null, actions: null },
  setHeaderConfig: () => {},
});

export const HeaderProvider = ({ children }) => {
  const [headerConfig, setHeaderConfig] = useState({
    title: '',
    icon: null,
    actions: null,
  });

  return (
    <HeaderContext.Provider value={{ headerConfig, setHeaderConfig }}>
      {children}
    </HeaderContext.Provider>
  );
};

export const useHeader = () => {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }

  // Helper function to easily set header configuration
  const setPageHeader = useCallback((config) => {
    context.setHeaderConfig(config);
  }, [context.setHeaderConfig]);

  return { ...context, setPageHeader };
};
