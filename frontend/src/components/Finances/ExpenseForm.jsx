import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, X, Upload, Calculator, Tag, Briefcase, Info } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import styles from './Finances.module.css';

export default function ExpenseForm() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const prefilledData = location.state || {};

    const [loading, setLoading] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [error, setError] = useState(null);
    const [file, setFile] = useState(null);

    const [formData, setFormData] = useState({
        motif: prefilledData.motif || '',
        categorie: prefilledData.categorie || 'fonctionnement',
        quantite: 1,
        prix_unitaire: '',
        commentaire: '',
        tache: '' // ID de la tâche sélectionnée
    });

    const [total, setTotal] = useState(0);

    useEffect(() => {
        const qty = parseInt(formData.quantite) || 0;
        const pu = parseFloat(formData.prix_unitaire) || 0;
        setTotal(qty * pu);
    }, [formData.quantite, formData.prix_unitaire]);

    // Fetch active tasks for linking
    useEffect(() => {
        const fetchTasks = async () => {
            try {
                // On récupère les tâches où l'utilisateur est impliqué
                const res = await api.get('tasks/taches/', {
                    params: { statut: 'en_cours' } // On filtre pour n'avoir que les actives
                });
                const allTasks = res.data.results || res.data;
                // Filtrer localement si l'API ne le fait pas parfaitement (ex: user assigné)
                // Mais l'endpoint 'mes_taches' serait mieux, ou le get_queryset filtre déjà.
                // Ici on assume que l'API renvoie les tâches visibles par l'user.
                // On ne garde que celles en cours ou validées (si on permet dépenses post-mission)
                const activeTasks = allTasks.filter(t => ['en_cours', 'validee'].includes(t.statut));
                setTasks(activeTasks);
            } catch (err) {
                console.error("Erreur chargement missions", err);
            }
        };
        fetchTasks();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        if (name === 'tache') {
            const task = tasks.find(t => t.id === parseInt(value));
            setSelectedTask(task || null);
            // Auto-categorize as Mission if task selected
            if (task && formData.categorie !== 'mission') {
                setFormData(prev => ({ ...prev, categorie: 'mission', [name]: value }));
            }
        }
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

        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key]) data.append(key, formData[key]);
        });
        if (file) data.append('piece_justificative', file);

        try {
            await api.post('finances/depenses/', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            navigate('/expenses');
        } catch (err) {
            console.error(err);
            const errorData = err.response?.data;
            let errorMessage = "Erreur lors de l'enregistrement de la dépense.";

            if (errorData) {
                if (typeof errorData === 'string') {
                    errorMessage = errorData;
                } else if (errorData.detail) {
                    errorMessage = errorData.detail;
                } else if (errorData.error) {
                    errorMessage = errorData.error;
                } else {
                    const firstKey = Object.keys(errorData)[0];
                    if (firstKey && Array.isArray(errorData[firstKey])) {
                        errorMessage = `${firstKey}: ${errorData[firstKey][0]}`;
                    }
                }
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.financeContainer}>
            <header className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link to="/expenses" className={styles.btnSecondary} style={{ padding: '8px' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className={styles.title}>Nouvelle Dépense</h1>
                        <p style={{ color: 'var(--color-text-muted)', marginTop: '4px' }}>Enregistrer un décaissement ou une demande d'achat</p>
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

                    {/* Mission Selection Linked to Auto-Approval */}
                    {tasks.length > 0 && (
                        <div className={styles.formGroup} style={{ background: 'var(--color-bg-hover)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border-light)' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Briefcase size={18} /> Lier à une Mission (Optionnel)
                            </label>
                            <select
                                name="tache"
                                value={formData.tache}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-card)', color: 'var(--color-text-primary)', outline: 'none' }}
                            >
                                <option value="" style={{ background: 'var(--color-bg-card)' }}>-- Aucune mission liée --</option>
                                {tasks.map(t => (
                                    <option key={t.id} value={t.id} style={{ background: 'var(--color-bg-card)' }}>
                                        {t.numero} - {t.titre}
                                    </option>
                                ))}
                            </select>

                            {selectedTask && (
                                <div style={{ marginTop: '12px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span>Budget Restant :</span>
                                        <span style={{ fontWeight: '700', color: (selectedTask.budget_restant - total) >= 0 ? '#10b981' : '#ef4444' }}>
                                            {formatCurrency(selectedTask.budget_restant)}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', padding: '10px 12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                        <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <span style={{ fontWeight: '500' }}>
                                            {(selectedTask.budget_restant - total) >= 0
                                                ? "Cette dépense sera automatiquement approuvée si elle respecte le solde."
                                                : "Attention : Cette dépense dépasse le budget de la mission."}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className={styles.formGroup}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Motif / Objet de la dépense</label>
                        <input
                            type="text"
                            name="motif"
                            required
                            placeholder="Ex: Achat de fournitures de bureau"
                            value={formData.motif}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)', outline: 'none' }}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Catégorie</label>
                        <div style={{ position: 'relative' }}>
                            <Tag size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <select
                                name="categorie"
                                value={formData.categorie}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)', outline: 'none' }}
                            >
                                <option value="fonctionnement" style={{ background: 'var(--color-bg-card)' }}>Fonctionnement</option>
                                <option value="investissement" style={{ background: 'var(--color-bg-card)' }}>Investissement</option>
                                <option value="personnel" style={{ background: 'var(--color-bg-card)' }}>Personnel</option>
                                <option value="formation" style={{ background: 'var(--color-bg-card)' }}>Formation</option>
                                <option value="mission" style={{ background: 'var(--color-bg-card)' }}>Mission</option>
                                <option value="autre" style={{ background: 'var(--color-bg-card)' }}>Autre</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div className={styles.formGroup}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Quantité</label>
                            <input
                                type="number"
                                name="quantite"
                                min="1"
                                required
                                value={formData.quantite}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)', outline: 'none' }}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Prix Unitaire (Ar)</label>
                            <input
                                type="number"
                                name="prix_unitaire"
                                required
                                placeholder="0.00"
                                value={formData.prix_unitaire}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)', outline: 'none' }}
                            />
                        </div>
                    </div>

                    <div style={{ background: 'var(--color-bg-hover)', padding: '16px', borderRadius: '12px', border: '1px dashed var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)' }}>
                            <Calculator size={20} />
                            <span style={{ fontWeight: '500' }}>Total calculé :</span>
                        </div>
                        <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                            {formatCurrency(total)}
                        </span>
                    </div>

                    <div className={styles.formGroup}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Justificatif (PDF, Image)</label>
                        <div style={{ position: 'relative' }}>
                            <Upload size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input
                                type="file"
                                onChange={handleFileChange}
                                style={{ width: '100%', padding: '10px 12px 10px 40px', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '0.875rem', background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)', outline: 'none' }}
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Commentaire / Justification</label>
                        <textarea
                            name="commentaire"
                            required
                            placeholder="Pourquoi cette dépense est-elle nécessaire ?"
                            value={formData.commentaire}
                            onChange={handleChange}
                            rows="3"
                            style={{ width: '100%', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px', resize: 'vertical', background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)', outline: 'none' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                        <button type="submit" disabled={loading} className={styles.btnPrimary} style={{ flex: 1, justifyContent: 'center' }}>
                            {loading ? 'Envoi...' : <><Save size={18} /> Soumettre la demande</>}
                        </button>
                        <Link to="/expenses" className={styles.btnSecondary} style={{ flex: 1, justifyContent: 'center' }}>
                            <X size={18} /> Annuler
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
