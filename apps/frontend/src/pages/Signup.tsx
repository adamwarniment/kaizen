import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Loader2, ArrowLeft, Sprout } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../services/api';
import { useAuth } from '../AuthContext';

const Signup = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { loginUser } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await signup({ name, email, password });
            loginUser(res.data.user, res.data.token);
            navigate('/');
        } catch (err) {
            alert('Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 kaizen-grid relative overflow-hidden">
            <div className="absolute -bottom-32 -right-32 w-[30rem] h-[30rem] rounded-full bg-accent/10 blur-3xl" />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md glass-card p-8 md:p-10 relative"
            >
                <div className="text-center mb-8">
                    <div className="w-14 h-14 kaizen-orbit rounded-full p-[3px] mx-auto mb-5"><div className="w-full h-full rounded-full bg-surface flex items-center justify-center"><Sprout size={24} className="text-accent-strong" /></div></div>
                    <p className="text-[10px] kaizen-eyebrow uppercase tracking-[.24em] font-semibold text-accent mb-2">Begin your practice</p>
                    <h1 className="text-5xl kaizen-wordmark text-ink-hi">Build gently.</h1>
                    <p className="text-ink-mid mt-3">Create a rhythm that makes progress inevitable.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-ink-hi mb-2">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input-field w-full py-3"
                            placeholder="John Doe"
                            required
                        />
                    </div>
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
                        {loading ? <Loader2 className="animate-spin" /> : <UserPlus size={20} />}
                        Create Account
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-ink-mid">
                    Already have an account? <Link to="/login" className="text-accent-strong hover:text-accent-strong">Sign In</Link>
                </div>
            </motion.div>
        </div>
    );
};

export default Signup;
