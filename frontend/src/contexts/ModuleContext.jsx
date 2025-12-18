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

            // #region agent log
            const requestUrl = '/accounts/modules/';
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                fetch('http://127.0.0.1:7242/ingest/dfaf7dec-d0bf-4b5b-b3ba-9ed78f29cc9a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ModuleContext.jsx:31', message: 'Before fetch modules request', data: { requestUrl, origin: window.location.origin }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
            }
            // #endregion

            // Utiliser axios au lieu de fetch pour une meilleure gestion d'erreur
            const response = await api.get(requestUrl);

            // #region agent log
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                fetch('http://127.0.0.1:7242/ingest/dfaf7dec-d0bf-4b5b-b3ba-9ed78f29cc9a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ModuleContext.jsx:38', message: 'After fetch modules response', data: { status: response.status, url: response.config.url }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
            }
            // #endregion

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


