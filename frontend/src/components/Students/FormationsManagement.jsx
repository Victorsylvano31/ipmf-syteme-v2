import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Edit2, ArrowLeft, Loader, Save, X, ToggleLeft, ToggleRight, Search } from 'lucide-react';
import api from '../../api/axios';
import { formatCurrency } from '../../utils/formatters';
import styles from './Students.module.css';

const INITIAL_FORM = {
    nom: '',
    description: '',
    duree_mois: 6,
    frais_defaut: '',
    nombre_tranches_defaut: 3,
    is_active: true
};

export default function FormationsManagement() {
    const navigate = useNavigate();
    const [formations, setFormations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(INITIAL_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [editId, setEditId] = useState(null);
    const [search, setSearch] = useState('');
    const [filterActive, setFilterActive] = useState('all');

    const fetchFormations = () => {
        api.get('students/formations/')
            .then(res => setFormations(res.data.results ?? res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchFormations();
    }, []);

    const handleOpen = (f = null) => {
        if (f) {
            setEditId(f.id);
            setForm({
                nom: f.nom,
                description: f.description || '',
                duree_mois: f.duree_mois,
                frais_defaut: f.frais_defaut,
                nombre_tranches_defaut: f.nombre_tranches_defaut,
                is_active: f.is_active
            });
        } else {
            setEditId(null);
            setForm(INITIAL_FORM);
        }
        setError('');
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nom || parseFloat(form.frais_defaut) <= 0) {
            setError('Veuillez remplir le nom et définir un montant valide.');
            return;
        }

        setSaving(true);
        try {
            const payload = { ...form, frais_defaut: parseFloat(form.frais_defaut) };
            if (editId) {
                await api.put(`students/formations/${editId}/`, payload);
            } else {
                await api.post('students/formations/', payload);
            }
            setModalOpen(false);
            fetchFormations();
        } catch (err) {
            setError(err.response?.data?.detail || 'Erreur lors de la sauvegarde.');
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (f) => {
        try {
            await api.patch(`students/formations/${f.id}/`, { is_active: !f.is_active });
            fetchFormations();
        } catch (err) {
            console.error(err);
        }
    };

    const filtered = formations.filter(f => {
        const matchesSearch = search ? f.nom.toLowerCase().includes(search.toLowerCase()) : true;
        const matchesActive = filterActive === 'all' ? true : filterActive === 'active' ? f.is_active : !f.is_active;
        return matchesSearch && matchesActive;
    });

    return (
        <div className={styles.pageContainer}>
            {/* Banner */}
            <div className={`${styles.banner} animate-slide-up`}>
                <div className={styles.bannerBg} />
                <div className={styles.bannerContent}>
                    <button className={styles.backBtn} onClick={() => navigate('/students')} style={{ marginBottom: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                        <ArrowLeft size={16} /> Retour aux étudiants
                    </button>
                    <span className={styles.bannerBadge}><BookOpen size={12} /> Catalogue</span>
                    <h1 className={styles.bannerTitle}>
                        Gestion des <span className={styles.bannerTitleAccent}>Formations</span>
                    </h1>
                </div>
                <div className={styles.bannerActions}>
                    <button onClick={() => handleOpen()} className={styles.btnPrimary}>
                        <Plus size={16} /> Nouvelle Formation
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className={`${styles.filterBar} animate-slide-up stagger-1`}>
                <div className={styles.searchWrapper}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                        className={styles.searchInput}
                        placeholder="Rechercher une formation..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select className={styles.filterSelect} value={filterActive} onChange={e => setFilterActive(e.target.value)}>
                    <option value="all">Toutes les formations</option>
                    <option value="active">Actives uniquement</option>
                    <option value="inactive">Inactives uniquement</option>
                </select>
            </div>

            {/* List */}
            <div className={`${styles.tableCard} animate-slide-up stagger-2`}>
                <div className={styles.tableHeader}>
                    <div>
                        <div className={styles.tableTitle}>Liste des Formations</div>
                        <div className={styles.tableSubtitle}>Configurations et frais par défaut</div>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '2.5rem' }}>Chargement...</div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Formation</th>
                                <th>Durée</th>
                                <th>Frais (par défaut)</th>
                                <th>Tranches</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(f => (
                                <tr key={f.id} style={{ opacity: f.is_active ? 1 : 0.6 }}>
                                    <td>
                                        <div style={{ fontWeight: 900, color: 'var(--color-text-primary)' }}>{f.nom}</div>
                                        {f.description && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{f.description}</div>}
                                    </td>
                                    <td style={{ fontWeight: 700, color: 'var(--color-text-muted)' }}>{f.duree_mois} mois</td>
                                    <td style={{ fontWeight: 900, color: 'var(--color-text-primary)' }}>{formatCurrency(f.frais_defaut)}</td>
                                    <td>
                                        <span className={`${styles.badge} ${styles.badgeBlue}`}>
                                            {f.nombre_tranches_defaut}
                                        </span>
                                    </td>
                                    <td>
                                        {f.is_active ? (
                                            <span className={`${styles.badge} ${styles.badgeGreen}`}>Actif</span>
                                        ) : (
                                            <span className={`${styles.badge} ${styles.badgeGray}`}>Inactif</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => handleOpen(f)} className={`${styles.actionBtn} ${styles.actionBtnBlue}`}>
                                                <Edit2 size={12} />
                                            </button>
                                            <button 
                                                onClick={() => toggleStatus(f)} 
                                                className={`${styles.actionBtn} ${f.is_active ? styles.actionBtnGreen : styles.actionBtnGray}`}
                                                style={{ padding: '0.5rem' }}
                                                title={f.is_active ? "Désactiver" : "Activer"}
                                            >
                                                {f.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Aucune formation trouvée.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
                    <div className={styles.modalCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 className={styles.modalTitle} style={{ marginBottom: 0 }}>
                                {editId ? 'Modifier la Formation' : 'Nouvelle Formation'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        {error && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Nom de la formation *</label>
                                <input className={styles.formInput} value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} required placeholder="Ex: Permis Catégorie C" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Frais de formation (Ar) *</label>
                                <input type="number" className={styles.formInput} value={form.frais_defaut} onChange={e => setForm({...form, frais_defaut: e.target.value})} required min="0" step="100" placeholder="Ex: 500000" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Durée (Mois)</label>
                                    <input type="number" className={styles.formInput} value={form.duree_mois} onChange={e => setForm({...form, duree_mois: e.target.value})} min="1" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Tranches par défaut</label>
                                    <select className={styles.formSelect} value={form.nombre_tranches_defaut} onChange={e => setForm({...form, nombre_tranches_defaut: parseInt(e.target.value)})}>
                                        {[1,2,3,4,6].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Description</label>
                                <textarea className={styles.formTextarea} value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                                <button type="button" className={styles.btnCancel} onClick={() => setModalOpen(false)}>Annuler</button>
                                <button type="submit" className={styles.btnSubmit} disabled={saving}>
                                    {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
