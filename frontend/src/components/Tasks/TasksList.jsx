import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { formatStatus, formatPriority, formatDate } from '../../utils/formatters';
import { Search, Plus, ChevronRight, User, Calendar, List, Filter, Download } from 'lucide-react';
import TasksCalendar from './TasksCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Avatar from '../ui/Avatar';

export default function TasksList() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('tous');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const res = await api.get('tasks/taches/');
                const data = res.data.results || res.data;
                setTasks(data);
                setFilteredTasks(data);
            } catch (err) {
                console.error("Erreur chargement tâches", err);
                setError("Impossible de charger les tâches.");
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, []);

    useEffect(() => {
        let result = tasks;
        if (searchTerm) {
            result = result.filter(t =>
                t.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.numero?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (statusFilter === 'retard') {
            result = result.filter(t => t.est_en_retard && !['terminee', 'validee', 'annulee'].includes(t.statut));
        } else if (statusFilter !== 'tous') {
            result = result.filter(t => t.statut === statusFilter);
        }
        setFilteredTasks(result);
    }, [searchTerm, statusFilter, tasks]);

    const handleExportCSV = async () => {
        try {
            const response = await api.get('tasks/taches/export_csv/', {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `missions_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Export error", err);
            alert("Erreur lors de l'exportation CSV");
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );

    if (error) return (
        <Card className="border-red-100 bg-red-50">
            <CardContent className="p-6 text-red-600 flex items-center gap-2">
                <span className="font-bold">Erreur:</span> {error}
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-10 pb-10">
            {/* Mission Strategic Header */}
            <div className="relative overflow-hidden rounded-[32px] bg-slate-900 bg-mesh-slate p-10 lg:p-12 shadow-2xl animate-slide-up border border-white/10">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

                <div className="absolute top-0 right-0 p-6 z-20 flex flex-wrap gap-3 justify-end">
                    <Button
                        variant="ghost"
                        onClick={handleExportCSV}
                        className="text-white/60 hover:text-white hover:bg-white/10 backdrop-blur-md rounded-full px-5 border border-white/5 font-bold text-xs uppercase tracking-widest"
                    >
                        <Download size={16} className="mr-2" />
                        <span>Exporter</span>
                    </Button>

                    {['admin', 'dg'].includes(user?.role?.toLowerCase()) && (
                        <Link to="/tasks/new">
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white border-none shadow-xl shadow-blue-600/20 font-black rounded-full px-6 py-2.5 text-xs uppercase tracking-widest group">
                                <Plus size={18} className="mr-2 group-hover:rotate-90 transition-transform duration-500" />
                                <span>Nouvelle Mission</span>
                            </Button>
                        </Link>
                    )}
                </div>

                <header className="relative z-10 flex flex-col justify-center min-h-[140px]">
                    <div className="space-y-4">
                        <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 backdrop-blur-xl px-4 py-1.5 font-black tracking-[0.2em] uppercase text-[10px] w-fit">
                            GESTION OPÉRATIONNELLE
                        </Badge>
                        <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter leading-tight drop-shadow-2xl">
                            Missions <span className="text-blue-400">&</span> Objectifs
                        </h1>
                        <p className="text-white/70 font-semibold text-lg max-w-2xl leading-relaxed">
                            Orchestration et suivi tactique de l'ensemble des missions actives et planifiées.
                        </p>
                    </div>
                </header>
            </div>

            {/* View Mode & Quick Filters Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 animate-slide-up stagger-1">
                <div className="inline-flex bg-slate-200/50 dark:bg-slate-800/40 p-1.5 rounded-[20px] border border-white/10 shadow-inner backdrop-blur-md">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center justify-center gap-3 px-6 py-2.5 rounded-[14px] text-xs font-black uppercase tracking-widest transition-all duration-300 ${viewMode === 'list'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xl'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
                            }`}
                    >
                        <List size={16} />
                        <span>Liste</span>
                    </button>
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`flex items-center justify-center gap-3 px-6 py-2.5 rounded-[14px] text-xs font-black uppercase tracking-widest transition-all duration-300 ${viewMode === 'calendar'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xl'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
                            }`}
                    >
                        <Calendar size={16} />
                        <span>Calendrier</span>
                    </button>
                </div>

                <Card className="flex-1 md:max-w-2xl border-none shadow-2xl bg-[var(--color-bg-card)] overflow-visible rounded-[24px] glass-card">
                    <CardContent className="p-3 flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative group">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-all duration-300" />
                            <input
                                placeholder="Recherche tactique..."
                                className="w-full pl-12 pr-4 py-2.5 bg-slate-100/50 dark:bg-slate-800/30 border-none rounded-[18px] focus:ring-0 text-sm font-bold text-[var(--color-text-primary)] transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="sm:w-56">
                            <div className="relative group">
                                <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10" />
                                <select
                                    className="w-full pl-12 pr-4 py-2.5 bg-slate-100/50 dark:bg-slate-800/30 border-none rounded-[18px] focus:ring-0 text-xs font-black uppercase tracking-widest text-[var(--color-text-primary)] appearance-none cursor-pointer"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="tous">Tous les statuts</option>
                                    <option value="retard">⚠️ Expiré / En Retard</option>
                                    <option value="creee">Nouveau</option>
                                    <option value="en_cours">En cours</option>
                                    <option value="terminee">Terminé</option>
                                    <option value="validee">Validé</option>
                                    <option value="annulee">Annulé</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {viewMode === 'list' ? (
                <div className="animate-slide-up stagger-2">
                    <Card className="border-none shadow-2xl bg-[var(--color-bg-card)] overflow-hidden rounded-[32px] glass-card">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-500/5 border-b border-[var(--color-border-light)]">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Numéro</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Mission</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Priorité</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Statut</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Échéance</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Assigné</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border-light)]">
                                    {filteredTasks.map(task => {
                                        const statusStyle = formatStatus(task.statut);

                                        return (
                                            <tr key={task.id} className={`group hover:bg-blue-500/5 transition-all duration-300 ${task.est_en_retard ? 'bg-red-500/[0.02]' : ''}`}>
                                                <td className="px-8 py-6">
                                                    <span className="font-black text-slate-500 font-mono text-xs tracking-widest">{task.numero}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-extrabold text-[var(--color-text-primary)] group-hover:text-blue-500 transition-colors tracking-tight text-base">{task.titre}</span>
                                                        {task.est_en_retard && (
                                                            <span className="inline-flex">
                                                                <Badge variant="danger" size="sm" className="px-2 py-0.5 text-[9px] font-black tracking-widest animate-pulse">EXPIRÉ</Badge>
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <Badge
                                                        variant={task.priorite === 'urgente' ? 'danger' : task.priorite === 'haute' ? 'accent' : 'primary'}
                                                        className="font-black tracking-widest uppercase text-[9px] px-3 py-1 rounded-full shadow-sm"
                                                    >
                                                        {task.priorite}
                                                    </Badge>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div
                                                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border"
                                                        style={{
                                                            backgroundColor: `${statusStyle.bg}10`,
                                                            color: statusStyle.color,
                                                            borderColor: `${statusStyle.color}20`,
                                                            boxShadow: `0 2px 10px ${statusStyle.color}05`
                                                        }}
                                                    >
                                                        <div className="w-1.5 h-1.5 rounded-full animate-pulse-subtle" style={{ backgroundColor: statusStyle.color }}></div>
                                                        {statusStyle.label}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className={task.est_en_retard ? 'text-red-500' : 'text-slate-400'} />
                                                        <span className={`text-sm font-bold tracking-tight ${task.est_en_retard ? 'text-red-500' : 'text-[var(--color-text-secondary)]'}`}>
                                                            {formatDate(task.date_echeance)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    {task.agents_assignes_names?.length > 0 ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative group/avatar">
                                                                <Avatar
                                                                    src={task.agents_assignes_photos?.[0]}
                                                                    name={task.agents_assignes_names[0]}
                                                                    size="base"
                                                                    className="ring-2 ring-white/10 group-hover/avatar:ring-blue-500 transition-all duration-300"
                                                                />
                                                            </div>
                                                            <span className="text-xs font-black text-slate-500 uppercase tracking-tighter truncate max-w-[120px]">
                                                                {task.agents_assignes_names.length === 1
                                                                    ? task.agents_assignes_names[0]
                                                                    : `${task.agents_assignes_names[0]} + ${task.agents_assignes_names.length - 1}`}
                                                            </span>
                                                        </div>
                                                    ) : <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Non assigné</span>}
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <Link to={`/tasks/${task.id}`}>
                                                        <Button variant="outline" size="sm" className="rounded-full border-slate-200 dark:border-slate-800 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all font-black text-[10px] uppercase tracking-widest px-5 group">
                                                            Détails <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                                        </Button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {filteredTasks.length === 0 && (
                            <div className="py-20 text-center bg-slate-500/5">
                                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <List size={40} className="text-slate-300" />
                                </div>
                                <p className="text-slate-500 font-extrabold text-lg tracking-tight">Aucun résultat</p>
                                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-2">Affinez vos filtres de recherche.</p>
                            </div>
                        )}
                    </Card>
                </div>
            ) : (
                <div className="animate-in fade-in zoom-in-95 duration-700">
                    <TasksCalendar tasks={filteredTasks} />
                </div>
            )}
        </div>
    );
}

