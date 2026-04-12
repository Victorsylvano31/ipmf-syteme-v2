import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ComposedChart,
    Bar,
    Cell,
    Area
} from 'recharts';
import {
    TrendingUp,
    ArrowUpCircle,
    ArrowDownCircle,
    Calendar,
    Download,
    RefreshCw,
    ArrowLeft
} from 'lucide-react';
import api from '../../api/axios';
import { formatCurrency } from '../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function FinanceAnalytics() {
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [granularity, setGranularity] = useState('month');
    const [visibility, setVisibility] = useState({
        entrees: true,
        depenses: true,
        solde: true
    });
    const [stats, setStats] = useState({ totalEntrees: 0, totalDepenses: 0, lastSolde: 0 });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('finances/analytics/', {
                params: { granularity }
            });

            let rawData = response.data.data;

            // 1. Zoom Temporel : Filtrer les périodes de début sans activité
            const firstActiveIndex = rawData.findIndex(item => item.entrees > 0 || item.depenses > 0);
            const processedData = firstActiveIndex !== -1 ? rawData.slice(firstActiveIndex) : rawData;

            setData(processedData);

            // 2. Calcul des Tendances (Trends)
            // On compare la dernière période "réelle" à la précédente
            const realData = processedData.filter(item => !item.is_forecast);
            let trends = { entrees: 0, depenses: 0 };

            if (realData.length >= 2) {
                const current = realData[realData.length - 1];
                const previous = realData[realData.length - 2];

                const calcTrend = (curr, prev) => prev > 0 ? ((curr - prev) / prev) * 100 : 0;
                trends.entrees = calcTrend(current.entrees, previous.entrees);
                trends.depenses = calcTrend(current.depenses, previous.depenses);
            }

            setStats({
                totalEntrees: response.data.overall_totals.total_entrees,
                totalDepenses: response.data.overall_totals.total_depenses,
                lastSolde: response.data.overall_totals.solde,
                trends
            });
            setLoading(false);
        } catch (err) {
            console.error("Error fetching analytics:", err);
            setError("Erreur lors de la récupération des données analytiques.");
            setLoading(false);
        }
    }, [granularity]);

    const handleExport = () => {
        window.print();
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatChartDate = (label) => {
        if (!label || typeof label !== 'string') return label;

        try {
            const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

            // Format ISO YYYY-MM ou YYYY-MM-DD
            const isoMatch = label.match(/^(\d{4})-(\d{1,2})/);
            if (isoMatch) {
                const year = isoMatch[1];
                const monthIdx = parseInt(isoMatch[2], 10) - 1;
                if (monthIdx >= 0 && monthIdx < 12) {
                    return `${months[monthIdx]} ${year.slice(2)}`;
                }
            }

            // Format Français DD-MM-YYYY ou DD/MM/YYYY
            const frMatch = label.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
            if (frMatch) {
                const year = frMatch[3];
                const monthIdx = parseInt(frMatch[2], 10) - 1;
                if (monthIdx >= 0 && monthIdx < 12) {
                    return `${months[monthIdx]} ${year.slice(2)}`;
                }
            }
        } catch (err) {
            console.error("Format error:", err);
        }

        return label;
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const isForecast = payload[0].payload.is_forecast;
            return (
                <div className="bg-[var(--color-bg-card)] p-4 rounded-xl border border-[var(--color-border)] shadow-xl backdrop-blur-md">
                    <p className="font-bold text-[var(--color-text-primary)] mb-2">{formatChartDate(label)} {isForecast ? '(Prévision)' : ''}</p>
                    <div className="space-y-1">
                        {payload.map((entry, index) => (
                            <div key={index} className="flex items-center justify-between gap-4 text-xs font-medium">
                                <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                    {entry.name}
                                </span>
                                <span className="text-[var(--color-text-primary)]">{formatCurrency(entry.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <RefreshCw className="animate-spin text-blue-500" size={32} />
                <span className="text-[var(--color-text-muted)] font-medium">Chargement des analyses...</span>
            </div>
        );
    }

    if (error) {
        return (
            <Card className="border-red-500/20 bg-red-500/5 m-6">
                <CardContent className="p-12 text-center space-y-4">
                    <p className="text-red-500 font-medium">{error}</p>
                    <Button onClick={fetchData}>Réessayer</Button>
                </CardContent>
            </Card>
        );
    }

    const tableData = [...data].reverse();

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Premium Strategic Banner (Version Slim) */}
            <div className="relative overflow-hidden rounded-[24px] bg-slate-950 bg-mesh-slate p-6 lg:p-8 shadow-xl animate-slide-up border border-white/10">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

                <div className="absolute top-0 right-0 p-4 z-20 flex flex-wrap gap-2 justify-end items-center no-print">
                    <div className="bg-white/10 backdrop-blur-xl p-1 rounded-xl flex gap-1 border border-white/10">
                        {['day', 'week', 'month', 'year'].map((g) => (
                            <button
                                key={g}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${granularity === g
                                    ? 'bg-white text-blue-600 shadow-lg'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                                    }`}
                                onClick={() => setGranularity(g)}
                            >
                                {g === 'day' ? 'J' : g === 'week' ? 'S' : g === 'month' ? 'M' : 'A'}
                            </button>
                        ))}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleExport}
                        className="text-white bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full px-4 border border-white/10 font-bold h-9 transition-all text-[11px]"
                    >
                        <Download size={14} className="mr-2" />
                        <span>Exporter</span>
                    </Button>
                </div>

                <header className="relative z-10 flex items-center gap-6">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/finances')}
                        className="w-10 h-10 p-0 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-xl no-print flex-shrink-0"
                    >
                        <ArrowLeft size={20} />
                    </Button>
                    <div className="space-y-1">
                        <Badge variant="outline" className="bg-blue-500/20 text-blue-200 border-blue-400/30 backdrop-blur-xl px-2 py-0.5 font-black tracking-[0.1em] uppercase text-[9px] w-fit">
                            ANALYTIQUES
                        </Badge>
                        <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
                            Analyses <span className="text-blue-200">Financières</span>
                        </h1>
                    </div>
                </header>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="hover:border-emerald-500/30 transition-all bg-[var(--color-bg-card)] shadow-sm">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                            <ArrowUpCircle size={28} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Total Entrées</p>
                            <div className="flex items-baseline justify-between">
                                <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">{formatCurrency(stats.totalEntrees)}</h3>
                                {stats.trends?.entrees !== 0 && (
                                    <span className={`text-[10px] font-black ${stats.trends?.entrees > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {stats.trends?.entrees > 0 ? '↑' : '↓'} {Math.abs(stats.trends?.entrees || 0).toFixed(1)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:border-red-500/30 transition-all bg-[var(--color-bg-card)] shadow-sm">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl">
                            <ArrowDownCircle size={28} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Total Dépenses</p>
                            <div className="flex items-baseline justify-between">
                                <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">{formatCurrency(stats.totalDepenses)}</h3>
                                {stats.trends?.depenses !== 0 && (
                                    <span className={`text-[10px] font-black ${stats.trends?.depenses < 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {stats.trends?.depenses > 0 ? '↑' : '↓'} {Math.abs(stats.trends?.depenses || 0).toFixed(1)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:border-blue-500/30 transition-all bg-[var(--color-bg-card)] shadow-sm">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                            <TrendingUp size={28} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Solde Actuel</p>
                            <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">{formatCurrency(stats.lastSolde)}</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Chart */}
            <Card className="p-8 border-[var(--color-border-light)] bg-[var(--color-bg-card)] shadow-md overflow-visible relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <CardTitle className="text-xl font-bold text-[var(--color-text-primary)]">Analyse des Flux et Solde Cumulé</CardTitle>
                    <div className="flex flex-wrap gap-4 no-print">
                        <button
                            className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${visibility.entrees ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)]'}`}
                            onClick={() => setVisibility(v => ({ ...v, entrees: !v.entrees }))}
                        >
                            <div className={`w-2 h-2 rounded-full ${visibility.entrees ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                            Entrées
                        </button>
                        <button
                            className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${visibility.depenses ? 'bg-red-500/10 border-red-500/30 text-red-600' : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)]'}`}
                            onClick={() => setVisibility(v => ({ ...v, depenses: !v.depenses }))}
                        >
                            <div className={`w-2 h-2 rounded-full ${visibility.depenses ? 'bg-red-500' : 'bg-slate-300'}`}></div>
                            Sorties
                        </button>
                        <button
                            className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${visibility.solde ? 'bg-blue-500/10 border-blue-500/30 text-blue-600' : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)]'}`}
                            onClick={() => setVisibility(v => ({ ...v, solde: !v.solde }))}
                        >
                            <div className={`w-2 h-2 rounded-full ${visibility.solde ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                            Solde
                        </button>
                    </div>
                </div>

                <div className="w-full h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <defs>
                                <linearGradient id="colorSolde" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-light)" />
                            <XAxis
                                dataKey="label"
                                stroke="var(--color-text-muted)"
                                fontSize={11}
                                fontWeight={600}
                                tickLine={false}
                                axisLine={false}
                                dy={15}
                                tickFormatter={formatChartDate}
                            />
                            <YAxis
                                stroke="var(--color-text-muted)"
                                fontSize={11}
                                fontWeight={600}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => value === 0 ? '0' : `${(value / 1000000).toFixed(1)} M`}
                            />
                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ stroke: 'var(--color-bg-hover)', strokeWidth: 2 }}
                            />

                            {visibility.entrees && (
                                <Bar
                                    name="Entrées"
                                    dataKey="entrees"
                                    fill="#10b981"
                                    radius={[4, 4, 0, 0]}
                                    barSize={14}
                                >
                                    {data.map((entry, index) => (
                                        <Cell
                                            key={`cell-e-${index}`}
                                            fill="#10b981"
                                            fillOpacity={entry.is_ongoing || entry.is_forecast ? 0.3 : 0.8}
                                            stroke={entry.is_ongoing ? "#10b981" : "none"}
                                            strokeDasharray={entry.is_ongoing ? "3 3" : "0"}
                                        />
                                    ))}
                                </Bar>
                            )}
                            {visibility.depenses && (
                                <Bar
                                    name="Dépenses"
                                    dataKey="depenses"
                                    fill="#ef4444"
                                    radius={[4, 4, 0, 0]}
                                    barSize={14}
                                >
                                    {data.map((entry, index) => (
                                        <Cell
                                            key={`cell-d-${index}`}
                                            fill="#ef4444"
                                            fillOpacity={entry.is_ongoing || entry.is_forecast ? 0.3 : 0.8}
                                            stroke={entry.is_ongoing ? "#ef4444" : "none"}
                                            strokeDasharray={entry.is_ongoing ? "3 3" : "0"}
                                        />
                                    ))}
                                </Bar>
                            )}
                            {visibility.solde && (
                                <Area
                                    name="Solde Cumulé"
                                    type="monotone"
                                    dataKey="solde_cumule"
                                    stroke="#3b82f6"
                                    strokeWidth={4}
                                    fill="url(#colorSolde)"
                                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            )}

                            {/* Previsions */}
                            {visibility.entrees && (
                                <Bar
                                    name="Prévision Entrées"
                                    dataKey="entrees_prevues"
                                    fill="#10b981"
                                    fillOpacity={0.2}
                                    stroke="none"
                                    barSize={14}
                                />
                            )}
                            {visibility.depenses && (
                                <Bar
                                    name="Prévision Dépenses"
                                    dataKey="depenses_prevues"
                                    fill="#ef4444"
                                    fillOpacity={0.2}
                                    stroke="none"
                                    barSize={14}
                                />
                            )}
                            {visibility.solde && (
                                <Line
                                    name="Prévision Solde Cumulé"
                                    type="monotone"
                                    dataKey="solde_cumule_prevu"
                                    stroke="#3b82f6"
                                    strokeDasharray="8 4"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            {/* Data Table */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Détails par Période</h2>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">{tableData.length} périodes</Badge>
                </div>
                <Card className="shadow-sm border-[var(--color-border-light)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[var(--color-bg-hover)] border-b border-[var(--color-border)]">
                                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Période</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Entrées</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Sorties</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Flux Net</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Solde Cumulé</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider text-right">Etat</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border-light)]">
                                {tableData.map((row, idx) => {
                                    const fluxNet = row.is_forecast ? (row.entrees_prevues - row.depenses_prevues) : (row.entrees - row.depenses);
                                    const currentSolde = row.is_forecast ? row.solde_cumule_prevu : row.solde_cumule;

                                    return (
                                        <tr key={idx} className={`${row.is_forecast ? 'bg-blue-500/5' : 'hover:bg-[var(--color-bg-hover)]'} transition-colors`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 font-bold text-[var(--color-text-primary)]">
                                                    <Calendar size={14} className="text-blue-500" />
                                                    {formatChartDate(row.label)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(row.is_forecast ? row.entrees_prevues : row.entrees)}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-red-500 dark:text-red-400">
                                                {formatCurrency(row.is_forecast ? row.depenses_prevues : row.depenses)}
                                            </td>
                                            <td className={`px-6 py-4 font-bold ${fluxNet >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {formatCurrency(fluxNet)}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-[var(--color-text-primary)]">
                                                {formatCurrency(currentSolde)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Badge
                                                    variant={row.is_forecast ? 'secondary' : 'default'}
                                                    className={`uppercase text-[10px] font-black ${row.is_forecast ? 'text-blue-600 bg-blue-500/10' : 'text-emerald-600 bg-emerald-500/10'}`}
                                                >
                                                    {row.is_forecast ? 'Prévision' : 'Réel'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div >
    );
}

