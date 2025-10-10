import { useState, useCallback } from 'react';

/**
 * Hook personnalisé pour gérer les notifications avec mascotte
 * Alternative à useSnackbar de notistack qui intègre automatiquement la mascotte
 */
export function useMascotSnackbar() {
    const [snackbars, setSnackbars] = useState([]);

    const enqueueSnackbar = useCallback((message, options = {}) => {
        const id = Date.now() + Math.random();
        const snackbar = {
            id,
            message,
            severity: options.variant || options.severity || 'info',
            autoHideDuration: options.autoHideDuration || 4000,
            open: true,
        };

        setSnackbars(prev => [...prev, snackbar]);

        // Auto-remove après la durée spécifiée
        if (snackbar.autoHideDuration) {
            setTimeout(() => {
                closeSnackbar(id);
            }, snackbar.autoHideDuration);
        }

        return id;
    }, []);

    const closeSnackbar = useCallback((id) => {
        setSnackbars(prev => prev.map(snackbar =>
            snackbar.id === id ? { ...snackbar, open: false } : snackbar
        ));

        // Remove completely after animation
        setTimeout(() => {
            setSnackbars(prev => prev.filter(snackbar => snackbar.id !== id));
        }, 300);
    }, []);

    return {
        enqueueSnackbar,
        closeSnackbar,
        snackbars,
    };
}

