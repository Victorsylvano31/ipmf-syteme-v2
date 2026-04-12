import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Navbar({ user, onLogout }) {
    const navigate = useNavigate();
    const [showFinanceMenu, setShowFinanceMenu] = useState(false);

    const handleLogout = () => {
        onLogout();
        navigate('/');
    };

    if (!user) return null;

    const isAdminOrDG = ['admin', 'dg'].includes(user.role);

    return (
        <nav style={{
            padding: '1rem',
            background: '#2c3e50',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>IPMF Système</div>
            <div style={{ display: 'flex', gap: '20px' }}>
                <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>Dashboard</Link>
                <Link to="/tasks" style={{ color: 'white', textDecoration: 'none' }}>Mes Tâches</Link>

                <div style={{ position: 'relative' }}>
                    <span
                        onClick={() => setShowFinanceMenu(!showFinanceMenu)}
                        style={{ color: 'white', textDecoration: 'none', cursor: 'pointer' }}
                    >
                        Finances ▼
                    </span>
                    {showFinanceMenu && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            background: 'white',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                            borderRadius: '4px',
                            minWidth: '150px',
                            zIndex: 100
                        }}>
                            <Link to="/expenses" style={dropdownLinkStyle}>Dépenses</Link>
                            {/* Future links: Recettes, Statistiques */}
                        </div>
                    )}
                </div>

                {isAdminOrDG && (
                    <Link to="/users" style={{ color: 'white', textDecoration: 'none' }}>Utilisateurs</Link>
                )}

                <Link to="/profile" style={{ color: 'white', textDecoration: 'none' }}>Profil</Link>
            </div>
            <div>
                <span style={{ marginRight: '15px', fontSize: '0.9rem' }}>
                    {user.username} ({user.role})
                </span>
                <button
                    onClick={handleLogout}
                    style={{
                        background: '#e74c3c',
                        border: 'none',
                        color: 'white',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Déconnexion
                </button>
            </div>
        </nav>
    );
}

const dropdownLinkStyle = {
    display: 'block',
    padding: '10px',
    color: '#2c3e50',
    textDecoration: 'none',
    borderBottom: '1px solid #eee'
};
