import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

export const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-[var(--color-border)] opacity-50 rounded-xl ${className}`} />
);

export const KpiCard = ({ label, value, trend, sparkline, color, icon: Icon, loading }) => {
    if (loading) {
        return (
            <Card className="border-none shadow-sm overflow-hidden bg-[var(--color-bg-hover)] backdrop-blur-sm">
                <CardContent className="p-5 space-y-4">
                    <div className="flex justify-between">
                        <Skeleton className="w-10 h-10" />
                        <Skeleton className="w-12 h-5" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="w-24 h-3" />
                        <Skeleton className="w-32 h-8" />
                    </div>
                    <Skeleton className="w-full h-8 mt-2" />
                </CardContent>
            </Card>
        );
    }

    const isPositive = trend > 0;
    const colorClasses = {
        blue: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', spark: '#3b82f6' },
        orange: { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', spark: '#f97316' },
        emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', spark: '#10b981' },
        indigo: { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', spark: '#6366f1' },
    }[color] || { bg: 'bg-slate-50 dark:bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', spark: '#64748b' };

    return (
        <Card className="premium-card overflow-hidden border border-[var(--color-border-light)] shadow-sm hover:shadow-xl transition-all duration-500 group hover:-translate-y-2 bg-[var(--color-bg-card)] relative">
            {/* Dynamic Glow Background */}
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 ${colorClasses.bg.replace('50', '500')}`} />

            <div className={`absolute top-0 left-0 w-1.5 h-full ${colorClasses.bg.replace('50', '500')} opacity-0 group-hover:opacity-100 transition-all duration-300`} />

            <CardContent className="p-6 relative z-10">
                <div className="flex justify-between items-start mb-5">
                    <div className={`p-3 rounded-2xl ${colorClasses.bg} ${colorClasses.text} group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-sm`}>
                        <Icon size={24} />
                    </div>
                    {trend !== undefined && trend !== 0 && (
                        <div className={`flex items-center gap-1.5 text-[12px] font-bold px-3 py-1 rounded-full backdrop-blur-md border ${isPositive ? 'bg-emerald-50/50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' : 'bg-red-50/50 border-red-100 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400'}`}>
                            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {Math.abs(trend)}%
                        </div>
                    )}
                </div>

                <div className="space-y-1.5">
                    <h3 className="text-[var(--color-text-muted)] text-[11px] font-black uppercase tracking-[0.15em] opacity-80">{label}</h3>
                    <p className="text-3xl font-black text-[var(--color-text-primary)] tracking-tight leading-none">{value}</p>
                </div>

                {sparkline && (
                    <div className="h-12 mt-6 opacity-30 group-hover:opacity-100 transition-all duration-700 transform translate-y-1 group-hover:translate-y-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sparkline}>
                                <Line
                                    type="monotone"
                                    dataKey="valeur"
                                    stroke={colorClasses.spark}
                                    strokeWidth={3}
                                    dot={false}
                                    animationDuration={2500}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
