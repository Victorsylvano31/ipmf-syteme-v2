import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Plus, Search, Users, CheckCircle, AlertCircle, Clock, RefreshCw, ArrowRight, BookOpen, BarChart3 } from 'lucide-react';
import api from '../../api/axios';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import styles from './Students.module.css';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];

const STATUT_PAIEMENT = {
    solde:     { label: 'Soldé',     cls: styles.badgeGreen,  color: '#10b981' },
    en_cours:  { label: 'En cours',  cls: styles.badgeYellow, color: '#f59e0b' },
    en_retard: { label: 'En retard', cls: styles.badgeRed,    color: '#ef4444' },
};

const STATUT_ETU = {
    actif:     { label: 'Actif',     cls: styles.badgeGreen },
    suspendu:  { label: 'Suspendu',  cls: styles.badgeYellow },
    diplome:   { label: 'Diplômé',   cls: styles.badgeBlue },
    abandonne: { label: 'Abandonné', cls: styles.badgeGray },
};

export default function StudentsList() {
    const { user } = useAuth();
    const [etudiants, setEtudiants] = useState([]);
    const [stats, setStats]         = useState(null);
    const [loading, setLoading]     = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch]       = useState('');
    const [filterStatut, setFilterStatut]     = useState('');
    const [filterPaiement, setFilterPaiement] = useState('');
    const [filterFormation, setFilterFormation] = useState('');
    const [filterAnnee, setFilterAnnee] = useState('');
    const [filterPromotion, setFilterPromotion] = useState('');
    const [formations, setFormations] = useState([]);

    const canCreate = ['admin', 'caisse', 'dg'].includes(user?.role);

    useEffect(() => {
        api.get('students/formations/')
            .then(r => setFormations(r.data.results ?? r.data))
            .catch(console.error);
    }, []);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const params = {};
            if (search) params.search = search;
            if (filterStatut) params.statut = filterStatut;
            if (filterFormation) params.formation = filterFormation;
            if (filterAnnee) params.annee_scolaire = filterAnnee;
            if (filterPromotion) params.promotion = filterPromotion;
            const [etRes, stRes] = await Promise.all([
                api.get('students/etudiants/', { params }),
                api.get('students/etudiants/stats/'),
            ]);
            setEtudiants(etRes.data.results ?? etRes.data);
            setStats(stRes.data);
        } catch (err) {
            console.error('Error fetching students:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [search, filterStatut, filterFormation, filterAnnee, filterPromotion]);

    useEffect(() => {
        const t = setTimeout(() => fetchData(), search ? 400 : 0);
        return () => clearTimeout(t);
    }, [fetchData, search]);

    const filtered = filterPaiement
        ? etudiants.filter(e => e.statut_paiement === filterPaiement)
        : etudiants;

    const kpis = stats ? [
        { label: 'Total Étudiants',      value: stats.total_etudiants,       icon: Users,        color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
        { label: 'Frais Soldés',         value: stats.paiements_soldes,      icon: CheckCircle,  color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
        { label: 'En retard',            value: stats.paiements_en_retard,   icon: AlertCircle,  color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
        { label: 'Recouvrements / mois', value: formatCurrency(stats.recouvrements_mois), icon: GraduationCap, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    ] : [];

    // Calcul des données pour le graphe : Répartition par formation
    const getChartData = () => {
        const counts = {};
        filtered.forEach(e => {
            counts[e.formation_nom] = (counts[e.formation_nom] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    };

    const getPieData = () => {
        let soldes = 0;
        let en_cours = 0;
        let en_retard = 0;

        filtered.forEach(e => {
            if (e.statut_paiement === 'solde') soldes++;
            else if (e.statut_paiement === 'en_retard') en_retard++;
            else en_cours++;
        });

        return [
            { name: 'Soldés', value: soldes, color: '#10b981' },
            { name: 'En cours', value: en_cours, color: '#f59e0b' },
            { name: 'En retard', value: en_retard, color: '#ef4444' }
        ].filter(d => d.value > 0);
    };

    const getFinancialData = () => {
        let prevu = 0;
        let encaisse = 0;
        filtered.forEach(e => {
            prevu += parseFloat(e.montant_total_frais) || 0;
            encaisse += parseFloat(e.montant_paye) || 0;
        });
        const restant = Math.max(0, prevu - encaisse);
        if (prevu === 0) return [];

        return [
            { name: 'Prévu', value: prevu, fill: '#3b82f6' },
            { name: 'Encaissé', value: encaisse, fill: '#10b981' },
            { name: 'Restant', value: restant, fill: '#ef4444' }
        ];
    };

    const chartData = getChartData();
    const pieData = getPieData();
    const financialData = getFinancialData();

    return (
        <div className={styles.pageContainer}>
            {/* ── Banner ── */}
            <div className={`${styles.banner} animate-slide-up`}>
                <div className={styles.bannerBg} />
                <div className={styles.bannerContent}>
                    <span className={styles.bannerBadge}><GraduationCap size={12} /> Gestion Scolaire</span>
                    <h1 className={styles.bannerTitle}>
                        Gestion des <span className={styles.bannerTitleAccent}>Étudiants</span>
                    </h1>
                    <p className={styles.bannerDesc}>Inscriptions et suivi des paiements de frais de formation.</p>
                </div>
                {canCreate && (
                    <div className={styles.bannerActions}>
                        <Link to="/students/formations" className={`${styles.btnPrimary}`} style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', boxShadow: 'none' }}>
                            <BookOpen size={16} /> Formations
                        </Link>
                        <Link to="/students/dashboard" className={`${styles.btnPrimary}`} style={{ background: 'rgba(124,58,237,0.15)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.3)', boxShadow: 'none' }}>
                            <BarChart3 size={16} /> Dashboard
                        </Link>
                        <Link to="/students/new" className={styles.btnPrimary}>
                            <Plus size={16} /> Inscrire un Étudiant
                        </Link>
                    </div>
                )}
            </div>

            {/* ── KPIs ── */}
            {stats && (
                <div className={`${styles.kpiGrid} animate-slide-up stagger-1`}>
                    {kpis.map((k, i) => (
                        <div key={i} className={styles.kpiCard}>
                            <div className={styles.kpiIcon} style={{ background: k.bg, color: k.color }}>
                                <k.icon size={20} />
                            </div>
                            <div>
                                <div className={styles.kpiLabel}>{k.label}</div>
                                <div className={styles.kpiValue}>{k.value}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Graphiques ── */}
            {(chartData.length > 0 || pieData.length > 0 || financialData.length > 0) && (
                <div className={`animate-slide-up stagger-1`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    {/* BarChart: Formations */}
                    {chartData.length > 0 && (
                        <div style={{ background: 'var(--color-bg-elevated)', borderRadius: '1.5rem', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>Par formation</h3>
                            <div style={{ height: '220px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                        <YAxis allowDecimals={false} stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            cursor={{ fill: 'rgba(0,0,0,0.03)' }} 
                                            contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', color: '#0f172a', fontSize: '0.875rem', fontWeight: 700 }}
                                            itemStyle={{ color: '#0f172a' }}
                                            formatter={(value) => [`${value} étudiant(s)`, 'Effectif']}
                                        />
                                        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* BarChart: Finances */}
                    {financialData.length > 0 && (
                        <div style={{ background: 'var(--color-bg-elevated)', borderRadius: '1.5rem', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>Flux Financiers (Ar)</h3>
                            <div style={{ height: '220px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={financialData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                        <YAxis 
                                            stroke="var(--color-text-muted)" 
                                            fontSize={11} 
                                            tickLine={false} 
                                            axisLine={false} 
                                            tickFormatter={(value) => value >= 1000000 ? `${(value/1000000).toFixed(1)}M` : value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
                                        />
                                        <Tooltip 
                                            cursor={{ fill: 'rgba(0,0,0,0.03)' }} 
                                            contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', color: '#0f172a', fontSize: '0.875rem', fontWeight: 700 }}
                                            itemStyle={{ color: '#0f172a' }}
                                            formatter={(value) => [formatCurrency(value), 'Montant']}
                                        />
                                        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                            {financialData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* PieChart: Paiements */}
                    {pieData.length > 0 && (
                        <div style={{ background: 'var(--color-bg-elevated)', borderRadius: '1.5rem', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>État des Soldes</h3>
                            <div style={{ height: '220px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            innerRadius={45}
                                            outerRadius={85}
                                            paddingAngle={3}
                                            dataKey="value"
                                            labelLine={false}
                                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                                if (percent === 0) return null;
                                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                                const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                                                const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                                                return (
                                                    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                                                        {`${(percent * 100).toFixed(0)}%`}
                                                    </text>
                                                );
                                            }}
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', color: '#0f172a', fontSize: '0.875rem' }}
                                            itemStyle={{ color: '#0f172a' }}
                                            formatter={(value, name, props) => [`${value} étudiant(s) (${(props.payload.percent * 100 || (value / pieData.reduce((a,b)=>a+b.value,0)) * 100).toFixed(0)}%)`, name]}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Filters ── */}
            <div className={`${styles.filterBar} animate-slide-up stagger-2`}>
                <div className={styles.searchWrapper}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                        className={styles.searchInput}
                        placeholder="Rechercher par nom, prénom, N° inscription..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select className={styles.filterSelect} value={filterFormation} onChange={e => setFilterFormation(e.target.value)}>
                    <option value="">Toutes les formations</option>
                    {formations.map(f => (
                        <option key={f.id} value={f.id}>{f.nom}</option>
                    ))}
                </select>
                <select className={styles.filterSelect} value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)}>
                    <option value="">Toutes les années</option>
                    <option value="2023-2024">2023-2024</option>
                    <option value="2024-2025">2024-2025</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                </select>
                <div className={styles.searchWrapper} style={{ maxWidth: '140px' }}>
                    <Search size={14} className={styles.searchIcon} />
                    <input
                        className={styles.searchInput}
                        placeholder="Promotion..."
                        value={filterPromotion}
                        onChange={e => setFilterPromotion(e.target.value)}
                        style={{ fontSize: '0.8125rem' }}
                    />
                </div>
                <select className={styles.filterSelect} value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
                    <option value="">Tous les statuts</option>
                    <option value="actif">Actif</option>
                    <option value="suspendu">Suspendu</option>
                    <option value="diplome">Diplômé</option>
                    <option value="abandonne">Abandonné</option>
                </select>
                <select className={styles.filterSelect} value={filterPaiement} onChange={e => setFilterPaiement(e.target.value)}>
                    <option value="">Tous paiements</option>
                    <option value="solde">Soldé</option>
                    <option value="en_cours">En cours</option>
                    <option value="en_retard">En retard</option>
                </select>
                <button className={`${styles.actionBtn} ${styles.actionBtnBlue}`} onClick={() => fetchData(true)} disabled={refreshing}>
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    {refreshing ? 'Actualisation...' : 'Actualiser'}
                </button>
            </div>

            {/* ── Table ── */}
            <div className={`${styles.tableCard} animate-slide-up stagger-3`}>
                <div className={styles.tableHeader}>
                    <div>
                        <div className={styles.tableTitle}>Registre des Étudiants</div>
                        <div className={styles.tableSubtitle}>{filtered.length} étudiant{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}</div>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {[1,2,3,4].map(i => <div key={i} className={styles.skeleton} style={{ height: '60px' }} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}><GraduationCap size={32} /></div>
                        <p style={{ fontWeight: 900, fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>Aucun étudiant trouvé</p>
                        <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                            {canCreate ? 'Commencez par inscrire un premier étudiant.' : 'Aucun résultat pour cette recherche.'}
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Étudiant</th>
                                    <th>Formation</th>
                                    <th>Année</th>
                                    <th>Téléphone</th>
                                    <th>Frais Total</th>
                                    <th>Progression paiement</th>
                                    <th>Statut Paiement</th>
                                    <th>Statut</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(e => {
                                    const pc = STATUT_PAIEMENT[e.statut_paiement] || STATUT_PAIEMENT.en_cours;
                                    const sc = STATUT_ETU[e.statut] || STATUT_ETU.actif;
                                    const pct = Math.min(parseFloat(e.pourcentage_paye) || 0, 100);
                                    const fillColor = pct >= 100 ? '#10b981' : pct > 0 ? '#f59e0b' : '#94a3b8';
                                    return (
                                        <tr key={e.id}>
                                            <td>
                                                <div className={styles.studentName}>{e.prenom} {e.nom}</div>
                                                <div className={styles.studentNumber}>{e.numero_inscription}</div>
                                            </td>
                                            <td style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{e.formation_nom}</td>
                                            <td style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--color-text-muted)' }}>{e.annee_scolaire}</td>
                                            <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>{e.telephone}</td>
                                            <td style={{ fontSize: '0.875rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>{formatCurrency(e.montant_total_frais)}</td>
                                            <td>
                                                <div className={styles.progressWrapper}>
                                                    <div className={styles.progressBar}>
                                                        <div className={styles.progressFill} style={{ width: `${pct}%`, background: fillColor }} />
                                                    </div>
                                                    <div className={styles.progressText} style={{ color: fillColor }}>
                                                        {pct}% — {formatCurrency(e.montant_paye)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className={`${styles.badge} ${pc.cls}`}>{pc.label}</span></td>
                                            <td><span className={`${styles.badge} ${sc.cls}`}>{sc.label}</span></td>
                                            <td>
                                                <Link to={`/students/${e.id}`} className={`${styles.actionBtn} ${styles.actionBtnGreen}`}>
                                                    Voir <ArrowRight size={12} />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
