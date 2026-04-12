import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    ClipboardList,
    Wallet,
    Users,
    User,
    LogOut,
    Briefcase,
    Menu,
    X,
    Moon,
    Sun,
    ChevronLeft,
    BarChart3,
    Activity,
    GraduationCap,
    Lightbulb
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import Avatar from './ui/Avatar';

export default function Sidebar({ isOpen, setIsOpen }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const { unreadCount } = useNotifications();

    if (!user) return null;

    const canSeeAnalytics = ['admin', 'dg', 'comptable'].includes(user.role);
    const isAdminOrDG = ['admin', 'dg'].includes(user.role);
    const canSeeStudents = ['admin', 'dg', 'caisse'].includes(user.role);

    const navItems = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
        { to: '/tasks', icon: ClipboardList, label: 'Missions' },
        { to: '/expenses', icon: Wallet, label: 'Dépenses' },
        { to: '/finances', icon: Wallet, label: 'Finances' },
        ...(canSeeStudents ? [{ to: '/students', icon: GraduationCap, label: 'Étudiants' }] : []),
        ...(canSeeAnalytics ? [{ to: '/finances/analytics', icon: BarChart3, label: 'Rapports' }] : []),
        ...(isAdminOrDG ? [{ to: '/users', icon: Users, label: 'Utilisateurs' }] : []),
        ...(isAdminOrDG ? [{ to: '/audit', icon: Activity, label: 'Journal d\'Audit' }] : []),
        { to: '/feedback', icon: Lightbulb, label: user.role === 'admin' ? 'Boîte de Réception' : 'Boîte à Idées' },
        { to: '/profile', icon: User, label: 'Profil' },
    ];

    return (
        <>
            {/* Mobile Menu Trigger */}
            {!isOpen && (
                <button
                    className="fixed top-4 left-4 z-50 p-2.5 bg-[var(--color-bg-card)] rounded-xl shadow-xl lg:hidden border border-[var(--color-border)] text-slate-400 hover:text-blue-500 hover:scale-110 transition-all duration-300 backdrop-blur-md"
                    onClick={() => setIsOpen(true)}
                >
                    <Menu size={24} />
                </button>
            )}

            <aside
                className={`
                    fixed inset-y-0 left-0 z-40 w-72 bg-gradient-to-b from-slate-900 to-slate-950 text-slate-300 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) lg:translate-x-0
                    ${isOpen ? 'translate-x-0 shadow-[20px_0_60px_-15px_rgba(0,0,0,0.5)]' : '-translate-x-full'}
                    flex flex-col border-r border-white/5
                `}
            >
                {/* Mesh Gradient Decorative Background Overlay */}
                <div className="absolute inset-0 bg-mesh-slate opacity-10 pointer-events-none"></div>

                {/* Header/Logo Section */}
                <div className="h-24 flex items-center justify-between px-8 relative z-10 border-b border-white/5">
                    <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/dashboard')}>
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white shadow-2xl shadow-blue-600/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 relative">
                            <Briefcase size={26} />
                            <div className="absolute inset-0 bg-white/20 rounded-2xl animate-pulse"></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-white tracking-tighter leading-none">IPMF</span>
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-1">Système v2</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all transition-colors"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 overflow-y-auto py-8 px-5 space-y-2 relative z-10 custom-scrollbar">
                    <p className="px-4 mb-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">Menu Principal</p>
                    {navItems.map((item, idx) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/finances' || item.to === '/dashboard'}
                            className={({ isActive }) => `
                                flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden
                                ${isActive
                                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/40 font-bold scale-[1.02]'
                                    : 'hover:bg-white/5 hover:text-white hover:translate-x-1'
                                }
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    {/* Active Highlight Glow */}
                                    {isActive && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent animate-shine"></div>
                                    )}
                                    <item.icon
                                        size={22}
                                        className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400 group-hover:scale-110'} transition-all duration-300`}
                                    />
                                    <span className="tracking-tight">{item.label}</span>
                                    {isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_white]"></div>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer Section */}
                <div className="p-6 border-t border-white/5 space-y-6 relative z-10 bg-slate-950/50 backdrop-blur-xl">
                    {/* User Profile Card (Premium Glass) */}
                    <div
                        className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group"
                        onClick={() => navigate('/profile')}
                    >
                        <div className="relative">
                            <Avatar
                                src={user.photo_url}
                                name={user.username}
                                size="md"
                                className="ring-2 ring-blue-500/30 group-hover:ring-blue-500 transition-all duration-500"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-white truncate tracking-tight">{user.username}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{user.role}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={logout}
                            className="flex-1 flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-red-500/5 hover:bg-red-500 text-slate-400 hover:text-white transition-all duration-300 border border-red-500/10 hover:border-red-500 shadow-lg hover:shadow-red-500/20 group font-black uppercase text-[10px] tracking-widest"
                            title="Se déconnecter"
                        >
                            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                            <span>Déconnexion</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Premium Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-30 lg:hidden transition-all duration-500"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
