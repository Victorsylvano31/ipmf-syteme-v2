import api from '../api/axios';

export const notificationService = {
    // Récupérer toutes les notifications
    getAll: async () => {
        const response = await api.get('/notifications/');
        return response.data;
    },

    // Marquer comme lu
    markAsRead: async (id) => {
        const response = await api.post(`/notifications/${id}/mark_read/`);
        return response.data;
    },

    // Marquer tout comme lu
    markAllAsRead: async () => {
        const response = await api.post('/notifications/mark_all_read/');
        return response.data;
    },

    // Récupérer le nombre de non-lus
    getUnreadCount: async () => {
        const response = await api.get('/notifications/unread_count/');
        return response.data;
    },
    // Marquer les notifications liées à un objet comme lues
    markRelatedAsRead: async (linkPattern) => {
        try {
            const response = await api.post('notifications/mark_related_read/', { link_pattern: linkPattern });
            return response.data;
        } catch (error) {
            console.error("Erreur marquage notifications liées", error);
            throw error;
        }
    }
};
