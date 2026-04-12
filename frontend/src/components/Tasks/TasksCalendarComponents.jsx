import React from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, XCircle } from 'lucide-react';

/* 
 * CustomToolbar
 * Barre d'outils personnalisée pour naviguer dans le calendrier.
 * Remplace la barre par défaut de react-big-calendar.
 */
export const CustomToolbar = (toolbar) => {
    const goToBack = () => {
        toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
        toolbar.onNavigate('NEXT');
    };

    const goToCurrent = () => {
        toolbar.onNavigate('TODAY');
    };

    const label = () => {
        const date = toolbar.date;
        if (toolbar.view === 'month') {
            const options = { month: 'long', year: 'numeric' };
            const dateString = date.toLocaleDateString('fr-FR', options);
            return dateString.charAt(0).toUpperCase() + dateString.slice(1);
        } else if (toolbar.view === 'week') {
            const start = toolbar.localizer.startOf(date, 'week');
            const end = toolbar.localizer.endOf(date, 'week');
            return `${toolbar.localizer.format(start, 'dd MMM')} – ${toolbar.localizer.format(end, 'dd MMM yyyy')}`;
        } else {
            return toolbar.localizer.format(date, 'dd MMMM yyyy');
        }
    };

    return (
        <div className="rbc-toolbar-custom">
            <div className="rbc-toolbar-group">
                <button type="button" onClick={goToCurrent} className="rbc-btn-today">
                    Aujourd'hui
                </button>
                <div className="rbc-btn-group-nav">
                    <button type="button" onClick={goToBack} aria-label="Précédent">
                        <ChevronLeft size={20} />
                    </button>
                    <button type="button" onClick={goToNext} aria-label="Suivant">
                        <ChevronRight size={20} />
                    </button>
                </div>
                <span className="rbc-toolbar-label">{label()}</span>
            </div>

            <div className="rbc-toolbar-group">
                <button
                    type="button"
                    className={toolbar.view === 'month' ? 'rbc-active' : ''}
                    onClick={() => toolbar.onView('month')}
                >
                    Mois
                </button>
                <button
                    type="button"
                    className={toolbar.view === 'week' ? 'rbc-active' : ''}
                    onClick={() => toolbar.onView('week')}
                >
                    Semaine
                </button>
                <button
                    type="button"
                    className={toolbar.view === 'day' ? 'rbc-active' : ''}
                    onClick={() => toolbar.onView('day')}
                >
                    Jour
                </button>
            </div>
        </div>
    );
};

/* 
 * CustomEvent
 * Composant d'affichage personnalisé pour un événement (tâche) dans le calendrier.
 * Affiche le statut, la priorité et le titre.
 */
export const CustomEvent = ({ event }) => {
    const task = event.resource;

    // Déterminer la couleur de la bordure gauche selon la priorité
    const getPriorityColor = (priority) => {
        const colors = {
            'basse': 'var(--color-success)',
            'moyenne': 'var(--color-primary-500)',
            'haute': 'var(--color-accent-500)',
            'urgente': 'var(--color-danger)'
        };
        return colors[priority] || 'var(--color-gray-500)';
    };

    const priorityColor = getPriorityColor(task.priorite);
    const isCancelled = task.statut === 'annulee';
    const isFailed = task.resultat === 'ECHEC_AUTOMATIQUE';

    // Fond coloré selon priorité
    const getBackgroundColor = (priority) => {
        if (isCancelled) return 'var(--color-bg-hover)';
        if (isFailed) return '#fee2e2'; // Light red for failure
        const backgrounds = {
            'urgente': 'var(--color-danger-light)',
            'haute': 'var(--color-accent-50)',
            'moyenne': 'var(--color-primary-50)',
            'basse': 'var(--color-success-light)'
        };
        return backgrounds[priority] || 'var(--color-primary-50)';
    };

    return (
        <div
            className="rbc-event-custom"
            style={{
                borderLeft: `4px solid ${isCancelled ? '#9ca3af' : (isFailed ? '#ef4444' : priorityColor)}`,
                opacity: isCancelled ? 0.6 : 1,
                backgroundColor: getBackgroundColor(task.priorite),
                textDecoration: isCancelled ? 'line-through' : 'none'
            }}
            title={task.description}
        >
            <div className="rbc-event-header">
                <span className="rbc-event-title" style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {task.titre}
                </span>
            </div>

            {/* Affichage de l'heure - hiérarchie visuelle */}
            <div style={{
                fontSize: '0.65rem',
                color: '#64748b',
                marginTop: '2px',
                fontWeight: 500,
                textDecoration: isCancelled ? 'line-through' : 'none'
            }}>
                {event.start && event.end ? (
                    `${event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                ) : null}
            </div>

            <div className="rbc-event-details">
                {task.priorite === 'urgente' && !isCancelled && (
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px', color: '#ef4444', fontSize: '0.70rem', fontWeight: 600 }}>
                        <AlertCircle size={10} style={{ marginRight: 2 }} /> Urgent
                    </div>
                )}
                {isCancelled && (
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px', color: '#ef4444', fontSize: '0.70rem', fontWeight: 600, textDecoration: 'none' }}>
                        <AlertCircle size={10} style={{ marginRight: 2 }} /> ANNULÉE
                    </div>
                )}
                {isFailed && (
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px', color: '#ef4444', fontSize: '0.70rem', fontWeight: 600 }}>
                        <XCircle size={10} style={{ marginRight: 2 }} /> NON TERMINÉ
                    </div>
                )}
            </div>
        </div>
    );
};

/*
 * CustomDateHeader
 * Affiche le numéro du jour et un badge si des tâches sont présentes.
 */
export const CustomDateHeader = ({ label, date, events = [] }) => {
    // Filtrer les événements pour ce jour précis
    const dayEvents = events.filter(event => {
        const eventDate = new Date(event.start);
        return (
            eventDate.getDate() === date.getDate() &&
            eventDate.getMonth() === date.getMonth() &&
            eventDate.getFullYear() === date.getFullYear()
        );
    });

    return (
        <div className="rbc-date-cell-custom" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '2px 8px',
            width: '100%'
        }}>
            <span className="rbc-button-link" style={{ fontWeight: dayEvents.length > 0 ? 700 : 400 }}>
                {label}
            </span>
            {dayEvents.length > 0 && (
                <div className="event-count-badge">
                    {dayEvents.length}
                </div>
            )}
        </div>
    );
};
