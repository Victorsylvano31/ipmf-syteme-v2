import Router from './routes';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ToastContainer from './components/Notifications/Toast';
import './styles/design-system.css';

const AppContent = () => {
    const { loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
                <p>Chargement de l'application...</p>
            </div>
        );
    }

    return (
        <>
            <ToastContainer />
            <Router />
        </>
    );
};

export default function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <NotificationProvider>
                    <AppContent />
                </NotificationProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
