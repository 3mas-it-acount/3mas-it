import React, { useState } from 'react';
import { ShieldCheck, FileText, Building2, Hash, Send } from 'lucide-react';
import { permissionsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../App';
import { useQueryClient } from 'react-query';

const departments = [
  'IT', 'HR', 'Finance', 'Operations', 'Sales', 'Support', 'Other'
];

const SystemPermission = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    pageName: '',
    department: '',
    code: ''
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const socket = useSocket();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!socket) return;
    const refetch = () => queryClient.invalidateQueries(['permissions']);
    socket.on('permissionCreated', refetch);
    socket.on('permissionUpdated', refetch);
    return () => {
      socket.off('permissionCreated', refetch);
      socket.off('permissionUpdated', refetch);
    };
  }, [socket, queryClient]);

  const validate = () => {
    const errs = {};
    if (!form.pageName.trim()) errs.pageName = t('Page name is required');
    if (!form.department) errs.department = t('Department is required');
    if (!form.code.trim()) errs.code = t('Code is required');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setErrors(errs => ({ ...errs, [e.target.name]: undefined }));
  };

  const handleFileChange = e => {
    setAttachment(e.target.files[0] || null);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitted(true);
    try {
      await permissionsAPI.createPermissionRequest({ ...form, attachment });
      toast.success(t('Permission request submitted!'));
      setForm({ pageName: '', department: '', code: '' });
      setAttachment(null);
    } catch (err) {
      toast.error(err.response?.data?.message || t('Failed to submit request'));
    } finally {
      setSubmitted(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <ShieldCheck className="text-white text-2xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{t('System Permission Request')}</h1>
            <p className="text-gray-600 mt-1">{t('Request access to a system page or feature.')}</p>
          </div>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold mb-1 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" /> {t('Name of Page')}
            </label>
            <input
              name="pageName"
              className={`form-input w-full ${errors.pageName ? 'border-red-500' : ''}`}
              placeholder={t('e.g. User Management')}
              value={form.pageName}
              onChange={handleChange}
            />
            {errors.pageName && <div className="text-xs text-red-500 mt-1">{errors.pageName}</div>}
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" /> {t('Department')}
            </label>
            <select
              name="department"
              className={`form-input w-full ${errors.department ? 'border-red-500' : ''}`}
              value={form.department}
              onChange={handleChange}
            >
              <option value="">{t('Select department')}</option>
              {departments.map(dep => (
                <option key={dep} value={dep}>{dep}</option>
              ))}
            </select>
            {errors.department && <div className="text-xs text-red-500 mt-1">{errors.department}</div>}
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 flex items-center gap-2">
              <Hash className="w-4 h-4 text-blue-500" /> {t('Code')}
            </label>
            <input
              name="code"
              className={`form-input w-full ${errors.code ? 'border-red-500' : ''}`}
              placeholder={t('Enter permission code')}
              value={form.code}
              onChange={handleChange}
            />
            {errors.code && <div className="text-xs text-red-500 mt-1">{errors.code}</div>}
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 flex items-center gap-2">
              {t('Attachment (optional)')}
            </label>
            <input type="file" name="attachment" onChange={handleFileChange} className="form-input w-full" />
            {attachment && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-700">
                <span>{attachment.name}</span>
                <button type="button" className="text-red-500" onClick={() => setAttachment(null)}>{t('Remove')}</button>
              </div>
            )}
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60"
            disabled={submitted}
          >
            <Send className="w-5 h-5" /> {submitted ? t('Requesting...') : t('Request Permission')}
          </button>
                      {submitted && <div className="text-green-600 text-center mt-2">{t('Request submitted!')}</div>}
        </form>
      </div>
    </div>
  );
};

export default SystemPermission; 