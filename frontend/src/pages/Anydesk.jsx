import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Copy, ExternalLink, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { anydeskAPI } from '../services/api';

const Anydesk = () => {
  const { t } = useTranslation();
  const [devices, setDevices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    anydeskId: '',
    branch: '',
    notes: '',
    password: ''
  });

  useEffect(() => {
    anydeskAPI.getDevices()
      .then(setDevices)
      .catch(() => toast.error('Failed to load devices'));
  }, []);

  const handleAdd = () => {
    setSelectedDevice(null);
    setFormData({ name: '', anydeskId: '', branch: '', notes: '', password: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (dev) => {
    setSelectedDevice(dev);
    setFormData({ ...dev });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this device?')) {
      try {
        await anydeskAPI.deleteDevice(id);
        setDevices(devices => devices.filter(d => d.id !== id));
        toast.success('Device deleted');
      } catch {
        toast.error('Failed to delete device');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.anydeskId || !formData.branch) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      if (selectedDevice) {
        const updated = await anydeskAPI.updateDevice(selectedDevice.id, formData);
        setDevices(devices => devices.map(d => d.id === updated.id ? updated : d));
        toast.success('Device updated');
      } else {
        const created = await anydeskAPI.addDevice(formData);
        setDevices(devices => [...devices, created]);
        toast.success('Device added');
      }
      setIsModalOpen(false);
    } catch {
      toast.error('Failed to save device');
    }
  };

  const handleCopy = (val) => {
    navigator.clipboard.writeText(val);
    toast.success('Copied!');
  };

  return (
    <div >
      <div className="rounded-xl p-8 mb-10 flex flex-col sm:flex-row justify-between items-center shadow-lg bg-gradient-to-r from-blue-500 to-violet-600">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white flex items-center gap-3">
            <span className="inline-block"><svg width="36" height="36" fill="none" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#fff"/><rect x="4" y="4" width="16" height="16" rx="4" fill="#6366f1"/><rect x="7" y="7" width="10" height="10" rx="2" fill="#a5b4fc"/></svg></span>
            {t('Anydesk Remote Devices')}
          </h1>
          <p className="text-white text-opacity-80 mt-2 text-lg">{t('Manage and connect to remote devices using Anydesk')}</p>
        </div>
        <button
          className="mt-6 sm:mt-0 px-6 py-3 rounded-lg bg-white text-blue-700 font-bold text-lg flex items-center gap-2 shadow hover:bg-blue-50 transition border border-blue-200"
          onClick={handleAdd}
        >
          <Plus className="w-6 h-6" /> {t('Add Device')}
        </button>
      </div>
      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {devices.length === 0 && (
          <div className="col-span-full text-center text-gray-400 dark:text-gray-200 text-lg py-16">{t('No devices found. Click "Add Device" to get started.')}</div>
        )}
        {devices.map((dev) => (
          <div key={dev.id} className="relative flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 overflow-hidden" style={{minHeight:'200px'}}>
            {/* Card Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div className="flex flex-col gap-1">
                <span className="font-extrabold text-2xl text-gray-900 dark:text-gray-200 tracking-wide flex items-center gap-2"><Monitor className="w-6 h-6 text-blue-500" />{dev.name}</span>
                <span className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-base font-bold border border-blue-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.72 11.06a2.25 2.25 0 1 0-3.18-3.18l-7.07 7.07a2.25 2.25 0 1 0 3.18 3.18l7.07-7.07Z" /></svg>
                  {t('Branch')}: {dev.branch}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEdit(dev)} className="hover:bg-gray-100 p-2 rounded transition" title="Edit">
                  <Edit className="w-6 h-6 text-gray-500" />
                </button>
                <button onClick={() => handleDelete(dev.id)} className="hover:bg-gray-100 p-2 rounded transition" title="Delete">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </button>
              </div>
            </div>
            {/* Divider */}
            <div className="border-t border-gray-100 mx-6 mb-0"></div>
            {/* Card Body */}
            <div className="px-6 pb-6 flex-1 flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4 mt-4">
                <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full shadow bg-gradient-to-r from-violet-500 to-indigo-500 text-white dark:text-gray-200 text-lg font-extrabold border border-violet-200" style={{fontWeight:'bold', fontSize:'1.15rem'}}>
                  <Copy className="w-5 h-5" />
                  {dev.anydeskId}
                  <button onClick={() => handleCopy(dev.anydeskId)} className="ml-2 text-white hover:text-yellow-200" title="Copy ID">
                    <Copy className="w-5 h-5" />
                  </button>
                  <a href={`anydesk://${dev.anydeskId}`} className="ml-2 text-white hover:text-green-200" title="Open in Anydesk">
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </span>
              </div>
             {dev.password && (
               <div className="flex items-center gap-2 mb-4">
                 <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-base font-semibold">
                   {t('Password')}: <span className="tracking-widest">{Array(dev.password.length).fill('•').join('')}</span>
                 </span>
                 <button onClick={() => handleCopy(dev.password)} className="text-gray-500 dark:text-gray-200 hover:text-blue-600" title="Copy Password">
                   <Copy className="w-5 h-5" />
                 </button>
               </div>
             )}
              <div className="mb-4 text-base text-gray-700 dark:text-gray-200 min-h-[32px]">
                {dev.notes}
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {selectedDevice ? t('Edit Device') : t('Add Device')}
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
                        {t('Device Name')} *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="form-input w-full"
                        placeholder={t('Enter device name')}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Anydesk ID')} *
                      </label>
                      <input
                        type="text"
                        value={formData.anydeskId}
                        onChange={e => setFormData({...formData, anydeskId: e.target.value})}
                        className="form-input w-full"
                        placeholder={t('Enter Anydesk ID')}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Branch')} *
                      </label>
                      <input
                        type="text"
                        value={formData.branch}
                        onChange={e => setFormData({...formData, branch: e.target.value})}
                        className="form-input w-full"
                        placeholder={t('Enter branch name')}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Notes')}
                      </label>
                      <input
                        type="text"
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        className="form-input w-full"
                        placeholder="Optional notes"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Password')}
                      </label>
                      <input
                        type="text"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        className="form-input w-full"
                        placeholder="Optional password for remote access"
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
                  >
                    {selectedDevice ? t('Update') : t('Add')}
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

export default Anydesk; 