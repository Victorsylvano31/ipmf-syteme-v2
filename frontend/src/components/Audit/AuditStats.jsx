import React, { useState, useEffect } from 'react';
import {
    Activity,
    ShieldAlert,
    User as UserIcon,
    Database,
    Clock,
    TrendingUp,
    AlertTriangle
} from 'lucide-react';
import api from '../../api/axios';
import {
    LineChart, Line, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Cell,
    PieChart, Pie
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Badge from '../ui/Badge';

export default function AuditStats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('audit/logs/statistiques/');
                setStats(response.data);
            } catch (error) {
                console.error("Erreur lors de la récupération des statistiques d'audit:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading || !stats) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full shadowed-blue"></div>
            </div>
        );
    }

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header>
                <h1 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">Statistiques d'Audit</h1>
                <p className="text-[var(--color-text-muted)] font-medium">Analyse de l'activité globale du système (30 derniers jours)</p>
            </header>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="hover:border-blue-500/30 transition-all group">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-wider">Total Actions</p>
                            <p className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">{stats.total_actions}</p>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform shadow-sm">
                            <Activity size={28} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:border-emerald-500/30 transition-all group">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-wider">Aujourd'hui</p>
                            <p className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">{stats.actions_aujourdhui}</p>
                        </div>
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform shadow-sm">
                            <TrendingUp size={28} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:border-amber-500/30 transition-all group">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-wider">Fréquence Moyenne</p>
                            <div className="flex items-baseline gap-1">
                                <p className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">{(stats.total_actions / 30).toFixed(1)}</p>
                                <span className="text-xs font-bold text-[var(--color-text-muted)]">/ jour</span>
                            </div>
                        </div>
                        <div className="p-4 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl group-hover:scale-110 transition-transform shadow-sm">
                            <Clock size={28} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Evolution Line Chart */}
                <Card className="shadow-sm border-[var(--color-border-light)] overflow-hidden">
                    <CardHeader className="p-6 border-b border-[var(--color-border-light)] bg-[var(--color-bg-hover)]/30">
                        <CardTitle className="text-xs font-black uppercase text-[var(--color-text-muted)] tracking-widest">Activité Temporelle (7 jours)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.activite_recente}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--color-border-light)" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="var(--color-text-muted)"
                                        fontSize={10}
                                        axisLine={false}
                                        tickLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        stroke="var(--color-text-muted)"
                                        fontSize={10}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--color-bg-card)',
                                            borderRadius: '16px',
                                            border: '1px solid var(--color-border)',
                                            boxShadow: 'var(--shadow-lg)',
                                            color: 'var(--color-text-primary)',
                                            fontWeight: 'bold'
                                        }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Module Bar Chart */}
                <Card className="shadow-sm border-[var(--color-border-light)] overflow-hidden">
                    <CardHeader className="p-6 border-b border-[var(--color-border-light)] bg-[var(--color-bg-hover)]/30">
                        <CardTitle className="text-xs font-black uppercase text-[var(--color-text-muted)] tracking-widest">Répartition par Module</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.actions_par_module} layout="vertical" margin={{ left: 20 }}>
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="module"
                                        type="category"
                                        stroke="var(--color-text-muted)"
                                        fontSize={10}
                                        width={80}
                                        axisLine={false}
                                        tickLine={false}
                                        fontWeight="bold"
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'var(--color-bg-hover)', radius: 8 }}
                                        contentStyle={{
                                            backgroundColor: 'var(--color-bg-card)',
                                            borderRadius: '12px',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-text-primary)'
                                        }}
                                    />
                                    <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24}>
                                        {stats.actions_par_module.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Users Table */}
                <Card className="shadow-sm border-[var(--color-border-light)] overflow-hidden lg:col-span-2">
                    <CardHeader className="p-6 border-b border-[var(--color-border-light)] bg-[var(--color-bg-hover)]/30">
                        <CardTitle className="text-xs font-black uppercase text-[var(--color-text-muted)] tracking-widest">Top 10 Utilisateurs les plus actifs</CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Utilisateur</th>
                                    <th className="px-6 py-4">Rôle</th>
                                    <th className="px-6 py-4">Actions</th>
                                    <th className="px-6 py-4 rounded-r-xl">Progression</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border-light)]">
                                {stats.actions_par_utilisateur.map((user, idx) => (
                                    <tr key={idx} className="hover:bg-[var(--color-bg-hover)] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center font-black text-xs">
                                                    {user.utilisateur__username?.[0]?.toUpperCase()}
                                                </div>
                                                <span className="font-bold text-[var(--color-text-primary)]">{user.utilisateur__username}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter bg-blue-50/50 dark:bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30">
                                                {user.utilisateur__role}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-black text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full text-sm">
                                                {user.count}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 w-64">
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 bg-[var(--color-bg-hover)] h-2 rounded-full overflow-hidden shadow-inner">
                                                    <div
                                                        className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full shadowed-blue transition-all duration-1000"
                                                        style={{ width: `${(user.count / stats.actions_par_utilisateur[0].count) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-black text-[var(--color-text-muted)] w-8">
                                                    {Math.round((user.count / stats.actions_par_utilisateur[0].count) * 100)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}

