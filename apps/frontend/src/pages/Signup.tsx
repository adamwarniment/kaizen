import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Loader2, ArrowLeft } from 'lucide-react';
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
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0f]">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md glass p-8"
            >
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Join Kaizen</h1>
                    <p className="text-slate-400 mt-2">Start earning rewards for your progress.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            placeholder="John Doe"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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

                <div className="mt-8 text-center text-sm text-slate-400">
                    Already have an account? <Link to="/login" className="text-emerald-400 hover:text-emerald-300">Sign In</Link>
                </div>
            </motion.div>
        </div>
    );
};

export default Signup;
