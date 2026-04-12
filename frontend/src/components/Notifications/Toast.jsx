import React from 'react';
import {
    CheckCircle,
    AlertCircle,
    Info,
    XCircle,
    X,
    ClipboardList,
    Wallet
} from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import styles from './Toast.module.css';

const ToastItem = ({ toast }) => {
    const { removeToast } = useNotifications();

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle size={20} />;
            case 'error': return <XCircle size={20} />;
            case 'warning': return <AlertCircle size={20} />;
            case 'task': return <ClipboardList size={20} />;
            case 'finance': return <Wallet size={20} />;
            default: return <Info size={20} />;
        }
    };

    return (
        <div className={`${styles.toastItem} ${styles[`type_${toast.type}`]} ${styles[`priority_${toast.priority}`]}`}>
            <div className={styles.indicator} />
            <div className={styles.content}>
                <div className={styles.icon}>
                    {getIcon(toast.type)}
                </div>
                <div className={styles.body}>
                    {toast.title && <h4 className={styles.title}>{toast.title}</h4>}
                    <p className={styles.message}>{toast.message}</p>
                </div>
                <button
                    className={styles.closeBtn}
                    onClick={() => removeToast(toast.id)}
                    aria-label="Fermer"
                >
                    <X size={16} />
                </button>
            </div>
            <div className={styles.progressBar}>
                <div className={styles.progress} />
            </div>
        </div>
    );
};

export const ToastContainer = () => {
    const { toasts } = useNotifications();

    if (toasts.length === 0) return null;

    return (
        <div className={styles.toastContainer}>
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} />
            ))}
        </div>
    );
};

export default ToastContainer;
