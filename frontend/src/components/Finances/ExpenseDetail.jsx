import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    ShieldCheck,
    CheckCircle,
    XCircle,
    Calendar,
    User,
    MessageSquare,
    CreditCard,
    Info
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { StatusBadge, FilePreview } from './FinanceComponents';
import styles from './Finances.module.css';

export default function ExpenseDetail() {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const [expense, setExpense] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [comment, setComment] = useState('');

    const fetchExpense = useCallback(async () => {
        try {
            const res = await api.get(`finances/depenses/${id}/`);
            setExpense(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchExpense();
    }, [fetchExpense]);

    const handleAction = async (action) => {
        if (action === 'reject' && !comment.trim()) {
            alert("Un motif de rejet est obligatoire.");
            return;
        }

        setActionLoading(true);
        try {
            const actionMapping = {
                'verify': 'verifier',
                'validate': 'valider',
                'pay': 'payer',
                'reject': 'reject' // Wait, does the backend have reject?
            };
            const urlAction = actionMapping[action] || action;
            await api.post(`finances/depenses/${id}/${urlAction}/`, { commentaire: comment });
            await fetchExpense();
            setComment('');
        } catch (err) {
            console.error(err);
            const errorMessage = err.response?.data?.error || err.response?.data?.detail || "Erreur inconnue";
            alert("Erreur : " + errorMessage);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className={styles.financeContainer}><p>Chargement...</p></div>;
    if (!expense) return <div className={styles.financeContainer}><p>Dépense non trouvée.</p></div>;

    const role = user.role;
    const isComptable = ['admin', 'comptable'].includes(role);
    const isDG = ['admin', 'dg'].includes(role);
    const isCaisse = ['admin', 'caisse'].includes(role);
    const isPayer = ['admin', 'caisse', 'dg'].includes(role);
    const isCreator = user && expense && user.id === expense.created_by && user.role !== 'dg';

    return (
        <div className={styles.financeContainer}>
            <header className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link to="/expenses" className={styles.btnSecondary} style={{ padding: '8px' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className={styles.title}>Demande : {expense.numero}</h1>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <StatusBadge status={expense.statut} />
                            <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontWeight: '500' }}>
                                {expense.categorie.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
                <div style={{ display: 'grid', gap: '24px' }}>
                    {/* Main Info */}
                    <div className={styles.tableWrapper} style={{ padding: '24px' }}>
                        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Motif / Objet</label>
                                <h2 style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)', marginTop: '4px' }}>{expense.motif}</h2>
                                {expense.tache_titre && (
                                    <div 
                                        onClick={() => navigate(`/tasks/${expense.tache}`)}
                                        className="cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
                                        style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--color-bg-hover)', borderRadius: '12px', border: '1px solid var(--color-border-light)' }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>Mission liée</label>
                                            <span style={{ fontSize: '0.65rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>Voir détails →</span>
                                        </div>
                                        <p style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>{expense.tache_titre}</p>
                                        <p style={{ fontSize: '0.8125rem', color: '#6366f1', fontWeight: '600', marginTop: '2px' }}>Budget Alloué : {formatCurrency(expense.tache_budget)}</p>
                                    </div>
                                )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Montant Demandé</label>
                                <p style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ef4444', marginTop: '4px' }}>{formatCurrency(expense.montant)}</p>
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{expense.quantite} x {formatCurrency(expense.prix_unitaire)}</p>
                            </div>
                        </div>

                        {expense.commentaire && (
                            <div style={{ padding: '16px', background: 'var(--color-bg-hover)', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--color-border-light)' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <MessageSquare size={14} /> Justification
                                </label>
                                <p style={{ marginTop: '8px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>{expense.commentaire}</p>
                            </div>
                        )}

                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Date de demande</label>
                                <p style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', color: 'var(--color-text-primary)' }}>
                                    <Calendar size={14} /> {formatDate(expense.created_at)}
                                </p>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Demandeur</label>
                                <p style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', color: 'var(--color-text-primary)' }}>
                                    <User size={14} /> {expense.created_by_name}
                                </p>
                            </div>
                            {expense.statut === 'payee' && (
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Payé le</label>
                                    <p style={{ fontWeight: '500', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                        <CheckCircle size={14} /> {formatDate(expense.date_paiement)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Justificatif */}
                    <div className={styles.tableWrapper} style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Justificatif de dépense</h3>
                        <FilePreview url={expense.piece_justificative} filename={expense.piece_justificative_name} />
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '24px', alignContent: 'start' }}>
                    {/* Workflow Actions */}
                    <div className={styles.tableWrapper} style={{ padding: '20px' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShieldCheck size={20} color="#3b82f6" /> Validation
                        </h3>

                        {/* Transitions Section */}
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {/* Action text area for reject/comment */}
                            {(expense.statut !== 'payee' && expense.statut !== 'rejetee') && !((expense.statut === 'en_attente' && isCreator)) && (
                                <textarea
                                    placeholder="Commentaire ou motif de rejet..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)', fontSize: '0.875rem', outline: 'none' }}
                                    rows="3"
                                />
                            )}

                            {/* Security Alert for Creator */}
                            {isCreator && expense.statut !== 'payee' && expense.statut !== 'rejetee' && (
                                <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '0.875rem', color: '#3b82f6', display: 'flex', gap: '8px' }}>
                                    <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span style={{ fontWeight: '500' }}>Vous avez créé cette demande. Vous ne pouvez pas la valider vous-même.</span>
                                </div>
                            )}

                            {/* Verify (Comptable) - HIDE IF CREATOR */}
                            {expense.statut === 'en_attente' && isComptable && !isCreator && (
                                <button onClick={() => handleAction('verify')} disabled={actionLoading} className={styles.btnPrimary} style={{ width: '100%', background: '#3b82f6' }}>
                                    <ShieldCheck size={18} /> Marquer comme Vérifié
                                </button>
                            )}

                            {/* Validate (DG or Comptable depending on amount) - HIDE IF CREATOR */}
                            {expense.statut === 'verifiee' && (
                                (expense.necessite_validation_dg ? isDG : isComptable) && !isCreator ? (
                                    <button onClick={() => handleAction('validate')} disabled={actionLoading} className={styles.btnPrimary} style={{ width: '100%', background: '#10b981' }}>
                                        <CheckCircle size={18} /> Approuver le paiement
                                    </button>
                                ) : (
                                    !isCreator && (
                                        <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '0.875rem', color: '#f59e0b' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                                                <Info size={16} />
                                                <span style={{ fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem' }}>Attente de Validation</span>
                                            </div>
                                            <p style={{ fontWeight: '500' }}>En attente de validation par {expense.necessite_validation_dg ? 'le DG' : 'le Comptable'}.</p>
                                        </div>
                                    )
                                )
                            )}

                            {/* Pay (Caisse, DG or Admin) - HIDE IF CREATOR */}
                            {expense.statut === 'validee' && isPayer && !isCreator && (
                                <button onClick={() => handleAction('pay')} disabled={actionLoading} className={styles.btnPrimary} style={{ width: '100%', background: '#059669' }}>
                                    <CreditCard size={18} /> Confirmer le Paiement
                                </button>
                            )}

                            {/* Valider et Payer Direct (DG Shortcut) - SI BUDGET DÉPASSÉ OU DG VEUT ALLER VITE */}
                            {['en_attente', 'verifiee'].includes(expense.statut) && isDG && !isCreator && (
                                <button 
                                    onClick={() => handleAction('payer_direct')} 
                                    disabled={actionLoading} 
                                    className={styles.btnPrimary} 
                                    style={{ 
                                        width: '100%', 
                                        background: expense.montant > expense.tache_budget ? '#dc2626' : '#10b981',
                                        boxShadow: expense.montant > expense.tache_budget ? '0 0 15px rgba(220, 38, 38, 0.3)' : 'none',
                                        border: 'none'
                                    }}
                                >
                                    <CreditCard size={18} /> Valider et Payer (Direct)
                                </button>
                            )}

                            {/* Reject (Available at most steps) - HIDE IF CREATOR */}
                            {['en_attente', 'verifiee', 'validee'].includes(expense.statut) && (isComptable || isDG) && !isCreator && (
                                <button onClick={() => handleAction('reject')} disabled={actionLoading} className={styles.btnSecondary} style={{ width: '100%', color: '#ef4444' }}>
                                    <XCircle size={18} /> Rejeter la demande
                                </button>
                            )}

                            {/* Status Terminal Messages */}
                            {expense.statut === 'payee' && (
                                <div style={{ textAlign: 'center', padding: '10px', color: '#10b981' }}>
                                    <CheckCircle size={40} style={{ margin: '0 auto 8px' }} />
                                    <p style={{ fontWeight: '600' }}>DEMANDE PAYÉE</p>
                                </div>
                            )}

                            {expense.statut === 'rejetee' && (
                                <div style={{ textAlign: 'center', padding: '10px', color: '#ef4444' }}>
                                    <XCircle size={40} style={{ margin: '0 auto 8px' }} />
                                    <p style={{ fontWeight: '600' }}>DEMANDE REJETÉE</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress Monitor */}
                    <div className={styles.tableWrapper} style={{ padding: '20px' }}>
                        <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>HISTORIQUE DES ÉTAPES</h3>
                        <div style={{ display: 'grid', gap: '12px', borderLeft: '2px solid var(--color-border-light)', paddingLeft: '16px', marginLeft: '6px' }}>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '-25px', top: '0', background: '#10b981', width: '16px', height: '16px', borderRadius: '50%', border: '4px solid var(--color-bg-card)', boxShadow: '0 0 0 1px var(--color-border-light)' }} />
                                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>Création</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{expense.created_by_name} - {formatDate(expense.created_at)}</p>
                            </div>

                            {expense.verifie_par && (
                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '-25px', top: '0', background: '#3b82f6', width: '16px', height: '16px', borderRadius: '50%', border: '4px solid var(--color-bg-card)', boxShadow: '0 0 0 1px var(--color-border-light)' }} />
                                    <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>Vérification</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{expense.verifie_par_name} - {formatDate(expense.date_verification)}</p>
                                </div>
                            )}

                            {(expense.valide_par_comptable || expense.valide_par_dg) && (
                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '-25px', top: '0', background: '#10b981', width: '16px', height: '16px', borderRadius: '50%', border: '4px solid var(--color-bg-card)', boxShadow: '0 0 0 1px var(--color-border-light)' }} />
                                    <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>Approbation</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        {expense.valide_par_dg_name || expense.valide_par_comptable_name}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
