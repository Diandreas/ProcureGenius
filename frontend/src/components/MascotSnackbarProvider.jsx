import React, { createContext, useContext } from 'react';
import { Box } from '@mui/material';
import { useMascotSnackbar } from '../hooks/useMascotSnackbar';
import MascotSnackbar from './MascotSnackbar';

const MascotSnackbarContext = createContext();

/**
 * Provider pour les notifications avec mascotte
 * Wrapper autour du hook useMascotSnackbar
 */
export function MascotSnackbarProvider({ children }) {
    const { enqueueSnackbar, closeSnackbar, snackbars } = useMascotSnackbar();

    return (
        <MascotSnackbarContext.Provider value={{ enqueueSnackbar, closeSnackbar }}>
            {children}

            {/* Render all snackbars */}
            <Box>
                {snackbars.map((snackbar, index) => (
                    <Box
                        key={snackbar.id}
                        sx={{
                            position: 'fixed',
                            top: 16 + (index * 72), // Stack them vertically
                            right: 16,
                            zIndex: 10000,
                        }}
                    >
                        <MascotSnackbar
                            open={snackbar.open}
                            onClose={() => closeSnackbar(snackbar.id)}
                            severity={snackbar.severity}
                            message={snackbar.message}
                            autoHideDuration={snackbar.autoHideDuration}
                        />
                    </Box>
                ))}
            </Box>
        </MascotSnackbarContext.Provider>
    );
}

/**
 * Hook pour utiliser le contexte MascotSnackbar
 */
export function useEnhancedSnackbar() {
    const context = useContext(MascotSnackbarContext);
    if (!context) {
        throw new Error('useEnhancedSnackbar must be used within MascotSnackbarProvider');
    }
    return context;
}

