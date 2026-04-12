import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import NotificationBell from './Notifications/NotificationBell';
import {
    Search,
    Bell,
    X,
    ClipboardList,
    Wallet,
    TrendingUp,
    User as UserIcon,
    Loader2,
    ChevronRight
} from 'lucide-react';
import Avatar from './ui/Avatar';
import api from '../api/axios';
import ThemeToggle from './ThemeToggle';

const Header = ({ className = '' }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setIsSearching(true);
                try {
                    const response = await api.get(`dashboard/donnees/search/?q=${searchQuery}`);
                    setResults(response.data);
                    setShowResults(true);
                } catch (error) {
                    console.error("Erreur de recherche:", error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setResults([]);
                setShowResults(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleResultClick = (url) => {
        navigate(url);
        setSearchQuery('');
        setShowResults(false);
    };

    const getIcon = (iconName) => {
        switch (iconName) {
            case 'ClipboardList': return <ClipboardList size={18} />;
            case 'Wallet': return <Wallet size={18} />;
            case 'TrendingUp': return <TrendingUp size={18} />;
            case 'User': return <UserIcon size={18} />;
            default: return <Search size={18} />;
        }
    };

    return (
        <header className={`
                fixed top-0 right-0 left-0 h-24 bg-white/70 dark:bg-slate-900/40 backdrop-blur-2xl 
                z-30 px-6 md:px-10 flex items-center justify-between transition-all duration-500
                border-b border-white/20 dark:border-slate-800/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]
                ${className}
            `}
        >
            {/* Search Bar - Premium Focus */}
            <div className="hidden sm:flex items-center flex-1 max-w-xl relative" ref={searchRef}>
                <div className="relative w-full group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-all duration-300 group-focus-within:scale-110">
                        <Search size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Rechercher une mission, un utilisateur..."
                        className="w-full pl-12 pr-12 py-3 bg-slate-100/50 dark:bg-slate-800/30 border border-transparent focus:border-blue-500/30 focus:bg-white dark:focus:bg-slate-800 rounded-2xl outline-none transition-all text-sm font-medium text-[var(--color-text-primary)] shadow-inner group-hover:shadow-md"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                        >
                            {isSearching ? <Loader2 size={18} className="animate-spin text-blue-500" /> : <X size={20} />}
                        </button>
                    )}
                </div>

                {/* Results Dropdown - Glass Style */}
                {showResults && (
                    <div className="absolute top-[calc(100%+12px)] left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-[24px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 z-50">
                        <div className="max-h-[450px] overflow-y-auto p-3 custom-scrollbar">
                            <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Résultats de recherche</p>
                            {results.length > 0 ? (
                                <div className="space-y-1">
                                    {results.map((res, idx) => (
                                        <button
                                            key={`${res.type}-${res.id}-${idx}`}
                                            className="w-full flex items-center gap-4 p-4 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 rounded-2xl transition-all text-left group border border-transparent hover:border-blue-500/10"
                                            onClick={() => handleResultClick(res.url)}
                                        >
                                            <div className={`
                                                p-3 rounded-xl shadow-sm transition-transform group-hover:scale-110 duration-300
                                                ${res.type === 'task' ? 'bg-amber-500/10 text-amber-500' : ''}
                                                ${res.type === 'expense' ? 'bg-red-500/10 text-red-600' : ''}
                                                ${res.type === 'income' ? 'bg-emerald-500/10 text-emerald-600' : ''}
                                                ${res.type === 'user' ? 'bg-blue-500/10 text-blue-600' : ''}
                                            `}>
                                                {getIcon(res.icon)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-[var(--color-text-primary)] group-hover:text-blue-500 transition-colors tracking-tight">{res.title}</p>
                                                <p className="text-[11px] text-[var(--color-text-muted)] font-black uppercase tracking-tighter mt-0.5">{res.subtitle}</p>
                                            </div>
                                            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ChevronRight size={16} className="text-blue-500" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-10 text-center">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Search size={24} className="text-slate-300" />
                                    </div>
                                    <p className="text-sm text-slate-400 font-bold tracking-tight">Aucun résultat pour "{searchQuery}"</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Actions */}
            <div className="flex sm:hidden items-center gap-2">
                <button className="p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <Search size={22} />
                </button>
            </div>

            {/* Global Actions */}
            <div className="flex items-center gap-3 md:gap-6 animate-slide-in-right">
                <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/30 p-1.5 rounded-2xl border border-white/10">
                    <ThemeToggle />
                    <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    <NotificationBell />
                </div>

                <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 hidden md:block"></div>

                {/* User Profile Mini - Premium Glass */}
                <div
                    className="flex items-center gap-4 pl-2 group cursor-pointer transition-all active:scale-95"
                    onClick={() => navigate('/profile')}
                >
                    <div className="text-right hidden sm:block">
                        <p className="text-[13px] font-black text-[var(--color-text-primary)] leading-none tracking-tight group-hover:text-blue-500 transition-colors">
                            {user?.username}
                        </p>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mt-1.5">
                            {user?.role}
                        </p>
                    </div>
                    <div className="relative">
                        <Avatar
                            src={user?.photo_url}
                            name={user?.username}
                            size="md"
                            className="ring-2 ring-transparent group-hover:ring-blue-500/50 transition-all duration-500 shadow-xl group-hover:scale-105"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-glow-emerald"></div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
