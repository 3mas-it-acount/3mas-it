import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Edit, Trash2, Search, Filter, Eye, Plus, UserPlus, Users, UserCheck, UserX, Monitor } from 'lucide-react';
import { employeesAPI } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

import EmployeeModal from '../components/EmployeeModal';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../App';
// EmployeeModal will be implemented next
// import EmployeeModal from '../components/EmployeeModal';

const DeviceIcon = Monitor;

// DeviceInfoModal for viewing device details
const DeviceInfoModal = ({ isOpen, onClose, device }) => {
  const { t } = useTranslation();
  if (!isOpen || !device) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 p-5 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-2xl">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center shadow">
              <DeviceIcon className="text-white text-xl" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{t('Device Information')}</h3>
              <p className="text-sm text-blue-100">{t("Details for this employee's device")}</p>
            </div>
            <button onClick={onClose} className="ml-auto text-white text-2xl hover:text-blue-200 focus:outline-none">×</button>
          </div>
          {/* Device Details */}
          <div className="p-6 space-y-3 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {device.snNum && <div><span className="font-semibold text-gray-700">{t('SN')}:</span> <span className="text-gray-900">{device.snNum}</span></div>}
              {device.deviceBrand && <div><span className="font-semibold text-gray-700">{t('Brand')}:</span> <span className="text-gray-900">{device.deviceBrand}</span></div>}
              {device.hard && <div><span className="font-semibold text-gray-700">{t('Hard')}:</span> <span className="text-gray-900">{device.hard}</span></div>}
              {device.ram && <div><span className="font-semibold text-gray-700">{t('RAM')}:</span> <span className="text-gray-900">{device.ram}</span></div>}
              {device.processor && <div><span className="font-semibold text-gray-700">{t('CPU')}:</span> <span className="text-gray-900">{device.processor}</span></div>}
              {device.deviceType && <div><span className="font-semibold text-gray-700">{t('Type')}:</span> <span className="text-gray-900">{device.deviceType}</span></div>}
              {device.macIp && <div><span className="font-semibold text-gray-700">{t('MAC/IP')}:</span> <span className="text-gray-900">{device.macIp}</span></div>}
              {device.deviceUser && <div><span className="font-semibold text-gray-700">{t('User')}:</span> <span className="text-gray-900">{device.deviceUser}</span></div>}
              {device.devicePass && <div><span className="font-semibold text-gray-700">{t('Pass')}:</span> <span className="text-gray-900">{device.devicePass}</span></div>}
              {device.deviceHost && <div><span className="font-semibold text-gray-700">{t('Host')}:</span> <span className="text-gray-900">{device.deviceHost}</span></div>}
              {device.anydeskNum && <div><span className="font-semibold text-gray-700">{t('Anydesk#')}:</span> <span className="text-gray-900">{device.anydeskNum}</span></div>}
              {device.anydeskPass && <div><span className="font-semibold text-gray-700">{t('Anydesk Pass')}:</span> <span className="text-gray-900">{device.anydeskPass}</span></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// EmailInfoModal for viewing email and email pass
const EmailInfoModal = ({ isOpen, onClose, email, emailPass }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-700 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200">{t('Email Information')}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none">
              <span className="text-xl">×</span>
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div><b>{t('Email')}:</b> {email}</div>
            <div><b>{t('Email Pass')}:</b> {emailPass}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Employees = () => {
  const { t } = useTranslation();
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [actionType, setActionType] = useState(null); // 'delete'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [deviceToView, setDeviceToView] = useState(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailToView, setEmailToView] = useState({ email: '', emailPass: '' });

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const socket = useSocket();

  // Check if user is admin, if not redirect to dashboard
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch employees
  const { data: employeesData, isLoading, error } = useQuery(
    ['employees', currentPage, debouncedSearchTerm, statusFilter],
    () => employeesAPI.getEmployees({
      page: currentPage,
      limit: 10,
      search: debouncedSearchTerm,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }).then(res => res.data),
    { keepPreviousData: true }
  );

  // Fetch positions for position dropdown (if needed)
  const { data: positionsData } = useQuery('positions', () => employeesAPI.getPositions().then(res => res.data));

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation(employeesAPI.deleteEmployee, {
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      setIsConfirmModalOpen(false);
      setSelectedEmployee(null);
    },
  });

  // Create employee mutation
  const createEmployeeMutation = useMutation(employeesAPI.createEmployee, {
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      setIsEmployeeModalOpen(false);
      setSelectedEmployee(null);
      toast.success('Employee created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create employee');
    },
  });

  // Update employee mutation
  const updateEmployeeMutation = useMutation(
    ({ id, data }) => employeesAPI.updateEmployee(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['employees']);
        setIsEmployeeModalOpen(false);
        setSelectedEmployee(null);
        toast.success('Employee updated successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update employee');
      },
    }
  );

  useEffect(() => {
    if (!socket) return;
    const refetch = () => queryClient.invalidateQueries(['employees']);
    socket.on('employeeCreated', refetch);
    socket.on('employeeUpdated', refetch);
    socket.on('employeeDeleted', refetch);
    return () => {
      socket.off('employeeCreated', refetch);
      socket.off('employeeUpdated', refetch);
      socket.off('employeeDeleted', refetch);
    };
  }, [socket, queryClient]);

  // Handlers
  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setIsEmployeeModalOpen(true);
  };
  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setIsEmployeeModalOpen(true);
  };
  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    setIsViewModalOpen(true);
  };
  const handleDeleteEmployee = (employee) => {
    setSelectedEmployee(employee);
    setActionType('delete');
    setIsConfirmModalOpen(true);
  };
  const handleConfirmDelete = () => {
    if (selectedEmployee) {
      deleteEmployeeMutation.mutate(selectedEmployee.id);
    }
  };

  const handleEmployeeSubmit = (data) => {
    if (selectedEmployee) {
      updateEmployeeMutation.mutate({ id: selectedEmployee.id, data });
    } else {
      createEmployeeMutation.mutate(data);
    }
  };

  // Pagination
  const totalPages = employeesData?.totalPages || 1;
  const employees = employeesData?.employees || [];

  // Calculate statistics
  const stats = {
    total: employeesData?.total || 0,
    active: employeesData?.employees?.filter(e => e.status === 'active').length || 0,
    inactive: employeesData?.employees?.filter(e => e.status === 'inactive').length || 0,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Employees')}</h1>
        <button
          className="hidden lg:inline-flex items-center gap-2 px-6 py-2 rounded-lg shadow bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
          onClick={handleAddEmployee}
        >
          <UserPlus className="text-lg" />
          {t('Add Employee')}
        </button>
      </div>
      {/* Responsive Employees Table */}
      <div className="hidden lg:block card dark:bg-gray-800 dark:border-gray-700 mb-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('Name')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('Email')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('Position')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">System Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">System Pass 1</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">System Pass 2</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('Status')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('Device')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('Actions')}</th>
              </tr>
            </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {employees.map((employee, idx) => (
              <tr key={employee.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-700' : 'bg-blue-50 hover:bg-blue-100 dark:bg-gray-800 transition-colors'}>
                <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900 dark:text-white">
                  {employee.fullName || ((employee.firstName || '') + ' ' + (employee.lastName || '')).trim()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    className="text-blue-700 dark:text-blue-300 hover:underline focus:outline-none"
                    onClick={() => {
                      setEmailToView({ email: employee.email, emailPass: employee.emailPass });
                      setEmailModalOpen(true);
                    }}
                    title={t('View Email & Password')}
                    type="button"
                  >
                    {employee.email}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{employee.position}</td>
                <td className="px-6 py-4 whitespace-nowrap">{employee.systemCode || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{employee.systemPass1 || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{employee.systemPass2 || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${employee.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}> {employee.status === 'active' ? t('Active') : t('Inactive')}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {employee.device ? (
                    <button
                      className="text-blue-500 hover:underline"
                      onClick={() => { setDeviceToView(employee.device); setDeviceModalOpen(true); }}
                    >
                      {t('View Device')}
                    </button>
                  ) : (
                    <span className="text-gray-400">{t('No Device')}</span>
                  )}
                  </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                    onClick={() => handleEditEmployee(employee)}
                    className="text-blue-600 hover:text-blue-900 p-1 transition-transform hover:scale-110"
                    title={t('Edit employee')}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                    onClick={() => handleDeleteEmployee(employee)}
                    className="text-red-600 hover:text-red-900 p-1 transition-transform hover:scale-110"
                    title={t('Delete employee')}
                    >
                    <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
    </div>
    {/* Mobile & Tablet Cards */}
    <div className="lg:hidden flex flex-col gap-4 mt-4">
      {employees.map((employee) => (
        <div key={employee.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow">
              <span className="text-white text-lg font-bold">{employee.firstName?.[0]}{employee.lastName?.[0]}</span>
            </div>
            <div>
              <div className="font-bold text-gray-900 dark:text-white">{employee.fullName || ((employee.firstName || '') + ' ' + (employee.lastName || '')).trim()}</div>
              <div className="text-xs text-gray-500 dark:text-white">{employee.email}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{employee.position}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${employee.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{employee.status === 'active' ? t('Active') : t('Inactive')}</span>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => handleEditEmployee(employee)} className="flex-1 text-blue-600 hover:text-blue-900 p-2 rounded bg-blue-50 dark:bg-blue-900/20" title={t('Edit employee')}><Edit className="w-5 h-5 mx-auto" /></button>
            <button onClick={() => handleDeleteEmployee(employee)} className="flex-1 text-red-600 hover:text-red-900 p-2 rounded bg-red-50 dark:bg-red-900/20" title={t('Delete employee')}><Trash2 className="w-5 h-5 mx-auto" /></button>
            <button onClick={() => handleViewEmployee(employee)} className="flex-1 text-gray-600 hover:text-gray-900 p-2 rounded bg-gray-50 dark:bg-gray-900/20" title={t('View employee')}><Eye className="w-5 h-5 mx-auto" /></button>
          </div>
        </div>
      ))}
    </div>
    {/* Pagination Controls */}
    {totalPages > 1 && (
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="text-sm text-gray-700">
          {t('Showing page')} {currentPage} {t('of')} {totalPages}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="btn-secondary disabled:opacity-50 rounded-full px-4"
          >
            {t('Previous')}
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="btn-secondary disabled:opacity-50 rounded-full px-4"
          >
            {t('Next')}
          </button>
        </div>
      </div>
    )}

      {/* Floating Action Button for Add Employee (mobile) */}
          <button
        className="lg:hidden fixed bottom-6 right-6 z-30 flex items-center gap-2 px-6 py-4 rounded-full shadow-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-lg transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 transform hover:scale-105"
        onClick={handleAddEmployee}
      >
        <UserPlus className="text-xl" />
        {t('Add Employee')}
          </button>

      {/* Modals */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSubmit={handleEmployeeSubmit}
        isLoading={createEmployeeMutation.isLoading || updateEmployeeMutation.isLoading}
        employee={selectedEmployee}
        positions={positionsData || []}
      />
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('Delete Employee')}
        message={t('Are you sure you want to delete employee', { name: selectedEmployee?.fullName })}
        isLoading={deleteEmployeeMutation.isLoading}
      />
      <DeviceInfoModal
        isOpen={deviceModalOpen}
        onClose={() => setDeviceModalOpen(false)}
        device={deviceToView}
      />
      <EmailInfoModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        email={emailToView.email}
        emailPass={emailToView.emailPass}
      />
    </div>
  );
};

export default Employees;
