import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    CheckCircle,
    AlertCircle,
    Info,
    ClipboardList,
    Wallet,
    XCircle
} from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import styles from './NotificationBell.module.css';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const NotificationBell = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Fermer le dropdown si on clique en dehors
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case 'task': return <ClipboardList size={18} />;
            case 'finance': return <Wallet size={18} />;
            case 'success': return <CheckCircle size={18} />;
            case 'warning': return <AlertCircle size={18} />;
            case 'error': return <XCircle size={18} />;
            default: return <Info size={18} />;
        }
    };

    const getIconClass = (type) => {
        switch (type) {
            case 'task': return styles.iconTask;
            case 'finance': return styles.iconFinance;
            case 'warning': return styles.iconWarning;
            case 'error': return styles.iconError;
            default: return styles.iconInfo;
        }
    };

    const handleNotificationClick = async (notif) => {
        if (!notif.is_read) {
            await markAsRead(notif.id);
        }
        setIsOpen(false);
        if (notif.link) {
            navigate(notif.link);
        }
    };

    return (
        <div className={styles.notificationContainer} ref={dropdownRef}>
            <button
                className={styles.bellButton}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Notifications"
            >
                <Bell size={22} />
                {unreadCount > 0 && (
                    <span className={styles.badge}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.header}>
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button className={styles.markAllBtn} onClick={markAllAsRead}>
                                Tout marquer comme lu
                            </button>
                        )}
                    </div>

                    <div className={styles.notificationList}>
                        {notifications.length === 0 ? (
                            <div className={styles.emptyState}>
                                <Bell size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                                <p>Aucune notification</p>
                            </div>
                        ) : (
                            notifications.slice(0, 50).map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`${styles.notificationItem} ${!notif.is_read ? styles.unread : ''} ${styles[`priority_${notif.priority}`]}`}
                                    onClick={() => handleNotificationClick(notif)}
                                >
                                    <div className={`${styles.iconWrapper} ${getIconClass(notif.type)}`}>
                                        {getIcon(notif.type)}
                                    </div>
                                    <div className={styles.content}>
                                        <div className={styles.itemHeader}>
                                            <p className={styles.itemTitle}>{notif.title}</p>
                                            <div className={styles.itemActions}>
                                                {!notif.is_read && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                                                        className={styles.quickMarkRead}
                                                        title="Marquer comme lu"
                                                    >
                                                        <CheckCircle size={14} />
                                                    </button>
                                                )}
                                                {notif.priority === 'critical' && (
                                                    <span className={styles.criticalBadge}>CRITIQUE</span>
                                                )}
                                            </div>
                                        </div>
                                        <p className={styles.itemMessage}>{notif.message}</p>
                                        <p className={styles.itemTime}>
                                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: fr })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <button className={styles.viewAll} onClick={() => { setIsOpen(false); navigate('/notifications'); }}>
                            Voir toutes les notifications
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
