import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, User, Phone, MapPin, BookOpen, CreditCard, ArrowLeft, Save, Loader } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Students.module.css';

const CURRENT_YEAR = new Date().getFullYear();
const ANNEE_SCOLAIRE = `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`;

const INITIAL = {
    nom: '', prenom: '', date_naissance: '', lieu_naissance: '', sexe: 'M',
    cin: '', adresse: '', telephone: '', email: '',
    formation: '', annee_scolaire: ANNEE_SCOLAIRE, promotion: '',
    date_inscription: new Date().toISOString().split('T')[0],
    montant_total_frais: '', nombre_tranches: 3,
    statut: 'actif', observations: '',
};

export default function StudentForm() {
    const navigate = useNavigate();
    const { user }  = useAuth();
    const [form, setForm]         = useState(INITIAL);
    const [errors, setErrors]     = useState({});
    const [formations, setFormations] = useState([]);
    const [saving, setSaving]     = useState(false);
    const [serverErr, setServerErr] = useState('');
    const canCreate = ['admin', 'caisse', 'dg'].includes(user?.role);

    // Fetch formations — toujours avant tout return conditionnel
    useEffect(() => {
        if (!canCreate) return;
        api.get('students/formations/', { params: { active_only: true } })
            .then(r => {
                const list = r.data.results ?? r.data;
                setFormations(list);
                if (list.length === 1) {
                    setForm(f => ({ ...f, formation: list[0].id, montant_total_frais: list[0].frais_defaut, nombre_tranches: list[0].nombre_tranches_defaut }));
                }
            })
            .catch(console.error);
    }, [canCreate]);

    // Guard — après tous les hooks
    useEffect(() => {
        if (user && !canCreate) navigate('/students');
    }, [canCreate, navigate]);

    const set = (field, val) => {
        setForm(f => ({ ...f, [field]: val }));
        if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
    };

    const handleFormationChange = (id) => {
        const f = formations.find(f => String(f.id) === String(id));
        setForm(prev => ({
            ...prev,
            formation: id,
            montant_total_frais: f ? f.frais_defaut : prev.montant_total_frais,
            nombre_tranches: f ? f.nombre_tranches_defaut : prev.nombre_tranches,
        }));
    };

    // Calcul preview tranches
    const totalFrais   = parseFloat(form.montant_total_frais) || 0;
    const nbTranches   = parseInt(form.nombre_tranches) || 3;
    const montantTranche = nbTranches > 0 ? (totalFrais / nbTranches).toFixed(2) : 0;

    const validate = () => {
        const e = {};
        if (!form.nom.trim())              e.nom = 'Le nom est requis.';
        if (!form.prenom.trim())           e.prenom = 'Le prénom est requis.';
        if (!form.date_naissance)          e.date_naissance = 'La date de naissance est requise.';
        if (!form.lieu_naissance.trim())   e.lieu_naissance = 'Le lieu de naissance est requis.';
        if (!form.adresse.trim())          e.adresse = "L'adresse est requise.";
        if (!form.telephone.trim())        e.telephone = 'Le téléphone est requis.';
        if (!form.formation)               e.formation = 'La formation est requise.';
        if (!form.annee_scolaire.trim())   e.annee_scolaire = "L'année scolaire est requise.";
        if (!form.montant_total_frais || parseFloat(form.montant_total_frais) <= 0)
                                           e.montant_total_frais = 'Le montant doit être supérieur à 0.';
        if (!form.nombre_tranches || parseInt(form.nombre_tranches) < 1)
                                           e.nombre_tranches = 'Minimum 1 tranche.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        setServerErr('');
        try {
            const payload = { ...form, montant_total_frais: parseFloat(form.montant_total_frais) };
            const res = await api.post('students/etudiants/', payload);
            navigate(`/students/${res.data.id}`);
        } catch (err) {
            const data = err.response?.data;
            if (data && typeof data === 'object') {
                const fieldErrors = {};
                Object.entries(data).forEach(([k, v]) => { fieldErrors[k] = Array.isArray(v) ? v[0] : v; });
                setErrors(fieldErrors);
                setServerErr("Veuillez corriger les erreurs ci-dessus.");
            } else {
                setServerErr("Une erreur est survenue. Veuillez réessayer.");
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            {/* Header */}
            <div className={`${styles.banner} animate-slide-up`}>
                <div className={styles.bannerBg} />
                <div className={styles.bannerContent}>
                    <button className={styles.backBtn} onClick={() => navigate('/students')}>
                        <ArrowLeft size={16} /> Retour à la liste
                    </button>
                    <span className={styles.bannerBadge}><GraduationCap size={12} /> Nouvelle Inscription</span>
                    <h1 className={styles.bannerTitle}>
                        Inscrire un <span className={styles.bannerTitleAccent}>Étudiant</span>
                    </h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className={styles.formContainer}>
                {serverErr && (
                    <div style={{ padding: '1rem 1.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '1rem', color: '#ef4444', fontWeight: 700, fontSize: '0.875rem' }}>
                        {serverErr}
                    </div>
                )}

                {/* ── Identité ── */}
                <div className={styles.formCard}>
                    <div className={styles.formCardHeader}>
                        <div className={styles.formCardHeaderIcon} style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                            <User size={18} />
                        </div>
                        <div className={styles.formCardTitle}>Identité</div>
                    </div>
                    <div className={styles.formBody}>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Nom <span className={styles.required}>*</span></label>
                                <input className={`${styles.formInput}${errors.nom ? ' '+styles.error : ''}`} value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="RAKOTO" />
                                {errors.nom && <span className={styles.errorMsg}>{errors.nom}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Prénom(s) <span className={styles.required}>*</span></label>
                                <input className={`${styles.formInput}${errors.prenom ? ' '+styles.error : ''}`} value={form.prenom} onChange={e => set('prenom', e.target.value)} placeholder="Jean" />
                                {errors.prenom && <span className={styles.errorMsg}>{errors.prenom}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Sexe <span className={styles.required}>*</span></label>
                                <select className={styles.formSelect} value={form.sexe} onChange={e => set('sexe', e.target.value)}>
                                    <option value="M">Masculin</option>
                                    <option value="F">Féminin</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Date de naissance <span className={styles.required}>*</span></label>
                                <input type="date" className={`${styles.formInput}${errors.date_naissance ? ' '+styles.error : ''}`} value={form.date_naissance} onChange={e => set('date_naissance', e.target.value)} />
                                {errors.date_naissance && <span className={styles.errorMsg}>{errors.date_naissance}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Lieu de naissance <span className={styles.required}>*</span></label>
                                <input className={`${styles.formInput}${errors.lieu_naissance ? ' '+styles.error : ''}`} value={form.lieu_naissance} onChange={e => set('lieu_naissance', e.target.value)} placeholder="Antananarivo" />
                                {errors.lieu_naissance && <span className={styles.errorMsg}>{errors.lieu_naissance}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>N° CIN</label>
                                <input className={styles.formInput} value={form.cin} onChange={e => set('cin', e.target.value)} placeholder="101 234 567 890 (optionnel)" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Contact ── */}
                <div className={styles.formCard}>
                    <div className={styles.formCardHeader}>
                        <div className={styles.formCardHeaderIcon} style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                            <Phone size={18} />
                        </div>
                        <div className={styles.formCardTitle}>Contact</div>
                    </div>
                    <div className={styles.formBody}>
                        <div className={styles.formGrid}>
                            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                <label className={styles.formLabel}>Adresse complète <span className={styles.required}>*</span></label>
                                <textarea className={`${styles.formTextarea}${errors.adresse ? ' '+styles.error : ''}`} value={form.adresse} onChange={e => set('adresse', e.target.value)} placeholder="Lot II AB 123, Antananarivo..." />
                                {errors.adresse && <span className={styles.errorMsg}>{errors.adresse}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Téléphone <span className={styles.required}>*</span></label>
                                <input className={`${styles.formInput}${errors.telephone ? ' '+styles.error : ''}`} value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="+261 34 00 000 00" />
                                {errors.telephone && <span className={styles.errorMsg}>{errors.telephone}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Email</label>
                                <input type="email" className={styles.formInput} value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemple.com (optionnel)" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Scolarité ── */}
                <div className={styles.formCard}>
                    <div className={styles.formCardHeader}>
                        <div className={styles.formCardHeaderIcon} style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                            <BookOpen size={18} />
                        </div>
                        <div className={styles.formCardTitle}>Scolarité</div>
                    </div>
                    <div className={styles.formBody}>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Formation <span className={styles.required}>*</span></label>
                                <select className={`${styles.formSelect}${errors.formation ? ' '+styles.error : ''}`} value={form.formation} onChange={e => handleFormationChange(e.target.value)}>
                                    <option value="">-- Choisir une formation --</option>
                                    {formations.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                                </select>
                                {errors.formation && <span className={styles.errorMsg}>{errors.formation}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Année scolaire <span className={styles.required}>*</span></label>
                                <input className={`${styles.formInput}${errors.annee_scolaire ? ' '+styles.error : ''}`} value={form.annee_scolaire} onChange={e => set('annee_scolaire', e.target.value)} placeholder="2025-2026" />
                                {errors.annee_scolaire && <span className={styles.errorMsg}>{errors.annee_scolaire}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Promotion</label>
                                <input className={styles.formInput} value={form.promotion} onChange={e => set('promotion', e.target.value)} placeholder="Ex: Promo 5" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Date d'inscription <span className={styles.required}>*</span></label>
                                <input type="date" className={styles.formInput} value={form.date_inscription} onChange={e => set('date_inscription', e.target.value)} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Statut</label>
                                <select className={styles.formSelect} value={form.statut} onChange={e => set('statut', e.target.value)}>
                                    <option value="actif">Actif</option>
                                    <option value="suspendu">Suspendu</option>
                                    <option value="diplome">Diplômé</option>
                                    <option value="abandonne">Abandonné</option>
                                </select>
                            </div>
                            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                <label className={styles.formLabel}>Observations</label>
                                <textarea className={styles.formTextarea} value={form.observations} onChange={e => set('observations', e.target.value)} placeholder="Notes libres (optionnel)" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Frais ── */}
                <div className={styles.formCard}>
                    <div className={styles.formCardHeader}>
                        <div className={styles.formCardHeaderIcon} style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                            <CreditCard size={18} />
                        </div>
                        <div className={styles.formCardTitle}>Frais de Formation</div>
                    </div>
                    <div className={styles.formBody}>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Montant Total (Ar) <span className={styles.required}>*</span></label>
                                <input type="number" className={`${styles.formInput}${errors.montant_total_frais ? ' '+styles.error : ''}`} value={form.montant_total_frais} onChange={e => set('montant_total_frais', e.target.value)} placeholder="600000" min="0" step="100" />
                                {errors.montant_total_frais && <span className={styles.errorMsg}>{errors.montant_total_frais}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Nombre de tranches <span className={styles.required}>*</span></label>
                                <select className={`${styles.formSelect}${errors.nombre_tranches ? ' '+styles.error : ''}`} value={form.nombre_tranches} onChange={e => set('nombre_tranches', parseInt(e.target.value))}>
                                    {[1,2,3,4,6].map(n => <option key={n} value={n}>{n} tranche{n > 1 ? 's' : ''}</option>)}
                                </select>
                                {errors.nombre_tranches && <span className={styles.errorMsg}>{errors.nombre_tranches}</span>}
                            </div>
                        </div>

                        {/* Preview tranches */}
                        {totalFrais > 0 && nbTranches > 0 && (
                            <div className={styles.tranchePreview} style={{ marginTop: '1.25rem' }}>
                                <div className={styles.tranchePreviewTitle}>Aperçu des tranches (auto-calculées)</div>
                                {Array.from({ length: nbTranches }, (_, i) => {
                                    const isLast = i === nbTranches - 1;
                                    const mt = isLast
                                        ? (totalFrais - parseFloat(montantTranche) * (nbTranches - 1)).toFixed(2)
                                        : montantTranche;
                                    return (
                                        <div key={i} className={styles.trancheRow}>
                                            <span><span className={styles.trancheNum}>Tranche {i+1}</span></span>
                                            <span>{parseFloat(mt).toLocaleString('fr-FR')} Ar</span>
                                        </div>
                                    );
                                })}
                                <div className={styles.trancheRow} style={{ background: 'rgba(16,185,129,0.15)', fontWeight: 900 }}>
                                    <span>Total</span>
                                    <span>{parseFloat(totalFrais).toLocaleString('fr-FR')} Ar</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Submit ── */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingBottom: '2rem' }}>
                    <button type="button" className={styles.btnCancel} onClick={() => navigate('/students')}>
                        Annuler
                    </button>
                    <button type="submit" className={styles.btnSubmit} disabled={saving}>
                        {saving ? <><Loader size={16} className="animate-spin" /> Enregistrement...</> : <><Save size={16} /> Inscrire l'étudiant</>}
                    </button>
                </div>
            </form>
        </div>
    );
}
