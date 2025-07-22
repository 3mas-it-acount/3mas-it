import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle, User, FileText, UploadCloud, MapPin, Clock, Calendar, Download, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { errandsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../App';

const STATUS_OPTIONS = ['pending', 'approved', 'rejected'];

const Errands = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedErrand, setSelectedErrand] = useState(null);
  const [formData, setFormData] = useState({
    reason: '',
    location: '',
    requestDate: '',
    requesterName: user ? `${user.firstName} ${user.lastName}` : '',
    requesterEmail: user?.email || '',
    requesterPhone: user?.phone || '',
    priority: 'medium',
    description: ''
  });

  // Fetch errands from backend
  const { data: errands = [], isLoading, error } = useQuery(
    ['errands'],
    () => errandsAPI.getErrands(),
    { keepPreviousData: true }
  );

  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      if (payload.type === 'errand') {
        queryClient.invalidateQueries(['errands']);
      }
    };
    socket.on('entityUpdated', handler);
    return () => {
      socket.off('entityUpdated', handler);
    };
  }, [socket, queryClient]);

  // Create errand mutation
  const createErrandMutation = useMutation(errandsAPI.addErrand, {
    onSuccess: () => {
      queryClient.invalidateQueries(['errands']);
      setIsModalOpen(false);
      toast.success(t('Errand submitted successfully!'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('Failed to submit errand'));
    },
  });

  const deleteErrandMutation = useMutation(errandsAPI.deleteErrand, {
    onSuccess: () => {
      queryClient.invalidateQueries(['errands']);
      toast.success(t('Errand deleted successfully!'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('Failed to delete errand'));
    },
  });

  const handleAdd = () => {
    setSelectedErrand(null);
    setFormData({
      reason: '',
      location: '',
      requestDate: '',
      requesterName: user ? `${user.firstName} ${user.lastName}` : '',
      requesterEmail: user?.email || '',
      requesterPhone: user?.phone || '',
      priority: 'medium',
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.reason || !formData.location || !formData.requestDate || !formData.requesterName || !formData.description) {
      toast.error(t('Please fill in all required fields'));
      return;
    }
    createErrandMutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (window.confirm(t('Are you sure you want to delete this errand?'))) {
      deleteErrandMutation.mutate(id);
    }
  };

  const handleExportExcel = () => {
    try {
      if (errands.length === 0) {
        toast.error(t('No errands to export'));
        return;
      }
      const data = errands.map(e => ({
        ID: e.id,
        Reason: e.reason,
        Location: e.location,
        'Tasker ': e.requesterName,
        'Request Date': e.requestDate,
        Description: e.description
      }));
      const filename = `errands_report_all.xlsx`;
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Errands');
      XLSX.writeFile(wb, filename);
      toast.success(t('All errands exported successfully!'));
    } catch (error) {
      toast.error(t('Failed to export errands'));
    }
  };

  return (
    <div >
      <div className="rounded-xl p-8 mb-10 flex flex-col sm:flex-row justify-between items-center shadow-lg bg-gradient-to-r from-green-500 to-blue-600">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-white" /> {t('Errand Management')}
          </h1>
          <p className="text-white text-opacity-80 mt-2 text-lg">{t('Track, assign, and complete errands and field tasks')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-6 sm:mt-0">
          <button
            className="px-6 py-3 rounded-lg bg-white text-green-700 font-bold text-lg flex items-center gap-2 shadow hover:bg-green-50 transition border border-green-200"
            onClick={handleAdd}
          >
            <Plus className="w-6 h-6" /> {t('Add Errand')}
          </button>
          <button
            className="px-6 py-3 rounded-lg bg-white text-blue-700 font-bold text-lg flex items-center gap-2 shadow hover:bg-blue-50 transition border border-blue-200"
            onClick={handleExportExcel}
          >
            <Download className="w-5 h-5 mr-2" />
            {t('Export Monthly Report')}
          </button>
        </div>
      </div>
      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {isLoading ? (
          <div className="col-span-full text-center text-gray-400 text-lg py-16">{t('Loading...')}</div>
        ) : errands.length === 0 ? (
          <div className="col-span-full text-center text-gray-400 text-lg py-16">{t('No errands found. Click "Add Errand" to get started.')}</div>
        ) : (
          errands.map((e) => (
            <div key={e.id} className="relative flex flex-col bg-white dark:bg-gray-700 rounded-2xl shadow-md border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 overflow-hidden" style={{minHeight:'220px'}}>
              {/* Card Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <div className="flex flex-col gap-1">
                  <span className="font-extrabold text-2xl text-gray-900 dark:text-gray-100 tracking-wide flex items-center gap-2">
                    <FileText className="w-6 h-6 text-green-500" />
                    {e.reason}
                  </span>
                  <span className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-base font-bold border border-green-200">
                    {t('Tasker')}: {e.requesterName}
                  </span>
                  <span className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-base font-bold border border-purple-200">
                    {t('Location')}: {e.location}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="text-red-500 hover:text-red-700 transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              {/* Divider */}
              <div className="border-t border-gray-100 mx-6 mb-0"></div>
              {/* Card Body */}
              <div className="px-6 pb-6 flex-1 flex flex-col justify-between">
                <div className="mb-2 text-base text-gray-700 dark:text-gray-200 min-h-[32px]">
                  <span className="font-medium">{t('Date')}:</span> {e.requestDate ? new Date(e.requestDate).toLocaleDateString() : ''}
                </div>

                <div className="mb-2 text-base text-gray-700 dark:text-gray-200 min-h-[32px]">
                  <span className="font-medium">{t('Description')}:</span> {e.description}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {t('Add Errand')}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none text-2xl"
                    >
                      &times;
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Reason')} *
                      </label>
                      <input
                        type="text"
                        value={formData.reason}
                        onChange={e => setFormData({...formData, reason: e.target.value})}
                        className="form-input w-full"
                        placeholder={t('Enter the reason for the errand')}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Location')} *
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={e => setFormData({...formData, location: e.target.value})}
                        className="form-input w-full"
                        placeholder={t('Enter location')}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Date')} *
                      </label>
                      <input
                        type="date"
                        value={formData.requestDate}
                        onChange={e => setFormData({...formData, requestDate: e.target.value})}
                        className="form-input w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Description')} *
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        className="form-input w-full"
                        placeholder={t('Enter description')}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn-secondary"
                  >
                    {t('Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={createErrandMutation.isLoading}
                  >
                    {t('Add')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Errands;