import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Calendar, CreditCard, User, MessageSquare, Clock } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { StatusBadge, FilePreview } from './FinanceComponents';
import styles from './Finances.module.css';

export default function IncomeDetail() {
    const { user } = useAuth();
    const { id } = useParams();
    const [income, setIncome] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [comment, setComment] = useState('');

    const fetchIncome = useCallback(async () => {
        try {
            const res = await api.get(`finances/entrees/${id}/`);
            setIncome(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchIncome();
    }, [fetchIncome]);

    const handleAction = async (action) => {
        if (action === 'cancel' && !comment.trim()) {
            alert("Un commentaire est requis pour annuler une entrée.");
            return;
        }

        setActionLoading(true);
        try {
            const actionMapping = {
                'confirm': 'confirmer',
                'cancel': 'annuler'
            };
            const urlAction = actionMapping[action] || action;
            await api.post(`finances/entrees/${id}/${urlAction}/`, { commentaire: comment });
            await fetchIncome();
            setComment('');
        } catch (err) {
            console.error(err);
            alert("Erreur lors de l'exécution de l'action.");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className={styles.financeContainer}><p>Chargement...</p></div>;
    if (!income) return <div className={styles.financeContainer}><p>Entrée non trouvée.</p></div>;

    const canManager = ['admin', 'dg', 'comptable', 'caisse'].includes(user.role);

    return (
        <div className={styles.financeContainer}>
            <header className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link to="/finances/incomes" className={styles.btnSecondary} style={{ padding: '8px' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className={styles.title}>Détail Entrée : {income.numero}</h1>
                        <StatusBadge status={income.statut} />
                    </div>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
                <div style={{ display: 'grid', gap: '24px' }}>
                    <div className={styles.tableWrapper} style={{ padding: '24px' }}>
                        <h3 style={{ marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>Informations Générales</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Motif</label>
                                <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', marginTop: '4px' }}>{income.motif}</p>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Montant</label>
                                <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981', marginTop: '4px' }}>{formatCurrency(income.montant)}</p>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Date d'opération</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <Calendar size={18} color="#94a3b8" />
                                    <span>{formatDate(income.date_entree)}</span>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Mode de paiement</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <CreditCard size={18} color="#94a3b8" />
                                    <span style={{ textTransform: 'capitalize' }}>{income.mode_paiement.replace('_', ' ')}</span>
                                </div>
                            </div>
                        </div>

                        {income.commentaire && (
                            <div style={{ marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <MessageSquare size={14} /> Commentaire
                                </label>
                                <p style={{ marginTop: '8px', color: '#475569' }}>{income.commentaire}</p>
                            </div>
                        )}
                    </div>

                    <div className={styles.tableWrapper} style={{ padding: '24px' }}>
                        <h3 style={{ marginBottom: '12px' }}>Pièce Justificative</h3>
                        <FilePreview url={income.piece_justificative} filename={income.piece_justificative_name} />
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '24px', alignContent: 'start' }}>
                    <div className={styles.tableWrapper} style={{ padding: '20px' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Actions & Workflow</h3>

                        {income.statut === 'en_attente' && income.can_confirm && (
                            <div style={{ display: 'grid', gap: '12px' }}>
                                <textarea
                                    placeholder="Ajouter une note ou motif d'annulation..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }}
                                    rows="3"
                                />
                                <button
                                    onClick={() => handleAction('confirm')}
                                    disabled={actionLoading}
                                    className={styles.btnPrimary} style={{ width: '100%', justifyContent: 'center' }}
                                >
                                    <CheckCircle size={18} /> Confirmer l'entrée
                                </button>
                                <button
                                    onClick={() => handleAction('cancel')}
                                    disabled={actionLoading}
                                    className={styles.btnSecondary} style={{ width: '100%', justifyContent: 'center', color: '#ef4444' }}
                                >
                                    <XCircle size={18} /> Annuler l'opération
                                </button>
                            </div>
                        )}

                        {income.statut !== 'en_attente' && (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                <CheckCircle size={32} style={{ margin: '0 auto 12px', color: income.statut === 'confirmee' ? '#10b981' : '#94a3b8' }} />
                                <p>Cette opération est terminée.</p>
                            </div>
                        )}
                    </div>

                    <div className={styles.tableWrapper} style={{ padding: '20px' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Traçabilité</h3>
                        <div style={{ display: 'grid', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{ background: '#f1f5f9', padding: '8px', borderRadius: '8px' }}><User size={16} color="#64748b" /></div>
                                <div>
                                    <p style={{ fontSize: '0.875rem', fontWeight: '600' }}>Créé par</p>
                                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{income.created_by_name}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{ background: '#f1f5f9', padding: '8px', borderRadius: '8px' }}><Clock size={16} color="#64748b" /></div>
                                <div>
                                    <p style={{ fontSize: '0.875rem', fontWeight: '600' }}>Date création</p>
                                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{formatDate(income.created_at)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
