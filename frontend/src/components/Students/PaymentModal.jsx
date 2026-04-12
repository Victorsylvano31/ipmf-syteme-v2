import { useState } from 'react';
import { X, CreditCard, Loader } from 'lucide-react';
import api from '../../api/axios';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Students.module.css';

export default function PaymentModal({ paiement, etudiantNom, onClose, onSuccess }) {
    const { user } = useAuth();
    const [form, setForm] = useState({
        montant: paiement.montant_prevu - paiement.montant_paye,
        mode_paiement: 'especes',
        reference: '',
        observations: '',
        date_paiement: new Date().toISOString().split('T')[0],
    });
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const restant = paiement.montant_prevu - parseFloat(paiement.montant_paye || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.montant || parseFloat(form.montant) <= 0) {
            setError('Le montant doit être supérieur à 0.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const res = await api.post(
                `students/paiements/${paiement.id}/enregistrer_paiement/`,
                { ...form, montant: parseFloat(form.montant) }
            );
            onSuccess(res.data);
        } catch (err) {
            const msg = err.response?.data?.detail || err.response?.data?.montant?.[0] || 'Erreur lors de l\'enregistrement.';
            setError(Array.isArray(msg) ? msg[0] : msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={styles.modalCard}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <div className={styles.modalTitle} style={{ marginBottom: 0 }}>Enregistrer un Paiement</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                                Tranche {paiement.numero_tranche} — {etudiantNom}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.25rem' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Info tranche */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', padding: '1rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Montant prévu</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>{formatCurrency(paiement.montant_prevu)}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Restant à payer</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: restant > 0 ? '#f59e0b' : '#10b981' }}>{formatCurrency(restant > 0 ? restant : 0)}</div>
                    </div>
                </div>

                {error && (
                    <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '0.75rem', color: '#ef4444', fontWeight: 700, fontSize: '0.8125rem', marginBottom: '1rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Montant payé (Ar) <span className="required" style={{ color: '#ef4444' }}>*</span></label>
                        <input
                            type="number"
                            className={styles.formInput}
                            value={form.montant}
                            onChange={e => set('montant', e.target.value)}
                            min="0" step="100"
                            placeholder={restant}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Mode de paiement <span style={{ color: '#ef4444' }}>*</span></label>
                        <select className={styles.formSelect} value={form.mode_paiement} onChange={e => set('mode_paiement', e.target.value)}>
                            <option value="especes">Espèces</option>
                            <option value="virement">Virement bancaire</option>
                            <option value="cheque">Chèque</option>
                            <option value="mobile_money">Mobile Money</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Date de paiement</label>
                        <input type="date" className={styles.formInput} value={form.date_paiement} onChange={e => set('date_paiement', e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Référence / N° reçu</label>
                        <input className={styles.formInput} value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="Ex: BCQ-2026-001 (optionnel)" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Observations</label>
                        <textarea className={styles.formTextarea} value={form.observations} onChange={e => set('observations', e.target.value)} placeholder="Notes (optionnel)" style={{ minHeight: '64px' }} />
                    </div>

                    <div className={styles.modalActions}>
                        <button type="button" className={styles.btnCancel} onClick={onClose}>Annuler</button>
                        <button type="submit" className={styles.btnSubmit} disabled={saving}>
                            {saving ? <><Loader size={14} className="animate-spin" /> Enregistrement...</> : <><CreditCard size={14} /> Confirmer le Paiement</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
