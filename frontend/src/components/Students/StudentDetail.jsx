import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft, GraduationCap, User, Phone, MapPin, BookOpen,
    CreditCard, CheckCircle, Clock, AlertCircle, Edit3, Calendar, Printer
} from 'lucide-react';
import api from '../../api/axios';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import PaymentModal from './PaymentModal';
import ReceiptTemplate from './ReceiptTemplate';
import styles from './Students.module.css';

const STATUT_PAIEMENT_CFG = {
    en_attente: { label: 'En attente', cls: styles.badgeGray,   icon: Clock,         color: '#94a3b8' },
    paye:       { label: 'Payé',       cls: styles.badgeGreen,  icon: CheckCircle,   color: '#10b981' },
    partiel:    { label: 'Partiel',    cls: styles.badgeYellow, icon: AlertCircle,   color: '#f59e0b' },
    en_retard:  { label: 'En retard',  cls: styles.badgeRed,    icon: AlertCircle,   color: '#ef4444' },
};

const STATUT_SCOLARITE_CFG = {
    actif:     styles.badgeGreen,
    suspendu:  styles.badgeYellow,
    diplome:   styles.badgeBlue,
    abandonne: styles.badgeGray,
};

const STATUT_GLOBAL_CFG = {
    solde:     { label: 'Soldé',     color: '#10b981' },
    en_cours:  { label: 'En cours',  color: '#f59e0b' },
    en_retard: { label: 'En retard', color: '#ef4444' },
};

export default function StudentDetail() {
    const { id }    = useParams();
    const navigate  = useNavigate();
    const { user }  = useAuth();

    const [etudiant, setEtudiant] = useState(null);
    const [loading, setLoading]   = useState(true);
    const [updatingStatut, setUpdatingStatut] = useState(false);
    const [modalPaiement, setModalPaiement] = useState(null); // tranche à payer
    const [modalReceipt, setModalReceipt]   = useState(null); // tranche à imprimer

    const canPay = ['admin', 'caisse', 'dg'].includes(user?.role);

    const fetchEtudiant = useCallback(async () => {
        try {
            const r = await api.get(`students/etudiants/${id}/`);
            setEtudiant(r.data);
        } catch (err) {
            console.error(err);
            if (err.response?.status === 404) navigate('/students');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => { fetchEtudiant(); }, [fetchEtudiant]);

    const handlePaiementSuccess = (updatedPaiement) => {
        setEtudiant(prev => ({
            ...prev,
            paiements: prev.paiements.map(p => p.id === updatedPaiement.id ? updatedPaiement : p),
        }));
        setModalPaiement(null);
        // Refresh full data for accurate totals
        fetchEtudiant();
    };

    const handleUpdateStatut = async (newStatut) => {
        setUpdatingStatut(true);
        try {
            await api.patch(`students/etudiants/${id}/`, { statut: newStatut });
            setEtudiant(prev => ({ ...prev, statut: newStatut }));
            fetchEtudiant(); // Synchroniser les attributs _display
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la modification du statut.");
        } finally {
            setUpdatingStatut(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className={styles.skeleton} style={{ height: '200px', borderRadius: '2rem' }} />
                <div className={styles.skeleton} style={{ height: '100px', borderRadius: '1.5rem' }} />
                <div className={styles.skeleton} style={{ height: '300px', borderRadius: '1.75rem' }} />
            </div>
        );
    }

    if (!etudiant) return null;

    const pct = Math.min(parseFloat(etudiant.pourcentage_paye) || 0, 100);
    const globalCfg = STATUT_GLOBAL_CFG[etudiant.statut_paiement] || STATUT_GLOBAL_CFG.en_cours;
    const initials = `${etudiant.prenom?.[0] || ''}${etudiant.nom?.[0] || ''}`.toUpperCase();

    return (
        <div className={styles.pageContainer}>
            {/* ── Back ── */}
            <button className={styles.backBtn} onClick={() => navigate('/students')}>
                <ArrowLeft size={16} /> Retour à la liste
            </button>

            {/* ── Header banner ── */}
            <div className={`${styles.detailHeader} animate-slide-up`}>
                <div className={styles.detailHeaderBg} />
                <div className={styles.detailHeaderContent}>
                    {etudiant.photo
                        ? <img src={etudiant.photo} alt={etudiant.nom_complet} className={styles.studentAvatarImg} />
                        : <div className={styles.studentAvatar}>{initials}</div>
                    }
                    <div className={styles.detailInfo}>
                        <div className={styles.detailNumero}>{etudiant.numero_inscription}</div>
                        <div className={styles.detailNom}>{etudiant.prenom} {etudiant.nom}</div>
                        <div className={styles.detailMeta}>
                            <div className={styles.detailMetaItem}><BookOpen size={12} style={{ display:'inline', marginRight: '4px' }} /><span>{etudiant.formation_nom}</span></div>
                            <div className={styles.detailMetaItem}><Calendar size={12} style={{ display:'inline', marginRight: '4px' }} /><span>{etudiant.annee_scolaire}</span></div>
                            <div className={styles.detailMetaItem}><Phone size={12} style={{ display:'inline', marginRight: '4px' }} /><span>{etudiant.telephone}</span></div>
                        </div>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                        {canPay ? (
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={etudiant.statut}
                                    disabled={updatingStatut}
                                    onChange={(e) => handleUpdateStatut(e.target.value)}
                                    className={`${styles.badge} ${STATUT_SCOLARITE_CFG[etudiant.statut] || styles.badgeGray}`}
                                    style={{ fontSize: '0.75rem', padding: '0.5rem 2rem 0.5rem 1.25rem', cursor: 'pointer', appearance: 'none', border: '1px solid rgba(255,255,255,0.2)' }}
                                    title="Modifier le statut de l'étudiant"
                                >
                                    <option value="actif">Actif</option>
                                    <option value="suspendu">Suspendu</option>
                                    <option value="diplome">Diplômé</option>
                                    <option value="abandonne">Abandonné</option>
                                </select>
                                <Edit3 size={10} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.7 }} />
                            </div>
                        ) : (
                            <span className={`${styles.badge} ${STATUT_SCOLARITE_CFG[etudiant.statut] || styles.badgeGray}`} style={{ fontSize: '0.75rem', padding: '0.5rem 1.25rem' }}>
                                {etudiant.statut_display}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Progress global ── */}
            <div className={`${styles.progressGlobal} animate-slide-up stagger-1`}>
                <div className={styles.progressGlobalTop}>
                    <div>
                        <div className={styles.progressGlobalTitle}>Progression des Paiements</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: globalCfg.color, letterSpacing: '-0.03em' }}>
                            {pct}% — {globalCfg.label}
                        </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                        {etudiant.nombre_tranches} tranche{etudiant.nombre_tranches > 1 ? 's' : ''}
                    </div>
                </div>
                <div className={styles.progressGlobalBar}>
                    <div className={styles.progressGlobalFill} style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${globalCfg.color}, ${globalCfg.color}aa)` }} />
                </div>
                <div className={styles.progressGlobalAmounts}>
                    <div className={styles.progressAmount}>
                        <span className={styles.progressAmountLabel}>Total frais</span>
                        <span className={`${styles.progressAmountValue} ${styles.amountTotal}`}>{formatCurrency(etudiant.montant_total_frais)}</span>
                    </div>
                    <div className={styles.progressAmount}>
                        <span className={styles.progressAmountLabel}>Payé</span>
                        <span className={`${styles.progressAmountValue} ${styles.amountPaid}`}>{formatCurrency(etudiant.montant_paye)}</span>
                    </div>
                    <div className={styles.progressAmount}>
                        <span className={styles.progressAmountLabel}>Restant</span>
                        <span className={`${styles.progressAmountValue} ${styles.amountRest}`}>{formatCurrency(etudiant.montant_restant)}</span>
                    </div>
                </div>
            </div>

            {/* ── Tableau des tranches ── */}
            <div className={`${styles.payTableCard} animate-slide-up stagger-2`}>
                <div className={styles.payTableHeader}>
                    <div>
                        <div className={styles.tableTitle}>Tableau des Paiements</div>
                        <div className={styles.tableSubtitle}>Suivi des tranches de frais de formation</div>
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Tranche</th>
                                <th>Montant Prévu</th>
                                <th>Montant Payé</th>
                                <th>Date Échéance</th>
                                <th>Date Paiement</th>
                                <th>Mode</th>
                                <th>Référence</th>
                                <th>Statut</th>
                                {canPay && <th>Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {(etudiant.paiements || []).map(p => {
                                const cfg = STATUT_PAIEMENT_CFG[p.statut] || STATUT_PAIEMENT_CFG.en_attente;
                                const isPaid = p.statut === 'paye';
                                const today = new Date().toISOString().split('T')[0];
                                const isLate = p.statut === 'en_attente' && p.date_echeance < today;
                                const effectiveStatut = isLate ? 'en_retard' : p.statut;
                                const effectiveCfg = STATUT_PAIEMENT_CFG[effectiveStatut] || cfg;

                                return (
                                    <tr key={p.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: `${effectiveCfg.color}18`, color: effectiveCfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem' }}>
                                                    {p.numero_tranche}
                                                </div>
                                                <span style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>
                                                    {p.numero_tranche === 1 ? '1ère' : `${p.numero_tranche}ème`} tranche
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 900, color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>{formatCurrency(p.montant_prevu)}</td>
                                        <td style={{ fontWeight: 900, color: parseFloat(p.montant_paye) > 0 ? '#10b981' : 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                            {parseFloat(p.montant_paye) > 0 ? formatCurrency(p.montant_paye) : '—'}
                                        </td>
                                        <td style={{ fontSize: '0.8125rem', fontWeight: 700, color: isLate ? '#ef4444' : 'var(--color-text-muted)' }}>
                                            {formatDate(p.date_echeance)}
                                        </td>
                                        <td style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                            {p.date_paiement ? formatDate(p.date_paiement) : '—'}
                                        </td>
                                        <td style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                            {p.mode_display || '—'}
                                        </td>
                                        <td style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                                            {p.reference || '—'}
                                        </td>
                                        <td>
                                            <span className={`${styles.badge} ${effectiveCfg.cls}`}>
                                                {effectiveCfg.label}
                                            </span>
                                        </td>
                                        {canPay && (
                                            <td>
                                                {!isPaid ? (
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.actionBtnGreen}`}
                                                        onClick={() => setModalPaiement(p)}
                                                    >
                                                        <CreditCard size={12} /> Payer
                                                    </button>
                                                ) : (
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.actionBtnBlue}`}
                                                        onClick={() => setModalReceipt(p)}
                                                        title="Imprimer le reçu"
                                                    >
                                                        <Printer size={12} /> Reçu
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Infos personnelles ── */}
            <div className={`${styles.infoGrid} animate-slide-up stagger-3`}>
                <div className={styles.infoCard}>
                    <div className={styles.infoCardTitle}><User size={14} /> Identité</div>
                    {[
                        ['Nom complet', etudiant.nom_complet],
                        ['Sexe', etudiant.sexe_display],
                        ['Date de naissance', formatDate(etudiant.date_naissance)],
                        ['Lieu de naissance', etudiant.lieu_naissance],
                        ['CIN', etudiant.cin || '—'],
                    ].map(([k, v]) => (
                        <div key={k} className={styles.infoRow}>
                            <span className={styles.infoKey}>{k}</span>
                            <span className={styles.infoVal}>{v}</span>
                        </div>
                    ))}
                </div>
                <div className={styles.infoCard}>
                    <div className={styles.infoCardTitle}><Phone size={14} /> Contact</div>
                    {[
                        ['Téléphone', etudiant.telephone],
                        ['Email', etudiant.email || '—'],
                        ['Adresse', etudiant.adresse],
                    ].map(([k, v]) => (
                        <div key={k} className={styles.infoRow}>
                            <span className={styles.infoKey}>{k}</span>
                            <span className={styles.infoVal} style={{ maxWidth: '200px', textAlign: 'right' }}>{v}</span>
                        </div>
                    ))}
                </div>
                <div className={styles.infoCard}>
                    <div className={styles.infoCardTitle}><BookOpen size={14} /> Scolarité</div>
                    {[
                        ['Formation', etudiant.formation_nom],
                        ['Année scolaire', etudiant.annee_scolaire],
                        ['Promotion', etudiant.promotion || '—'],
                        ["Date d'inscription", formatDate(etudiant.date_inscription)],
                        ['Inscrit par', etudiant.created_by_nom || '—'],
                    ].map(([k, v]) => (
                        <div key={k} className={styles.infoRow}>
                            <span className={styles.infoKey}>{k}</span>
                            <span className={styles.infoVal}>{v}</span>
                        </div>
                    ))}
                    {etudiant.observations && (
                        <div className={styles.infoRow}>
                            <span className={styles.infoKey}>Observations</span>
                            <span className={styles.infoVal} style={{ maxWidth: '200px', textAlign: 'right', whiteSpace: 'pre-wrap' }}>{etudiant.observations}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modal Paiement ── */}
            {modalPaiement && (
                <PaymentModal
                    paiement={modalPaiement}
                    etudiantNom={etudiant.nom_complet}
                    onClose={() => setModalPaiement(null)}
                    onSuccess={handlePaiementSuccess}
                />
            )}
            {/* ── Modal Reçu ── */}
            {modalReceipt && (
                <ReceiptTemplate
                    etudiant={etudiant}
                    paiement={modalReceipt}
                    onClose={() => setModalReceipt(null)}
                />
            )}
        </div>
    );
}
