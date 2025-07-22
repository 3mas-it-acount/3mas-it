import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle, XCircle, Clock, DollarSign, Package, Search, Filter, Download, Calendar, User, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';

const LOCAL_KEY = 'purchases';
const STATUS_OPTIONS = ['Pending', 'Approved', 'Rejected', 'In Progress', 'Completed', 'Cancelled'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const CATEGORY_OPTIONS = ['Hardware', 'Software', 'Office Supplies', 'Services', 'Equipment', 'Other'];

const Purchases = () => {
  const { t } = useTranslation();
  const [purchases, setPurchases] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    quantity: 1,
    category: 'Hardware',
    installationLocation: '',
    requestDate: new Date().toISOString().split('T')[0],
    description: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_KEY);
    if (saved) setPurchases(JSON.parse(saved));
  }, []);

  const savePurchases = (arr) => {
    setPurchases(arr);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(arr));
  };

  const handleAdd = () => {
    setSelectedPurchase(null);
    setFormData({
      title: '',
      quantity: 1,
      category: 'Hardware',
      installationLocation: '',
      requestDate: new Date().toISOString().split('T')[0],
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (purchase) => {
    setSelectedPurchase(purchase);
    setFormData({
      title: purchase.title,
      quantity: purchase.quantity,
      category: purchase.category,
      installationLocation: purchase.installationLocation || '',
      requestDate: purchase.requestDate,
      description: purchase.description
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this purchase request?')) {
      const arr = purchases.filter(p => p.id !== id);
      savePurchases(arr);
      toast.success('Purchase request deleted');
    }
  };

  const handleApprove = (id) => {
    const arr = purchases.map(p => p.id === id ? { ...p, status: 'Approved' } : p);
    savePurchases(arr);
    toast.success('Purchase request approved');
  };

  const handleReject = (id) => {
    const arr = purchases.map(p => p.id === id ? { ...p, status: 'Rejected' } : p);
    savePurchases(arr);
    toast.success('Purchase request rejected');
  };

  const handleExportExcel = () => {
    try {
      if (purchases.length === 0) {
        toast.error('No purchases to export');
        return;
      }
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const monthlyPurchases = purchases.filter(p => {
        const purchaseDate = new Date(p.requestDate);
        return purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear;
      });
      if (monthlyPurchases.length === 0) {
        toast.error('No purchases found for current month');
        return;
      }
      const data = monthlyPurchases.map(p => ({
        ID: p.id,
        Tools: p.title,
        Quantity: p.quantity,
        Category: p.category,
        'Installation Location': p.installationLocation,
        Date: p.requestDate,
        Description: p.description
      }));
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[currentMonth];
      const filename = `purchases_report_${monthName}_${currentYear}.xlsx`;
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
      XLSX.writeFile(wb, filename);
      toast.success(`Monthly purchases report exported successfully! (${monthName} ${currentYear})`);
    } catch (error) {
      toast.error('Failed to export purchases');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.quantity || !formData.category || !formData.installationLocation || !formData.requestDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (selectedPurchase) {
      const arr = purchases.map(p =>
        p.id === selectedPurchase.id ? { ...formData, id: selectedPurchase.id } : p
      );
      savePurchases(arr);
      toast.success('Purchase request updated');
    } else {
      const arr = [
        ...purchases,
        { ...formData, id: Date.now() }
      ];
      savePurchases(arr);
      toast.success('Purchase request added');
    }
    setIsModalOpen(false);
  };

  // Filter purchases based on search and filters
  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = !searchTerm || 
      purchase.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (purchase.installationLocation || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || purchase.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Calculate totals
  const totalAmount = filteredPurchases.reduce((sum, p) => sum + parseFloat(p.totalAmount || 0), 0);
  const pendingCount = purchases.filter(p => p.status === 'Pending').length;
  const approvedCount = purchases.filter(p => p.status === 'Approved').length;

  return (
    <div>
      {/* Header */}
      <div className="rounded-xl p-8 mb-10 flex flex-col sm:flex-row justify-between items-center shadow-lg bg-gradient-to-r from-purple-500 to-indigo-600">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-white" /> {t('Purchase Management')}
          </h1>
          <p className="text-white text-opacity-80 mt-2 text-lg">{t('Track and manage purchase requests')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-6 sm:mt-0">
          <button
            className="px-6 py-3 rounded-lg bg-white text-purple-700 font-bold text-lg flex items-center gap-2 shadow hover:bg-purple-50 transition border border-purple-200"
            onClick={handleAdd}
          >
            <Plus className="w-6 h-6" /> {t('Add Purchase')}
          </button>
          <button
            className="px-6 py-3 rounded-lg bg-white text-indigo-700 font-bold text-lg flex items-center gap-2 shadow hover:bg-indigo-50 transition border border-indigo-200"
            onClick={handleExportExcel}
          >
            <Download className="w-5 h-5 mr-2" />
            {t('Export Monthly Report')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8 border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search purchases..."
              className="form-input pl-10 rounded-lg bg-gray-50 border-gray-200 focus:border-purple-400 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="form-select rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-200 focus:border-purple-400"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
                            <option value="all">{t('All Categories')}</option>
            {CATEGORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>

      {/* Purchases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredPurchases.length === 0 && (
          <div className="col-span-full text-center text-gray-400 text-lg py-16">
            {purchases.length === 0 ? t('No purchases found. Click "Add Purchase" to get started.') : t('No purchases match your search criteria.')}
          </div>
        )}
        {filteredPurchases.map((p) => (
          <div key={p.id} className="relative flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 overflow-hidden" style={{minHeight:'180px'}}>
            {/* Card Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div className="flex flex-col gap-1">
                <span className="font-extrabold text-xl text-gray-900 dark:text-white tracking-wide flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-500" />
                  {p.title}
                </span>
                <span className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-bold border border-blue-200">
                  {t('Category')}: {p.category}
                </span>
                <span className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-bold border border-green-200">
                  {t('Quantity')}: {p.quantity}
                </span>
                <span className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-bold border border-purple-200">
                  {t('Installation Location')}: {p.installationLocation}
                </span>
                <span className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-bold border border-gray-200">
                  {t('Date')}: {p.requestDate}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEdit(p)} className="hover:bg-gray-100 p-2 rounded transition" title={t('Edit')}>
                  <Edit className="w-5 h-5 text-gray-500" />
                </button>
                                  <button onClick={() => handleDelete(p.id)} className="hover:bg-gray-100 p-2 rounded transition" title={t('Delete')}>
                  <Trash2 className="w-5 h-5 text-red-500" />
                </button>
              </div>
            </div>
            {/* Divider */}
            <div className="border-t border-gray-100 mx-6 mb-0"></div>
            {/* Card Body */}
            <div className="px-6 pb-6 flex-1 flex flex-col justify-between">
              <div className="mb-2 text-base text-gray-700 dark:text-gray-200 min-h-[32px]">
                {p.description}
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
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {selectedPurchase ? t('Edit Purchase Request') : t('Add Purchase Request')}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                          {t('Tools')} *
                        </label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={e => setFormData({...formData, title: e.target.value})}
                          className="form-input w-full"
                          placeholder={t('Enter tool name')}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                          {t('Quantity')} *
                        </label>
                        <input
                          type="number"
                          value={formData.quantity}
                          onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                          className="form-input w-full"
                          min="1"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                          {t('Category')} *
                        </label>
                        <select
                          value={formData.category}
                          onChange={e => setFormData({...formData, category: e.target.value})}
                          className="form-input w-full"
                          required
                        >
                          {CATEGORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                          {t('Installation Location')} *
                        </label>
                        <input
                          type="text"
                          value={formData.installationLocation}
                          onChange={e => setFormData({...formData, installationLocation: e.target.value})}
                          className="form-input w-full"
                          placeholder={t('Enter installation location')}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                        {t('Description')}
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        className="form-input w-full"
                        placeholder={t('Describe the purchase')}
                        rows={3}
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
                    {selectedPurchase ? t('Update') : t('Add')}
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

export default Purchases; 