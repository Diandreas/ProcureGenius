import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const ModuleContext = createContext();

export const useModules = () => {
    const context = useContext(ModuleContext);
    if (!context) {
        throw new Error('useModules must be used within a ModuleProvider');
    }
    return context;
};

export const ModuleProvider = ({ children }) => {
    const [modules, setModules] = useState([]);
    const [moduleMetadata, setModuleMetadata] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchModules();
    }, []);

    const fetchModules = async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                setLoading(false);
                return;
            }

            // Utiliser axios au lieu de fetch pour une meilleure gestion d'erreur
            const response = await api.get('/accounts/modules/');
            const data = response.data;
            setModules(data.module_codes || []);
            setModuleMetadata(data.modules || []);
        } catch (err) {
            console.error('Error fetching modules:', err);
            // Si c'est une erreur de parsing JSON (réponse HTML), donner un message plus clair
            if (err.response) {
                const contentType = err.response.headers['content-type'] || '';
                if (contentType.includes('text/html')) {
                    setError('Le serveur a retourné une page HTML au lieu de JSON. Vérifiez la configuration du proxy.');
                    console.error('Response was HTML instead of JSON:', err.response.data?.substring?.(0, 200));
                } else {
                    setError(`Erreur HTTP ${err.response.status}: ${err.response.statusText}`);
                }
            } else {
                setError(err.message || 'Erreur lors du chargement des modules');
            }
        } finally {
            setLoading(false);
        }
    };

    const hasModule = (moduleCode) => {
        return modules.includes(moduleCode);
    };

    const hasAnyModule = (...moduleCodes) => {
        return moduleCodes.some(code => modules.includes(code));
    };

    const hasAllModules = (...moduleCodes) => {
        return moduleCodes.every(code => modules.includes(code));
    };

    const getModuleMetadata = (moduleCode) => {
        return moduleMetadata.find(m => m.code === moduleCode);
    };

    const refreshModules = () => {
        setLoading(true);
        fetchModules();
    };

    const value = {
        modules,
        moduleMetadata,
        loading,
        error,
        hasModule,
        hasAnyModule,
        hasAllModules,
        getModuleMetadata,
        refreshModules,
    };

    return (
        <ModuleContext.Provider value={value}>
            {children}
        </ModuleContext.Provider>
    );
};

export default ModuleContext;


