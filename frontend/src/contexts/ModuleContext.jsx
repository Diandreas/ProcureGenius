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

    // Cache local des modules : permet a la barre de navigation d'afficher les
    // memes boutons hors-ligne (sinon les modules echouent et les boutons
    // non-core disparaissent).
    const MODULES_CACHE_KEY = 'cached_modules_v1';

    const applyCachedModules = () => {
        try {
            const raw = localStorage.getItem(MODULES_CACHE_KEY);
            if (raw) {
                const cached = JSON.parse(raw);
                setModules(cached.module_codes || []);
                setModuleMetadata(cached.modules || []);
                return true;
            }
        } catch { /* ignore */ }
        return false;
    };

    const fetchModules = async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                setLoading(false);
                return;
            }

            // Affiche d'abord les modules en cache (instantane, fonctionne offline)
            applyCachedModules();

            const response = await api.get('/accounts/modules/');
            const data = response.data;
            const codes = data.module_codes || [];
            const meta = data.modules || [];
            setModules(codes);
            setModuleMetadata(meta);
            setError(null);
            // Mise en cache pour les prochains demarrages / le mode hors-ligne.
            try {
                localStorage.setItem(MODULES_CACHE_KEY, JSON.stringify({ module_codes: codes, modules: meta }));
            } catch { /* quota : ignore */ }
        } catch (err) {
            // Hors-ligne / erreur reseau : on garde les modules en cache (deja
            // appliques ci-dessus) au lieu de vider la barre de navigation.
            const hadCache = applyCachedModules();
            if (!hadCache) {
                console.error('Error fetching modules:', err);
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


