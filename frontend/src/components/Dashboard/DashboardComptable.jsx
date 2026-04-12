import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ClipboardList, CheckCircle, Clock, Wallet, TrendingUp, RefreshCw, AlertCircle, ChevronRight } from 'lucide-react';
import api from '../../api/axios';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { KpiCard, Skeleton } from './DashboardComponents';

export default function DashboardComptable() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const res = await api.get('dashboard/donnees/overview/');
            setData(res.data);
        } catch (err) {
            console.error("Erreur dashboard comptable", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading && !data) return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <KpiCard key={i} loading />)}
            </div>
            <Skeleton className="w-full h-96" />
        </div>
    );

    const kpiIcons = [AlertCircle, TrendingUp, Wallet];

    return (
        <div className="space-y-10 pb-10">
            {/* Header Comptable Premium */}
            <div className="relative overflow-hidden rounded-[32px] bg-slate-900 bg-mesh-slate p-10 lg:p-12 shadow-2xl animate-slide-up border border-white/10">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

                <div className="absolute top-0 right-0 p-6 z-20 flex flex-wrap gap-3 justify-end items-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchData(true)}
                        className="text-white/60 hover:text-white hover:bg-white/10 backdrop-blur-md rounded-full px-5 border border-white/5 h-10 font-bold uppercase text-[10px] tracking-widest"
                        disabled={refreshing}
                    >
                        <RefreshCw size={16} className={`${refreshing ? 'animate-spin' : ''} mr-2`} />
                        {refreshing ? 'Vérification...' : 'Actualiser'}
                    </Button>
                    <Link to="/expenses" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white border-none shadow-xl shadow-blue-600/20 font-black rounded-full h-10 text-[10px] uppercase tracking-widest flex items-center transition-all group">
                        Explorer les Flux <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                <header className="relative z-10 flex flex-col justify-center min-h-[140px]">
                    <div className="space-y-4">
                        <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 backdrop-blur-xl px-4 py-1.5 font-black tracking-[0.2em] uppercase text-[10px] w-fit">
                            ESPACE DE VÉRIFICATION
                        </Badge>
                        <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter leading-tight drop-shadow-2xl">
                            Espace <span className="text-blue-400">Comptable</span>
                        </h1>
                        <p className="text-white/70 font-semibold text-lg max-w-2xl leading-relaxed">
                            Gestion rigoureuse et vérification de conformité des flux financiers de l'IPMF.
                        </p>
                    </div>
                </header>
            </div>

            {/* KPI Cards - Staggered */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-slide-up stagger-1">
                {data?.kpis?.map((kpi, idx) => (
                    <KpiCard
                        key={idx}
                        {...kpi}
                        icon={kpiIcons[idx] || ClipboardList}
                    />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Verification List (8 columns) */}
                <div className="lg:col-span-8 animate-slide-up stagger-2">
                    <Card className="border-none shadow-2xl bg-[var(--color-bg-card)] overflow-hidden rounded-[28px] glass-card">
                        <CardHeader className="flex flex-row items-center justify-between p-8 border-b border-[var(--color-border-light)] bg-white/5">
                            <div>
                                <CardTitle className="text-xl font-black tracking-tight">Registre des dépenses payées</CardTitle>
                                <p className="text-xs text-[var(--color-text-muted)] font-black uppercase tracking-[0.2em] mt-1">Audit de conformité (Lecture seule)</p>
                            </div>
                            <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-4 py-1 font-black rounded-full">{data?.recent_activity?.length || 0} Paiements</Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            {data?.recent_activity?.length > 0 ? (
                                <div className="divide-y divide-[var(--color-border-light)]">
                                    {data.recent_activity.map(expense => (
                                        <div key={expense.id} className="p-6 hover:bg-slate-500/5 transition-all flex items-center justify-between group">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-[18px] bg-blue-500/10 text-blue-500 flex items-center justify-center font-black text-xs transition-transform group-hover:scale-110 duration-500">
                                                    {expense.motif?.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-base font-extrabold text-[var(--color-text-primary)] group-hover:text-blue-500 transition-colors tracking-tight">{expense.motif}</p>
                                                    <p className="text-[11px] text-[var(--color-text-muted)] font-black uppercase tracking-widest mt-1">
                                                        {expense.numero} • <span className="text-blue-500">{formatCurrency(expense.montant)}</span> • {formatDate(expense.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                            <Link
                                                to={`/expenses/${expense.id}`}
                                                className="px-6 py-2.5 bg-blue-500/10 text-blue-500 rounded-full hover:bg-blue-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                                            >
                                                Consulter <ArrowRight size={14} />
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-16 text-center text-[var(--color-text-muted)]">
                                    <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                        <CheckCircle size={40} />
                                    </div>
                                    <p className="font-black text-emerald-600 uppercase text-xs tracking-[0.2em]">Flux Nettoyé</p>
                                    <p className="text-[11px] font-bold mt-2 opacity-60">Aucune dépense récemment payée à auditer.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Strategic Alerts (4 columns) */}
                <div className="lg:col-span-4 space-y-8 animate-slide-up stagger-3">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-[11px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">Priorités Comptables</h2>
                        <AlertCircle size={14} className="text-orange-500" />
                    </div>
                    {data?.strategic_alerts?.length > 0 ? (
                        data.strategic_alerts.map((alert, idx) => (
                            <div key={idx} className="p-6 rounded-[28px] border border-orange-500/20 bg-orange-500/5 backdrop-blur-xl shadow-xl shadow-orange-500/5 transition-all hover:-translate-y-1 group cursor-pointer">
                                <div className="flex gap-5">
                                    <div className="p-3.5 rounded-2xl bg-orange-500/15 text-orange-500 h-fit shadow-inner group-hover:scale-110 transition-transform duration-500">
                                        <AlertCircle size={24} />
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        <p className="text-base font-black text-[var(--color-text-primary)] tracking-tight">{alert.title}</p>
                                        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed font-bold">{alert.description}</p>
                                        <button
                                            onClick={() => navigate(alert.action)}
                                            className="mt-4 flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 group-hover:gap-4 transition-all"
                                        >
                                            Régulariser <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center bg-emerald-500/5 rounded-[32px] border border-emerald-500/20 border-dashed backdrop-blur-sm">
                            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} />
                            </div>
                            <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em]">Comptabilité saine</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
