import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, X, Upload, DollarSign, Calendar } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import styles from './Finances.module.css';

export default function IncomeForm() {
    const { user } = useAuth();
    const { addToast } = useNotifications();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [file, setFile] = useState(null);

    const [formData, setFormData] = useState({
        motif: '',
        montant: '',
        mode_paiement: 'especes',
        date_entree: new Date().toISOString().split('T')[0],
        commentaire: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Using FormData for file upload
        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));
        if (file) data.append('piece_justificative', file);

        try {
            await api.post('finances/entrees/', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            addToast("Entrée d'argent enregistrée avec succès", "success", "Succès");
            navigate('/finances/incomes');
        } catch (err) {
            console.error(err);
            const errorData = err.response?.data;
            let errorMessage = "Erreur lors de l'enregistrement de l'entrée.";

            if (errorData) {
                if (typeof errorData === 'string') {
                    errorMessage = errorData;
                } else if (errorData.detail) {
                    errorMessage = errorData.detail;
                } else if (errorData.error) {
                    errorMessage = errorData.error;
                } else {
                    // Extract first field error if available
                    const firstKey = Object.keys(errorData)[0];
                    if (firstKey && Array.isArray(errorData[firstKey])) {
                        errorMessage = `${firstKey}: ${errorData[firstKey][0]}`;
                    }
                }
            }
            setError(errorMessage);
            addToast(errorMessage, "error", "Erreur");
        } finally {
            setLoading(false);
        }
    };

    const canCreate = ['admin', 'caisse', 'comptable', 'dg', 'agent'].includes(user?.role);

    if (!canCreate) {
        return (
            <div className={styles.financeContainer}>
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '24px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', fontWeight: '700' }}>Accès Restreint</h2>
                        <p style={{ fontWeight: '500' }}>Votre rôle (<strong>{user?.role}</strong>) ne possède pas les permissions nécessaires pour enregistrer des entrées d'argent.</p>
                        <Link to="/finances" className={styles.btnSecondary} style={{ marginTop: '24px', display: 'inline-flex' }}>
                            Retour aux finances
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.financeContainer}>
            <header className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link to="/finances/incomes" className={styles.btnSecondary} style={{ padding: '8px' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className={styles.title}>Enregistrer une Entrée</h1>
                        <p style={{ color: 'var(--color-text-muted)', marginTop: '4px' }}>Ajouter un nouveau flux de trésorerie</p>
                    </div>
                </div>
            </header>

            <div className={styles.tableWrapper} style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
                {error && (
                    <div style={{ background: '#fef2f2', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '24px' }}>
                    <div className={styles.formGroup}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Motif / Objet</label>
                        <input
                            type="text"
                            name="motif"
                            required
                            placeholder="Ex: Paiement facture #1234"
                            value={formData.motif}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)', outline: 'none' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div className={styles.formGroup}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Montant (Ar)</label>
                            <div style={{ position: 'relative' }}>
                                <DollarSign size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input
                                    type="number"
                                    name="montant"
                                    required
                                    placeholder="0.00"
                                    value={formData.montant}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Mode de paiement</label>
                            <select
                                name="mode_paiement"
                                value={formData.mode_paiement}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)', outline: 'none' }}
                            >
                                <option value="especes" style={{ background: 'var(--color-bg-card)' }}>Espèces</option>
                                <option value="virement" style={{ background: 'var(--color-bg-card)' }}>Virement bancaire</option>
                                <option value="cheque" style={{ background: 'var(--color-bg-card)' }}>Chèque</option>
                                <option value="carte" style={{ background: 'var(--color-bg-card)' }}>Carte bancaire</option>
                                <option value="mobile" style={{ background: 'var(--color-bg-card)' }}>Paiement mobile</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div className={styles.formGroup}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Date d'entrée</label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input
                                    type="date"
                                    name="date_entree"
                                    required
                                    value={formData.date_entree}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)', outline: 'none', colorScheme: 'dark' }}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Pièce justificative</label>
                            <div style={{ position: 'relative' }}>
                                <Upload size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    style={{ width: '100%', padding: '10px 12px 10px 40px', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '0.875rem', background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)', outline: 'none' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Commentaire (optionnel)</label>
                        <textarea
                            name="commentaire"
                            placeholder="Détails supplémentaires..."
                            value={formData.commentaire}
                            onChange={handleChange}
                            rows="3"
                            style={{ width: '100%', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px', resize: 'vertical', background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)', outline: 'none' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                        <button type="submit" disabled={loading} className={styles.btnPrimary} style={{ flex: 1, justifyContent: 'center' }}>
                            {loading ? 'Enregistrement...' : <><Save size={18} /> Enregistrer l'entrée</>}
                        </button>
                        <Link to="/finances/incomes" className={styles.btnSecondary} style={{ flex: 1, justifyContent: 'center' }}>
                            <X size={18} /> Annuler
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
