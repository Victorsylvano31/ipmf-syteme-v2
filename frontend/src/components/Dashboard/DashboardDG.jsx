import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    TrendingUp,
    TrendingDown,
    ClipboardList,
    Wallet,
    AlertCircle,
    ArrowUpRight,
    Search,
    CheckCircle,
    Clock,
    User,
    ChevronRight,
    Activity,
    RefreshCw,
    Percent
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import api from '../../api/axios';
import { formatCurrency } from '../../utils/formatters';
import { KpiCard, Skeleton } from './DashboardComponents';

export default function DashboardDG() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const res = await api.get('dashboard/donnees/overview/');
            setData(res.data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Erreur dashboard DG", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Polling every 5 minutes
        const interval = setInterval(() => fetchData(true), 300000);
        return () => clearInterval(interval);
    }, [fetchData]);

    if (loading && !data) return (
        <div className="space-y-8 pb-10">
            <div className="flex justify-between">
                <div className="space-y-2">
                    <Skeleton className="w-64 h-8" />
                    <Skeleton className="w-48 h-4" />
                </div>
                <Skeleton className="w-32 h-10" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => <KpiCard key={i} loading />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    <Skeleton className="w-full h-[400px]" />
                    <Skeleton className="w-full h-[300px]" />
                </div>
                <div className="lg:col-span-4 space-y-8">
                    <Skeleton className="w-full h-[500px]" />
                </div>
            </div>
        </div>
    );

    const kpiIcons = [ClipboardList, Wallet, TrendingUp, Percent];

    return (
        <div className="space-y-10 pb-10">
            {/* Header Stratégique Premium */}
            <div className="relative overflow-hidden rounded-[32px] bg-slate-900 bg-mesh-slate p-10 lg:p-12 shadow-2xl animate-slide-up border border-white/10">
                {/* Decorative Pattern Overlay */}
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

                <div className="absolute top-0 right-0 p-6 z-20 flex flex-wrap gap-3 justify-end items-center">
                    <span className="text-white/40 text-[10px] font-black uppercase tracking-widest hidden sm:flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/5">
                        <Clock size={14} className="animate-pulse-subtle" />
                        Initialisé à {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchData(true)}
                        className="text-white/60 hover:text-white hover:bg-white/10 backdrop-blur-md rounded-full px-5 border border-white/5 h-10 font-bold uppercase text-[10px] tracking-widest"
                        disabled={refreshing}
                    >
                        <RefreshCw size={16} className={`${refreshing ? 'animate-spin' : ''} mr-2`} />
                        {refreshing ? 'Mise à jour...' : 'Actualiser'}
                    </Button>
                    <Button
                        onClick={() => navigate('/audit')}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-none shadow-xl shadow-blue-600/20 font-black rounded-full px-8 h-10 text-[10px] uppercase tracking-widest flex items-center group transition-all"
                    >
                        <Activity size={18} className="mr-2 group-hover:animate-pulse" />
                        Journal Stratégique
                    </Button>
                </div>

                <header className="relative z-10 flex flex-col justify-center min-h-[140px]">
                    <div className="space-y-4">
                        <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 backdrop-blur-xl px-4 py-1.5 font-black tracking-[0.2em] uppercase text-[10px] w-fit">
                            PILOTAGE STRATÉGIQUE
                        </Badge>
                        <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter leading-tight drop-shadow-2xl">
                            Dashboard <span className="text-blue-400">DG</span>
                        </h1>
                        <p className="text-white/70 font-semibold text-lg max-w-2xl leading-relaxed">
                            Orchestration des ressources et analyse de la performance opérationnelle en temps réel.
                        </p>
                    </div>
                </header>
            </div>

            {/* KPI ROW - Staggered */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 animate-slide-up stagger-1">
                {data?.kpis?.map((kpi, idx) => (
                    <KpiCard
                        key={idx}
                        {...kpi}
                        icon={kpiIcons[idx] || Activity}
                    />
                ))}
            </div>

            {/* MAIN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* Evolution & Cashflow (8 columns) */}
                <div className="lg:col-span-8 space-y-10 animate-slide-up stagger-2">
                    <Card className="border-none shadow-2xl bg-[var(--color-bg-card)] overflow-hidden rounded-[32px] glass-card">
                        <CardHeader className="flex flex-row items-center justify-between p-8 border-b border-[var(--color-border-light)] bg-white/5">
                            <div>
                                <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2 text-[var(--color-text-primary)]">
                                    Évolution du Cashflow
                                </CardTitle>
                                <p className="text-xs text-[var(--color-text-muted)] font-black uppercase tracking-[0.2em] mt-1">Flux monétaires réels (30 derniers jours)</p>
                            </div>
                            <div className="flex gap-3">
                                <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 font-bold animate-pulse">Live Tracking</Badge>
                                <Badge variant="outline" className="border-[var(--color-border-light)] font-bold px-3 py-1">Ariary (Ar)</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[380px] p-8">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data?.charts?.cashflow_history} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCashflow" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-light)" opacity={0.5} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="var(--color-text-muted)"
                                        fontSize={10}
                                        axisLine={false}
                                        tickLine={false}
                                        tickMargin={15}
                                        fontFamily="Inter, sans-serif"
                                        fontWeight={600}
                                    />
                                    <YAxis
                                        stroke="var(--color-text-muted)"
                                        fontSize={10}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                        fontFamily="Inter, sans-serif"
                                        fontWeight={600}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                            backdropFilter: 'blur(12px)',
                                            borderRadius: '20px',
                                            border: '1px solid rgba(255, 255, 255, 0.3)',
                                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                                            padding: '20px',
                                        }}
                                        itemStyle={{
                                            color: '#10b981',
                                            fontWeight: '900',
                                            fontSize: '14px'
                                        }}
                                        labelStyle={{
                                            color: '#64748b',
                                            marginBottom: '8px',
                                            fontWeight: '700',
                                            fontSize: '11px',
                                            textTransform: 'uppercase'
                                        }}
                                        cursor={{ stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5 5' }}
                                        formatter={(v) => [formatCurrency(v), 'Variation']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="valeur"
                                        stroke="#10b981"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorCashflow)"
                                        animationBegin={500}
                                        animationDuration={2000}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Mission Budget Analysis - Premium Progress Bars */}
                    <Card className="border-none shadow-2xl bg-[var(--color-bg-card)] rounded-[32px] overflow-hidden glass-card">
                        <CardHeader className="flex flex-row items-center justify-between p-8 bg-white/5 border-b border-[var(--color-border-light)]">
                            <div>
                                <CardTitle className="text-xl font-black tracking-tight text-[var(--color-text-primary)]">Suivi des Missions</CardTitle>
                                <p className="text-xs text-[var(--color-text-muted)] font-black uppercase tracking-[0.2em] mt-1">Consommation budgétaire par projet</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')} className="text-blue-500 font-black text-xs uppercase tracking-widest hover:bg-blue-500/10 px-4 rounded-full">
                                Voir Détails <ArrowUpRight size={16} className="ml-2" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            {data?.charts?.budget_distribution?.map(mission => (
                                <div
                                    key={mission.id}
                                    className="group cursor-pointer p-4 -m-4 rounded-[24px] hover:bg-slate-500/5 transition-all duration-500"
                                    onClick={() => navigate(`/tasks/${mission.id}`)}
                                >
                                    <div className="flex justify-between items-end mb-4">
                                        <div className="space-y-1">
                                            <p className="text-base font-black text-[var(--color-text-primary)] group-hover:text-blue-500 transition-colors tracking-tight">{mission.titre}</p>
                                            <p className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-[0.2em]">{mission.numero}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-xl font-black tabular-nums ${mission.percent > 90 ? 'text-red-500 shadow-glow' : 'text-blue-500'}`}>{mission.percent}%</p>
                                            <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest mt-0.5">{formatCurrency(mission.spent)} / {formatCurrency(mission.budget)}</p>
                                        </div>
                                    </div>
                                    <div className="h-4 w-full bg-[var(--color-bg-hover)] rounded-full overflow-hidden border border-[var(--color-border-light)] p-1 group-hover:border-blue-500/30 transition-colors">
                                        <div
                                            className={`h-full rounded-full transition-all duration-[1500ms] cubic-bezier(0.34, 1.56, 0.64, 1) relative ${mission.percent > 100 ? 'bg-red-500' : mission.percent > 85 ? 'bg-orange-500' : 'bg-gradient-to-r from-blue-500 to-emerald-500'}`}
                                            style={{ width: `${Math.min(mission.percent, 100)}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-shine" />
                                            {mission.percent > 90 && (
                                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Alerts & Activity (4 columns) */}
                <div className="lg:col-span-4 space-y-10 animate-slide-up stagger-3">
                    {/* ALERT CENTER - Premium Visuals */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-[11px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">Critical Alerts</h2>
                            <Activity size={14} className="text-red-500 animate-pulse" />
                        </div>
                        <div className="space-y-4">
                            {data?.strategic_alerts?.length > 0 ? (
                                data.strategic_alerts.map((alert, idx) => (
                                    <div key={idx} className={`p-6 rounded-[28px] border transition-all hover:-translate-y-1 hover:shadow-2xl group cursor-pointer ${alert.type === 'danger' ? 'bg-red-500/5 border-red-500/20 shadow-red-500/5' : 'bg-orange-500/5 border-orange-500/20 shadow-orange-500/5'} backdrop-blur-xl`}>
                                        <div className="flex gap-5">
                                            <div className={`p-3.5 rounded-2xl h-fit shadow-inner transition-transform group-hover:scale-110 duration-500 ${alert.type === 'danger' ? 'bg-red-500/15 text-red-500' : 'bg-orange-500/15 text-orange-500'}`}>
                                                <AlertCircle size={24} />
                                            </div>
                                            <div className="space-y-2 flex-1">
                                                <p className="text-base font-black text-[var(--color-text-primary)] tracking-tight">{alert.title}</p>
                                                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed font-bold">{alert.description}</p>
                                                <button
                                                    onClick={() => navigate(alert.action)}
                                                    className={`mt-4 flex items-center text-[10px] font-black uppercase tracking-[0.2em] ${alert.type === 'danger' ? 'text-red-500' : 'text-orange-500'} group-hover:gap-4 transition-all`}
                                                >
                                                    Agir Immédiatement <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-16 text-center bg-emerald-500/5 rounded-[32px] border border-emerald-500/20 border-dashed backdrop-blur-sm">
                                    <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                        <CheckCircle size={40} />
                                    </div>
                                    <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em]">Tout est sous contrôle</p>
                                    <p className="text-[10px] text-emerald-600/60 mt-2 font-bold uppercase">Zéro alerte critique</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RECENT FEED - Glass Style */}
                    <div className="space-y-6">
                        <h2 className="text-[11px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em] px-2">Événements Récents</h2>
                        <Card className="border-none shadow-2xl overflow-hidden bg-[var(--color-bg-card)] rounded-[32px] glass-card">
                            <div className="divide-y divide-[var(--color-border-light)]">
                                {data?.recent_activity?.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="p-6 flex gap-5 hover:bg-slate-500/5 transition-all cursor-pointer group"
                                        onClick={() => navigate(item.type === 'task' ? '/tasks' : '/expenses')}
                                    >
                                        <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-500 ${item.type === 'task' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                            {item.type === 'task' ? <ClipboardList size={22} /> : <Wallet size={22} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-base font-black text-[var(--color-text-primary)] truncate group-hover:text-blue-500 transition-colors tracking-tight uppercase">{item.title}</p>
                                            <p className="text-[12px] text-[var(--color-text-muted)] font-bold mt-1 truncate">{item.subtitle}</p>
                                            <div className="flex items-center gap-3 mt-4">
                                                <Badge variant={item.status === 'validee' || item.status === 'payee' ? 'success' : 'primary'} className="font-black px-3 py-0.5 rounded-full uppercase text-[9px] tracking-widest">{item.status}</Badge>
                                                <span className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-tighter flex items-center gap-1.5"><Clock size={12} />{new Date(item.time).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                        <Button
                            variant="ghost"
                            className="w-full h-14 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] hover:text-blue-500 hover:bg-blue-500/5 group"
                            onClick={() => navigate('/audit')}
                        >
                            Audit de Direction Complet <ArrowRight size={14} className="ml-2 group-hover:translate-x-2 transition-transform" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
