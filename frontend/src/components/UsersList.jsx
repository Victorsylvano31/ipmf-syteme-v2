// src/components/UsersList.jsx
import { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import {
    Plus, Search, Edit2,
    ToggleLeft, ToggleRight, Users,
    ShieldCheck, Activity,
    X, Save, AlertCircle,
    Mail, Phone, Briefcase, Calendar,
    User as UserIcon, Lock, Check,
    MoreVertical, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Input from './ui/Input';
import Avatar from './ui/Avatar';

export default function UsersList() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    const isAdminOrDG = useMemo(() => {
        return ['admin', 'dg'].includes(user?.role?.toLowerCase());
    }, [user]);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        password_confirm: '',
        role: 'agent',
        telephone: '',
        departement: '',
        date_embauche: '',
        is_active: true
    });
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [usersRes, statsRes] = await Promise.all([
                api.get('users/'),
                api.get('users/stats/')
            ]);
            setUsers(usersRes.data.results || usersRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
            const matchesSearch = fullName.includes(search.toLowerCase()) ||
                (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
                (u.email || '').toLowerCase().includes(search.toLowerCase());
            const matchesRole = roleFilter === '' || u.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [users, search, roleFilter]);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            await api.post('users/', formData);
            setShowCreateModal(false);
            fetchData();
            // Reset form
            setFormData({
                username: '', email: '', first_name: '', last_name: '',
                password: '', password_confirm: '', role: 'agent',
                telephone: '', departement: '', date_embauche: '',
                is_active: true
            });
        } catch (err) {
            setError(err.response?.data || { detail: 'Une erreur est survenue' });
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            await api.patch(`users/${selectedUser.id}/`, formData);
            setShowEditModal(false);
            fetchData();
        } catch (err) {
            setError(err.response?.data || { detail: 'Une erreur est survenue' });
        }
    };

    const handleToggleStatus = async (user) => {
        try {
            await api.post(`users/${user.id}/activate/`);
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteUser = async (userToDel) => {
        if (!window.confirm(`⚠️ ATTENTION : Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur ${userToDel.full_name || userToDel.username} ? Cette action est irréversible.`)) {
            return;
        }
        
        try {
            await api.delete(`users/${userToDel.id}/`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || "Erreur lors de la suppression de l'utilisateur.");
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setFormData({
            ...user,
            password: '',
            password_confirm: ''
        });
        setShowEditModal(true);
    };

    const getRoleBadgeVariant = (role) => {
        switch (role) {
            case 'admin': return 'danger';
            case 'dg': return 'primary';
            case 'comptable': return 'warning';
            case 'caisse': return 'success';
            default: return 'default';
        }
    };

    if (loading && users.length === 0) {
        return (
            <div className="flex flex-col gap-6 animate-pulse">
                <div className="h-16 bg-[var(--color-bg-hover)] rounded-2xl w-1/4"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="h-28 bg-[var(--color-bg-hover)] rounded-2xl"></div>
                    <div className="h-28 bg-[var(--color-bg-hover)] rounded-2xl"></div>
                    <div className="h-28 bg-[var(--color-bg-hover)] rounded-2xl"></div>
                </div>
                <div className="h-96 bg-[var(--color-bg-hover)] rounded-2xl"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Premium Strategic Banner (Version Slim) */}
            <div className="relative overflow-hidden rounded-[24px] bg-slate-950 bg-mesh-slate p-6 lg:p-8 shadow-xl animate-slide-up border border-white/10 mb-8">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

                <div className="absolute top-0 right-0 p-4 z-20 flex flex-wrap gap-3 justify-end items-center">
                    {isAdminOrDG && (
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md rounded-full px-6 py-2 h-9 border border-white/10 font-black text-[10px] uppercase tracking-widest group shadow-xl transition-all"
                        >
                            <Plus size={16} className="mr-2 group-hover:rotate-90 transition-transform duration-300" />
                            <span>Nouveau</span>
                        </Button>
                    )}
                </div>

                <header className="relative z-10 flex items-center gap-6">
                    <div className="space-y-1">
                        <Badge variant="outline" className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30 backdrop-blur-xl px-2 py-0.5 font-black tracking-[0.1em] uppercase text-[9px] w-fit">
                            ADMINISTRATION
                        </Badge>
                        <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
                            Gestion des <span className="text-indigo-200">Utilisateurs</span>
                        </h1>
                    </div>
                </header>
            </div>

            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-blue-600 border-none text-white shadow-lg shadow-blue-500/20">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Total Effectif</p>
                                <p className="text-3xl font-bold">{stats.total}</p>
                            </div>
                            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                                <Users size={28} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="hover:border-emerald-500/30 transition-colors bg-[var(--color-bg-card)]">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-wider">Membres Actifs</p>
                                <p className="text-3xl font-bold text-[var(--color-text-primary)]">{stats.actifs}</p>
                            </div>
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                <Activity size={28} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="hover:border-purple-500/30 transition-colors bg-[var(--color-bg-card)]">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-wider">Administrateurs</p>
                                <p className="text-3xl font-bold text-[var(--color-text-primary)]">{stats.par_role?.admin || 0}</p>
                            </div>
                            <div className="p-3 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
                                <ShieldCheck size={28} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Controls & Table */}
            <Card className="shadow-sm border-[var(--color-border-light)] overflow-visible">
                <CardHeader className="p-6 border-b border-[var(--color-border-light)]">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full max-w-3xl">
                        <div className="relative flex-1 group">
                            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Rechercher par nom, email ou identifiant..."
                                className="w-full pl-11 pr-4 py-2 bg-[var(--color-bg-hover)] border border-[var(--color-border-light)] rounded-xl focus:ring-4 focus:ring-blue-100/20 focus:border-blue-500 outline-none transition-all text-sm text-[var(--color-text-primary)]"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <select
                            className="w-full sm:w-auto px-4 py-2 bg-[var(--color-bg-hover)] border border-[var(--color-border-light)] rounded-xl focus:ring-4 focus:ring-blue-100/20 focus:border-blue-500 outline-none transition-all text-sm font-medium text-[var(--color-text-secondary)] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_12px_center] bg-no-repeat pr-10 cursor-pointer"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="">Tous les rôles</option>
                            <option value="admin">Administrateur</option>
                            <option value="dg">Directeur Général</option>
                            <option value="comptable">Comptable</option>
                            <option value="caisse">Responsable Caisse</option>
                            <option value="agent">Agent</option>
                        </select>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--color-bg-hover)] border-b border-[var(--color-border-light)]">
                                <th className="px-6 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Collaborateur</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Rôle & Mission</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Statut</th>
                                {isAdminOrDG && <th className="px-6 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border-light)]">
                            {filteredUsers.length > 0 ? filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-[var(--color-bg-hover)] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar
                                                src={u.photo_url}
                                                name={u.full_name || u.username}
                                                size="base"
                                                className="ring-2 ring-[var(--color-bg-hover)]"
                                            />
                                            <div>
                                                <p className="text-sm font-bold text-[var(--color-text-primary)] leading-tight">{u.full_name}</p>
                                                <p className="text-xs text-[var(--color-text-muted)] font-medium">@{u.username}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1.5">
                                            <Badge variant={getRoleBadgeVariant(u.role)} className="capitalize px-2 py-0.5 font-bold tracking-tight">
                                                {u.role_display}
                                            </Badge>
                                            <p className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1 font-medium">
                                                <Briefcase size={10} /> {u.departement || 'Non assigné'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="space-y-0.5">
                                            <p className="text-[var(--color-text-secondary)] font-medium flex items-center gap-1.5 leading-tight">
                                                <Mail size={12} className="text-[var(--color-text-muted)]" /> {u.email}
                                            </p>
                                            {u.telephone && (
                                                <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
                                                    <Phone size={11} className="text-[var(--color-text-muted)]" /> {u.telephone}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div
                                            onClick={() => isAdminOrDG && handleToggleStatus(u)}
                                            className={`
                                                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all
                                                ${u.is_active
                                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
                                                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                                }
                                                ${isAdminOrDG ? 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-100/50' : ''}
                                            `}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-[var(--color-text-muted)]'}`} />
                                            {u.is_active ? 'Actif' : 'Suspendu'}
                                        </div>
                                    </td>
                                    {isAdminOrDG && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-10 h-10 p-0 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10"
                                                    onClick={() => openEditModal(u)}
                                                    title="Modifier"
                                                >
                                                    <Edit2 size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-10 h-10 p-0 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                                    onClick={() => handleToggleStatus(u)}
                                                    title={u.is_active ? "Désactiver" : "Activer"}
                                                >
                                                    {u.is_active
                                                        ? <ToggleRight size={24} className="text-emerald-500" />
                                                        : <ToggleLeft size={24} className="text-slate-300" />
                                                    }
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-10 h-10 p-0 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-300 hover:text-red-500 transition-colors"
                                                    onClick={() => handleDeleteUser(u)}
                                                    title="Supprimer définitivement"
                                                >
                                                    <Trash2 size={18} />
                                                </Button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-[var(--color-bg-hover)] rounded-full text-[var(--color-text-muted)]">
                                                <Search size={40} />
                                            </div>
                                            <p className="text-[var(--color-text-muted)] font-medium">Aucun collaborateur trouvé pour cette recherche.</p>
                                            <Button variant="outline" size="sm" onClick={() => { setSearch(''); setRoleFilter(''); }}>Réinitialiser</Button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <CardHeader className="p-4 bg-[var(--color-bg-hover)] border-t border-[var(--color-border-light)] flex justify-between items-center">
                    <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">Fin de liste • {filteredUsers.length} affichés</p>
                </CardHeader>
            </Card>

            {/* Modal Overlay Component */}
            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300 bg-[var(--color-bg-card)] border-[var(--color-border)]">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-hover)]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/20">
                                    {showCreateModal ? <Plus size={20} /> : <Edit2 size={20} />}
                                </div>
                                <CardTitle className="text-[var(--color-text-primary)]">{showCreateModal ? 'Nouveau Collaborateur' : 'Profil du Collaborateur'}</CardTitle>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setShowEditModal(false);
                                    setError(null);
                                }}
                                className="w-8 h-8 p-0 rounded-full"
                            >
                                <X size={20} />
                            </Button>
                        </CardHeader>

                        <div className="flex-1 overflow-y-auto p-8 bg-[var(--color-bg-card)]">
                            <form onSubmit={showCreateModal ? handleCreateUser : handleUpdateUser} id="user-form" className="space-y-6">
                                {error && (
                                    <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium animate-shake">
                                        <AlertCircle size={20} className="shrink-0" />
                                        <span>{typeof error === 'string' ? error : Object.values(error).flat().join(', ')}</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <Input
                                        label="Prénom"
                                        required
                                        placeholder="Jean"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        icon={UserIcon}
                                    />
                                    <Input
                                        label="Nom"
                                        required
                                        placeholder="Dupont"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        icon={UserIcon}
                                    />
                                    <Input
                                        label="Identifiant"
                                        required
                                        placeholder="jdupont"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        icon={UserIcon}
                                    />
                                    <Input
                                        label="Email professionnel"
                                        required
                                        type="email"
                                        placeholder="j.dupont@ipmf.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        icon={Mail}
                                    />

                                    <div className="space-y-1">
                                        <label className="text-sm font-bold text-[var(--color-text-secondary)] ml-1">Rôle Système</label>
                                        <div className="relative">
                                            <ShieldCheck size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-blue-500 transition-colors z-10" />
                                            <select
                                                className="w-full pl-11 pr-4 py-2.5 bg-[var(--color-bg-hover)] border border-[var(--color-border-light)] rounded-xl focus:ring-4 focus:ring-blue-100/20 focus:border-blue-500 outline-none transition-all text-sm font-medium text-[var(--color-text-primary)] appearance-none cursor-pointer"
                                                value={formData.role}
                                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            >
                                                <option value="admin">Administrateur</option>
                                                <option value="dg">Directeur Général</option>
                                                <option value="comptable">Comptable</option>
                                                <option value="caisse">Responsable Caisse</option>
                                                <option value="agent">Agent</option>
                                            </select>
                                        </div>
                                    </div>

                                    <Input
                                        label="Téléphone"
                                        placeholder="+261 ..."
                                        value={formData.telephone}
                                        onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                                        icon={Phone}
                                    />

                                    <Input
                                        label="Département / Direction"
                                        placeholder="Operations, Finance..."
                                        value={formData.departement}
                                        onChange={(e) => setFormData({ ...formData, departement: e.target.value })}
                                        icon={Briefcase}
                                    />

                                    <Input
                                        label="Date d'embauche"
                                        type="date"
                                        value={formData.date_embauche}
                                        onChange={(e) => setFormData({ ...formData, date_embauche: e.target.value })}
                                        icon={Calendar}
                                    />

                                    <Input
                                        label={showEditModal ? 'Changer mot de passe (optionnel)' : 'Mot de passe'}
                                        required={showCreateModal}
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        icon={Lock}
                                    />

                                    <Input
                                        label="Confirmation"
                                        required={showCreateModal}
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password_confirm}
                                        onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                                        icon={Check}
                                    />
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-[var(--color-bg-hover)] rounded-xl border border-dashed border-[var(--color-border)]">
                                    <input
                                        type="checkbox"
                                        id="modal_is_active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-5 h-5 rounded-md border-[var(--color-border)] bg-[var(--color-bg-card)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <label htmlFor="modal_is_active" className="text-sm font-bold text-[var(--color-text-secondary)] cursor-pointer">
                                        Activer l'accès au portail dès la création
                                    </label>
                                </div>
                            </form>
                        </div>

                        <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-bg-hover)] flex justify-end gap-3 px-8">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setShowEditModal(false);
                                    setError(null);
                                }}
                                className="px-6"
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                form="user-form"
                                className="px-8 shadow-blue-500/20"
                                icon={Save}
                            >
                                {showCreateModal ? 'Créer le profil' : 'Enregistrer'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}


