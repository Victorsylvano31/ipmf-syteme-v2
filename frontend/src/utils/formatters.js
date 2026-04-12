export const formatStatus = (status) => {
    switch (status) {
        case 'creee': return { label: 'Créée', color: '#f59e0b', bg: '#fef3c7' };
        case 'en_cours': return { label: 'En cours', color: '#3b82f6', bg: '#dbeafe' };
        case 'terminee': return { label: 'Terminée', color: '#10b981', bg: '#d1fae5' };
        case 'validee': return { label: 'Validée', color: '#059669', bg: '#ecfdf5' };
        case 'annulee': return { label: 'Annulée', color: '#ef4444', bg: '#fee2e2' };
        default: return { label: status, color: '#64748b', bg: '#f1f5f9' };
    }
};

export const formatPriority = (priority) => {
    switch (priority) {
        case 'urgente': return { label: 'Urgente', color: '#dc2626' };
        case 'haute': return { label: 'Haute', color: '#ef4444' };
        case 'moyenne': return { label: 'Moyenne', color: '#f59e0b' };
        case 'basse': return { label: 'Basse', color: '#10b981' };
        default: return { label: priority, color: '#64748b' };
    }
};

export const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MGA' }).format(amount).replace('MGA', 'Ar');
};

export const formatExpenseStatus = (status) => {
    switch (status) {
        case 'en_attente': return { label: 'En attente', color: '#f59e0b', bg: '#fef3c7' };
        case 'verifiee': return { label: 'Vérifiée', color: '#3b82f6', bg: '#dbeafe' };
        case 'validee': return { label: 'Validée', color: '#10b981', bg: '#d1fae5' };
        case 'payee': return { label: 'Payée', color: '#059669', bg: '#ecfdf5' };
        case 'rejetee': return { label: 'Rejetée', color: '#ef4444', bg: '#fee2e2' };
        default: return { label: status, color: '#64748b', bg: '#f1f5f9' };
    }
};
