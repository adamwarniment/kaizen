import axios, { AxiosResponse } from 'axios';

const api = axios.create({
    baseURL: '/api',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('kaizen_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
    return config;
});

export interface ApiToken {
    id: string;
    userId: string;
    name: string;
    tokenHash?: string;
    lastUsedAt?: string;
    createdAt: string;
}

// Type Definitions
export interface User {
    id: string;
    name: string;
    email: string;
    balance: number;
    weekStart?: 'SUNDAY' | 'MONDAY';
    createdAt: string;
}

export const updateUser = (data: Partial<User>) => api.put<User>('/users/me', data);

export interface Measure {
    id: string;
    userId: string;
    name: string;
    unit: string;
    icon?: string;
    color?: string;
    goals?: Goal[];
    entries?: Entry[];
    createdAt: string;
    updatedAt: string;
}

export interface Goal {
    id: string;
    userId: string;
    measureId: string;
    measure?: Measure;
    timeframe: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    type: 'TOTAL' | 'COUNT';
    targetValue: number;
    minPerEntry?: number;
    rewardAmount: number;
    createdAt: string;
}

export interface Entry {
    id: string;
    userId: string;
    measureId: string;
    measure?: Measure;
    value: number;
    date: string;
    createdAt: string;
}

export interface Transaction {
    id: string;
    userId: string;
    amount: number;
    type: 'REWARD' | 'CASHOUT' | 'BONUS' | 'MANUAL_CREDIT' | 'MANUAL_DEBIT' | 'CREDIT' | 'DEBIT';
    title: string;
    description?: string;
    notes?: string;
    createdAt: string;
}

// API Functions
export const signup = (data: any) => api.post<{ token: string, user: User }>('/auth/signup', data);
export const login = (data: any) => api.post<{ token: string, user: User }>('/auth/login', data);
export const getDemoUser = () => api.get<{ token: string, user: User }>('/auth/demo');
export const getUser = () => api.get<User>('/users/me');

export const getMeasures = () => api.get<Measure[]>('/measures');
export const createMeasure = (data: Partial<Measure>) => api.post<Measure>('/measures', data);
export const updateMeasure = (id: string, data: Partial<Measure>) => api.put<Measure>(`/measures/${id}`, data);
export const deleteMeasure = (id: string) => api.delete(`/measures/${id}`);

export const getGoals = () => api.get<Goal[]>('/goals');
export const createGoal = (data: Partial<Goal>) => api.post<Goal>('/goals', data);
export const deleteGoal = (id: string) => api.delete(`/goals/${id}`);

export const getEntries = (start?: string, end?: string) => api.get<Entry[]>('/entries', { params: { start, end } });
export const createEntry = (data: Partial<Entry>) => api.post<Entry>('/entries', data);
export const updateEntry = (id: string, data: Partial<Entry>) => api.put<Entry>(`/entries/${id}`, data);
export const deleteEntry = (id: string) => api.delete(`/entries/${id}`);

export const getHistory = () => api.get<Transaction[]>('/transactions');
export const cashout = (data: { amount: number }) => api.post<{ message: string, newBalance: number }>('/transactions/cashout', data);
export const createTransaction = (data: Partial<Transaction>) => api.post('/transactions', data);
export const updateTransaction = (id: string, data: Partial<Transaction>) => api.put(`/transactions/${id}`, data);
export const deleteTransaction = (id: string) => api.delete(`/transactions/${id}`);

export const getApiTokens = () => api.get<ApiToken[]>('/api-tokens');
export const createApiToken = (data: { name: string }) => api.post<{ token: string, name: string, id: string }>('/api-tokens', data);
export const deleteApiToken = (id: string) => api.delete(`/api-tokens/${id}`);

export default api;
