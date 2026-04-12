import {
    CheckCircle2,
    Clock,
    XCircle,
    AlertCircle,
    ShieldCheck,
    CreditCard,
    FileText
} from 'lucide-react';
import styles from './Finances.module.css';

export const StatusBadge = ({ status, type = 'expense' }) => {
    const configs = {
        // Incomes
        en_attente: { label: 'En attente', color: '#854d0e', bg: 'rgba(254, 249, 195, 0.1)', icon: <Clock size={14} /> },
        confirmee: { label: 'Confirmée', color: '#166534', bg: 'rgba(220, 252, 231, 0.1)', icon: <CheckCircle2 size={14} /> },
        annulee: { label: 'Annulée', color: '#991b1b', bg: 'rgba(254, 226, 226, 0.1)', icon: <XCircle size={14} /> },

        // Expenses (some overlap)
        verifiee: { label: 'Vérifiée', color: '#1e40af', bg: 'rgba(219, 234, 254, 0.1)', icon: <ShieldCheck size={14} /> },
        validee: { label: 'Validée', color: '#166534', bg: 'rgba(220, 252, 231, 0.1)', icon: <CheckCircle2 size={14} /> },
        payee: { label: 'Payée', color: '#15803d', bg: 'rgba(240, 253, 244, 0.1)', icon: <CreditCard size={14} /> },
        rejetee: { label: 'Rejetée', color: '#991b1b', bg: 'rgba(254, 226, 226, 0.1)', icon: <AlertCircle size={14} /> }
    };

    const config = configs[status] || configs['en_attente'];

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '600',
            backgroundColor: config.bg,
            color: config.color,
            border: `1px solid ${config.color}40`,
            backdropFilter: 'blur(4px)'
        }}>
            {config.icon}
            {config.label}
        </span>
    );
};

export const FilePreview = ({ url, filename }) => {
    if (!url) return <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '16px', border: '1px dashed var(--color-border)', borderRadius: '12px', textAlign: 'center' }}>Aucune pièce jointe.</div>;

    // Check for image types, ignoring query parameters like ?X-Amz-Algorithm=...
    const urlWithoutQuery = url.split('?')[0];
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(urlWithoutQuery);

    return (
        <div style={{ marginTop: '12px', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '12px', background: 'var(--color-bg-hover)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-text-primary)' }}>{filename || 'Justificatif'}</span>
                <a href={url} target="_blank" rel="noopener noreferrer" className={styles.btnSecondary} style={{ padding: '4px 12px', fontSize: '0.75rem' }}>
                    Ouvrir / Télécharger
                </a>
            </div>
            {isImage ? (
                <div style={{ padding: '16px', textAlign: 'center', background: 'rgba(255,255,255,0.05)' }}>
                    <img 
                        src={url} 
                        alt="Preview" 
                        style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '4px', objectFit: 'contain' }} 
                        onError={(e) => {
                            e.target.onerror = null; // Prevent infinite loop
                            e.target.style.display = 'none';
                            e.target.insertAdjacentHTML('afterend', '<div style="padding: 20px; color: var(--color-text-muted);">Aperçu indisponible. Le fichier n\'a pas pu être chargé.</div>');
                        }}
                    />
                </div>
            ) : (
                <div style={{ padding: '32px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)' }}>
                    <FileText size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <p>Aperçu non disponible pour ce type de fichier.</p>
                </div>
            )}
        </div>
    );
};
