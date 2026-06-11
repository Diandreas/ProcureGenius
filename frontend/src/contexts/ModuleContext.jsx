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
    const [planModules, setPlanModules] = useState([]); // modules disponibles selon le plan
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
                if (cached.plan_modules) setPlanModules(cached.plan_modules);
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
            const planMods = data.plan_modules || codes;
            setModules(codes);
            setModuleMetadata(meta);
            setPlanModules(planMods);
            setError(null);
            // Mise en cache pour les prochains demarrages / le mode hors-ligne.
            try {
                localStorage.setItem(MODULES_CACHE_KEY, JSON.stringify({ module_codes: codes, modules: meta, plan_modules: planMods }));
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

    // Module REELLEMENT actif = active par l'utilisateur ET disponible dans le
    // plan. (Corrige le cas d'un module herite—ex. contracts en Gratuit—qui ne
    // doit pas etre traite comme actif.)
    const hasModule = (moduleCode) => {
        const enabled = modules.includes(moduleCode);
        if (!planModules || planModules.length === 0) return enabled; // fallback offline
        return enabled && planModules.includes(moduleCode);
    };

    // Module verrouille = pas disponible dans le plan actif (a griser + cadenas
    // pour inciter a l'upgrade). 'dashboard' n'est jamais verrouille.
    const isLocked = (moduleCode) => {
        if (!planModules || planModules.length === 0) return false;
        if (moduleCode === 'dashboard') return false;
        return !planModules.includes(moduleCode);
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
        planModules,
        loading,
        error,
        hasModule,
        isLocked,
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


