import React, { useEffect, useState } from 'react';
import { FileText, Download, Eye, FolderOpen } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const DOC_TYPE_LABELS = {
    appointment_letter: 'Appointment Letter',
    experience_letter: 'Experience Letter',
    salary_revision: 'Salary Revision Letter',
    offer_letter: 'Offer Letter',
    payslip: 'Payslip',
    id_proof: 'ID Proof',
    certificate: 'Certificate',
    bgv: 'BGV Report',
    other: 'Other'
};

const MyDocuments = () => {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewDoc, setViewDoc] = useState(null);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const { data } = await api.get('/documents/mine');
                setDocs(data.documents);
            } catch { toast.error('Failed to load documents'); }
            finally { setLoading(false); }
        };
        fetch();
    }, []);

    const handleDownload = (doc) => {
        if (!doc.content) { toast.error('No content available'); return; }
        const blob = new Blob([doc.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${doc.title}.txt`;
        a.click(); URL.revokeObjectURL(url);
        toast.success('Downloaded!');
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>My Documents</h1>
                <p>Access your HR-issued letters and documents</p>
            </div>

            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {Array(6).fill(0).map((_, i) => <div key={i} className="card skeleton" style={{ height: 110 }} />)}
                </div>
            ) : docs.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><FolderOpen size={48} /></div><h3>No documents yet</h3><p>Your HR-issued documents will appear here</p></div></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {docs.map(doc => (
                        <div key={doc._id} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                <div style={{ width: 42, height: 42, background: '#EEF2FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <FileText size={20} color="#4F46E5" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                                    <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 2 }}>{DOC_TYPE_LABELS[doc.type] || doc.type}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(doc.createdAt).toLocaleDateString('en-IN')} · v{doc.version}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setViewDoc(doc)}>
                                    <Eye size={13} /> Preview
                                </button>
                                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => handleDownload(doc)}>
                                    <Download size={13} /> Download
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={!!viewDoc} onClose={() => setViewDoc(null)} title={viewDoc?.title || 'Document'} size="lg">
                {viewDoc && (
                    <div>
                        <div style={{ padding: 20, background: 'var(--bg-light)', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: 440, overflowY: 'auto', border: '1px solid var(--border)' }}>
                            {viewDoc.content || 'No content available.'}
                        </div>
                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button className="btn btn-secondary" onClick={() => setViewDoc(null)}>Close</button>
                            <button className="btn btn-primary" onClick={() => { handleDownload(viewDoc); setViewDoc(null); }}><Download size={14} /> Download</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default MyDocuments;
