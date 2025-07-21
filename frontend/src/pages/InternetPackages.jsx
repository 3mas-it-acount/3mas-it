import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Settings, ExternalLink } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const PROVIDER_STYLES = {
  'WE': {
    bg: 'bg-blue-600',
    text: 'text-white',
    card: 'border-blue-600',
    progress: 'bg-blue-500',
  },
  'Vodafone': {
    bg: 'bg-red-600',
    text: 'text-white',
    card: 'border-red-600',
    progress: 'bg-red-500',
  },
  'Orange': {
    bg: 'bg-orange-500',
    text: 'text-white',
    card: 'border-orange-500',
    progress: 'bg-orange-400',
  },
  'Etisalat': {
    bg: 'bg-green-600',
    text: 'text-white',
    card: 'border-green-600',
    progress: 'bg-green-500',
  },
  'default': {
    bg: 'bg-gray-600',
    text: 'text-white',
    card: 'border-gray-400',
    progress: 'bg-gray-400',
  }
};

function parseProvider(pkg) {
  if (!pkg || !pkg.packageNumber) return 'default';
  if (/^01[0125]/.test(pkg.packageNumber)) {
    if (pkg.packageNumber.startsWith('011')) return 'Etisalat';
    if (pkg.packageNumber.startsWith('012')) return 'Vodafone';
    if (pkg.packageNumber.startsWith('010')) return 'Orange';
    if (pkg.packageNumber.startsWith('015')) return 'WE';
  }
  if (pkg.provider) return pkg.provider;
  return 'default';
}

function getProviderName(pkg) {
  if (pkg.provider === 'TE' || pkg.provider === 'WE') return 'WE';
  if (pkg.provider) return pkg.provider;
  const p = parseProvider(pkg);
  if (p === 'WE') return 'WE';
  if (p === 'Vodafone') return 'Vodafone';
  if (p === 'Orange') return 'Orange';
  if (p === 'Etisalat') return 'Etisalat';
  return 'Other';
}

function parseUsage(pkg) {
  // expects packageSize like '100GB', '50GB', '100MB', etc. and usage like '45.2GB'
  let used = parseFloat(pkg.dataUsed || '0');
  let total = 0;
  if (pkg.packageSize) {
    const match = pkg.packageSize.match(/([\d.]+)\s*(GB|MB)/i);
    if (match) {
      total = parseFloat(match[1]);
      if (/MB/i.test(match[2])) total = total / 1024;
    }
  }
  if (pkg.dataUsed && /MB/i.test(pkg.dataUsed)) used = used / 1024;
  return { used, total };
}

const InternetPackages = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  const [packages, setPackages] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [formData, setFormData] = useState({
    packageNumber: '',
    packagePrice: '',
    packageSize: '',
    renewalDate: '',
    balance: '',
    provider: '',
    branch: '',
    lastUpdated: ''
  });

  useEffect(() => {
    const savedPackages = localStorage.getItem('internetPackages');
    if (savedPackages) {
      setPackages(JSON.parse(savedPackages));
    }
  }, []);

  const savePackages = (newPackages) => {
    localStorage.setItem('internetPackages', JSON.stringify(newPackages));
    setPackages(newPackages);
  };

  const handleAddPackage = () => {
    setSelectedPackage(null);
    setFormData({
      packageNumber: '',
      packagePrice: '',
      packageSize: '',
      renewalDate: '',
      balance: '',
      provider: '',
      branch: '',
      lastUpdated: ''
    });
    setIsModalOpen(true);
  };

  const handleEditPackage = (pkg) => {
    setSelectedPackage(pkg);
    setFormData({ ...pkg });
    setIsModalOpen(true);
  };

  const handleDeletePackage = (id) => {
    if (window.confirm(t('Are you sure you want to delete this package?'))) {
      const updatedPackages = packages.filter(pkg => pkg.id !== id);
      savePackages(updatedPackages);
      toast.success(t('Package deleted successfully'));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Only require provider, packageNumber, packageSize, renewalDate, and branch
    if (!formData.provider || !formData.packageNumber || !formData.packageSize || !formData.renewalDate || !formData.branch) {
      toast.error(t('Please fill in all required fields'));
      return;
    }
    if (selectedPackage) {
      const updatedPackages = packages.map(pkg =>
        pkg.id === selectedPackage.id ? { ...pkg, ...formData, lastUpdated: new Date().toISOString() } : pkg
      );
      savePackages(updatedPackages);
      toast.success(t('Package updated successfully'));
    } else {
      const newPackage = {
        id: Date.now(),
        ...formData,
        lastUpdated: new Date().toISOString()
      };
      savePackages([...packages, newPackage]);
      toast.success(t('Package added successfully'));
    }
    setIsModalOpen(false);
  };

  return (
    <div>
      {/* Gradient Header */}
      <div className="rounded-xl p-8 mb-10 flex flex-col sm:flex-row justify-between items-center shadow-lg" style={{background: 'linear-gradient(90deg, #4f46e5 0%, #9333ea 100%)'}}>
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white flex items-center gap-3">
            <span className="inline-block"><svg width="36" height="36" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18.5A8.5 8.5 0 1 1 12 3.5a8.5 8.5 0 0 1 0 17Z"/><path fill="#fff" d="M7 10.5a1 1 0 1 1 2 0v3a1 1 0 1 1-2 0v-3Zm4 0a1 1 0 1 1 2 0v3a1 1 0 1 1-2 0v-3Zm4 0a1 1 0 1 1 2 0v3a1 1 0 1 1-2 0v-3Z"/></svg></span>
            {t('My Internet Accounts')}
          </h1>
          <p className="text-white text-opacity-80 mt-2 text-lg">{t('Manage and monitor your internet package accounts')}</p>
        </div>
        <button
          className="mt-6 sm:mt-0 px-6 py-3 rounded-lg bg-white text-violet-700 font-bold text-lg flex items-center gap-2 shadow hover:bg-violet-50 transition border border-violet-200"
          onClick={handleAddPackage}
        >
          <Plus className="w-6 h-6" /> {t('Add Account')}
        </button>
      </div>
      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {packages.length === 0 && (
          <div className="col-span-full text-center text-gray-400 text-lg py-16">{t('No internet accounts found. Click "Add Account" to get started.')}</div>
        )}
        {packages.map((pkg) => {
          const provider = getProviderName(pkg);
          const style = PROVIDER_STYLES[provider] || PROVIDER_STYLES['default'];
          const now = new Date();
          const lastUpdated = pkg.lastUpdated ? new Date(pkg.lastUpdated) : now;
          return (
            <div key={pkg.id} className={`relative flex flex-col bg-white dark:bg-gray-600 rounded-2xl shadow-md border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 overflow-hidden`} style={{minHeight:'260px'}}>
              {/* Colored Accent Bar */}
              <div className={`absolute left-0 top-0 h-full w-2 ${style.bg}`}></div>
              {/* Card Header */}
              <div className={`flex items-center justify-between px-6 pt-5 pb-3`}>
                <div className="flex flex-col gap-1">
                  <span className="font-extrabold text-2xl text-gray-900 dark:text-white tracking-wide">{provider}</span>
                  <span className="text-lg text-gray-700 dark:text-white font-mono">{pkg.packageNumber}</span>
                  {pkg.branch && (
                    <span className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-base font-bold border border-blue-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.72 11.06a2.25 2.25 0 1 0-3.18-3.18l-7.07 7.07a2.25 2.25 0 1 0 3.18 3.18l7.07-7.07Z" /></svg>
                      {t('Branch')}: {pkg.branch}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEditPackage(pkg)} className="hover:bg-gray-100 p-2 rounded transition" title={t('Edit')}>
                    <Edit className="w-6 h-6 text-gray-500" />
                  </button>
                  <button onClick={() => handleDeletePackage(pkg.id)} className="hover:bg-gray-100 p-2 rounded transition" title={t('Delete')}>
                    <Trash2 className="w-6 h-6 text-red-500" />
                  </button>
                </div>
              </div>
              {/* Divider */}
              <div className="border-t border-gray-100 mx-6 mb-0"></div>
              {/* Card Body */}
              <div className="px-6 pb-6 flex-1 flex flex-col justify-between ">
                <div className="flex items-center gap-3 mb-6 mt-4">
                  {pkg.packageSize && (
                    <span className="inline-flex items-center gap-3 px-6 py-2 rounded-full shadow bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-lg font-extrabold border border-violet-200" style={{fontWeight:'bold', fontSize:'1.25rem'}}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><rect x="4" y="8" width="16" height="8" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></svg>
                      {pkg.packageSize}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-8 mb-4">
                  <div className="flex items-center gap-2 text-lg">
                    <span className="text-gray-400">$</span>
                    <span className="font-bold text-gray-900">{pkg.balance ? `EGP ${pkg.balance}` : '--'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-lg">
                    <span className="text-gray-400">{t('Renewal Date')}:</span>
                    <span className="font-bold text-gray-900">{pkg.renewalDate ? new Date(pkg.renewalDate).toLocaleDateString() : '--'}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-400 mb-4">{t('Last updated')}: {lastUpdated.toLocaleString()}</div>
                <div className="flex gap-2 mt-auto">
                  {provider === 'Vodafone' && (
                    <a
                      href="https://web.vodafone.com.eg/spa/login"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 btn-primary flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" /> {t('Open Portal')}
                    </a>
                  )}
                  {(provider === 'TE' || provider === 'WE') && (
                    <a
                      href="https://my.te.eg/echannel/#/login"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 btn-primary flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" /> {t('Open Portal')}
                    </a>
                  )}
                  {provider === 'Orange' && (
                    <a
                      href="https://www.orange.eg/ar/myaccount/login"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 btn-primary flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" /> {t('Open Portal')}
                    </a>
                  )}
                  {provider === 'Etisalat' && (
                    <a
                      href="https://www.etisalat.eg/etisalat/portal/login.jsp"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 btn-primary flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" /> {t('Open Portal')}
                    </a>
                  )}
                  {!(provider === 'Vodafone' || provider === 'TE' || provider === 'WE' || provider === 'Orange' || provider === 'Etisalat') && (
                    <button
                      className="flex-1 btn-primary flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                      title={t('Portal not available for this provider')}
                      disabled
                    >
                      <ExternalLink className="w-4 h-4" /> {t('Open Portal')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white dark:bg-gray-500 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {selectedPackage ? t('Edit Account') : t('Add Account')}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="text-gray-400 hover:text-gray-00 focus:outline-none text-2xl"
                    >
                      &times;
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                        {t('Provider')}
                      </label>
                      <select
                        value={formData.provider}
                        onChange={e => setFormData({...formData, provider: e.target.value})}
                        className="form-input w-full"
                      >
                        <option value="">{t('Select Provider')}</option>
                        <option value="WE">{t('WE')}</option>
                        <option value="Vodafone">{t('Vodafone')}</option>
                        <option value="Orange">{t('Orange')}</option>
                        <option value="Etisalat">{t('Etisalat')}</option>
                        <option value="Other">{t('Other')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                        {t('Account Number')} *
                      </label>
                      <input
                        type="text"
                        value={formData.packageNumber}
                        onChange={e => setFormData({...formData, packageNumber: e.target.value})}
                        className="form-input w-full"
                        placeholder={t('Enter account number')}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                        {t('Package Size')} *
                      </label>
                      <input
                        type="text"
                        value={formData.packageSize}
                        onChange={e => setFormData({...formData, packageSize: e.target.value})}
                        className="form-input w-full"
                        placeholder={t('e.g. 100GB, 50GB, 100MB')}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                        {t('Balance')}
                      </label>
                      <input
                        type="text"
                        value={formData.balance}
                        onChange={e => setFormData({...formData, balance: e.target.value})}
                        className="form-input w-full"
                        placeholder={t('e.g. 125.50')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                        {t('Renewal Date')} *
                      </label>
                      <input
                        type="date"
                        value={formData.renewalDate}
                        onChange={e => setFormData({...formData, renewalDate: e.target.value})}
                        className="form-input w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 sm:px-6 flex justify-end space-x-2">
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
                    {selectedPackage ? t('Update') : t('Add')}
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

export default InternetPackages; 