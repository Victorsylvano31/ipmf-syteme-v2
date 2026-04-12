import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { notificationService } from '../services/notificationService';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toasts, setToasts] = useState([]);
    const { user } = useAuth();
    const lastNotifIdRef = useRef(null);
    const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

    const playNotificationSound = useCallback(() => {
        audioRef.current.play().catch(e => console.log("Audio play blocked by browser"));
    }, []);

    const addToast = useCallback((message, type = 'info', title = '', priority = 'medium') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, title, priority }]);
        // Auto-remove après 5 secondes ou 10s pour les critiques
        const delay = priority === 'critical' ? 10000 : 5000;
        setTimeout(() => {
            removeToast(id);
        }, delay);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const response = await notificationService.getAll();
            const data = response.results || response;

            // Détection de nouvelles notifications pour les Toasts
            if (Array.isArray(data) && data.length > 0) {
                const latestId = data[0].id;
                if (lastNotifIdRef.current !== null && latestId > lastNotifIdRef.current) {
                    // Nouvelles notifications détectées !
                    const newCount = data.filter(n => n.id > lastNotifIdRef.current).length;
                    playNotificationSound();

                    if (newCount === 1) {
                        const notif = data[0];
                        addToast(notif.message, notif.type, notif.title, notif.priority);
                    } else if (newCount > 1) {
                        addToast(`Vous avez ${newCount} nouvelles notifications`, 'info', 'Notifications', 'medium');
                    }
                }
                lastNotifIdRef.current = latestId;
            }

            setNotifications(Array.isArray(data) ? data : []);

            const countData = await notificationService.getUnreadCount();
            setUnreadCount(countData.count);
        } catch (error) {
            console.error("Erreur chargement notifications", error);
        }
    }, [user, addToast, playNotificationSound]);

    // Polling toutes les 30 secondes
    useEffect(() => {
        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        } else {
            lastNotifIdRef.current = null;
        }
    }, [user, fetchNotifications]);

    const markAsRead = async (id) => {
        try {
            await notificationService.markAsRead(id);
            // Mise à jour locale optimiste
            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Erreur markAsRead", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Erreur markAllAsRead", error);
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            toasts,
            addToast,
            removeToast,
            markAsRead,
            markAllAsRead,
            refresh: fetchNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);
