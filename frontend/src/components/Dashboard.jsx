import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    ClipboardList,
    ArrowRight,
    Activity,
    Clock as ClockIcon,
    CheckCircle,
    Shield,
    Calendar,
    Wallet,
    RefreshCw,
    ChevronRight,
    AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import api from '../api/axios';
import { KpiCard, Skeleton } from './Dashboard/DashboardComponents';

// Import specialized dashboards
import DashboardDG from './Dashboard/DashboardDG';
import DashboardComptable from './Dashboard/DashboardComptable';
import DashboardCaisse from './Dashboard/DashboardCaisse';

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (!user) return;
        if (isRefresh) setRefreshing(true);
        try {
            const res = await api.get('dashboard/donnees/overview/');
            setData(res.data);
        } catch (err) {
            console.error("Dashboard stats error", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        fetchData();
        return () => {
            clearInterval(timer);
        };
    }, [fetchData]);

    const formatTime = (date) => {
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    // Role-based Router Logic
    if (user?.role === 'dg') return <DashboardDG />;
    if (user?.role === 'comptable') return <DashboardComptable />;
    if (user?.role === 'caisse') return <DashboardCaisse />;

    // Default / Admin / Agent Dashboard
    if (loading && !data) {
        return (
            <div className="space-y-8 pb-10">
                <Skeleton className="w-full h-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <KpiCard key={i} loading />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Skeleton className="w-full h-96" />
                    <Skeleton className="w-full h-96" />
                </div>
            </div>
        );
    }

    const kpiIcons = [ClipboardList, CheckCircle, Wallet, Shield];

    return (
        <div className="space-y-10 pb-10">
            {/* Welcome Header with Mesh Gradient Background */}
            <div className="relative overflow-hidden rounded-[32px] bg-mesh-blue p-10 lg:p-12 shadow-2xl animate-slide-up">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-400/10 rounded-full blur-[100px] -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] -ml-32 -mb-32" />

                <div className="absolute top-0 right-0 p-6 z-20">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchData(true)}
                        className="text-white/60 hover:text-white hover:bg-white/10 backdrop-blur-md rounded-full px-4"
                        disabled={refreshing}
                    >
                        <RefreshCw size={16} className={`${refreshing ? 'animate-spin' : ''} mr-2`} /> Actualiser
                    </Button>
                </div>

                <header className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <Badge variant="outline" className="bg-white/5 text-white/80 border-white/10 backdrop-blur-sm px-3 py-1 font-semibold tracking-wider uppercase text-[10px]">
                            Espace de Travail Sécurisé
                        </Badge>
                        <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter leading-tight">
                            Bonjour, {user?.full_name || user?.username} <span className="inline-block animate-bounce-slow">👋</span>
                        </h1>
                        <p className="text-slate-300 font-medium text-xl max-w-xl">
                            Heureux de vous revoir. <span className="text-white font-bold">{data?.kpis?.[0]?.value || '0'} nouvelles missions</span> requièrent votre attention aujourd'hui.
                        </p>
                    </div>

                    <div className="flex items-center gap-6 bg-white/5 backdrop-blur-xl p-6 rounded-[24px] border border-white/10 shadow-2xl glass-card">
                        <div className="w-16 h-16 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-inner">
                            <ClockIcon size={32} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-3xl font-black text-white tabular-nums tracking-tighter">{formatTime(currentTime)}</p>
                            <p className="text-[11px] font-black text-blue-300 uppercase tracking-[0.2em]">{formatDate(currentTime)}</p>
                        </div>
                    </div>
                </header>
            </div>

            {/* Stats Overview with Staggered Animation */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-slide-up stagger-1">
                {data?.kpis?.map((kpi, idx) => (
                    <KpiCard
                        key={idx}
                        {...kpi}
                        icon={kpiIcons[idx] || Activity}
                    />
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* Dashboard Main Column (8 columns) - Reordered for impact */}
                <div className="lg:col-span-8 space-y-10 animate-slide-up stagger-2">
                    {/* RECENT ACTIVITY - Premium Table */}
                    <Card className="border-none shadow-xl bg-[var(--color-bg-card)] overflow-hidden rounded-[28px] glass-card">
                        <CardHeader className="flex flex-row items-center justify-between p-8 border-b border-[var(--color-border-light)] bg-white/5">
                            <div>
                                <CardTitle className="text-xl font-black tracking-tight">Activité Récente</CardTitle>
                                <p className="text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-widest mt-1">Flux de travail en temps réel</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')} className="text-blue-500 font-black text-xs hover:bg-blue-500/5 px-4 rounded-full">
                                Tout voir <ChevronRight size={14} className="ml-1" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-[var(--color-border-light)]">
                                {data?.recent_activity?.length > 0 ? (
                                    data.recent_activity.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-6 hover:bg-slate-500/5 transition-all group cursor-pointer" onClick={() => navigate(item.numero ? `/tasks/${item.id}` : '#')}>
                                            <div className="flex items-center gap-5">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${item.statut === 'terminee' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                    <ClipboardList size={22} />
                                                </div>
                                                <div>
                                                    <p className="text-base font-extrabold text-[var(--color-text-primary)] group-hover:text-blue-500 transition-colors tracking-tight">{item.titre || item.motif}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs font-bold text-blue-500/80">{item.numero}</span>
                                                        <span className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-widest">• {new Date(item.date_creation || item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant={item.statut === 'terminee' || item.statut === 'validee' ? 'success' : 'primary'} size="sm" className="font-black px-4 py-1 rounded-full uppercase text-[10px] tracking-widest shadow-sm">
                                                {item.statut}
                                            </Badge>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-16 text-center text-[var(--color-text-muted)]">
                                        <ClipboardList size={40} className="mx-auto mb-4 opacity-20" />
                                        <p className="text-sm font-bold">Aucune activité récente à afficher.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* UPCOMING REMINDERS - Styled as Promo Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-8 rounded-[32px] bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl relative overflow-hidden group cursor-pointer" onClick={() => navigate('/calendar')}>
                            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-1000" />
                            <Calendar className="text-white/90 mb-6" size={32} />
                            <h3 className="text-xl font-black mb-2 tracking-tight">Missions à venir</h3>
                            <p className="text-sm text-blue-100 font-medium leading-relaxed mb-6 opacity-80">Gérez votre emploi du temps et optimisez vos déplacements stratégiques.</p>
                            <span className="flex items-center text-xs font-bold uppercase tracking-[0.2em] group-hover:gap-3 transition-all">
                                Consulter l'agenda <ArrowRight size={16} className="ml-2" />
                            </span>
                        </div>

                        <Card className="p-8 rounded-[32px] border-none shadow-xl bg-[var(--color-bg-card)] relative overflow-hidden group glass-card">
                            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[var(--color-bg-hover)] rounded-full group-hover:scale-150 transition-transform duration-1000" />
                            <CheckCircle className="text-emerald-500 mb-6 relative z-10" size={32} />
                            <h3 className="text-xl font-black mb-2 tracking-tight relative z-10">Performance</h3>
                            <p className="text-sm text-[var(--color-text-muted)] font-medium leading-relaxed mb-6 relative z-10">Vous avez accompli <span className="text-[var(--color-text-primary)] font-black">80%</span> de vos objectifs ce mois-ci.</p>
                            <div className="h-2 w-full bg-[var(--color-bg-hover)] rounded-full overflow-hidden relative z-10 mb-2">
                                <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] w-[80%] transition-all duration-1000 delay-500" />
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Dashboard Side Column (4 columns) */}
                <div className="lg:col-span-4 space-y-10 animate-slide-up stagger-3">
                    {/* STRATEGIC ALERTS - Premium Style */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-[11px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">Alertes de Priorité</h2>
                            <Activity size={14} className="text-blue-500" />
                        </div>
                        <div className="space-y-4">
                            {data?.strategic_alerts?.length > 0 ? (
                                data.strategic_alerts.map((alert, idx) => (
                                    <div key={idx} className={`p-6 rounded-[24px] border transition-all hover:-translate-y-1 hover:shadow-lg group cursor-pointer ${alert.type === 'danger' ? 'bg-red-500/5 border-red-500/20' : 'bg-orange-500/5 border-orange-500/20'} backdrop-blur-md`}>
                                        <div className="flex gap-4">
                                            <div className={`p-3 rounded-2xl h-fit shadow-inner ${alert.type === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                <AlertCircle size={20} />
                                            </div>
                                            <div className="space-y-2 flex-1">
                                                <p className="text-sm font-black text-[var(--color-text-primary)] tracking-tight">{alert.title}</p>
                                                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed font-medium">{alert.description}</p>
                                                <button
                                                    onClick={() => navigate(alert.action)}
                                                    className={`mt-3 flex items-center text-[10px] font-black uppercase tracking-[0.2em] ${alert.type === 'danger' ? 'text-red-500' : 'text-orange-500'} group-hover:gap-3 transition-all`}
                                                >
                                                    Résoudre <ChevronRight size={14} className="ml-1" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-12 text-center bg-emerald-500/5 rounded-[32px] border border-emerald-500/20 border-dashed">
                                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle size={32} className="text-emerald-500" />
                                    </div>
                                    <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em]">Système en Ordre</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* QUICK PROFILE CARD - Glass Style */}
                    <Card className="border-none shadow-2xl bg-[var(--color-bg-card)] overflow-hidden rounded-[32px] glass-card">
                        <div className="h-24 bg-mesh-blue opacity-80" />
                        <CardContent className="px-8 pb-8 -mt-12 relative z-10 text-center">
                            <div className="inline-flex p-1.5 rounded-full bg-white shadow-xl mb-4">
                                <div className="w-20 h-20 rounded-full bg-blue-600 border-4 border-white flex items-center justify-center text-white text-3xl font-black">
                                    {(user?.full_name || user?.username || 'U').substring(0, 1).toUpperCase()}
                                </div>
                            </div>
                            <h3 className="text-xl font-black text-[var(--color-text-primary)] tracking-tight">{user?.full_name || user?.username}</h3>
                            <p className="text-xs font-black text-blue-500 uppercase tracking-[0.2em] mt-1">{user?.role}</p>

                            <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-[var(--color-border-light)]">
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Id</p>
                                    <p className="text-sm font-bold text-[var(--color-text-primary)]">#{user?.id || '...'}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Statut</p>
                                    <p className="text-sm font-extrabold text-emerald-500">Actif</p>
                                </div>
                            </div>

                            <Button variant="outline" className="w-full mt-8 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all h-12" onClick={() => navigate('/profile')}>
                                Gérer Profil
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
