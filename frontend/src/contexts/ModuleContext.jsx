import React, { createContext, useContext, useState, useEffect } from 'react';

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

            const response = await fetch('/api/v1/accounts/modules/', {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setModules(data.module_codes || []);
                setModuleMetadata(data.modules || []);
            } else {
                console.error('Failed to fetch modules');
            }
        } catch (err) {
            console.error('Error fetching modules:', err);
            setError(err.message);
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


