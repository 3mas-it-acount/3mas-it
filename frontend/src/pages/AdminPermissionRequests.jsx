import React, { useEffect, useState } from 'react';
import { permissionsAPI } from '../services/api';
import { ShieldCheck, UserCheck, UserX, Loader2, FileText, Eye, XCircle, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import InlineImage from '../components/InlineImage';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};
const statusIcons = {
  pending: <Clock className="w-4 h-4 text-yellow-500 inline-block mr-1" />,
  approved: <CheckCircle className="w-4 h-4 text-green-500 inline-block mr-1" />,
  rejected: <XCircle className="w-4 h-4 text-red-500 inline-block mr-1" />,
};

const AdminPermissionRequests = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const { user } = useAuth();

  // Check if user is admin, if not redirect to dashboard
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await permissionsAPI.getPermissionRequests();
      setRequests(data);
    } catch (err) {
      toast.error(t('Failed to fetch requests'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    try {
      await permissionsAPI.updatePermissionRequestStatus(id, status);
      toast.success(status === 'approved' ? t('Request approved') : t('Request rejected'));
      fetchRequests();
    } catch (err) {
      toast.error(t('Failed to update status'));
    } finally {
      setUpdatingId(null);
    }
  };

  // Filtering
  const filtered = requests.filter(req => {
    const matchesSearch = req.pageName.toLowerCase().includes(search.toLowerCase()) || req.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesDept = departmentFilter === 'all' || req.department === departmentFilter;
    return matchesSearch && matchesStatus && matchesDept;
  });
  const departments = Array.from(new Set(requests.map(r => r.department))).filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="card dark:bg-gray-800 dark:border-gray-700 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('System Permission Requests')}</h1>
        {/* Responsive Permission Requests Table */}
        <div className="hidden lg:block card dark:bg-gray-800 dark:border-gray-700 mb-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('Page Name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('Department')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('Code')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('Requested By')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('Attachment')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('Status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('Date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8"><Loader2 className="animate-spin mx-auto text-blue-500" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-500">{t('No requests found.')}</td></tr>
              ) : filtered.map(req => (
                <tr key={req.id} className="hover:bg-blue-100 dark:hover:bg-blue-900  transition-colors">
                  <td className="px-6 py-3 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" /> {req.pageName}
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{req.department}</span>
                  </td>
                  <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{req.code}</td>
                  <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{req.requester ? `${req.requester.firstName} ${req.requester.lastName}` : '-'}</td>
                  <td className="px-6 py-3 text-gray-700 dark:text-gray-300">
                    {req.attachment ? (
                      <a href={`/api/uploads/${req.attachment}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{t('Download')}</a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusColors[req.status]}`}>{statusIcons[req.status]}{req.status}</span>
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{new Date(req.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-3 text-right space-x-2">
                    <button
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 transition"
                      title={t('View details')}
                      onClick={() => setSelected(req)}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {req.status === 'pending' && (
                      <>
                        <button
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 font-bold text-xs hover:bg-green-200 transition"
                          disabled={updatingId === req.id}
                          title={t('Approve')}
                          onClick={() => handleStatusChange(req.id, 'approved')}
                        >
                          <UserCheck className="w-4 h-4" /> {t('Approve')}
                        </button>
                        <button
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 font-bold text-xs hover:bg-red-200 transition"
                          disabled={updatingId === req.id}
                          title={t('Reject')}
                          onClick={() => handleStatusChange(req.id, 'rejected')}
                        >
                          <UserX className="w-4 h-4" /> {t('Reject')}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile & Tablet Cards */}
        <div className="lg:hidden flex flex-col gap-4 mt-4">
          {filtered.map((req) => (
            <div key={req.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow">
                  <ShieldCheck className="text-white text-xl" />
                </div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">{req.pageName}</div>
                  <div className="text-xs text-gray-500 dark:text-white">{req.department}</div>
                </div>
              </div>
              <div className="text-sm text-gray-900 dark:text-white break-all">{req.code}</div>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColors[req.status]}`}>{statusIcons[req.status]}{req.status}</span>
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{req.requester ? `${req.requester.firstName} ${req.requester.lastName}` : '-'}</span>
              </div>
              <div className="flex gap-2 mt-2">
                {req.attachment && (
                  <a href={`/api/uploads/${req.attachment}`} target="_blank" rel="noopener noreferrer" className="flex-1 text-blue-600 hover:text-blue-900 p-2 rounded bg-blue-50 dark:bg-blue-900/20 text-center">{t('Download')}</a>
                )}
                <button onClick={() => setSelected(req)} className="flex-1 text-gray-600 hover:text-gray-900 p-2 rounded bg-gray-50 dark:bg-gray-900/20 text-center" title={t('View details')}><Eye className="w-5 h-5 mx-auto" /></button>
                {req.status === 'pending' && (
                  <>
                    <button onClick={() => handleStatusChange(req.id, 'approved')} disabled={updatingId === req.id} className="flex-1 text-green-600 hover:text-green-900 p-2 rounded bg-green-50 dark:bg-green-900/20 text-center" title={t('Approve')}>{t('Approve')}</button>
                    <button onClick={() => handleStatusChange(req.id, 'rejected')} disabled={updatingId === req.id} className="flex-1 text-red-600 hover:text-red-900 p-2 rounded bg-red-50 dark:bg-red-900/20 text-center" title={t('Reject')}>{t('Reject')}</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Modal for details */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setSelected(null)}>&times;</button>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-400" /> {selected.pageName}</h2>
            <div className="mb-2 text-sm text-gray-600">Department: <span className="font-semibold text-blue-700">{selected.department}</span></div>
            <div className="mb-2 text-sm text-gray-600">Code: <span className="font-semibold">{selected.code}</span></div>
            <div className="mb-2 text-sm text-gray-600">Requested By: <span className="font-semibold">{selected.requester ? `${selected.requester.firstName} ${selected.requester.lastName}` : '-'}</span></div>
            <div className="mb-2 text-sm text-gray-600">Status: <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusColors[selected.status]}`}>{statusIcons[selected.status]}{selected.status}</span></div>
            <div className="mb-2 text-sm text-gray-600">Date: <span className="font-semibold">{new Date(selected.createdAt).toLocaleString()}</span></div>
                            {selected.attachment && (
                  <div className="mb-2">
                    <div className="text-sm text-gray-600 mb-1">Attachment:</div>
                    {selected.attachment.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                      <InlineImage src={`/api/uploads/${selected.attachment}`} alt="Attachment" className="rounded-lg border w-full max-h-60 object-contain" />
                    ) : (
                      <a href={window.IS_ELECTRON && window.BACKEND_URL ? 
                        `${window.BACKEND_URL}/api/uploads/${selected.attachment}` : 
                        `/api/uploads/${selected.attachment}`} 
                        target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Download</a>
                    )}
                  </div>
                )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPermissionRequests; 