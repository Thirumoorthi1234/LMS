import React, { useEffect, useState } from 'react';
import { Plus, FileText, Download, Trash2, Search, Eye } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const DOC_TYPES = {
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

const TEMPLATES = {
    appointment_letter: (emp) => `APPOINTMENT LETTER

Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}

Dear ${emp?.name || '[Employee Name]'},

We are pleased to appoint you as ${emp?.position || '[Position]'} in our ${emp?.department || '[Department]'} department.

Your employment commences from ${emp?.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-IN') : '[Date]'}.

Please report to HR on the joining date with all original documents.

Regards,
HR Department`,

    experience_letter: (emp) => `EXPERIENCE LETTER

Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}

To Whom It May Concern,

This is to certify that ${emp?.name || '[Employee Name]'} has worked with us as ${emp?.position || '[Position]'} in the ${emp?.department || '[Department]'} department.

During the tenure, ${emp?.name || 'the employee'} demonstrated excellent professional skills and conduct.

We wish them the best in their future endeavours.

Regards,
HR Department`,

    salary_revision: (emp) => `SALARY REVISION LETTER

Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}

Dear ${emp?.name || '[Employee Name]'},

We are pleased to inform you that your salary has been revised effective from ${new Date().toLocaleDateString('en-IN')}.

This revision reflects your valuable contributions and performance.

Please contact HR for the updated salary breakup.

Regards,
HR Department`
};

const defaultForm = { title: '', type: 'appointment_letter', employee: '', content: '' };

const Documents = () => {
    const [docs, setDocs] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, item: null });
    const [viewModal, setViewModal] = useState({ open: false, doc: null });
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [filterEmp, setFilterEmp] = useState('');
    const [filterType, setFilterType] = useState('');
    const [search, setSearch] = useState('');

    const fetchDocs = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterEmp) params.employee = filterEmp;
            if (filterType) params.type = filterType;
            const { data } = await api.get('/documents', { params });
            setDocs(data.documents);
        } catch { toast.error('Failed to load documents'); }
        finally { setLoading(false); }
    };

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get('/users');
            setEmployees(data.users.filter(u => u.role === 'employee'));
        } catch { }
    };

    useEffect(() => { fetchDocs(); fetchEmployees(); }, []);
    useEffect(() => { fetchDocs(); }, [filterEmp, filterType]);

    const handleTypeChange = (type) => {
        const selectedEmp = employees.find(e => e._id === form.employee);
        const template = TEMPLATES[type];
        const content = template ? template(selectedEmp) : '';
        setForm(f => ({ ...f, type, content, title: DOC_TYPES[type] || '' }));
    };

    const handleEmployeeChange = (empId) => {
        const emp = employees.find(e => e._id === empId);
        const template = TEMPLATES[form.type];
        const content = template ? template(emp) : form.content;
        setForm(f => ({ ...f, employee: empId, content }));
    };

    const openCreate = () => { setForm(defaultForm); setModal({ open: true, item: null }); };
    const closeModal = () => setModal({ open: false, item: null });

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.employee || !form.title) { toast.error('Employee and title are required'); return; }
        setSaving(true);
        try {
            await api.post('/documents', form);
            toast.success('Document created');
            closeModal(); fetchDocs();
        } catch (err) { toast.error(err.response?.data?.message || 'Operation failed'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this document?')) return;
        try { await api.delete(`/documents/${id}`); toast.success('Deleted'); fetchDocs(); }
        catch { toast.error('Failed to delete'); }
    };

    const handleDownload = (doc) => {
        if (!doc.content) { toast.error('No content to download'); return; }
        const blob = new Blob([doc.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${doc.title}.txt`;
        a.click(); URL.revokeObjectURL(url);
    };

    const filtered = docs.filter(d => {
        if (!search) return true;
        const q = search.toLowerCase();
        return d.title?.toLowerCase().includes(q) || d.employee?.name?.toLowerCase().includes(q);
    });

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Document Management</h1>
                <p>Generate and manage HR letters and employee documents</p>
            </div>

            <div className="filter-bar">
                <div style={{ position: 'relative', flex: 1, maxWidth: 260 }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-control" style={{ width: 180 }} value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
                    <option value="">All Employees</option>
                    {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                </select>
                <select className="form-control" style={{ width: 200 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="">All Types</option>
                    {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> Generate Document</button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Document</th>
                                <th>Type</th>
                                <th>Employee</th>
                                <th>Generated By</th>
                                <th>Date</th>
                                <th>Version</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (<tr key={i}>{Array(7).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>))
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><FileCheck size={48} /></div><h3>No documents found</h3><p>Generate HR letters for employees</p></div></td></tr>
                            ) : (
                                filtered.map(doc => (
                                    <tr key={doc._id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <FileText size={16} color="var(--primary)" />
                                                <span style={{ fontWeight: 600, fontSize: 13 }}>{doc.title}</span>
                                            </div>
                                        </td>
                                        <td><span style={{ fontSize: 12, background: '#EEF2FF', color: '#4F46E5', padding: '2px 8px', borderRadius: 6 }}>{DOC_TYPES[doc.type] || doc.type}</span></td>
                                        <td>
                                            <div style={{ fontWeight: 500, fontSize: 13 }}>{doc.employee?.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{doc.employee?.department}</div>
                                        </td>
                                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{doc.generatedBy?.name || ''}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(doc.createdAt).toLocaleDateString('en-IN')}</td>
                                        <td><span className="badge badge-approved"><span className="badge-dot" />v{doc.version}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setViewModal({ open: true, doc })} title="View"><Eye size={14} /></button>
                                                <button className="btn btn-secondary btn-sm btn-icon" onClick={() => handleDownload(doc)} title="Download"><Download size={14} /></button>
                                                <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(doc._id)} title="Delete"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Generate Modal */}
            <Modal isOpen={modal.open} onClose={closeModal} title="Generate Document" size="lg">
                <form onSubmit={handleSave}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Document Type</label>
                            <select className="form-control" value={form.type} onChange={e => handleTypeChange(e.target.value)}>
                                {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Employee</label>
                            <select className="form-control" value={form.employee} onChange={e => handleEmployeeChange(e.target.value)} required>
                                <option value="">Select Employee</option>
                                {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}  {emp.department || 'N/A'}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label required">Document Title</label>
                        <input className="form-control" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Document Content</label>
                        <textarea className="form-control" rows={10} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Document content (auto-filled from template)" style={{ fontFamily: 'monospace', fontSize: 13 }} />
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Generating...' : 'Generate & Save'}</button>
                    </div>
                </form>
            </Modal>

            {/* View Modal */}
            <Modal isOpen={viewModal.open} onClose={() => setViewModal({ open: false, doc: null })} title={viewModal.doc?.title || 'Document'} size="lg">
                {viewModal.doc && (
                    <div>
                        <div style={{ padding: 20, background: 'var(--bg-light)', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: 480, overflowY: 'auto', border: '1px solid var(--border)' }}>
                            {viewModal.doc.content || 'No content available'}
                        </div>
                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button className="btn btn-secondary" onClick={() => setViewModal({ open: false, doc: null })}>Close</button>
                            <button className="btn btn-primary" onClick={() => handleDownload(viewModal.doc)}><Download size={14} /> Download</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Documents;
