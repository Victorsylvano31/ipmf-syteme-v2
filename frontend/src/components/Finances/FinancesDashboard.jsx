import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardComptable from '../Dashboard/DashboardComptable';
import DashboardCaisse from '../Dashboard/DashboardCaisse';
import {
    ArrowUpCircle,
    ArrowDownCircle,
    TrendingUp,
    Receipt,
    ChevronRight,
    Plus,
    ArrowUpRight
} from 'lucide-react';
import api from '../../api/axios';
import { formatCurrency } from '../../utils/formatters';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import styles from './Finances.module.css';

export default function FinancesDashboard() {
    const { user } = useAuth();

    const [stats, setStats] = useState({
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        loading: true
    });

    useEffect(() => {
        if (user?.role === 'agent') return;

        const fetchStats = async () => {
            try {
                // Use analytics endpoint to get correct overall totals (avoids pagination issues)
                const response = await api.get('finances/analytics/');
                const { overall_totals } = response.data;

                setStats({
                    totalIncome: overall_totals.total_entrees,
                    totalExpenses: overall_totals.total_depenses,
                    balance: overall_totals.solde,
                    loading: false
                });
            } catch (err) {
                console.error("Error fetching finance stats:", err);
                setStats(s => ({ ...s, loading: false }));
            }
        };

        fetchStats();
    }, [user?.role]); // added user?.role to dependency array just in case

    if (user?.role === 'agent') {
        return <Navigate to="/finances/incomes" replace />;
    }

    if (user?.role === 'caisse') {
        return (
            <div className={styles.financeContainer}>
                <DashboardCaisse />
            </div>
        );
    }

    if (user?.role === 'comptable') {
        return (
            <div className={styles.financeContainer}>
                <DashboardComptable />
            </div>
        );
    }

    return (
        <div className={styles.financeContainer}>
            {/* Main Finances Banner */}
            <div className={`${styles.financeBanner} animate-slide-up`}>
                <div className={styles.bannerContent}>
                    <span className={styles.bannerBadge}>PILOTAGE FINANCIER</span>
                    <h1 className={styles.bannerTitle}>Gestion <span className={styles.bannerTitleHighlight}>Financière</span></h1>
                    <p className={styles.bannerDesc}>
                        Orchestration des flux de trésorerie et analyse de la performance budgétaire.
                    </p>
                </div>
                <div className={styles.bannerActions}>
                    {user?.permissions?.includes('can_create_depense') && (
                        <Link to="/expenses/new" className={styles.btnDepense}>
                            <Plus size={18} /> DÉPENSE
                        </Link>
                    )}
                    {user?.permissions?.includes('can_create_entree') && (
                        <Link to="/finances/incomes/new" className={styles.btnEntree}>
                            <ArrowUpRight size={18} /> ENREGISTRER ENTRÉE
                        </Link>
                    )}
                </div>
            </div>

            {/* Role-Based Action Sections */}
            <div style={{ marginBottom: '32px' }}>
                {['admin'].includes(user?.role) && <DashboardComptable />}
                {['admin'].includes(user?.role) && <DashboardCaisse />}
            </div>

            <div className={`${styles.statsGrid} animate-slide-up stagger-1`}>
                <div className={`${styles.statCard} premium-card soft-glow-blue`}>
                    <div className={`${styles.statIcon} ${styles.incomeIcon}`} style={{ boxShadow: 'inset 0 0 10px rgba(16, 185, 129, 0.1)' }}>
                        <ArrowUpCircle size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Total Entrées</span>
                        <span className={styles.statValue} style={{ fontSize: '1.75rem' }}>
                            {stats.loading ? '...' : formatCurrency(stats.totalIncome)}
                        </span>
                    </div>
                </div>

                <div className={`${styles.statCard} premium-card`}>
                    <div className={`${styles.statIcon} ${styles.expenseIcon}`} style={{ boxShadow: 'inset 0 0 10px rgba(239, 68, 68, 0.1)' }}>
                        <ArrowDownCircle size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Total Dépenses</span>
                        <span className={styles.statValue} style={{ fontSize: '1.75rem' }}>
                            {stats.loading ? '...' : formatCurrency(stats.totalExpenses)}
                        </span>
                    </div>
                </div>

                <div className={`${styles.statCard} premium-card soft-glow-blue`}>
                    <div className={`${styles.statIcon} ${styles.balanceIcon}`} style={{ boxShadow: 'inset 0 0 10px rgba(59, 130, 246, 0.1)' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Solde Actuel</span>
                        <span className={`${styles.statValue} ${stats.balance >= 0 ? styles.amountPositive : styles.amountNegative}`} style={{ fontSize: '1.75rem' }}>
                            {stats.loading ? '...' : formatCurrency(stats.balance)}
                        </span>
                    </div>
                </div>
            </div>

            <h2 className={`${styles.sectionTitle} animate-slide-up stagger-2`} style={{ marginTop: '40px', fontSize: '1.5rem', opacity: '0.9' }}>Modules Financiers</h2>

            <div className={`${styles.cardGrid} animate-slide-up stagger-3`}>
                <Link to="/finances/incomes" className={`${styles.navCard} premium-card group`}>
                    <div className={styles.navCardIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <ArrowUpCircle size={24} className="group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                        <div className={styles.navCardTitle}>
                            Flux de Trésorerie (Entrées)
                            <span className={styles.activeBadge}>Actif</span>
                        </div>
                        <p className={styles.navCardDesc}>
                            Suivez toutes les recettes, paiements de clients et injections de fonds.
                        </p>
                    </div>
                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', color: '#10b981', fontWeight: '700', fontSize: '0.8125rem', gap: '4px' }} className="group-hover:gap-2 transition-all">
                        Voir les détails <ChevronRight size={14} />
                    </div>
                </Link>

                <Link to="/expenses" className={`${styles.navCard} premium-card group`}>
                    <div className={styles.navCardIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                        <ArrowDownCircle size={24} className="group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                        <div className={styles.navCardTitle}>Gestion des Dépenses</div>
                        <p className={styles.navCardDesc}>
                            Suivi des coûts opérationnels, salaires, achats et frais de mission.
                        </p>
                    </div>
                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', color: '#ef4444', fontWeight: '700', fontSize: '0.8125rem', gap: '4px' }} className="group-hover:gap-2 transition-all">
                        Voir les détails <ChevronRight size={14} />
                    </div>
                </Link>

                <Link to="/finances/analytics" className={`${styles.navCard} premium-card group`}>
                    <div className={styles.navCardIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                        <Receipt size={24} className="group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                        <div className={styles.navCardTitle}>Budgets & Rapports</div>
                        <p className={styles.navCardDesc}>
                            Analyse prévisionnelle et rapports financiers mensuels.
                        </p>
                    </div>
                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', color: '#3b82f6', fontWeight: '700', fontSize: '0.8125rem', gap: '4px' }} className="group-hover:gap-2 transition-all">
                        Voir les analyses <ChevronRight size={14} />
                    </div>
                </Link>
            </div>
        </div>
    );
}
