/**
 * Hook pour gérer les raccourcis clavier globaux
 * Supporte Mac (Cmd) et Windows/Linux (Ctrl)
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key;
      const ctrl = event.ctrlKey || event.metaKey; // Support Mac Command key
      const alt = event.altKey;

      // Ne pas intercepter les raccourcis dans les champs de saisie
      const isInputField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);
      const isContentEditable = event.target.isContentEditable;

      // Alt+1-4 : Navigation entre modules (toujours actif)
      if (alt && !ctrl && key >= '1' && key <= '4') {
        event.preventDefault();
        const routes = ['/dashboard', '/suppliers', '/purchase-orders', '/invoices'];
        const index = parseInt(key) - 1;
        if (routes[index]) {
          navigate(routes[index]);
        }
        return;
      }

      // Ctrl/Cmd+K : Ouvrir la recherche globale
      if (ctrl && key === 'k') {
        event.preventDefault();
        // Déclencher l'événement personnalisé pour ouvrir la recherche
        window.dispatchEvent(new CustomEvent('openGlobalSearch'));
        return;
      }

      // Ctrl/Cmd+/ : Ouvrir l'aide
      if (ctrl && key === '/') {
        event.preventDefault();
        navigate('/help');
        return;
      }

      // Les raccourcis suivants ne fonctionnent pas dans les champs de saisie
      if (isInputField || isContentEditable) {
        return;
      }

      // Ctrl/Cmd+S : Enregistrer (seulement dans les formulaires)
      if (ctrl && key === 's') {
        event.preventDefault();
        // Déclencher l'événement personnalisé pour enregistrer
        window.dispatchEvent(new CustomEvent('saveForm'));
        return;
      }

      // Ctrl/Cmd+N : Nouveau (contextuel)
      if (ctrl && key === 'n') {
        event.preventDefault();
        // Déclencher l'événement personnalisé pour créer un nouveau document
        window.dispatchEvent(new CustomEvent('createNew'));
        return;
      }
    };

    // Ajouter l'écouteur d'événements
    window.addEventListener('keydown', handleKeyDown);

    // Nettoyer à la fin
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);
};

export default useKeyboardShortcuts;
