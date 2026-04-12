import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { Calendar, AlertTriangle, User, CreditCard, Send, PlusCircle, X, Edit2, Save } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Avatar from '../ui/Avatar';

export default function TaskForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { addToast } = useNotifications();
    const queryParams = new URLSearchParams(location.search);
    const isEdit = Boolean(id);

    // Helper to format ISO or Date for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch (e) {
            return '';
        }
    };

    const [formData, setFormData] = useState({
        titre: '',
        description: '',
        date_debut: formatDateForInput(queryParams.get('start')),
        date_echeance: formatDateForInput(queryParams.get('end')),
        priorite: 'moyenne',
        agent_principal: '',
        budget_alloue: ''
    });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await api.get('users/?page_size=100');
                const data = res.data.results || res.data;
                const usersData = Array.isArray(data) ? data : [];
                setUsers(usersData);
            } catch (err) {
                console.error("Erreur chargement utilisateurs", err);
            }
        };

        const fetchTask = async () => {
            if (!isEdit) return;
            setLoading(true);
            try {
                const res = await api.get(`tasks/taches/${id}/`);
                const task = res.data;
                setFormData({
                    titre: task.titre || '',
                    description: task.description || '',
                    date_debut: formatDateForInput(task.date_debut),
                    date_echeance: formatDateForInput(task.date_echeance),
                    priorite: task.priorite || 'moyenne',
                    agent_principal: task.agent_principal || '',
                    budget_alloue: task.budget_alloue || ''
                });
            } catch (err) {
                console.error("Erreur chargement mission", err);
                setError("Impossible de charger les données de la mission.");
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
        fetchTask();
    }, [id, isEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Filtrer pour exclure le DG et admin du dropdown Chef de mission
    const chefCandidates = users.filter(u => !['dg', 'admin'].includes(u.role));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const payload = {
            ...formData,
            agent_principal: formData.agent_principal || null,
            agents_assignes: formData.agent_principal ? [parseInt(formData.agent_principal)] : []
        };

        try {
            if (isEdit) {
                await api.patch(`tasks/taches/${id}/`, payload);
                addToast("La mission a été mise à jour avec succès", "success", "Succès");
            } else {
                await api.post('tasks/taches/', payload);
                addToast("La mission a été créée avec succès", "success", "Succès");
            }
            navigate(isEdit ? `/tasks/${id}` : '/tasks');
        } catch (err) {
            console.error(err);
            const errorData = err.response?.data;
            let errorMessage = "Erreur lors de la création de la tâche.";

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
            addToast(errorMessage, "error", "Erreur");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    icon={X}
                    onClick={() => navigate('/tasks')}
                    className="text-slate-400 hover:text-red-500"
                >
                    Annuler
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        {isEdit ? (
                            <><Edit2 size={24} className="text-blue-500" /> Modifier la Mission</>
                        ) : (
                            <><PlusCircle size={24} className="text-blue-500" /> Nouvelle Mission</>
                        )}
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">
                        {isEdit ? "Modifiez les détails de cette mission." : "Définissez les détails et assignez des agents."}
                    </p>
                </div>
            </div>

            {error && (
                <Card className="border-red-100 bg-red-50 border-l-4 border-l-red-500">
                    <CardContent className="p-4 text-red-700 flex items-center gap-3">
                        <AlertTriangle size={20} />
                        <span className="font-semibold text-sm">{error}</span>
                    </CardContent>
                </Card>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
                    <div className="h-1.5 w-full bg-blue-600"></div>
                    <CardContent className="p-8 space-y-8">
                        {/* Section 1: Basic Info */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Titre de la mission</label>
                                <Input
                                    name="titre"
                                    placeholder="Audit financier Q1, Déplacement sur site..."
                                    value={formData.titre}
                                    onChange={handleChange}
                                    required
                                    className="text-lg font-semibold h-12 bg-slate-50/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Description détaillée</label>
                                <textarea
                                    name="description"
                                    placeholder="Décrivez les objectifs, les étapes et les livrables attendus pour cette mission..."
                                    value={formData.description}
                                    onChange={handleChange}
                                    required
                                    className="w-full p-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100/50 focus:border-blue-500 outline-none transition-all text-sm min-h-[150px] leading-relaxed"
                                />
                            </div>
                        </div>

                        {/* Section 2: Dates & Priority */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar size={14} className="text-blue-500" /> Date de début
                                </label>
                                <Input
                                    type="datetime-local"
                                    name="date_debut"
                                    value={formData.date_debut}
                                    onChange={handleChange}
                                    className="bg-slate-50/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar size={14} className="text-red-500" /> Échéance
                                </label>
                                <Input
                                    type="datetime-local"
                                    name="date_echeance"
                                    value={formData.date_echeance}
                                    onChange={handleChange}
                                    required
                                    className="bg-slate-50/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <AlertTriangle size={14} className="text-amber-500" /> Priorité
                                </label>
                                <div className="relative group">
                                    <select
                                        name="priorite"
                                        value={formData.priorite}
                                        onChange={handleChange}
                                        className="w-full px-4 h-11 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100/50 focus:border-blue-500 outline-none transition-all text-sm font-semibold text-slate-900 appearance-none cursor-pointer"
                                    >
                                        <option value="basse">🟢 Basse</option>
                                        <option value="moyenne">🟡 Moyenne</option>
                                        <option value="haute">🟠 Haute</option>
                                        <option value="urgente">🔴 Urgente</option>
                                    </select>
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Chef de Mission */}
                        <div className="space-y-6 pt-6 border-t border-slate-100">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                                    <User size={16} className="text-blue-500" /> Chef de mission
                                </label>
                                <p className="text-[10px] font-medium text-slate-400 mb-4">Le Chef sélectionné pourra ensuite constituer son équipe depuis la page de la mission.</p>
                                <div className="relative group">
                                    <select
                                        name="agent_principal"
                                        value={formData.agent_principal}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 h-12 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100/50 focus:border-blue-500 outline-none transition-all text-sm font-semibold text-slate-900 appearance-none cursor-pointer"
                                    >
                                        <option value="">— Sélectionner un Chef de mission —</option>
                                        {chefCandidates.map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.full_name || u.username} ({u.role_display || u.role})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                </div>

                                {/* Preview of selected Chef */}
                                {formData.agent_principal && (() => {
                                    const chef = users.find(u => u.id === parseInt(formData.agent_principal));
                                    if (!chef) return null;
                                    return (
                                        <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                                            <Avatar name={chef.full_name || chef.username} size="base" />
                                            <div>
                                                <p className="text-sm font-bold text-blue-700 dark:text-blue-400">{chef.full_name || chef.username}</p>
                                                <p className="text-[10px] font-bold text-blue-500/60 uppercase tracking-widest">{chef.role_display || chef.role} — Chef de mission</p>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Section 4: Budget */}
                        <div className="pt-6 border-t border-[var(--color-border-light)]">
                            <div className="max-w-xs space-y-2">
                                <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-2">
                                    <CreditCard size={16} className="text-emerald-500" /> Budget alloué (Ar)
                                    <span className="text-[9px] font-medium text-slate-400 normal-case tracking-normal">(Optionnel — peut être défini après)</span>
                                </label>
                                <Input
                                    type="number"
                                    name="budget_alloue"
                                    placeholder="Ex: 500000 — ou laisser vide"
                                    value={formData.budget_alloue}
                                    onChange={handleChange}
                                    className="font-mono font-bold text-lg bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 focus:border-emerald-500 focus:ring-emerald-500/10"
                                />
                                <p className="text-[10px] text-slate-400 font-medium">💡 Vous pouvez remplir le Bon de Commande dans la page de la mission et synchroniser le budget automatiquement.</p>
                            </div>
                        </div>
                    </CardContent>

                    <div className="p-8 bg-[var(--color-bg-hover)]/30 flex items-center justify-between border-t border-[var(--color-border-light)]">
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/tasks')}
                            type="button"
                            className="text-slate-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 transition-all font-bold"
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            icon={isEdit ? Save : Send}
                            className="px-10 h-12 shadow-xl shadow-blue-500/20"
                        >
                            {loading ? (isEdit ? 'Mise à jour...' : 'Création en cours...') : (isEdit ? 'Enregistrer les modifications' : 'Créer la mission')}
                        </Button>
                    </div>
                </Card>
            </form>
        </div >
    );
}

