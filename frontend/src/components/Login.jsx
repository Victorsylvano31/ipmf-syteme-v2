import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, User, Lock, AlertCircle, Building2, Shield, TrendingUp, Eye, EyeOff, CheckCircle2, Users, Briefcase, BarChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    // Parallax effect on mouse move
    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePosition({
                x: (e.clientX / window.innerWidth - 0.5) * 20,
                y: (e.clientY / window.innerHeight - 0.5) * 20,
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const result = await login({ username, password });

        if (!result.success) {
            setError(result.error);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex font-sans bg-slate-50 dark:bg-[#121212] transition-colors duration-500">
            {/* Left Side - Branding & Illustration */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 dark:bg-[#0a0a0a]">
                {/* Mesh Gradient Background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/30 blur-[100px] animate-pulse"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px]"></div>
                    <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] rounded-full bg-cyan-500/20 blur-[90px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                </div>

                {/* Decorative Overlay */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJ6TTM0IDM0djJoMnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40"></div>

                <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full h-full">
                    {/* Logo & Brand */}
                    <div>
                        <motion.div 
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.6 }}
                            className="flex items-center gap-3 mb-8"
                        >
                            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                                <Building2 className="w-6 h-6 text-blue-300" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black tracking-tighter">IPMF</h1>
                                <p className="text-slate-300 text-sm font-medium">Système de Gestion Interne</p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Center - Main Visual (Parallax + Framer Motion) */}
                    <div className="flex-1 flex items-center justify-center">
                        <div className="max-w-md">
                            <div className="relative w-80 h-80 mx-auto">
                                {/* Central Element */}
                                <motion.div 
                                    style={{ x: mousePosition.x * 0.5, y: mousePosition.y * 0.5 }}
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/5 backdrop-blur-xl rounded-full border border-white/20 flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.3)] z-20"
                                >
                                    <Shield className="w-16 h-16 text-blue-300 drop-shadow-lg" />
                                </motion.div>

                                {/* Orbiting Elements */}
                                <motion.div 
                                    style={{ x: mousePosition.x * 1.5, y: mousePosition.y * 1.5 }}
                                    className="absolute -top-4 left-1/2 -translate-x-1/2 w-20 h-20 z-30 group"
                                >
                                    <motion.div 
                                        animate={{ y: [0, -15, 0] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                        className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl rotate-12 shadow-2xl opacity-90 flex items-center justify-center backdrop-blur-md border border-white/10"
                                    >
                                        <TrendingUp className="w-10 h-10 text-white group-hover:scale-110 transition-transform -rotate-12" />
                                    </motion.div>
                                </motion.div>

                                <motion.div 
                                    style={{ x: mousePosition.x * -1, y: mousePosition.y * -1 }}
                                    className="absolute bottom-4 left-4 w-24 h-24 z-10 group"
                                >
                                    <motion.div 
                                        animate={{ y: [0, 15, 0] }}
                                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                        className="w-full h-full bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full shadow-[0_0_30px_rgba(34,211,238,0.4)] opacity-80 flex items-center justify-center backdrop-blur-md border border-white/10"
                                    >
                                        <Users className="w-10 h-10 text-white group-hover:scale-110 transition-transform" />
                                    </motion.div>
                                </motion.div>

                                <motion.div 
                                    style={{ x: mousePosition.x * 0.8, y: mousePosition.y * 1.2 }}
                                    className="absolute bottom-4 -right-4 w-20 h-20 z-20 group"
                                >
                                    <motion.div 
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                                        className="w-full h-full bg-gradient-to-br from-indigo-500 to-blue-700 rounded-2xl -rotate-12 shadow-2xl opacity-90 flex items-center justify-center backdrop-blur-md border border-white/10"
                                    >
                                        <Briefcase className="w-8 h-8 text-white group-hover:scale-110 transition-transform rotate-12" />
                                    </motion.div>
                                </motion.div>

                                <motion.div 
                                    style={{ x: mousePosition.x * -1.5, y: mousePosition.y * -0.5 }}
                                    className="absolute top-12 -right-8 w-16 h-16 z-10 group"
                                >
                                    <motion.div 
                                        animate={{ y: [0, 20, 0] }}
                                        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                                        className="w-full h-full bg-gradient-to-br from-blue-400 to-cyan-300 rounded-xl rotate-45 shadow-2xl opacity-80 flex items-center justify-center backdrop-blur-md border border-white/10"
                                    >
                                        <BarChart className="w-7 h-7 text-white group-hover:scale-110 transition-transform -rotate-45" />
                                    </motion.div>
                                </motion.div>
                            </div>

                            <motion.div 
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.8 }}
                                className="text-center mt-12"
                            >
                                <h2 className="text-3xl font-bold mb-4 tracking-tight">
                                    Plateforme de Gestion Intégrée
                                </h2>
                                <p className="text-slate-300 text-lg leading-relaxed font-light">
                                    Gérez vos missions, finances et équipes en toute sécurité avec notre solution professionnelle.
                                </p>
                            </motion.div>
                        </div>
                    </div>

                    {/* Footer Features */}
                    <div className="grid grid-cols-3 gap-6">
                        <motion.div whileHover={{ y: -5 }} className="text-center transition-transform cursor-default">
                            <div className="text-3xl font-black mb-1 text-white tracking-tighter">100%</div>
                            <div className="text-blue-300/80 text-[10px] uppercase font-bold tracking-widest">Sécurisé</div>
                        </motion.div>
                        <motion.div whileHover={{ y: -5 }} className="text-center transition-transform cursor-default">
                            <div className="text-3xl font-black mb-1 text-white tracking-tighter">24/7</div>
                            <div className="text-blue-300/80 text-[10px] uppercase font-bold tracking-widest">Disponible</div>
                        </motion.div>
                        <motion.div whileHover={{ y: -5 }} className="text-center transition-transform cursor-default">
                            <div className="text-3xl font-black mb-1 text-white tracking-tighter">5+</div>
                            <div className="text-blue-300/80 text-[10px] uppercase font-bold tracking-widest">Modules</div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
                {/* Mobile Logo */}
                <div className="lg:hidden absolute top-8 left-8 flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">IPMF</span>
                </div>

                <motion.div 
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className="w-full max-w-md"
                >
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800/50 p-8 lg:p-10 transition-colors duration-500">
                        {/* Header */}
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Connexion</h2>
                            <p className="text-slate-500 dark:text-slate-400">Accédez à votre espace de gestion</p>
                        </div>

                        {/* Skeleton loader for transition state */}
                        {isLoading ? (
                            <div className="space-y-6 animate-pulse">
                                <div className="h-[60px] bg-slate-100 dark:bg-slate-800 rounded-xl w-full"></div>
                                <div className="h-[60px] bg-slate-100 dark:bg-slate-800 rounded-xl w-full"></div>
                                <div className="flex justify-between items-center h-5">
                                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3"></div>
                                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/4"></div>
                                </div>
                                <div className="h-[56px] bg-blue-100 dark:bg-blue-900/40 rounded-xl w-full"></div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <AnimatePresence mode='wait'>
                                    {error && (
                                        <motion.div 
                                            initial={{ x: -10, opacity: 0 }}
                                            animate={{ x: [-10, 10, -10, 10, 0], opacity: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.4 }}
                                            className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 rounded-xl text-sm"
                                        >
                                            <AlertCircle size={20} className="flex-shrink-0" />
                                            <span>{error}</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="relative group/field">
                                    <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors z-20 ${username ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'} group-focus-within/field:text-blue-600 dark:group-focus-within/field:text-blue-400`}>
                                        <User size={20} />
                                    </div>
                                    <input
                                        type="text"
                                        id="username"
                                        className={`peer w-full pl-12 pr-12 py-4 bg-transparent border-2 rounded-xl outline-none transition-all text-slate-900 dark:text-white shadow-sm z-10 relative 
                                        ${username === '' && error ? 'border-red-300 dark:border-red-800/50 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500'} 
                                        focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] dark:focus:shadow-[0_0_15px_rgba(59,130,246,0.1)]`}
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        required
                                        autoFocus
                                        aria-label="Nom d'utilisateur"
                                    />
                                    <label 
                                        htmlFor="username"
                                        className={`absolute text-sm duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-[#1e1e1e] px-2 left-10 font-medium pointer-events-none transition-colors
                                        ${username ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 top-4 scale-100'} 
                                        peer-focus:px-2 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:top-2 peer-focus:text-blue-600 dark:peer-focus:text-blue-400`}
                                    >
                                        Nom d'utilisateur
                                    </label>
                                    
                                    <AnimatePresence>
                                        {username.length > 2 && (
                                            <motion.div 
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-green-500 z-20"
                                            >
                                                <CheckCircle2 size={18} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="relative group/field mt-6">
                                    <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors z-20 ${password ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'} group-focus-within/field:text-blue-600 dark:group-focus-within/field:text-blue-400`}>
                                        <Lock size={20} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        className={`peer w-full pl-12 pr-12 py-4 bg-transparent border-2 rounded-xl outline-none transition-all text-slate-900 dark:text-white shadow-sm z-10 relative
                                        ${password === '' && error ? 'border-red-300 dark:border-red-800/50 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500'}
                                        focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] dark:focus:shadow-[0_0_15px_rgba(59,130,246,0.1)]`}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        aria-label="Mot de passe"
                                    />
                                    <label 
                                        htmlFor="password"
                                        className={`absolute text-sm duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-[#1e1e1e] px-2 left-10 font-medium pointer-events-none transition-colors
                                        ${password ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 top-4 scale-100'} 
                                        peer-focus:px-2 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:top-2 peer-focus:text-blue-600 dark:peer-focus:text-blue-400`}
                                    >
                                        Mot de passe
                                    </label>
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center z-20">
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none"
                                            title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                                            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                                        >
                                            <AnimatePresence mode="wait" initial={false}>
                                                <motion.div
                                                    key={showPassword ? "hide" : "show"}
                                                    initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                                                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                                    exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                                                    transition={{ duration: 0.15 }}
                                                >
                                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </motion.div>
                                            </AnimatePresence>
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center mt-4">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={rememberMe}
                                                onChange={e => setRememberMe(e.target.checked)}
                                                className="peer w-5 h-5 appearance-none rounded-lg border-2 border-slate-300 dark:border-slate-600 checked:bg-blue-600 checked:border-blue-600 dark:checked:bg-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none cursor-pointer transition-all"
                                                aria-label="Se souvenir de moi"
                                            />
                                            <svg className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M2 7.5L5.5 11L12 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                                            Se souvenir de moi
                                        </span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => alert("Veuillez contacter l'administrateur système pour réinitialiser votre mot de passe.")}
                                        className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline underline-offset-4 transition-all focus:outline-none rounded"
                                    >
                                        Mot de passe oublié ?
                                    </button>
                                </div>

                                <motion.button
                                    whileHover={{ scale: (username && password) ? 1.03 : 1, filter: (username && password) ? "brightness(1.1)" : "brightness(1)" }}
                                    whileTap={{ scale: (username && password) ? 0.96 : 1 }}
                                    type="submit"
                                    disabled={isLoading || !username || !password}
                                    className={`w-full py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group focus:outline-none focus:ring-4 focus:ring-blue-500/30
                                    ${(!username || !password) 
                                        ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none' 
                                        : 'bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white shadow-blue-500/30 dark:shadow-blue-900/40 hover:shadow-xl dark:border-t dark:border-white/10'}`}
                                >
                                    <span className="font-semibold text-lg">Se connecter</span>
                                    <LogIn className={`w-5 h-5 transition-transform ${(!username || !password) ? '' : 'group-hover:translate-x-1'}`} />
                                </motion.button>
                            </form>
                        )}

                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/50 text-center">
                            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                                © 2026 IPMF - Institut Professionnel
                            </p>
                        </div>
                    </div>

                    {/* Admin Link */}
                    <div className="mt-6 text-center">
                        <a
                            href={`${(process.env.REACT_APP_API_URL || '').replace(/\/api\/?$/, '') || 'http://127.0.0.1:8000'}/admin/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline underline-offset-4 transition-all inline-flex items-center gap-2 group focus:outline-none rounded px-2"
                        >
                            <Shield size={16} className="group-hover:animate-pulse" />
                            Espace d'Administration
                        </a>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

