import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api, { setAuthToken } from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = useCallback(async () => {
        try {
            const res = await api.get('users/me/');
            setUser(res.data);
        } catch (err) {
            console.error("Erreur chargement profil", err);
            setUser(null);
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setAuthToken(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            setAuthToken(token);
            fetchUser();
        } else {
            setLoading(false);
        }
    }, [fetchUser]);


    const login = useCallback(async (credentials) => {
        try {
            const res = await api.post('auth/token/', credentials);
            localStorage.setItem('access_token', res.data.access);
            localStorage.setItem('refresh_token', res.data.refresh);
            setAuthToken(res.data.access);
            await fetchUser();
            return { success: true };
        } catch (err) {
            return {
                success: false,
                error: err.response?.data?.detail || "Erreur de connexion"
            };
        }
    }, [fetchUser]);

    const logout = useCallback(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setAuthToken(null);
        setUser(null);
    }, []);

    // Écouter les erreurs 401 globales
    useEffect(() => {
        const handleUnauthorized = () => {
            logout();
        };
        window.addEventListener('unauthorized', handleUnauthorized);
        return () => window.removeEventListener('unauthorized', handleUnauthorized);
    }, [logout]);

    const hasRole = useCallback((roles) => {
        if (!user) return false;
        if (typeof roles === 'string') roles = [roles];
        return roles.includes(user.role?.toLowerCase());
    }, [user]);

    const value = {
        user,
        loading,
        login,
        logout,
        fetchUser,
        hasRole,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
