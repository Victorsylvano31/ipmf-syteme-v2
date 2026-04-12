import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowUpCircle, Filter, Search, Download, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';

export default function IncomeList() {
    const [incomes, setIncomes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchIncomes = async (page = 1, search = '') => {
        setLoading(true);
        try {
            const params = {
                page,
                search: search || undefined,
            };
            const res = await api.get('finances/entrees/', { params });
            const data = res.data;

            if (data.results) {
                setIncomes(data.results);
                setTotalPages(Math.ceil(data.count / 50));
            } else {
                setIncomes(data);
                setTotalPages(1);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIncomes(currentPage, searchTerm);
    }, [currentPage]);

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            setCurrentPage(1);
            fetchIncomes(1, searchTerm);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'confirmee': return { color: '#10b981', label: 'Confirmée' };
            case 'annulee': return { color: '#ef4444', label: 'Annulée' };
            default: return { color: '#f59e0b', label: 'En attente' };
        }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('finances/entrees/export_csv/', {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `entrees_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Export error", err);
            alert("Erreur lors de l'exportation CSV");
        }
    };

    if (loading && incomes.length === 0) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/finances">
                        <Button variant="outline" size="sm" className="w-10 h-10 p-0 rounded-full">
                            <ArrowLeft size={18} />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">Flux de Trésorerie</h1>
                        <p className="text-sm text-[var(--color-text-muted)] font-medium">Historique des entrées d'argent</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={handleExportCSV} className="gap-2">
                        <Download size={18} />
                        <span>Exporter CSV</span>
                    </Button>
                    <Link to="/finances/incomes/new">
                        <Button className="gap-2 shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700">
                            <ArrowUpCircle size={18} />
                            <span>Nouvelle Entrée</span>
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <Card className="shadow-sm border-[var(--color-border-light)]">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full">
                        <Input
                            placeholder="Rechercher par motif ou numéro (Entrée)..."
                            icon={Search}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearch}
                            className="bg-[var(--color-bg-hover)] border-[var(--color-border-light)]"
                        />
                    </div>
                    <Button variant="outline" className="gap-2 w-full md:w-auto">
                        <Filter size={18} />
                        <span>Filtrer</span>
                    </Button>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="shadow-sm border-[var(--color-border-light)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--color-bg-hover)] border-b border-[var(--color-border)]">
                                <th className="px-6 py-4 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Référence</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Motif</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Mode</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Montant</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Statut</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border-light)]">
                            {incomes.map(income => {
                                const statusStyle = getStatusStyle(income.statut);
                                return (
                                    <tr key={income.id} className="hover:bg-emerald-500/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-[var(--color-text-secondary)] font-mono text-sm">{income.numero}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-[var(--color-text-primary)] group-hover:text-emerald-500 transition-colors line-clamp-1">{income.motif}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                                            {formatDate(income.date_entree)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="capitalize text-[10px] font-bold bg-[var(--color-bg-hover)] border-[var(--color-border-light)]">
                                                {income.mode_paiement.replace('_', ' ')}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(income.montant)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div
                                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ring-1 ring-inset"
                                                style={{
                                                    backgroundColor: `${statusStyle.color}15`,
                                                    color: statusStyle.color,
                                                    borderColor: `${statusStyle.color}30`,
                                                }}
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusStyle.color }}></div>
                                                {statusStyle.label.toUpperCase()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link to={`/finances/incomes/${income.id}`}>
                                                <Button variant="outline" size="sm" icon={ChevronRight}>Détails</Button>
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {incomes.length === 0 && !loading && (
                    <div className="py-20 text-center bg-[var(--color-bg-hover)]">
                        <div className="inline-flex p-4 rounded-full bg-[var(--color-bg-card)] text-[var(--color-text-muted)] mb-4">
                            <ArrowUpCircle size={40} />
                        </div>
                        <p className="text-[var(--color-text-muted)] font-medium">Aucune entrée d'argent trouvée.</p>
                    </div>
                )}
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 py-4">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        Précédent
                    </Button>
                    <span className="text-sm font-semibold text-[var(--color-text-muted)]">
                        Page <span className="text-[var(--color-text-primary)]">{currentPage}</span> sur <span className="text-[var(--color-text-primary)]">{totalPages}</span>
                    </span>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        Suivant
                    </Button>
                </div>
            )}
        </div>
    );
}
