import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';

let cachedUser = null;

/**
 * Hook simple pour récupérer le profil utilisateur courant.
 * Met en cache le résultat pour éviter des appels API répétés.
 */
const useCurrentUser = () => {
    const [user, setUser] = useState(cachedUser);
    const [loading, setLoading] = useState(!cachedUser);

    useEffect(() => {
        if (cachedUser) {
            setUser(cachedUser);
            setLoading(false);
            return;
        }
        authAPI.getProfile()
            .then(res => {
                cachedUser = res.data;
                setUser(res.data);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const isAdmin = ['admin', 'manager', 'owner'].includes(user?.role);
    const isBiologist = user?.role === 'biologist';
    const canManageLab = isAdmin || isBiologist;

    return { user, loading, isAdmin, isBiologist, canManageLab };
};

export default useCurrentUser;
