import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const SharedElementContext = createContext(null);

export function SharedElementProvider({ children }) {
  const [sharedElement, setSharedElement] = useState(null);
  const timeoutRef = useRef(null);

  // Enregistrer un élément partagé avec sa position et ses données
  const registerSharedElement = useCallback((id, rect, data = {}) => {
    // Annuler le timeout de nettoyage précédent
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setSharedElement({
      id,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
      data,
      timestamp: Date.now(),
    });

    // Nettoyer après 2 secondes si pas utilisé
    timeoutRef.current = setTimeout(() => {
      setSharedElement(null);
    }, 2000);
  }, []);

  // Récupérer et consommer l'élément partagé
  const consumeSharedElement = useCallback((expectedId) => {
    if (sharedElement && sharedElement.id === expectedId) {
      const element = sharedElement;
      // Ne pas nettoyer immédiatement pour permettre l'animation
      return element;
    }
    return null;
  }, [sharedElement]);

  // Nettoyer l'élément partagé
  const clearSharedElement = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setSharedElement(null);
  }, []);

  return (
    <SharedElementContext.Provider
      value={{
        sharedElement,
        registerSharedElement,
        consumeSharedElement,
        clearSharedElement
      }}
    >
      {children}
    </SharedElementContext.Provider>
  );
}

export function useSharedElement() {
  const context = useContext(SharedElementContext);
  if (!context) {
    throw new Error('useSharedElement must be used within a SharedElementProvider');
  }
  return context;
}

export default SharedElementContext;
