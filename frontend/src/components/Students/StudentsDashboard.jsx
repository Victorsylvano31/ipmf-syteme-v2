import React, { useState, useEffect } from 'react';
import { Loader, GraduationCap, Users, Clock, CheckCircle, ArrowRight, DollarSign } from 'lucide-react';
import api from '../../api/axios';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { useNavigate } from 'react-router-dom';
import styles from './Students.module.css';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];
const PIE_COLORS = {
    M: '#3b82f6', F: '#ec4899',
    solde: '#10b981', en_cours: '#f59e0b', en_retard: '#ef4444'
};

export default function StudentsDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('students/etudiants/stats/');
                setStats(res.data);
            } catch (err) {
                console.error("Erreur chargement stats dashboard", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading || !stats) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader className="animate-spin text-blue-500 w-12 h-12" />
            </div>
        );
    }

    const piePaiementData = [
        { name: 'Soldé', value: stats.paiements_soldes, color: PIE_COLORS.solde },
        { name: 'En cours', value: stats.paiements_en_cours, color: PIE_COLORS.en_cours },
        { name: 'En retard', value: stats.paiements_en_retard, color: PIE_COLORS.en_retard }
    ].filter(d => d.value > 0);

    const pieSexeData = [
        { name: 'Hommes', value: stats.repartition_sexe.M, color: PIE_COLORS.M },
        { name: 'Femmes', value: stats.repartition_sexe.F, color: PIE_COLORS.F }
    ].filter(d => d.value > 0);

    return (
        <div className="flex flex-col gap-8 pb-10">
            {/* Header & Navigation */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                            <BarChart className="w-6 h-6" />
                        </div>
                        Tableau de Bord Étudiants
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 ml-15">Vue d'ensemble et analytiques des inscriptions</p>
                </div>
                
                <button 
                    onClick={() => navigate('/students')}
                    className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"
                >
                    <Users size={18} />
                    Liste des Étudiants
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className={`p-6 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent overflow-hidden relative`}>
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl"></div>
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-1">Total Effectif</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white">{stats.total_etudiants}</h3>
                        <span className="text-xs font-bold text-slate-500">étudiants</span>
                    </div>
                </div>

                <div className={`p-6 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent overflow-hidden relative`}>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-1">Étudiants Actifs</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white">{stats.etudiants_actifs}</h3>
                        <span className="text-xs font-bold text-emerald-500">
                            {stats.total_etudiants > 0 ? Math.round((stats.etudiants_actifs / stats.total_etudiants) * 100) : 0}%
                        </span>
                    </div>
                </div>

                <div className={`p-6 rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-transparent overflow-hidden relative`}>
                    <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">Paiements en retard</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white">{stats.paiements_en_retard}</h3>
                        <span className="text-xs font-bold text-red-500">dossiers</span>
                    </div>
                </div>

                <div className={`p-6 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent overflow-hidden relative`}>
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-1">Recouvrement du mois</p>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">{formatCurrency(stats.recouvrements_mois)}</h3>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white mb-6">Inscriptions par Formation</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.par_formation} margin={{ top: 5, right: 10, left: -20, bottom: 25 }}>
                                <XAxis dataKey="nom" tick={{ fontSize: 11, fill: '#64748b' }} angle={-25} textAnchor="end" />
                                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                                <Tooltip 
                                    cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                    {stats.par_formation.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white mb-6">Tendance des Inscriptions</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.inscriptions_mensuelles}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#64748b' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="count" 
                                    stroke="#3b82f6" 
                                    strokeWidth={4}
                                    dot={{ stroke: '#3b82f6', strokeWidth: 2, fill: '#fff', r: 5 }}
                                    activeDot={{ r: 7, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2 self-start">Statut des Paiements</h3>
                    <div className="h-64 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={piePaiementData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {piePaiementData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-20px]">
                            <span className="text-3xl font-black text-slate-800 dark:text-white">{stats.etudiants_actifs}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actifs</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2 self-start">Répartition par Sexe</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieSexeData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={90}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {pieSexeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Financial Overview Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white">Santé Financière par Formation</h3>
                        <p className="text-sm text-slate-500">Suivi du taux de recouvrement global</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Taux Global</p>
                        <h4 className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.revenus_financiers.taux_recouvrement}%</h4>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="p-4 pl-6">Formation</th>
                                <th className="p-4">Effectif</th>
                                <th className="p-4 text-right">Frais Attendus</th>
                                <th className="p-4 text-right">Frais Encaissés</th>
                                <th className="p-4 pr-6 w-48 text-right">Progression</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {stats.par_formation.map((f, i) => {
                                const percent = f.frais_total > 0 ? Math.round((f.frais_paye / f.frais_total) * 100) : 0;
                                return (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="p-4 pl-6 font-bold text-slate-800 dark:text-white">{f.nom}</td>
                                        <td className="p-4 font-bold text-slate-600 dark:text-slate-300">
                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
                                                <Users size={12} /> {f.count}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right text-slate-500">{formatCurrency(f.frais_total)}</td>
                                        <td className="p-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(f.frais_paye)}</td>
                                        <td className="p-4 pr-6">
                                            <div className="flex items-center justify-end gap-3">
                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-8">{percent}%</span>
                                                <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full rounded-full transition-all duration-1000" 
                                                        style={{ 
                                                            width: `${percent}%`,
                                                            backgroundColor: percent > 80 ? '#10b981' : percent > 40 ? '#f59e0b' : '#ef4444'
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <td className="p-4 pl-6 font-black text-slate-800 dark:text-white">TOTAL GLOBAL</td>
                                <td className="p-4 font-black text-slate-800 dark:text-white">{stats.total_etudiants}</td>
                                <td className="p-4 text-right font-black text-slate-800 dark:text-white">{formatCurrency(stats.revenus_financiers.frais_total_attendu)}</td>
                                <td className="p-4 text-right font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.revenus_financiers.frais_total_encaisse)}</td>
                                <td className="p-4 pr-6"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
            
        </div>
    );
}
