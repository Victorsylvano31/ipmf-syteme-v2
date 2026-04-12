import React, { useState, useRef, useEffect } from 'react';
import {
    Sparkles,
    X,
    Send,
    Bot,
    User,
    Loader2,
    ChevronDown,
    Zap,
    TrendingUp,
    AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './AssistantChat.module.css';
import api from '../../api/axios';

const TypewriterText = ({ text, delay = 15 }) => {
    const [currentText, setCurrentText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setCurrentText(prevText => prevText + text[currentIndex]);
                setCurrentIndex(prevIndex => prevIndex + 1);
            }, delay);
            return () => clearTimeout(timeout);
        }
    }, [currentIndex, delay, text]);

    // Parse bold text (*text*) and standard newlines
    const renderFormattedText = (rawText) => {
        // Simple markdown parsing for bold and linebreaks
        const htmlText = rawText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br/>');
        return <span dangerouslySetInnerHTML={{ __html: htmlText }} />;
    };

    return renderFormattedText(currentText);
};

const AssistantChat = () => {
    const { user, hasRole } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Initial welcome message
    const defaultWelcome = {
        id: 'welcome_1',
        role: 'assistant',
        content: `Bonjour ${user?.first_name || 'Monsieur le Directeur'}. Je suis Sylva, votre assistant stratégique IPMF. Comment puis-je vous éclairer aujourd'hui ?`,
        time: new Date().toISOString(),
        isInitial: true
    };

    const [messages, setMessages] = useState([]);
    const scrollRef = useRef(null);

    // Charger l'historique depuis localStorage au montage
    useEffect(() => {
        const savedHistory = localStorage.getItem(`sylva_history_${user?.id}`);
        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                if (parsed.length > 0) {
                    setMessages(parsed);
                } else {
                    setMessages([defaultWelcome]);
                }
            } catch (e) {
                setMessages([defaultWelcome]);
            }
        } else {
            setMessages([defaultWelcome]);
        }
    }, [user?.id]);

    // Sauvegarder dans localStorage à chaque modification
    useEffect(() => {
        if (messages.length > 0 && user?.id) {
            localStorage.setItem(`sylva_history_${user?.id}`, JSON.stringify(messages));
        }
    }, [messages, user?.id]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, loading]);

    // Uniquement pour DG et Admin
    if (!hasRole(['dg', 'admin'])) return null;

    const suggestions = [
        { icon: <TrendingUp size={14} />, text: "Résumé du Cashflow", query: "Fais-moi un résumé de l'évolution du cashflow et du solde actuel." },
        { icon: <AlertTriangle size={14} />, text: "Alertes Critiques", query: "Quelles sont les alertes critiques nécessitant mon attention ?" },
        { icon: <Zap size={14} />, text: "Validations urgentes", query: "Ai-je des dépenses urgentes à valider ?" }
    ];

    const handleClearChat = () => {
        if (window.confirm("Voulez-vous vraiment effacer l'historique de cette conversation ?")) {
            setMessages([defaultWelcome]);
            localStorage.removeItem(`sylva_history_${user?.id}`);
        }
    };

    const handleSend = async (e, customQuery = null) => {
        if (e) e.preventDefault();
        const query = customQuery || message;
        if (!query.trim()) return;

        const userMsg = {
            id: Date.now().toString(),
            role: 'user',
            content: query,
            time: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMsg]);
        setMessage('');
        setLoading(true);

        try {
            // Preparer l'historique pour le backend (exclure le message de bienvenue)
            const chatHistory = messages
                .filter(m => !m.isInitial && !m.isError)
                .map(m => ({
                    role: m.role,
                    content: m.content
                }));

            const response = await api.post('dashboard/ai/chat/', {
                message: query,
                history: chatHistory
            });

            const aiMsg = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.data.reply,
                time: new Date().toISOString()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            const errorMsg = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Désolé, j'ai rencontré une difficulté technique pour analyser ces données. Vérifiez votre connexion ou réessayez.",
                time: new Date().toISOString(),
                isError: true
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (isoString) => {
        try {
            return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return "";
        }
    };

    return (
        <div className={styles.container}>
            {/* Floating Action Button */}
            <button
                className={`${styles.fab} ${isOpen ? styles.fabActive : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title="Sylva - Intelligence IPMF"
            >
                {isOpen ? <ChevronDown size={28} /> : <Sparkles size={24} className={styles.sparkleIcon} />}
                <div className={styles.fabGlow}></div>
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className={styles.chatWindow}>
                    {/* Header */}
                    <div className={styles.header}>
                        <div className={styles.headerTitle}>
                            <div className={styles.botIcon}>
                                <Bot size={20} />
                                <div className={styles.onlineBadge}></div>
                            </div>
                            <div>
                                <h3>Sylva</h3>
                                <span>Assistant Stratégique</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleClearChat} className={styles.closeBtn} title="Nouvelle discussion / Effacer">
                                <Sparkles size={16} />
                            </button>
                            <button onClick={() => setIsOpen(false)} className={styles.closeBtn} title="Fermer">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className={styles.messagesArea} ref={scrollRef}>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`${styles.messageRow} ${msg.role === 'user' ? styles.userRow : styles.assistantRow}`}
                            >
                                <div className={styles.messageContent}>
                                    {msg.role === 'assistant' && (
                                        <div className={styles.msgAvatarGemini}>
                                            <img src="/assets/sylva_avatar.png" alt="Sylva" className={styles.avatarImg} />
                                        </div>
                                    )}
                                    <div className={styles.bubble}>
                                        {msg.role === 'assistant' && !msg.isInitial && !msg.isError ? (
                                            <TypewriterText text={msg.content} />
                                        ) : (
                                            <span dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                                        )}
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className={styles.msgAvatarUserText}>
                                            {user?.first_name ? user.first_name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                    )}
                                </div>
                                <span className={styles.timeTag}>
                                    {formatTime(msg.time)}
                                </span>
                            </div>
                        ))}
                        {loading && (
                            <div className={styles.assistantRow} style={{ animation: 'fadeInUp 0.3s ease forwards' }}>
                                <div className={styles.messageContent}>
                                    <div className={styles.msgAvatarGemini}>
                                        <img src="/assets/sylva_avatar.png" alt="Sylva" className={styles.avatarImg} />
                                    </div>
                                    <div className={`${styles.bubble} ${styles.loadingBubble}`}>
                                        <div className={styles.typingIndicator}>
                                            <div className={styles.typingDot}></div>
                                            <div className={styles.typingDot}></div>
                                            <div className={styles.typingDot}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Controls */}
                    <div className={styles.controls}>
                        {messages.length < 3 && !loading && (
                            <div className={styles.suggestions}>
                                {suggestions.map((s, i) => (
                                    <button key={i} onClick={(e) => handleSend(e, s.query)} className={styles.suggestionBtn}>
                                        {s.icon} {s.text}
                                    </button>
                                ))}
                            </div>
                        )}
                        <form onSubmit={handleSend} className={styles.inputForm}>
                            <input
                                type="text"
                                placeholder="Posez une question à Sylva..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                disabled={loading}
                            />
                            <button type="submit" disabled={!message.trim() || loading} className={styles.sendBtn}>
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssistantChat;
