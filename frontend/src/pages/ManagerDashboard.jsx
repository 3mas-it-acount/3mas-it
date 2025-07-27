import { useState, useEffect } from 'react';
import { permissionsAPI, employeesAPI, ticketsAPI, errandRequestsAPI, errandsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { ShieldCheck, FileText, Eye, XCircle, CheckCircle, Clock, Monitor, Loader2, UserCircle, Users, TrendingUp, AlertTriangle, Download, Search, Filter, RefreshCw, Calendar, MapPin, User, Package } from 'lucide-react';
import * as XLSX from 'xlsx';
import DarkModeToggle from '../components/DarkModeToggle';
import Tooltip from '../components/Tooltip';
import InlineImage from '../components/InlineImage';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../App';
import { useQueryClient } from 'react-query';


const ManagerDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  console.log('Rendering ManagerDashboard for user:', user);
  const [permissionRequests, setPermissionRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showEmployees, setShowEmployees] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [deviceToView, setDeviceToView] = useState(null);
  const [loading, setLoading] = useState(false);
  const [empLoading, setEmpLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [errandRequests, setErrandRequests] = useState([]);
  const [errandLoading, setErrandLoading] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportMonth, setExportMonth] = useState(new Date().getMonth());
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [exportWarning, setExportWarning] = useState('');

  const socket = useSocket();
  const queryClient = useQueryClient();

  // Compute unique departments and statuses for dropdowns
  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));
  const statuses = Array.from(new Set(employees.map(e => e.status).filter(Boolean)));

  // Filter employees based on search/filter
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      !searchTerm ||
      (emp.fullName && emp.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (emp.firstName && emp.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (emp.lastName && emp.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDepartment = !departmentFilter || emp.department === departmentFilter;
    const matchesStatus = !statusFilter || emp.status === statusFilter;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Calculate dashboard stats
  const stats = {
    totalEmployees: employees.length,
    pendingRequests: permissionRequests.filter(r => r.status === 'pending').length,
    approvedRequests: permissionRequests.filter(r => r.status === 'approved').length,
    rejectedRequests: permissionRequests.filter(r => r.status === 'rejected').length,
    pendingErrands: errandRequests.filter(r => r.status === 'pending').length,
    approvedErrands: errandRequests.filter(r => r.status === 'approved').length,
    rejectedErrands: errandRequests.filter(r => r.status === 'rejected').length,
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setErrandLoading(true);
    
    // Fetch function
    const fetchData = async () => {
      try {
        const [permData, errandData] = await Promise.all([
          permissionsAPI.getPermissionRequests(),
          errandRequestsAPI.getErrandRequests()
        ]);
        if (isMounted) {
          setPermissionRequests(permData);
          setErrandRequests(errandData);
      setLoading(false);
      setErrandLoading(false);
        }
      } catch (e) {
        if (isMounted) {
          setLoading(false);
          setErrandLoading(false);
        }
      }
    };

    fetchData(); // Initial fetch
    const interval = setInterval(fetchData, 10000); // Poll every 10s

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleShowEmployees = async () => {
    setEmpLoading(true);
    const res = await employeesAPI.getEmployees({ page: 1, limit: 100 });
    let arr = [];
    if (res && res.data && Array.isArray(res.data.employees)) arr = res.data.employees;
    setEmployees(arr);
    setShowEmployees(true);
    setEmpLoading(false);
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await permissionsAPI.updatePermissionRequestStatus(id, status);
      toast.success(`Request ${status}d successfully!`, {
        duration: 3000,
        position: 'top-right',
      });
      // Refresh permission requests
      const updated = await permissionsAPI.getPermissionRequests();
      setPermissionRequests(updated);
    } catch (e) {
      toast.error('Failed to update request status', {
        duration: 4000,
        position: 'top-right',
      });
    }
  };

  const handleUpdateErrandStatus = async (id, status) => {
    try {
      await errandRequestsAPI.updateErrandRequestStatus(id, status);
      toast.success(`Errand request ${status}d successfully!`, {
        duration: 3000,
        position: 'top-right',
      });
      // Refresh errand requests
      const data = await errandRequestsAPI.getErrandRequests();
      setErrandRequests(data);
    } catch (e) {
      toast.error('Failed to update errand request status', {
        duration: 4000,
        position: 'top-right',
      });
    }
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      // Fetch all tickets (adjust API as needed to get all, not paginated)
      const response = await ticketsAPI.getTickets({ page: 1, limit: 1000 });
      const tickets = response.tickets || [];
      
      if (tickets.length === 0) {
        toast.error('No tickets found to export', {
          duration: 4000,
          position: 'top-right',
        });
        setExportLoading(false);
        return;
      }

      // Get current month and year
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Filter tickets for current month (based on createdAt date)
      const monthlyTickets = tickets.filter(ticket => {
        const ticketDate = new Date(ticket.createdAt);
        return ticketDate.getMonth() === currentMonth && ticketDate.getFullYear() === currentYear;
      });

      if (monthlyTickets.length === 0) {
        toast.error('No tickets found for current month', {
          duration: 4000,
          position: 'top-right',
        });
        setExportLoading(false);
        return;
      }

      // Prepare data for Excel (columns match Support Tickets page)
      const data = monthlyTickets.map(ticket => ({
        ID: ticket.id,
        Title: ticket.title,
        Description: ticket.description,
        Priority: ticket.priority,
        Status: ticket.status,
        Category: ticket.category,
        'Assigned To': ticket.assignee ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}` : '',
        'Created By': ticket.creator ? `${ticket.creator.firstName} ${ticket.creator.lastName}` : '',
        'Created At': ticket.createdAt,
        'Due Date': ticket.dueDate,
        'Resolved At': ticket.resolvedAt,
        Report: ticket.report || ''
      }));

      // Create filename with month and year
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[currentMonth];
      const filename = `tickets_report_${monthName}_${currentYear}.xlsx`;
      
      // Create worksheet and workbook
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tickets');
      
      // Download Excel file
      XLSX.writeFile(wb, filename);
      
      toast.success(`Monthly tickets report exported successfully! (${monthName} ${currentYear})`, {
        duration: 4000,
        position: 'top-right',
      });
    } catch (error) {
      toast.error('Failed to export tickets. Please try again.', {
        duration: 4000,
        position: 'top-right',
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportErrands = async () => {
    try {
      // Fetch errands from backend
      const errands = await errandsAPI.getErrands();
      if (!errands || errands.length === 0) {
        toast.error('No errands to export', {
          duration: 4000,
          position: 'top-right',
        });
        return;
      }
      // Get current month and year
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      // Filter errands for current month (by requestDate)
      const monthlyErrands = errands.filter(e => {
        const errandDate = new Date(e.requestDate);
        return errandDate.getMonth() === currentMonth && errandDate.getFullYear() === currentYear;
      });
      if (monthlyErrands.length === 0) {
        toast.error('No errands found for current month', {
          duration: 4000,
          position: 'top-right',
        });
        return;
      }
      const data = monthlyErrands.map(e => ({
        ID: e.id,
        Reason: e.reason,
        Location: e.location,
        'Request Date': e.requestDate,
        'Requester Name': e.requesterName,
        'Requester Email': e.requesterEmail,
        'Requester Phone': e.requesterPhone,
        Priority: e.priority,
        Status: e.status,
        Description: e.description || ''
      }));
      // Create filename with month and year
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[currentMonth];
      const filename = `errands_report_${monthName}_${currentYear}.xlsx`;
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Errands');
      XLSX.writeFile(wb, filename);
      toast.success(`Monthly errands report exported successfully! (${monthName} ${currentYear})`, {
        duration: 4000,
        position: 'top-right',
      });
    } catch (error) {
      toast.error('Failed to export errands', {
        duration: 4000,
        position: 'top-right',
      });
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setErrandLoading(true);
    try {
      // Refresh permission requests
      const data = await permissionsAPI.getPermissionRequests();
      setPermissionRequests(data);
      
      // Refresh errand requests
      const errandData = await errandRequestsAPI.getErrandRequests();
      setErrandRequests(errandData);
      
      toast.success('Dashboard refreshed successfully!', {
        duration: 2000,
        position: 'top-right',
      });
    } catch (error) {
      toast.error('Failed to refresh dashboard', {
        duration: 3000,
        position: 'top-right',
      });
    } finally {
      setLoading(false);
      setErrandLoading(false);
    }
  };

  const handleExportPurchases = () => {
    try {
      const saved = localStorage.getItem('purchases');
      const purchases = saved ? JSON.parse(saved) : [];
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

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toISOString().split('T')[0];
  }

  const handleExportAllReports = async () => {
    try {
      // Purchases from localStorage
      const purchasesRaw = localStorage.getItem('purchases');
      const purchases = purchasesRaw ? JSON.parse(purchasesRaw) : [];
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const purchasesSheet = purchases.filter(p => {
        const purchaseDate = new Date(p.requestDate);
        return purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear;
      }).map(p => ({
        ID: p.id,
        Tools: p.title,
        Quantity: p.quantity,
        Category: p.category,
        'Installation Location': p.installationLocation,
        Date: p.requestDate,
        Description: p.description
      }));
      // Errands from backend
      let errandsSheet = [];
      try {
        const errands = await errandsAPI.getErrands();
        errandsSheet = errands.filter(e => {
          const errandDate = new Date(e.requestDate);
          return errandDate.getMonth() === currentMonth && errandDate.getFullYear() === currentYear;
        }).map(e => ({
          ID: e.id,
          Reason: e.reason,
          Location: e.location,
          'Request Date': e.requestDate,
          'Requester Name': e.requesterName,
          'Requester Email': e.requesterEmail,
          'Requester Phone': e.requesterPhone,
          Priority: e.priority,
          Status: e.status,
          Description: e.description || ''
        }));
      } catch (err) {
        toast.error('Failed to fetch errands for export');
      }
      // Tickets from API
      let ticketsSheet = [];
      try {
        const response = await ticketsAPI.getTickets({ page: 1, limit: 10000 });
        const tickets = response.tickets || [];
        ticketsSheet = tickets.filter(ticket => {
          const ticketDate = new Date(ticket.createdAt);
          return ticketDate.getMonth() === currentMonth && ticketDate.getFullYear() === currentYear;
        }).map(ticket => ({
          ID: ticket.id,
          Title: ticket.title,
          Description: ticket.description,
          Priority: ticket.priority,
          Status: ticket.status,
          Category: ticket.category,
          'Assigned To': ticket.assignee ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}` : '',
          'Created By': ticket.creator ? `${ticket.creator.firstName} ${ticket.creator.lastName}` : '',
          'Created At': ticket.createdAt,
          'Due Date': ticket.dueDate,
          'Resolved At': ticket.resolvedAt,
          Report: ticket.report || ''
        }));
      } catch (err) {
        toast.error('Failed to fetch tickets for export');
      }
      // Create workbook and sheets
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchasesSheet), 'Purchases');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(errandsSheet), 'Errands');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ticketsSheet), 'Tickets');
      // File name
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[currentMonth];
      const filename = `all_reports_${monthName}_${currentYear}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success('All reports exported successfully!');
    } catch (error) {
      toast.error('Failed to export all reports');
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  
  const statusIcons = {
    pending: <Clock className="w-4 h-4 text-yellow-500 inline-block mr-1" />,
    approved: <CheckCircle className="w-4 h-4 text-green-500 inline-block mr-1" />,
    rejected: <XCircle className="w-4 h-4 text-red-500 inline-block mr-1" />,
  };

  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      if (payload.type === 'errand') {
        queryClient.invalidateQueries(['errandRequests']);
      }
    };
    socket.on('entityUpdated', handler);
    return () => {
      socket.off('entityUpdated', handler);
    };
  }, [socket, queryClient]);

  useEffect(() => {
    if (!socket) return;
    // Real-time updates for errand requests (already present)
    const errandHandler = (payload) => {
      if (payload.type === 'errand') {
        queryClient.invalidateQueries(['errandRequests']);
      }
    };
    socket.on('entityUpdated', errandHandler);
    // Real-time updates for users
    const userRefetch = () => queryClient.invalidateQueries(['users']);
    socket.on('userCreated', userRefetch);
    socket.on('userUpdated', userRefetch);
    socket.on('userDeleted', userRefetch);
    // Real-time updates for employees
    const employeeRefetch = () => queryClient.invalidateQueries(['employees']);
    socket.on('employeeCreated', employeeRefetch);
    socket.on('employeeUpdated', employeeRefetch);
    socket.on('employeeDeleted', employeeRefetch);
    // Real-time updates for permissions
    const permissionRefetch = () => queryClient.invalidateQueries(['permissions']);
    socket.on('permissionCreated', permissionRefetch);
    socket.on('permissionUpdated', permissionRefetch);
    // Real-time updates for tickets
    const ticketRefetch = () => queryClient.invalidateQueries(['tickets']);
    socket.on('ticketCreated', ticketRefetch);
    socket.on('ticketUpdated', ticketRefetch);
    socket.on('ticketDeleted', ticketRefetch);
    return () => {
      socket.off('entityUpdated', errandHandler);
      socket.off('userCreated', userRefetch);
      socket.off('userUpdated', userRefetch);
      socket.off('userDeleted', userRefetch);
      socket.off('employeeCreated', employeeRefetch);
      socket.off('employeeUpdated', employeeRefetch);
      socket.off('employeeDeleted', employeeRefetch);
      socket.off('permissionCreated', permissionRefetch);
      socket.off('permissionUpdated', permissionRefetch);
      socket.off('ticketCreated', ticketRefetch);
      socket.off('ticketUpdated', ticketRefetch);
      socket.off('ticketDeleted', ticketRefetch);
    };
  }, [socket, queryClient]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Dashboard Header with Dark Mode Toggle */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between mb-6">
        <div className="w-full sm:w-auto mb-4 sm:mb-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-900 dark:text-white mb-2 flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-blue-500" aria-hidden="true" /> 
            {t('Manager Dashboard')}
          </h1>
          {/* <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
            Welcome, <span className="font-bold">{user?.firstName}</span>! Here you can manage permission requests, view employees, and export ticket reports.
          </p> */}
        </div>
        <div className="flex items-center gap-3">
                          <Tooltip content={t('Export all reports (Purchases, Tickets, Errands)')} position="bottom">
              <button 
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg flex items-center gap-2 shadow-lg hover:from-indigo-600 hover:to-purple-700 hover:scale-105 transition-all border-0 mt-2 mb-4"
              onClick={handleExportAllReports}
                              aria-label={t('Export all reports to Excel')}
              style={{ minWidth: '220px' }}
            >
              <Download className="w-5 h-5" />
              {t('Export Reports')}
              </button>
            </Tooltip>
                          <Tooltip content={t('Refresh dashboard data')} position="bottom">
            <button 
              className="p-2 rounded-full bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={handleRefresh}
              disabled={loading}
                              aria-label={t('Refresh dashboard')}
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Enhanced Quick Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
        <div
          className="stats-card cursor-pointer px-6 py-5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-bold text-lg flex flex-col items-start gap-2 shadow-lg border-2 border-blue-500 hover:from-indigo-600 hover:to-blue-700 focus:from-indigo-600 focus:to-blue-700 hover:scale-105 focus:scale-105 transition-all duration-200 outline-none"
          onClick={handleShowEmployees}
                          aria-label={t('Show all employees')}
          tabIndex={0}
          onKeyPress={e => { if (e.key === 'Enter' || e.key === ' ') handleShowEmployees(); }}
        >
          <div className="stats-icon bg-white bg-opacity-20 rounded-full mb-2">
            <Users className="w-7 h-7 text-white" aria-hidden="true" />
          </div>
          <div>
            <div className="stats-number text-white font-extrabold text-2xl">{stats.totalEmployees}</div>
                            <div className="stats-label text-white text-base font-semibold">{t('Total Employees')}</div>
          </div>
        </div>
        
        <div className="stats-card">
          <div className="stats-icon bg-yellow-100 dark:bg-yellow-900">
            <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
          </div>
          <div>
            <div className="stats-number">{stats.pendingRequests}</div>
                          <div className="stats-label">{t('Pending Permissions')}</div>
          </div>
        </div>
        
        <div className="stats-card">
          <div className="stats-icon bg-green-100 dark:bg-green-900">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" aria-hidden="true" />
          </div>
          <div>
            <div className="stats-number">{stats.approvedRequests}</div>
                          <div className="stats-label">{t('Approved Permissions')}</div>
          </div>
        </div>
        
        <div className="stats-card">
          <div className="stats-icon bg-red-100 dark:bg-red-900">
            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <div>
            <div className="stats-number">{stats.rejectedRequests}</div>
                          <div className="stats-label">{t('Rejected Permissions')}</div>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-icon bg-orange-100 dark:bg-orange-900">
            <MapPin className="w-6 h-6 text-orange-600 dark:text-orange-400" aria-hidden="true" />
          </div>
          <div>
            <div className="stats-number">{stats.pendingErrands}</div>
                          <div className="stats-label">{t('Pending Errands')}</div>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-icon bg-emerald-100 dark:bg-emerald-900">
            <MapPin className="w-6 h-6 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <div>
            <div className="stats-number">{stats.approvedErrands + stats.rejectedErrands}</div>
                          <div className="stats-label">{t('Processed Errands')}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full">
        {/* Permission Requests Section */}
        <div className="w-full">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Enhanced Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      {t('System Permission Requests')}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {t('Manage and review access permission requests')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {permissionRequests.length} request{permissionRequests.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Enhanced Table */}
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="text-center">
                  <Loader2 className="animate-spin w-10 h-10 text-blue-500 mx-auto mb-4" aria-label={t('Loading')} />
                                      <p className="text-gray-600 dark:text-gray-300">{t('Loading permission requests...')}</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {permissionRequests.length === 0 ? (
                  <div className="text-center py-16 px-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
                      <ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('No Permission Requests')}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{t('All caught up! New requests will appear here when submitted.')}</p>
                  </div>
                ) : (
                  <div className="min-w-full">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" role="table" aria-label={t('System Permission Requests')}>
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-500" />
                              {t('Page Name')}
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-500" />
                              {t('Department')}
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-gray-500" />
                              {t('Code')}
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <UserCircle className="w-4 h-4 text-gray-500" />
                              {t('Requested By')}
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Download className="w-4 h-4 text-gray-500" />
                              {t('Attachment')}
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              {t('Status')}
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              {t('Date')}
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {permissionRequests.map((req, index) => (
                          <tr key={req.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {req.pageName}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    ID: #{req.id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                                {req.department}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <code className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded font-mono">
                                {req.code}
                              </code>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                  <UserCircle className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {req.requester ? `${req.requester.firstName} ${req.requester.lastName}` : 'Unknown'}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {req.requester?.email || '-'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {req.attachment ? (
                                <Tooltip content={t('Download attachment')} position="top">
                                  <a 
                                    href={`/api/uploads/${req.attachment}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors text-sm font-medium"
                                    aria-label={t('Download attachment')}
                                  >
                                    <Download className="w-4 h-4" />
                                    Download
                                  </a>
                                </Tooltip>
                              ) : (
                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-sm">
                                  <XCircle className="w-4 h-4" />
                                  No File
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold shadow-sm border ${statusColors[req.status]}`} aria-label={`Status: ${req.status}`}>
                                {statusIcons[req.status]}
                                <span className="capitalize">{req.status}</span>
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {new Date(req.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(req.createdAt).toLocaleTimeString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Tooltip content={t('View details')} position="top">
                                  <button
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    onClick={() => setSelected(req)}
                                    aria-label="View details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </Tooltip>
                                {user?.role === 'manager' && req.status === 'pending' && (
                                  <>
                                    <Tooltip content={t('Approve request')} position="top">
                                      <button
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                                        onClick={() => handleUpdateStatus(req.id, 'approved')}
                                        aria-label="Approve request"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                      </button>
                                    </Tooltip>
                                    <Tooltip content={t('Reject request')} position="top">
                                      <button
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                                        onClick={() => handleUpdateStatus(req.id, 'rejected')}
                                        aria-label="Reject request"
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                    </Tooltip>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
          
        </div>

        {/* Errand Requests Section */}
        <div className="w-full mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Enhanced Header */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <MapPin className="w-6 h-6 text-green-600 dark:text-green-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      {t('Errand Requests')}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {t('Review and manage employee errand requests')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {errandRequests.length} request{errandRequests.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Enhanced Table */}
            {errandLoading ? (
              <div className="flex justify-center items-center py-16">
                <div className="text-center">
                  <Loader2 className="animate-spin w-10 h-10 text-green-500 mx-auto mb-4" aria-label="Loading" />
                  <p className="text-gray-600 dark:text-gray-300">Loading errand requests...</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {errandRequests.length === 0 ? (
                  <div className="text-center py-16 px-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
                      <MapPin className="w-8 h-8 text-green-600 dark:text-green-400" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('No Errand Requests')}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{t('All caught up! New errand requests will appear here when submitted.')}</p>
                  </div>
                ) : (
                  <div className="min-w-full">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" role="table" aria-label="Errand Requests">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-500" />
                              {t('Reason')}
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              {t('Location')}
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-500" />
                              {t('Requester')}
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              {t('Request Date')}
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              {t('Status')}
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {errandRequests.map((errand, index) => (
                          <tr key={errand.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 bg-white dark:bg-gray-800 `}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                                  <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {errand.reason}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    ID: #{errand.id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                                {errand.location || 'Not specified'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                  <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {errand.requesterName}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {errand.requesterEmail || '-'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 dark:text-white">
                    {new Date(errand.requestDate).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(errand.createdAt).toLocaleTimeString()}
                  </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold shadow-sm border ${statusColors[errand.status]}`} aria-label={`Status: ${errand.status}`}>
                                {statusIcons[errand.status]}
                                <span className="capitalize">{errand.status}</span>
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Tooltip content={t('View details')} position="top">
              <button 
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    onClick={() => setSelected(errand)}
                                    aria-label="View details"
                                  >
                                    <Eye className="w-4 h-4" />
              </button>
            </Tooltip>
                                {user?.role === 'manager' && errand.status === 'pending' && (
                                  <>
                                    <Tooltip content={t('Approve errand request')} position="top">
                                      <button
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                                        onClick={() => handleUpdateErrandStatus(errand.id, 'approved')}
                                        aria-label="Approve errand request"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                      </button>
                                    </Tooltip>
                                    <Tooltip content={t('Reject errand request')} position="top">
                                      <button
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                                        onClick={() => handleUpdateErrandStatus(errand.id, 'rejected')}
                                        aria-label="Reject errand request"
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                    </Tooltip>
                                  </>
                                )}
          </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Employees Modal */}
      {showEmployees && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 transition-all duration-300 ease-in-out animate-fadeIn" role="dialog" aria-modal="true" aria-label="Employees Modal">
          <div className="bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto w-full max-w-6xl relative transform transition-all duration-300 ease-in-out scale-95 sm:scale-100 animate-modalIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" aria-hidden="true" /> 
                {t('All Employees')}
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" 
                onClick={() => setShowEmployees(false)}
                aria-label="Close employees list"
              >
                &times;
              </button>
            </div>
            
            {/* Enhanced Search and Filter Controls */}
            <div className="search-controls">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                <input
                  type="text"
                  className="form-input pl-10 w-full"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  aria-label="Search employees"
                />
              </div>
              <select
                className="form-select w-full sm:w-auto"
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                aria-label="Filter by department"
              >
                <option value="">{t('All Departments')}</option>
                {departments.map(dep => (
                  <option key={dep} value={dep}>{dep}</option>
                ))}
              </select>
              <select
                className="form-select w-full sm:w-auto"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="">{t('All Statuses')}</option>
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            
            {empLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="animate-spin w-8 h-8 text-blue-500" aria-label="Loading" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                {filteredEmployees.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <Users className="w-16 h-16" aria-hidden="true" />
                    </div>
                    <div className="empty-state-title">{t('No employees found')}</div>
                    <div className="empty-state-description">{t('Try adjusting your search or filters.')}</div>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 mb-4 text-xs sm:text-sm" role="table" aria-label="Employees">
                    <thead className="table-header">
                      <tr>
                        <th scope="col" className="px-2 sm:px-4 py-2">{t('Name')}</th>
                        <th scope="col" className="px-2 sm:px-4 py-2">{t('Department')}</th>
                        <th scope="col" className="px-2 sm:px-4 py-2">{t('Email')}</th>
                        <th scope="col" className="px-2 sm:px-4 py-2">{t('Position')}</th>
                        <th scope="col" className="px-2 sm:px-4 py-2">{t('Status')}</th>
                        <th scope="col" className="px-2 sm:px-4 py-2">{t('Phone')}</th>
                        <th scope="col" className="px-2 sm:px-4 py-2">{t('Location')}</th>
                        <th scope="col" className="px-2 sm:px-4 py-2">{t('Device')}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {Array.isArray(filteredEmployees) && filteredEmployees.map(emp => (
                        <tr key={emp.id} className="table-row">
                          <td className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <UserCircle className="w-5 h-5 text-gray-400" aria-hidden="true" />
                            {emp.fullName || (emp.firstName + ' ' + emp.lastName)}
                          </td>
                          <td className="table-cell text-gray-800 dark:text-gray-200">{emp.department}</td>
                          <td className="table-cell text-gray-800 dark:text-gray-200">{emp.email}</td>
                          <td className="table-cell text-gray-800 dark:text-gray-200">{emp.position}</td>
                          <td className="table-cell text-gray-800 dark:text-gray-200">{emp.status}</td>
                          <td className="table-cell text-gray-800 dark:text-gray-200">{emp.phone}</td>
                          <td className="table-cell text-gray-800 dark:text-gray-200">{emp.location}</td>
                          <td className="table-cell">
                            {emp.device ? (
                              <Tooltip content={t('View device details')} position="top">
                                <button 
                                  className="text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1 transition-colors" 
                                  onClick={() => { setDeviceToView(emp.device); setDeviceModalOpen(true); }}
                                  aria-label="View device details"
                                >
                                  <Monitor className="w-4 h-4 inline-block" aria-hidden="true" /> 
                                  {t('View Device')}
                                </button>
                              </Tooltip>
                            ) : (
                              <span className="text-gray-400">{t('No Device')}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            
            <div className="flex justify-end mt-4">
              <button 
                className="btn-secondary" 
                onClick={() => setShowEmployees(false)}
                aria-label="Close employees list"
              >
                {t('Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Device Modal */}
      {deviceModalOpen && deviceToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 transition-all duration-300 ease-in-out animate-fadeIn" role="dialog" aria-modal="true" aria-label="Device Information Modal">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-4 sm:p-8 w-full max-w-lg relative transform transition-all duration-300 ease-in-out scale-95 sm:scale-100 animate-modalIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-500" aria-hidden="true" /> 
                {t('Device Information')}
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" 
                onClick={() => setDeviceModalOpen(false)}
                aria-label="Close device info"
              >
                &times;
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-sm">
              {deviceToView.snNum && <div><span className="font-semibold text-gray-700 dark:text-gray-300">{t('SN:')}</span> <span className="text-gray-900 dark:text-white">{deviceToView.snNum}</span></div>}
              {deviceToView.deviceBrand && <div><span className="font-semibold text-gray-700 dark:text-gray-300">{t('Brand:')}</span> <span className="text-gray-900 dark:text-white">{deviceToView.deviceBrand}</span></div>}
              {deviceToView.hard && <div><span className="font-semibold text-gray-700 dark:text-gray-300">{t('Hard:')}</span> <span className="text-gray-900 dark:text-white">{deviceToView.hard}</span></div>}
              {deviceToView.ram && <div><span className="font-semibold text-gray-700 dark:text-gray-300">{t('RAM:')}</span> <span className="text-gray-900 dark:text-white">{deviceToView.ram}</span></div>}
              {deviceToView.processor && <div><span className="font-semibold text-gray-700 dark:text-gray-300">{t('CPU:')}</span> <span className="text-gray-900 dark:text-white">{deviceToView.processor}</span></div>}
              {deviceToView.deviceType && <div><span className="font-semibold text-gray-700 dark:text-gray-300">{t('Type:')}</span> <span className="text-gray-900 dark:text-white">{deviceToView.deviceType}</span></div>}
              {deviceToView.macIp && <div><span className="font-semibold text-gray-700 dark:text-gray-300">{t('MAC/IP:')}</span> <span className="text-gray-900 dark:text-white">{deviceToView.macIp}</span></div>}
              {deviceToView.deviceUser && <div><span className="font-semibold text-gray-700 dark:text-gray-300">{t('User:')}</span> <span className="text-gray-900 dark:text-white">{deviceToView.deviceUser}</span></div>}
              {deviceToView.devicePass && <div><span className="font-semibold text-gray-700 dark:text-gray-300">{t('Pass:')}</span> <span className="text-gray-900 dark:text-white">{deviceToView.devicePass}</span></div>}
              {deviceToView.deviceHost && <div><span className="font-semibold text-gray-700 dark:text-gray-300">{t('Host:')}</span> <span className="text-gray-900 dark:text-white">{deviceToView.deviceHost}</span></div>}
              {deviceToView.anydeskNum && <div><span className="font-semibold text-gray-700 dark:text-gray-300">{t('Anydesk#:')}</span> <span className="text-gray-900 dark:text-white">{deviceToView.anydeskNum}</span></div>}
              {deviceToView.anydeskPass && <div><span className="font-semibold text-gray-700 dark:text-gray-300">{t('Anydesk Pass:')}</span> <span className="text-gray-900 dark:text-white">{deviceToView.anydeskPass}</span></div>}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Request Details Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 transition-all duration-300 ease-in-out animate-fadeIn" role="dialog" aria-modal="true" aria-label="Request Details Modal">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-4 sm:p-8 w-full max-w-md relative transform transition-all duration-300 ease-in-out scale-95 sm:scale-100 animate-modalIn">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                {selected.type === 'errand_request' ? (
                  <>
                    <MapPin className="w-4 h-4 text-green-400" aria-hidden="true" /> 
                    {t('Errand Request')}
                  </>
                ) : (
                  <>
                <FileText className="w-4 h-4 text-blue-400" aria-hidden="true" /> 
                {selected.pageName}
                  </>
                )}
              </h2>
              <button 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" 
                onClick={() => setSelected(null)}
                aria-label="Close details"
              >
                &times;
              </button>
            </div>
            <div className="space-y-3 text-xs sm:text-sm">
                              {selected.type === 'errand_request' ? (
                  // Errand request details
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('Reason:')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{selected.reason}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('Location:')}</span>
                      <span className="font-semibold text-blue-700 dark:text-blue-300">{selected.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('Request Date:')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {new Date(selected.requestDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('Requested By:')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {selected.requesterName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('Email:')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {selected.requesterEmail || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('Phone:')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {selected.requesterPhone || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('Priority:')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {selected.priority}
                      </span>
                    </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">{t('Status:')}</span>
                    <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-bold ${statusColors[selected.status]}`}>
                      {statusIcons[selected.status]}{selected.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('Date:')}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {new Date(selected.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {selected.description && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-gray-600 dark:text-gray-400 mb-2">{t('Description:')}</div>
                      <div className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        {selected.description}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // Permission request details
                <>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('Department:')}</span>
                <span className="font-semibold text-blue-700 dark:text-blue-300">{selected.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('Code:')}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{selected.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('Requested By:')}</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {selected.requester ? `${selected.requester.firstName} ${selected.requester.lastName}` : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">{t('Status:')}</span>
                <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-bold ${statusColors[selected.status]}`}>
                  {statusIcons[selected.status]}{selected.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('Date:')}</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {new Date(selected.createdAt).toLocaleString()}
                </span>
              </div>
              {selected.attachment && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-gray-600 dark:text-gray-400 mb-2">{t('Attachment:')}</div>
                  {selected.attachment.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                    <InlineImage 
                      src={`/api/uploads/${selected.attachment}`} 
                      alt="Attachment" 
                      className="rounded-lg border w-full max-h-60 object-contain" 
                    />
                  ) : (
                    <a 
                      href={window.IS_ELECTRON && window.BACKEND_URL ? 
                        `${window.BACKEND_URL}/api/uploads/${selected.attachment}` : 
                        `/api/uploads/${selected.attachment}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-700 dark:text-blue-300 underline hover:text-blue-900 dark:hover:text-blue-400 transition"
                    >
                      {t('Download Attachment')}
                    </a>
                  )}
                </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Purchases Table at the bottom */}
      <div className="w-full mt-10">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('Purchases')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{t('All purchase requests for this month')}</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            {(() => {
              let purchases = [];
              if (typeof window !== 'undefined') {
                const purchasesRaw = localStorage.getItem('purchases');
                purchases = purchasesRaw ? JSON.parse(purchasesRaw) : [];
              }
              const now = new Date();
              const currentMonth = now.getMonth();
              const currentYear = now.getFullYear();
              const monthlyPurchases = purchases.filter(p => {
                const purchaseDate = new Date(p.requestDate);
                return purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear;
              });
              if (monthlyPurchases.length === 0) {
                return (
                  <div className="text-center py-16 px-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full mb-4">
                      <Package className="w-8 h-8 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('No Purchases')}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{t('No purchase requests found for this month.')}</p>
                  </div>
                );
              }
              return (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" role="table" aria-label="Purchases">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">{t('Tools')}</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">{t('Quantity')}</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">{t('Category')}</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">{t('Installation Location')}</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">{t('Date')}</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">{t('Description')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {monthlyPurchases.map((p, idx) => (
                      <tr key={p.id || idx} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{p.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{p.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{p.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{p.installationLocation}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{p.requestDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;