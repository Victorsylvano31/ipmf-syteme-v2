import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import Avatar from './ui/Avatar';
import AvatarUpload from './Profile/AvatarUpload';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Input from './ui/Input';
import {
    User,
    Mail,
    Phone,
    Building,
    Calendar as CalendarIcon,
    Clock,
    ShieldCheck,
    Lock,
    Save,
    X,
    RefreshCw,
    CheckCircle2
} from 'lucide-react';

/**
 * Composant de Profil Utilisateur - Version Premium
 */
export default function Profile() {
    const [user, setUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        telephone: '',
        email: ''
    });

    const [pwdData, setPwdData] = useState({
        new_password: '',
        new_password_confirm: ''
    });
    const [isChangingPwd, setIsChangingPwd] = useState(false);

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('users/me/');
            setUser(res.data);
            setFormData({
                first_name: res.data.first_name || '',
                last_name: res.data.last_name || '',
                telephone: res.data.telephone || '',
                email: res.data.email || ''
            });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Impossible de charger le profil.' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        try {
            const res = await api.put('users/update_me/', formData);
            setUser(prev => ({ ...prev, ...res.data }));
            setIsEditing(false);
            setMessage({ type: 'success', text: 'Profil mis à jour avec succès.' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.error || 'Erreur lors de la mise à jour.';
            setMessage({ type: 'error', text: errorMsg });
        }
    };

    const handlePwdChange = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (pwdData.new_password !== pwdData.new_password_confirm) {
            setMessage({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas.' });
            return;
        }

        try {
            await api.put('users/update_me/', {
                password: pwdData.new_password,
                ...formData
            });

            setMessage({ type: 'success', text: 'Mot de passe modifié avec succès.' });
            setPwdData({ new_password: '', new_password_confirm: '' });
            setIsChangingPwd(false);
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Erreur lors du changement de mot de passe.' });
        }
    };

    const handleAvatarSuccess = (profileData) => {
        setUser(prev => ({ ...prev, photo_url: profileData.photo_url }));
        setMessage({ type: 'success', text: 'Photo de profil mise à jour.' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    if (loading && !user) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full shadowed-blue"></div>
            <p className="text-[var(--color-text-muted)] font-medium animate-pulse">Chargement de votre profil...</p>
        </div>
    );

    if (!user) return (
        <div className="flex justify-center p-10">
            <Card className="max-w-md w-full border-red-100 bg-red-50/50">
                <CardContent className="p-6 text-center text-red-600 font-bold">
                    Utilisateur non trouvé.
                </CardContent>
            </Card>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Profil Premium Strategic (Version Slim) */}
            <div className="relative overflow-hidden rounded-[24px] bg-slate-950 bg-mesh-slate p-6 lg:p-8 shadow-xl animate-slide-up border border-white/10 group">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-white/10 transition-colors duration-700"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 lg:gap-8">
                    <div className="relative">
                        <div className="absolute inset-0 bg-white/20 blur-xl rounded-full scale-110 animate-pulse-subtle"></div>
                        <AvatarUpload
                            currentAvatar={user.photo_url}
                            name={user.full_name || user.username}
                            onUploadSuccess={handleAvatarSuccess}
                        />
                    </div>

                    <div className="text-center md:text-left space-y-3">
                        <div className="space-y-1">
                            <Badge variant="outline" className="bg-blue-500/20 text-blue-200 border-blue-400/30 backdrop-blur-xl px-2 py-0.5 font-black tracking-[0.1em] uppercase text-[9px] w-fit mx-auto md:mx-0">
                                ESPACE PERSONNEL
                            </Badge>
                            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
                                {user.full_name || user.username}
                            </h1>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-2">
                            <span className="inline-flex px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-[9px] font-black uppercase tracking-widest text-white border border-white/10 shadow-lg">
                                {user.role_display}
                            </span>
                            <span className="flex items-center gap-1.5 text-white/70 text-[11px] font-bold bg-white/5 px-3 py-1 rounded-lg border border-white/5">
                                <ShieldCheck size={14} className="text-blue-300" /> ID: {user.id}
                            </span>
                            <span className="flex items-center gap-1.5 text-white/70 text-[11px] font-bold bg-white/5 px-3 py-1 rounded-lg border border-white/5">
                                <Building size={14} className="text-blue-300" /> {user.departement || 'Aucun département'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {message.text && (
                <div className={`p-4 rounded-2xl border animate-in slide-in-from-top-2 flex items-center gap-3 ${message.type === 'success'
                    ? 'bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-red-50/50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400'
                    }`}>
                    <CheckCircle2 size={18} />
                    <span className="font-bold text-sm">{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Section Informations (8 columns) */}
                <Card className="lg:col-span-8 shadow-xl border-[var(--color-border-light)] overflow-hidden">
                    <CardHeader className="p-6 border-b border-[var(--color-border-light)] bg-[var(--color-bg-hover)]/30 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3 text-blue-600">
                            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                                <User size={20} />
                            </div>
                            <CardTitle className="text-lg font-black tracking-tight text-[var(--color-text-primary)]">Détails du Profil</CardTitle>
                        </div>
                        {!isEditing && (
                            <Button
                                onClick={() => setIsEditing(true)}
                                variant="secondary"
                                size="sm"
                                className="font-bold gap-2"
                            >
                                <Save size={16} className="text-blue-500" /> Modifier
                            </Button>
                        )}
                    </CardHeader>

                    <CardContent className="p-8">
                        {isEditing ? (
                            <form onSubmit={handleSave} className="space-y-6 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-[var(--color-text-muted)] tracking-widest px-1">Prénom</label>
                                        <Input
                                            name="first_name"
                                            value={formData.first_name}
                                            onChange={handleInputChange}
                                            placeholder="Votre prénom"
                                            className="bg-[var(--color-bg-hover)]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-[var(--color-text-muted)] tracking-widest px-1">Nom</label>
                                        <Input
                                            name="last_name"
                                            value={formData.last_name}
                                            onChange={handleInputChange}
                                            placeholder="Votre nom"
                                            className="bg-[var(--color-bg-hover)]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-[var(--color-text-muted)] tracking-widest px-1">Email professionnel</label>
                                        <Input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            icon={Mail}
                                            placeholder="email@example.com"
                                            className="bg-[var(--color-bg-hover)]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-[var(--color-text-muted)] tracking-widest px-1">Téléphone</label>
                                        <Input
                                            name="telephone"
                                            value={formData.telephone}
                                            onChange={handleInputChange}
                                            icon={Phone}
                                            placeholder="+261..."
                                            className="bg-[var(--color-bg-hover)]"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-[var(--color-border-light)]">
                                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 px-6">
                                        <Save size={18} /> Enregistrer
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        variant="ghost"
                                        className="font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] gap-2"
                                    >
                                        <X size={18} /> Annuler
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                                <InfoItem
                                    label="Email Officiel"
                                    value={user.email}
                                    icon={Mail}
                                    color="blue"
                                />
                                <InfoItem
                                    label="Téléphone"
                                    value={user.telephone || 'Non renseigné'}
                                    icon={Phone}
                                    color="orange"
                                />
                                <InfoItem
                                    label="Date d'embauche"
                                    value={user.date_embauche ? new Date(user.date_embauche).toLocaleDateString() : 'N/A'}
                                    icon={CalendarIcon}
                                    color="indigo"
                                />
                                <InfoItem
                                    label="Dernière Connexion"
                                    value={user.last_login ? new Date(user.last_login).toLocaleString() : 'N/A'}
                                    icon={Clock}
                                    color="slate"
                                />
                                <div className="md:col-span-2 pt-6 border-t border-[var(--color-border-light)]">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-4 rounded-2xl ${user.is_active ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-red-50 text-red-600'} border border-current opacity-20`}>
                                            <ShieldCheck size={28} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black uppercase text-[var(--color-text-muted)] tracking-widest">Statut du compte</h4>
                                            <p className={`text-xl font-black ${user.is_active ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {user.is_active ? 'Compte Actif' : 'Compte Suspendu'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Section Sécurité (4 columns) */}
                <div className="lg:col-span-4 space-y-8">
                    <Card className="shadow-lg border-amber-500/20 bg-gradient-to-br from-[var(--color-bg-card)] to-amber-50/20 dark:to-amber-500/5">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-3 text-amber-500">
                                <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
                                    <Lock size={20} />
                                </div>
                                <CardTitle className="text-lg font-black tracking-tight text-[var(--color-text-primary)]">Sécurité</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <p className="text-sm text-[var(--color-text-secondary)] font-medium leading-relaxed">
                                Protégez votre accès en renouvelant régulièrement votre mot de passe.
                            </p>

                            {isChangingPwd ? (
                                <form onSubmit={handlePwdChange} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest px-1">Nouveau mot de passe</label>
                                        <Input
                                            type="password"
                                            required
                                            value={pwdData.new_password}
                                            onChange={(e) => setPwdData({ ...pwdData, new_password: e.target.value })}
                                            className="bg-white/50 dark:bg-black/20"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest px-1">Confirmation</label>
                                        <Input
                                            type="password"
                                            required
                                            value={pwdData.new_password_confirm}
                                            onChange={(e) => setPwdData({ ...pwdData, new_password_confirm: e.target.value })}
                                            className="bg-white/50 dark:bg-black/20"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2 pt-2">
                                        <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black uppercase text-[10px] tracking-widest py-3 shadow-lg shadow-amber-500/20">
                                            Mettre à jour <RefreshCw size={14} className="ml-2" />
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => setIsChangingPwd(false)}
                                            variant="ghost"
                                            className="w-full font-bold text-[var(--color-text-muted)] hover:bg-amber-500/5"
                                        >
                                            Annuler
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <Button
                                    onClick={() => setIsChangingPwd(true)}
                                    variant="outline"
                                    className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-500/10 font-black uppercase text-[10px] tracking-widest py-3 gap-2"
                                >
                                    <Lock size={14} /> Changer le mot de passe
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Info Box */}
                    <div className="p-6 rounded-3xl bg-blue-600/5 border border-blue-500/10 space-y-3">
                        <div className="flex items-center gap-2 text-blue-600">
                            <ShieldCheck size={18} />
                            <span className="text-xs font-black uppercase tracking-widest">Confidentialité</span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-secondary)] font-medium leading-normal italic">
                            Vos données personnelles sont uniquement accessibles par l'administration et vous-même conformément à la charte IPMF.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoItem({ label, value, icon: Icon, color }) {
    const colorStyles = {
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/5 dark:text-blue-400 border-blue-100 dark:border-blue-900/30",
        orange: "bg-orange-50 text-orange-600 dark:bg-orange-500/5 dark:text-orange-400 border-orange-100 dark:border-orange-900/30",
        indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/5 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30",
        slate: "bg-slate-50 text-slate-600 dark:bg-slate-500/5 dark:text-slate-400 border-slate-100 dark:border-slate-900/30",
    }[color] || "bg-slate-50 text-slate-600";

    return (
        <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl border ${colorStyles} shrink-0 shadow-sm`}>
                <Icon size={20} />
            </div>
            <div className="space-y-1">
                <span className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.15em] mb-1">
                    {label}
                </span>
                <span className="text-base font-bold text-[var(--color-text-primary)] leading-none">
                    {value}
                </span>
            </div>
        </div>
    );
}
