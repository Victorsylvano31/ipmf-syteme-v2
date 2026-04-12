import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    CheckCircle,
    AlertCircle,
    Info,
    ClipboardList,
    Wallet,
    XCircle,
    CheckCheck,
    Filter,
    ArrowLeft
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import styles from '../components/Notifications/NotificationBell.module.css';

const NotificationsPage = () => {
    const { notifications, markAsRead, markAllAsRead, refresh } = useNotifications();
    const [filter, setFilter] = useState('all');
    const navigate = useNavigate();

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'all') return true;
        if (filter === 'unread') return !n.is_read;
        return n.type === filter;
    });

    const getIcon = (type) => {
        switch (type) {
            case 'task': return <ClipboardList size={20} />;
            case 'finance': return <Wallet size={20} />;
            case 'success': return <CheckCircle size={20} />;
            case 'warning': return <AlertCircle size={20} />;
            case 'error': return <XCircle size={20} />;
            default: return <Info size={20} />;
        }
    };

    const getIconClass = (type) => {
        switch (type) {
            case 'task': return styles.iconTask;
            case 'finance': return styles.iconFinance;
            case 'warning': return styles.iconWarning;
            case 'error': return styles.iconError;
            default: return styles.iconInfo;
        }
    };

    const handleNotificationClick = async (notif) => {
        if (!notif.is_read) {
            await markAsRead(notif.id);
        }
        if (notif.link) {
            navigate(notif.link);
        }
    };


    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Premium Strategic Banner (Version Slim) */}
            <div className="relative overflow-hidden rounded-[24px] bg-slate-950 bg-mesh-slate p-6 lg:p-8 shadow-xl animate-slide-up border border-white/10 mb-8">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

                <div className="absolute top-0 right-0 p-4 z-20 flex flex-wrap gap-2 justify-end items-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        className="text-white bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full px-5 border border-white/10 font-bold h-9 transition-all text-[11px] group"
                    >
                        <CheckCheck size={14} className="mr-2 group-hover:scale-110 transition-transform" />
                        <span>Tout marquer lu</span>
                    </Button>
                </div>

                <header className="relative z-10 flex items-center gap-6">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 p-0 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-xl flex-shrink-0"
                    >
                        <ArrowLeft size={20} />
                    </Button>
                    <div className="space-y-1">
                        <Badge variant="outline" className="bg-blue-500/20 text-blue-200 border-blue-400/30 backdrop-blur-xl px-2 py-0.5 font-black tracking-[0.1em] uppercase text-[9px] w-fit">
                            COMMUNICATIONS
                        </Badge>
                        <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
                            Mes <span className="text-blue-200">Notifications</span>
                        </h1>
                    </div>
                </header>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                {[
                    { id: 'all', label: 'Toutes' },
                    { id: 'unread', label: 'Non lues' },
                    { id: 'task', label: 'Missions' },
                    { id: 'finance', label: 'Finances' }
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setFilter(item.id)}
                        className={`
                            px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap
                            ${filter === item.id
                                ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-lg scale-105'
                                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-blue-500/50'}
                        `}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                {filteredNotifications.length === 0 ? (
                    <div className="py-20 px-6 text-center text-slate-400 dark:text-slate-500">
                        <Bell size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold">Aucune notification trouvée</p>
                    </div>
                ) : (
                    filteredNotifications.map((notif) => (
                        <div
                            key={notif.id}
                            className={`
                                p-5 border-b border-slate-100 dark:border-slate-800/50 cursor-pointer transition-all flex gap-4 relative
                                ${!notif.is_read ? 'bg-blue-50/50 dark:bg-blue-500/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                            `}
                            onClick={() => handleNotificationClick(notif)}
                        >
                            {!notif.is_read && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                            )}
                            <div className={`${styles.iconWrapper} ${getIconClass(notif.type)} flex-shrink-0 w-11 h-11`}>
                                {getIcon(notif.type)}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="text-[15px] font-bold text-slate-900 dark:text-white leading-tight">{notif.title}</h4>
                                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: fr })}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                    {notif.message}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
