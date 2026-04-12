import React, { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Filter,
    Download,
    Calendar,
    User as UserIcon,
    Database,
    ChevronLeft,
    ChevronRight,
    Eye,
    ShieldAlert,
    Activity,
    X
} from 'lucide-react';
import api from '../../api/axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Avatar from '../ui/Avatar';

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        search: '',
        module: '',
        action_type: '',
        niveau: '',
        date_debut: '',
        date_fin: ''
    });
    const [selectedLog, setSelectedLog] = useState(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page,
                ...filters
            };
            const response = await api.get('audit/logs/', { params });
            setLogs(response.data.results || response.data);
            if (response.data.count) {
                setTotalPages(Math.ceil(response.data.count / 20)); // DRF default page size
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des logs d'audit:", error);
        } finally {
            setLoading(false);
        }
    }, [page, filters]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPage(1); // Reset to first page on filter change
    };

    const getTypeStyle = (type) => {
        switch (type) {
            case 'create': return { color: '#10b981', label: 'Création' };
            case 'update': return { color: '#3b82f6', label: 'Modification' };
            case 'delete': return { color: '#ef4444', label: 'Suppression' };
            case 'validation': return { color: '#06b6d4', label: 'Validation' };
            case 'rejet': return { color: '#f43f5e', label: 'Rejet' };
            case 'login': return { color: '#8b5cf6', label: 'Connexion' };
            case 'logout': return { color: '#64748b', label: 'Déconnexion' };
            default: return { color: '#94a3b8', label: type };
        }
    };

    const getLevelBadge = (level) => {
        switch (level) {
            case 'info': return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Info</Badge>;
            case 'warning': return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Warning</Badge>;
            case 'error': return <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/20 gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Erreur</Badge>;
            case 'critical': return <Badge variant="secondary" className="bg-red-900/10 text-red-800 border-red-900/20 gap-1.5 font-bold"><ShieldAlert size={12} /> Critique</Badge>;
            default: return <Badge variant="outline">{level}</Badge>;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Premium Strategic Banner (Version Slim) */}
            <div className="relative overflow-hidden rounded-[24px] bg-slate-950 bg-mesh-slate p-6 lg:p-8 shadow-xl animate-slide-up border border-white/10 mb-8">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

                <div className="absolute top-0 right-0 p-4 z-20 flex flex-wrap gap-3 justify-end items-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { }}
                        className="text-white/60 hover:text-white hover:bg-white/10 backdrop-blur-md rounded-full px-5 border border-white/5 font-bold text-[11px] uppercase tracking-widest h-9 transition-all"
                    >
                        <Download size={14} className="mr-2" />
                        <span>Exporter</span>
                    </Button>
                </div>

                <header className="relative z-10 flex items-center gap-6">
                    <div className="space-y-1">
                        <Badge variant="outline" className="bg-slate-500/20 text-slate-300 border-slate-500/30 backdrop-blur-xl px-2 py-0.5 font-black tracking-[0.1em] uppercase text-[9px] w-fit">
                            SÉCURITÉ & CONTRÔLE
                        </Badge>
                        <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
                            Journal <span className="text-slate-400">d'Audit</span>
                        </h1>
                    </div>
                </header>
            </div>

            {/* Filters */}
            <Card className="shadow-sm border-[var(--color-border-light)] overflow-visible">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase ml-1">Rechercher</label>
                            <Input
                                icon={Search}
                                name="search"
                                placeholder="Message, ID, Repr..."
                                value={filters.search}
                                onChange={handleFilterChange}
                                className="bg-[var(--color-bg-hover)]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase ml-1">Module</label>
                            <select
                                name="module"
                                className="w-full px-4 py-2.5 bg-[var(--color-bg-hover)] border border-[var(--color-border-light)] rounded-xl focus:ring-4 focus:ring-blue-100/20 focus:border-blue-500 outline-none transition-all text-sm font-medium text-[var(--color-text-primary)] cursor-pointer"
                                value={filters.module}
                                onChange={handleFilterChange}
                            >
                                <option value="">Tous les modules</option>
                                <option value="users">Utilisateurs</option>
                                <option value="finances">Finances</option>
                                <option value="tasks">Missions</option>
                                <option value="auth">Authentification</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase ml-1">Actions</label>
                            <select
                                name="action_type"
                                className="w-full px-4 py-2.5 bg-[var(--color-bg-hover)] border border-[var(--color-border-light)] rounded-xl focus:ring-4 focus:ring-blue-100/20 focus:border-blue-500 outline-none transition-all text-sm font-medium text-[var(--color-text-primary)] cursor-pointer"
                                value={filters.action_type}
                                onChange={handleFilterChange}
                            >
                                <option value="">Tous les types</option>
                                <option value="create">Création</option>
                                <option value="update">Modification</option>
                                <option value="delete">Suppression</option>
                                <option value="validation">Validation</option>
                                <option value="payment">Paiement</option>
                                <option value="rejet">Rejet</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase ml-1">Niveau</label>
                            <select
                                name="niveau"
                                className="w-full px-4 py-2.5 bg-[var(--color-bg-hover)] border border-[var(--color-border-light)] rounded-xl focus:ring-4 focus:ring-blue-100/20 focus:border-blue-500 outline-none transition-all text-sm font-medium text-[var(--color-text-primary)] cursor-pointer"
                                value={filters.niveau}
                                onChange={handleFilterChange}
                            >
                                <option value="">Tous les niveaux</option>
                                <option value="info">Information</option>
                                <option value="warning">Avertissement</option>
                                <option value="error">Erreur</option>
                                <option value="critical">Critique</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase ml-1">Période</label>
                            <div className="flex items-center gap-2">
                                <input type="date" name="date_debut" className="flex-1 px-3 py-2.5 bg-[var(--color-bg-hover)] border border-[var(--color-border-light)] rounded-xl text-xs font-semibold text-[var(--color-text-primary)]" value={filters.date_debut} onChange={handleFilterChange} />
                                <input type="date" name="date_fin" className="flex-1 px-3 py-2.5 bg-[var(--color-bg-hover)] border border-[var(--color-border-light)] rounded-xl text-xs font-semibold text-[var(--color-text-primary)]" value={filters.date_fin} onChange={handleFilterChange} />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <Card className="shadow-sm border-[var(--color-border-light)] overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center">
                        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4 shadowed-blue"></div>
                        <p className="text-[var(--color-text-muted)] font-medium">Chargement des logs...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
                        <div className="p-5 bg-[var(--color-bg-hover)] rounded-3xl border border-[var(--color-border-light)] flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                                <Activity size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[var(--color-text-muted)]">Total Logs</p>
                                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{logs.length}</p>
                            </div>
                        </div>
                        <div className="p-5 bg-[var(--color-bg-hover)] rounded-3xl border border-[var(--color-border-light)] flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                                <Database size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[var(--color-text-muted)]">Créations</p>
                                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{logs.filter(log => log.action_type === 'create').length}</p>
                            </div>
                        </div>
                        <div className="p-5 bg-[var(--color-bg-hover)] rounded-3xl border border-[var(--color-border-light)] flex items-center gap-4">
                            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                                <ShieldAlert size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[var(--color-text-muted)]">Erreurs</p>
                                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{logs.filter(log => log.niveau === 'error' || log.niveau === 'critical').length}</p>
                            </div>
                        </div>
                        <div className="p-5 bg-[var(--color-bg-hover)] rounded-3xl border border-[var(--color-border-light)] flex items-center gap-4">
                            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
                                <UserIcon size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[var(--color-text-muted)]">Connexions</p>
                                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{logs.filter(log => log.action_type === 'login').length}</p>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Table */}
            <Card className="shadow-sm border-[var(--color-border-light)] overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center">
                        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4 shadowed-blue"></div>
                        <p className="text-[var(--color-text-muted)] font-medium">Chargement des logs...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[var(--color-bg-hover)] border-b border-[var(--color-border)]">
                                        <th className="px-6 py-4 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Date & Heure</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Acteur</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Module</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Action</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Message</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider text-right">Détails</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border-light)]">
                                    {logs.map(log => {
                                        const typeStyle = getTypeStyle(log.action_type);
                                        return (
                                            <tr key={log.id} className="hover:bg-[var(--color-bg-hover)] transition-colors group">
                                                <td className="px-6 py-4 font-bold text-[var(--color-text-secondary)] whitespace-nowrap text-sm">
                                                    {format(new Date(log.timestamp), 'dd/MM/yyyy', { locale: fr })}
                                                    <span className="block text-[10px] text-[var(--color-text-muted)] font-mono">
                                                        {format(new Date(log.timestamp), 'HH:mm:ss')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar
                                                            src={log.utilisateur_photo}
                                                            name={log.utilisateur_name || 'Système'}
                                                            size="base"
                                                            className="w-9 h-9 rounded-xl"
                                                        />
                                                        <div>
                                                            <span className="block font-bold text-[var(--color-text-primary)] text-sm">{log.utilisateur_name || 'Système'}</span>
                                                            <span className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-widest">{log.utilisateur_role || 'Automation'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-[var(--color-bg-hover)] border-[var(--color-border-light)]">
                                                        {log.module_display}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div
                                                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black ring-1 ring-inset"
                                                        style={{
                                                            backgroundColor: `${typeStyle.color}15`,
                                                            color: typeStyle.color,
                                                            borderColor: `${typeStyle.color}30`
                                                        }}
                                                    >
                                                        <div className="w-1 h-3 rounded-full" style={{ backgroundColor: typeStyle.color }} />
                                                        {typeStyle.label.toUpperCase()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-0.5 max-w-xs">
                                                        <p className="text-sm font-medium text-[var(--color-text-secondary)] line-clamp-1" title={log.message}>
                                                            {log.message}
                                                        </p>
                                                        {log.objet_repr && (
                                                            <span className="text-[10px] text-blue-500 font-bold font-mono">
                                                                #{log.objet_repr}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"
                                                        onClick={() => setSelectedLog(log)}
                                                    >
                                                        <Eye size={16} />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-3 py-6 bg-[var(--color-bg-hover)]/30 border-t border-[var(--color-border-light)]">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="rounded-xl w-10 h-10 p-0"
                                >
                                    <ChevronLeft size={18} />
                                </Button>
                                <div className="flex items-center gap-1.5">
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${page === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border-light)] hover:bg-[var(--color-bg-hover)]'}`}
                                            onClick={() => setPage(i + 1)}
                                        >
                                            {i + 1}
                                        </button>
                                    )).slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))}
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                    className="rounded-xl w-10 h-10 p-0"
                                >
                                    <ChevronRight size={18} />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </Card>

            {/* Detailed Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300 border-[var(--color-border)] bg-[var(--color-bg-card)]">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--color-border-light)] bg-[var(--color-bg-hover)]/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadowed-blue">
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <CardTitle className="text-[var(--color-text-primary)]">Détails de l'Action</CardTitle>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-[var(--color-text-muted)]">Log #{selectedLog.id}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)} className="h-9 w-9 p-0 rounded-full hover:bg-red-500/10 hover:text-red-500">
                                <X size={20} />
                            </Button>
                        </CardHeader>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-5 bg-[var(--color-bg-hover)] rounded-3xl border border-[var(--color-border-light)]">
                                    <span className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-3">Acteur</span>
                                    <div className="flex items-center gap-3">
                                        <Avatar
                                            src={selectedLog.utilisateur_photo}
                                            name={selectedLog.utilisateur_name || 'Système'}
                                            size="md"
                                        />
                                        <div>
                                            <p className="font-bold text-[var(--color-text-primary)]">{selectedLog.utilisateur_name || 'Système'}</p>
                                            <p className="text-xs text-[var(--color-text-muted)] uppercase font-black">{selectedLog.utilisateur_role || 'Système'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-5 bg-[var(--color-bg-hover)] rounded-3xl border border-[var(--color-border-light)]">
                                    <span className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-3">Date & Heure</span>
                                    <div className="flex items-center gap-3 text-blue-600">
                                        <Calendar size={24} />
                                        <div>
                                            <p className="font-bold text-[var(--color-text-primary)] text-sm">{format(new Date(selectedLog.timestamp), 'dd MMMM yyyy', { locale: fr })}</p>
                                            <p className="text-sm font-black text-blue-500">{format(new Date(selectedLog.timestamp), 'HH:mm:ss')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <span className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Message d'Opération</span>
                                <div className="p-6 border border-dashed border-blue-500/30 rounded-3xl bg-blue-500/5 text-[var(--color-text-primary)] font-semibold text-base leading-relaxed">
                                    {selectedLog.message}
                                </div>
                            </div>

                            {selectedLog.differences && Object.keys(selectedLog.differences).length > 0 && (
                                <div className="space-y-4">
                                    <span className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Modifications de Données</span>
                                    <div className="grid grid-cols-1 gap-4">
                                        {Object.entries(selectedLog.differences).map(([field, delta]) => (
                                            <div key={field} className="p-5 bg-[var(--color-bg-hover)]/30 rounded-3xl border border-[var(--color-border-light)] group hover:border-blue-500/30 transition-all">
                                                <span className="inline-block px-2 py-0.5 rounded-md bg-slate-500/10 text-[var(--color-text-muted)] font-black text-[9px] uppercase tracking-tighter mb-4">{field}</span>
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm font-semibold">
                                                    <div className="flex-1 p-3 bg-red-50 dark:bg-red-500/5 text-red-600 dark:text-red-400 rounded-2xl border border-red-500/10 line-through truncate opacity-70">
                                                        {String(delta.old)}
                                                    </div>
                                                    <div className="flex justify-center">
                                                        <ChevronRight className="text-blue-500 rotate-90 sm:rotate-0" size={18} />
                                                    </div>
                                                    <div className="flex-1 p-3 bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-500/10 truncate font-black">
                                                        {String(delta.new)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-[var(--color-border-light)] flex justify-end bg-[var(--color-bg-hover)]/30">
                            <Button
                                onClick={() => setSelectedLog(null)}
                                className="px-8 rounded-2xl font-black uppercase text-xs tracking-widest"
                            >
                                Fermer
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

