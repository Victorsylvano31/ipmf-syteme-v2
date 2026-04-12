import React from 'react';
import { Printer, X } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import styles from './Students.module.css';

/**
 * Composant de Reçu de Paiement optimisé pour l'impression.
 */
export default function ReceiptTemplate({ etudiant, paiement, onClose }) {
    if (!paiement || !etudiant) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className={styles.modalOverlay} style={{ zIndex: 9999 }}>
            <div className={styles.modalCard} style={{ maxWidth: '600px', padding: '0' }}>
                {/* Header Actions (Non imprimables) */}
                <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.5rem', background: 'var(--color-bg-elevated)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 800 }}>Aperçu du Reçu</h3>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={handlePrint} className={styles.btnPrimary} style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }}>
                            <Printer size={14} /> Imprimer
                        </button>
                        <button onClick={onClose} className={styles.btnCancel} style={{ padding: '0.4rem 0.75rem' }}>
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Zone de Reçu (Imprimable) */}
                <div id="receipt-print-zone" className="print-only-container" style={{ padding: '2rem', background: '#fff', color: '#000' }}>
                    <div style={{ border: '2px solid #000', padding: '1.5rem', borderRadius: '4px', position: 'relative' }}>
                        
                        {/* Header Reçu */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #000', paddingBottom: '1rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>IPMF</h2>
                                <p style={{ margin: 0, fontSize: '0.75rem' }}>Institut de Promotion de Madagascar</p>
                                <p style={{ margin: 0, fontSize: '0.65rem' }}>Contact : +261 34 00 000 00</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>BON DE CAISSE</h3>
                                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>N° {paiement.reference || `REC-${paiement.id}`}</p>
                                <p style={{ margin: 0, fontSize: '0.75rem' }}>Date: {formatDate(paiement.date_paiement || new Date())}</p>
                            </div>
                        </div>

                        {/* Corps du Reçu */}
                        <div style={{ marginBottom: '2rem', fontSize: '0.9375rem', lineHeight: '1.8' }}>
                            <div>Reçu de M./Mme/Mlle : <strong style={{ textTransform: 'uppercase' }}>{etudiant.nom} {etudiant.prenom}</strong></div>
                            <div>Inscrit(e) en : <strong>{etudiant.formation_nom}</strong></div>
                            <div>Promotion : {etudiant.promotion || '—'} | N° Inscription : {etudiant.numero_inscription}</div>
                            <div style={{ marginTop: '0.5rem' }}>La somme de : <strong style={{ fontSize: '1.1rem' }}>{formatCurrency(paiement.montant_paye)}</strong></div>
                            <div>Motif : Paiement Frais de Formation - {paiement.numero_tranche === 1 ? '1ère' : `${paiement.numero_tranche}ème`} Tranche</div>
                            <div>Reste à payer : {formatCurrency(etudiant.montant_restant)}</div>
                        </div>

                        {/* Footer (Signatures) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
                            <div style={{ textAlign: 'center', width: '45%' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '3rem' }}>L'Étudiant(e)</div>
                                <div style={{ borderTop: '1px dashed #000', paddingTop: '0.25rem', fontSize: '0.65rem' }}>Signature</div>
                            </div>
                            <div style={{ textAlign: 'center', width: '45%' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '3rem' }}>La Caisse (IPMF)</div>
                                <div style={{ borderTop: '1px dashed #000', paddingTop: '0.25rem', fontSize: '0.65rem' }}>Signature & Cachet</div>
                            </div>
                        </div>

                        {/* Mention légale */}
                        <div style={{ marginTop: '2rem', fontSize: '0.65rem', fontStyle: 'italic', textAlign: 'center', opacity: 0.7 }}>
                            Ce document est une preuve officielle de paiement. Veuillez le conserver précieusement.
                        </div>
                    </div>
                </div>
            </div>

            {/* CSS d'impression spécifique */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body * { visibility: hidden !important; background: #fff !important; }
                    .no-print { display: none !important; }
                    #receipt-print-zone, #receipt-print-zone * { visibility: visible !important; }
                    #receipt-print-zone { 
                        position: fixed !important; 
                        left: 0 !important; 
                        top: 0 !important; 
                        width: 100% !important; 
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .modalOverlay { background: white !important; position: static !important; }
                    .modalCard { border: none !important; box-shadow: none !important; max-width: 100% !important; }
                }
            ` }} />
        </div>
    );
}
