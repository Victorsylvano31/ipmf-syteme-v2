import React, { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios';
import styles from './Feedback.module.css';

export default function FeedbackForm() {
    const [type, setType] = useState('suggestion');
    const [titre, setTitre] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            await api.post('feedback/messages/', {
                type,
                titre,
                description
            });
            setIsSuccess(true);
        } catch (err) {
            console.error(err);
            setError("Une erreur s'est produite lors de l'envoi.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className={styles.card}>
                <div className={styles.successMessage}>
                    <div className={styles.successIcon}>
                        <CheckCircle2 size={32} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Message Envoyé !</h3>
                        <p style={{ marginTop: '0.5rem' }}>Merci pour votre retour. L'administrateur le lira avec attention.</p>
                    </div>
                    <button 
                        className={styles.resetBtn} 
                        onClick={() => {
                            setIsSuccess(false);
                            setTitre('');
                            setDescription('');
                        }}
                    >
                        Envoyer un autre message
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.card}>
            <div className={styles.cardTitle}>Nouveau Message</div>
            
            {error && <div style={{ color: 'red', marginBottom: '1rem', fontWeight: 'bold' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Que souhaitez-vous nous dire ?</label>
                    <div className={styles.typeContainer}>
                        <div 
                            className={`${styles.typeCard} ${type === 'bug' ? styles.typeCardActive : ''}`} 
                            onClick={() => setType('bug')}
                        >
                            <span className={styles.typeIcon}>🐛</span>
                            <span className={styles.typeTitle}>Signaler un Bug</span>
                        </div>
                        <div 
                            className={`${styles.typeCard} ${type === 'suggestion' ? styles.typeCardActive : ''}`} 
                            onClick={() => setType('suggestion')}
                        >
                            <span className={styles.typeIcon}>💡</span>
                            <span className={styles.typeTitle}>Suggestion / Idée</span>
                        </div>
                        <div 
                            className={`${styles.typeCard} ${type === 'question' ? styles.typeCardActive : ''}`} 
                            onClick={() => setType('question')}
                        >
                            <span className={styles.typeIcon}>❓</span>
                            <span className={styles.typeTitle}>Poser une Question</span>
                        </div>
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Titre (résumé)</label>
                    <input 
                        type="text" 
                        required 
                        value={titre}
                        onChange={(e) => setTitre(e.target.value)}
                        placeholder="Ex: Le bouton X ne marche pas..."
                        className={styles.input}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Description détaillée</label>
                    <textarea 
                        required 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Veuillez détailler au maximum votre problème ou votre idée..."
                        className={`${styles.input} ${styles.textarea}`}
                    />
                </div>

                <button type="submit" disabled={isSubmitting || !titre || !description} className={styles.submitBtn}>
                    {isSubmitting ? 'Envoi en cours...' : (
                        <>
                            Envoyer à l'Administration <Send size={18} />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
