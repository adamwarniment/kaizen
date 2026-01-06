import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUser, getDemoUser, User } from './services/api';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    loginUser: (userData: User, token: string) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const loginUser = (userData: User, token: string) => {
        localStorage.setItem('kaizen_token', token);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('kaizen_token');
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const res = await getUser();
            setUser(res.data);
        } catch (e) {
            logout();
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('kaizen_token');
            if (token) {
                try {
                    const res = await getUser();
                    setUser(res.data);
                } catch (e) {
                    localStorage.removeItem('kaizen_token');
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, loginUser, logout, refreshUser, setUser }}>
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
