import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import FeedbackForm from './FeedbackForm';
import AdminFeedbackList from './AdminFeedbackList';
import styles from './Feedback.module.css';
import { Lightbulb } from 'lucide-react';

export default function FeedbackPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    return (
        <div className={styles.container}>
            <div className={styles.pageHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '16px', 
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)'
                    }}>
                        <Lightbulb size={24} />
                    </div>
                    <div>
                        <h1 className={styles.title}>Boîte à Idées</h1>
                        <p className={styles.subtitle}>
                            {isAdmin 
                                ? "Gérez les suggestions et les rapports d'erreurs envoyés par les collaborateurs." 
                                : "Aidez-nous à améliorer le système ! Envoyez vos suggestions ou signalez un bug."}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Formulaire visible pour tout le monde SAUF l'admin */}
                {!isAdmin && <FeedbackForm />}

                {/* Liste d'administration visible UNIQUEMENT pour l'admin */}
                {isAdmin && <AdminFeedbackList />}
            </div>
        </div>
    );
}
