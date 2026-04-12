
import React, { useState, useCallback, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

// Styles
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './TasksCalendar.css';

// Composants personnalisés
import { CustomToolbar, CustomEvent, CustomDateHeader } from './TasksCalendarComponents';

const locales = {
    'fr': fr,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

// Activation du Drag and Drop
const DnDCalendar = withDragAndDrop(Calendar);

const TasksCalendar = ({ tasks }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [events, setEvents] = useState([]);

    // Utiliser useEffect pour synchroniser l'état local avec les props
    // Cela permet de mettre à jour le calendrier si la liste des tâches change depuis le parent
    // Transformation initiale des tâches en événements
    useEffect(() => {
        const formattedEvents = tasks
            .filter(task => {
                // On masque les tâches validées ET les tâches terminées avec succès
                // On garde les tâches "ECHEC_AUTOMATIQUE" (même si statut='terminee')
                if (task.statut === 'validee') return false;
                if (task.statut === 'terminee' && task.resultat !== 'ECHEC_AUTOMATIQUE') return false;
                return true;
            })
            .map(task => {
                // Start: Priorité à date_debut, sinon date_creation
                let start = new Date(task.date_debut || task.date_creation);
                let end = new Date(task.date_echeance);

                // Sécurité : si date fin invalide ou avant le début
                if (isNaN(end.getTime()) || end < start) {
                    end = new Date(start);
                    end.setHours(start.getHours() + 1); // Durée par défaut 1h
                }

                let title = task.titre;
                if (task.statut === 'annulee') {
                    title = `🚫 ANNULÉE - ${task.titre}`;
                }

                return {
                    id: task.id,
                    title: title,
                    start,
                    end,
                    resource: task,
                    allDay: false // On active le support de l'heure précise
                };
            });
        setEvents(formattedEvents);
    }, [tasks]);

    const eventStyleGetter = (event) => {
        return {
            className: 'rbc-event-modern'
        };
    };

    const handleSelectEvent = (event) => {
        navigate(`/tasks/${event.id}`);
    };

    const moveEvent = useCallback(async ({ event, start, end }) => {
        const updatedEvent = { ...event, start, end };

        setEvents((prevEvents) => {
            const filtered = prevEvents.filter((ev) => ev.id !== event.id);
            return [...filtered, updatedEvent];
        });

        try {
            // Format ISO complet avec heure (YYYY-MM-DDTHH:mm:ss.sssZ)
            const formatDateForApi = (date) => date.toISOString();

            // On met à jour date_debut (start) et date_echeance (end)
            await api.patch(`tasks/taches/${event.id}/`, {
                date_debut: formatDateForApi(start),
                date_echeance: formatDateForApi(end)
            });
            console.log(`Tâche ${event.id} déplacée : ${formatDateForApi(start)} -> ${formatDateForApi(end)}`);
        } catch (error) {
            console.error("Erreur mise à jour tâche", error);
            setEvents((prevEvents) => {
                const filtered = prevEvents.filter((ev) => ev.id !== event.id);
                return [...filtered, event];
            });
            alert("Erreur serveur lors du déplacement.");
        }
    }, []);

    const resizeEvent = useCallback(async ({ event, start, end }) => {
        const updatedEvent = { ...event, start, end };

        setEvents((prevEvents) => {
            const filtered = prevEvents.filter((ev) => ev.id !== event.id);
            return [...filtered, updatedEvent];
        });

        try {
            const formatDateForApi = (date) => date.toISOString();
            await api.patch(`tasks/taches/${event.id}/`, {
                date_echeance: formatDateForApi(end)
            });
        } catch (error) {
            console.error("Erreur redimensionnement", error);
            // Rollback
            setEvents((prevEvents) => {
                const filtered = prevEvents.filter((ev) => ev.id !== event.id);
                return [...filtered, event];
            });
        }
    }, []);

    const canEdit = ['admin', 'dg'].includes(user?.role);

    return (
        <div className="tasks-calendar-container">
            <DnDCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                culture='fr'
                messages={{
                    next: "Suivant",
                    previous: "Précédent",
                    today: "Aujourd'hui",
                    month: "Mois",
                    week: "Semaine",
                    day: "Jour",
                    agenda: "Agenda",
                    date: "Date",
                    time: "Heure",
                    event: "Tâche",
                    noEventsInRange: "Aucune tâche dans cette période.",
                }}
                eventPropGetter={eventStyleGetter}
                components={{
                    toolbar: CustomToolbar,
                    event: CustomEvent,
                    month: {
                        dateHeader: (props) => <CustomDateHeader {...props} events={events} />
                    }
                }}
                views={['month', 'week', 'day']}
                defaultView="month"
                onSelectEvent={handleSelectEvent}
                onSelectSlot={({ start, end }) => {
                    const startStr = start.toISOString();
                    const endStr = end.toISOString();
                    navigate(`/tasks/new?start=${startStr}&end=${endStr}`);
                }}
                onEventDrop={canEdit ? moveEvent : undefined}
                onEventResize={canEdit ? resizeEvent : undefined}
                resizable={canEdit}
                selectable={true}
                dragFromOutsideItem={null}
            />
        </div>
    );
};

export default TasksCalendar;

