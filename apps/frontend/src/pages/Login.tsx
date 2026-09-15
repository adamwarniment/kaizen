import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, Loader2, Sprout } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { login, getDemoUser } from '../services/api';
import { useAuth } from '../AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { loginUser } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await login({ email, password });
            loginUser(res.data.user, res.data.token);
            navigate('/');
        } catch (err) {
            alert('Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    const handleDemo = async () => {
        setLoading(true);
        try {
            const res = await getDemoUser();
            loginUser(res.data.user, res.data.token);
            navigate('/');
        } catch (err) {
            alert('Demo failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 kaizen-grid relative overflow-hidden">
            <div className="absolute -top-32 -left-32 w-[30rem] h-[30rem] rounded-full bg-accent/10 blur-3xl" />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md glass-card p-8 md:p-10 relative"
            >
                <div className="text-center mb-8">
                    <div className="w-14 h-14 kaizen-orbit rounded-full p-[3px] mx-auto mb-5"><div className="w-full h-full rounded-full bg-surface flex items-center justify-center"><Sprout size={24} className="text-accent-strong" /></div></div>
                    <p className="text-[10px] kaizen-eyebrow uppercase tracking-[.24em] font-semibold text-accent mb-2">A practice for progress</p>
                    <h1 className="text-5xl kaizen-wordmark text-ink-hi">Welcome back.</h1>
                    <p className="text-ink-mid mt-3">Small improvements become a life you can feel.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-ink-hi mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-field w-full py-3"
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-ink-hi mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-field w-full py-3"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full py-4 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <LogIn size={20} />}
                        Sign In
                    </button>
                </form>

                <div className="mt-6 flex flex-col gap-4">
                    <button
                        onClick={handleDemo}
                        className="w-full py-4 bg-raise/[.045] hover:bg-raise/[.08] border border-hairline/10 rounded-xl font-semibold transition-all"
                    >
                        Try Demo
                    </button>
                    <div className="text-center text-sm text-ink-mid">
                        Don't have an account? <Link to="/signup" className="text-accent-strong hover:text-accent-strong">Sign Up</Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
