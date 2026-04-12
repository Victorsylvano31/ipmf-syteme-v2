import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import api from '../../api/axios';
import styles from './Feedback.module.css';

export default function AdminFeedbackList() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchMessages = async () => {
        try {
            const res = await api.get('feedback/messages/');
            setMessages(res.data.results || res.data);
        } catch (err) {
            console.error("Erreur charment messages feedback", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const handleStatutChange = async (id, newStatut) => {
        try {
            await api.patch(`feedback/messages/${id}/`, { statut: newStatut });
            // Update local state
            setMessages(messages.map(m => m.id === id ? { ...m, statut: newStatut } : m));
        } catch (err) {
            console.error("Erreur mise à jour statut", err);
            alert("Erreur lors de la mise à jour");
        }
    };

    const getTypeBadge = (type) => {
        if (type === 'bug') return <span className={`${styles.badge} ${styles['badge-bug']}`}>🐛 Bug</span>;
        if (type === 'suggestion') return <span className={`${styles.badge} ${styles['badge-suggestion']}`}>💡 Suggestion</span>;
        if (type === 'question') return <span className={`${styles.badge} ${styles['badge-question']}`}>❓ Question</span>;
        return type;
    };

    if (loading) {
        return <div className={styles.card} style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader className="animate-spin text-blue-500" /></div>;
    }

    return (
        <div className={styles.card}>
            <div className={styles.cardTitle}>Boîte de Réception ({messages.length})</div>
            
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Titre & Description</th>
                            <th>Auteur</th>
                            <th>Date</th>
                            <th>Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        {messages.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Aucun message reçu pour le moment.</td>
                            </tr>
                        ) : messages.map((msg) => (
                            <tr key={msg.id}>
                                <td>{getTypeBadge(msg.type)}</td>
                                <td style={{ maxWidth: '300px' }}>
                                    <div style={{ fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{msg.titre}</div>
                                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.8 }}>{msg.description}</div>
                                </td>
                                <td style={{ fontWeight: 'bold' }}>{msg.auteur_nom}</td>
                                <td>{new Date(msg.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })}</td>
                                <td>
                                    <select 
                                        className={styles.statusSelect}
                                        value={msg.statut}
                                        onChange={(e) => handleStatutChange(msg.id, e.target.value)}
                                        style={{
                                            fontWeight: 'bold',
                                            borderColor: msg.statut === 'nouveau' ? '#ef4444' : (msg.statut === 'resolu' ? '#10b981' : '')
                                        }}
                                    >
                                        <option value="nouveau">🔴 Nouveau</option>
                                        <option value="lu">🟡 Lu</option>
                                        <option value="en_cours">🔵 En cours</option>
                                        <option value="resolu">🟢 Résolu</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
