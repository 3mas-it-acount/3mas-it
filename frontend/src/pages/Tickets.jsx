import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Search, Filter, Edit, Trash2, FileText, Check, X as XIcon } from 'lucide-react';
import { ticketsAPI, errandRequestsAPI } from '../services/api';
import TicketModal from '../components/TicketModal';
import ConfirmModal from '../components/ConfirmModal';
import LoadingOverlay from '../components/LoadingOverlay';
import ErrandRequestModal from '../components/ErrandRequestModal';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../App';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useAuth } from '../hooks/useAuth';

const Tickets = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isErrandModalOpen, setIsErrandModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const queryClient = useQueryClient();
  const socket = useSocket();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when searching
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch tickets
  const { data: ticketsData, isLoading, error } = useQuery(
    ['tickets', currentPage, debouncedSearchTerm, statusFilter],
    () => ticketsAPI.getTickets({ 
      page: currentPage, 
      limit: 10,
      search: debouncedSearchTerm,
      status: statusFilter !== 'all' ? statusFilter : undefined
    }),
    {
      keepPreviousData: true,
    }
  );

  // Fetch errand requests
  const { data: errandRequests, isLoading: errandLoading } = useQuery(
    ['errandRequests'],
    () => errandRequestsAPI.getErrandRequests(),
    {
      keepPreviousData: true,
    }
  );

  // Create ticket mutation
  const createTicketMutation = useMutation(ticketsAPI.createTicket, {
    onSuccess: () => {
      queryClient.invalidateQueries(['tickets']);
      setIsTicketModalOpen(false);
      setSelectedTicket(null);
      toast.success('Ticket created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create ticket');
    },
  });

  // Update ticket mutation
  const updateTicketMutation = useMutation(
    ({ id, data }) => ticketsAPI.updateTicket(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tickets']);
        setIsTicketModalOpen(false);
        setSelectedTicket(null);
        toast.success('Ticket updated successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update ticket');
      },
    }
  );

  // Delete ticket mutation
  const deleteTicketMutation = useMutation(ticketsAPI.deleteTicket, {
    onSuccess: () => {
      queryClient.invalidateQueries(['tickets']);
      setIsConfirmModalOpen(false);
      setSelectedTicket(null);
      toast.success('Ticket deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete ticket');
    },
  });

  // Create errand request mutation
  const createErrandMutation = useMutation(errandRequestsAPI.createErrandRequest, {
    onSuccess: () => {
      queryClient.invalidateQueries(['tickets']);
      setIsErrandModalOpen(false);
      toast.success('Errand request submitted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to submit errand request');
    },
  });

  // Approve errand request mutation
  const approveErrandMutation = useMutation(
    ({ id, status }) => errandRequestsAPI.updateErrandRequestStatus(id, status),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['errandRequests']);
        toast.success('Errand request approved!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to approve errand request');
      },
    }
  );

  // Reject errand request mutation
  const rejectErrandMutation = useMutation(
    ({ id, status }) => errandRequestsAPI.updateErrandRequestStatus(id, status),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['errandRequests']);
        toast.success('Errand request rejected!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to reject errand request');
      },
    }
  );

  useEffect(() => {
    if (!socket) return;
    const refetch = () => queryClient.invalidateQueries(['tickets']);
    socket.on('ticketCreated', refetch);
    socket.on('ticketUpdated', refetch);
    socket.on('ticketDeleted', refetch);
    return () => {
      socket.off('ticketCreated', refetch);
      socket.off('ticketUpdated', refetch);
      socket.off('ticketDeleted', refetch);
    };
  }, [socket, queryClient]);

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

  const handleCreateTicket = () => {
    setSelectedTicket(null);
    setIsTicketModalOpen(true);
  };

  const handleRequestErrand = () => {
    setIsErrandModalOpen(true);
  };

  const handleErrandSubmit = (errandData) => {
    // Format the errand data for the new API
    const errandRequestData = {
      reason: errandData.reason,
      location: errandData.location,
      requestDate: errandData.date,
      requesterName: errandData.requester,
      requesterEmail: errandData.requesterEmail,
      requesterPhone: errandData.requesterPhone,
      priority: errandData.priority,
      description: errandData.description
    };

    createErrandMutation.mutate(errandRequestData);
  };

  const handleApproveErrand = (errand) => {
    approveErrandMutation.mutate({ id: errand.id, status: 'approved' });
  };

  const handleRejectErrand = (errand) => {
    rejectErrandMutation.mutate({ id: errand.id, status: 'rejected' });
  };

  const handleEditTicket = (ticket) => {
    setSelectedTicket(ticket);
    setIsTicketModalOpen(true);
  };

  const handleDeleteTicket = (ticket) => {
    setSelectedTicket(ticket);
    setIsConfirmModalOpen(true);
  };

  const handleTicketSubmit = (formData) => {
    if (selectedTicket) {
      updateTicketMutation.mutate({ id: selectedTicket.id, data: formData });
    } else {
      createTicketMutation.mutate(formData);
    }
  };

  const handleConfirmDelete = () => {
    if (selectedTicket) {
      deleteTicketMutation.mutate(selectedTicket.id);
    }
  };

  const handleExportExcel = async () => {
    try {
      // Fetch all tickets (adjust API as needed to get all, not paginated)
      const response = await ticketsAPI.getTickets({ page: 1, limit: 1000 });
      const tickets = response.tickets || [];
      
      if (tickets.length === 0) {
        toast.error('No tickets to export');
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
        toast.error('No tickets found for current month');
        return;
      }

      // Prepare data for Excel
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
      toast.success(`Monthly tickets report exported successfully! (${monthName} ${currentYear})`);
    } catch (error) {
      toast.error('Failed to export tickets');
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      open: 'badge-danger',
      in_progress: 'badge-warning',
      pending: 'badge-warning',
      resolved: 'badge-success',
      closed: 'badge-gray',
    };
    return statusClasses[status] || 'badge-gray';
  };

  const isErrandRequest = (ticket) => {
    return ticket.type === 'errand_request' || ticket.category === 'errand_request';
  };

  const getPriorityBadge = (priority) => {
    const priorityClasses = {
      low: 'badge-gray',
      medium: 'badge-warning',
      high: 'badge-danger',
      critical: 'badge-danger',
    };
    return priorityClasses[priority] || 'badge-gray';
  };

  return (
    <div className="min-h-screen  dark:bg-gray-900 p-2 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-lg p-4 sm:p-6 shadow mb-2 border border-blue-100">
        <h1 className="text-xl sm:text-3xl font-extrabold text-blue-800 dark:text-white flex items-center gap-3">
          <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h6m-6 0V7a4 4 0 00-4-4H5a4 4 0 00-4 4v10a4 4 0 004 4h6a4 4 0 004-4z" /></svg>
          {t('Support Tickets')}
        </h1>
        <div className="flex flex-col gap-2 w-full sm:flex-row sm:w-auto">
          {user?.role !== 'user' && (
            <button
              onClick={handleExportExcel}
              className="btn-secondary flex items-center shadow-lg hover:scale-105 transition-transform w-full sm:w-auto"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              {t('Export Monthly Report')}
            </button>
          )}
          <button
            onClick={handleRequestErrand}
            className="btn-secondary flex items-center shadow-lg hover:scale-105 transition-transform bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
          >
            <FileText className="w-5 h-5 mr-2" />
            {t('Request Errand')}
          </button>
          <button
            onClick={handleCreateTicket}
            className="btn-primary flex items-center shadow-lg hover:scale-105 transition-transform w-full sm:w-auto"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t('New Ticket')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 sm:p-6 shadow flex flex-col sm:flex-row sm:items-center gap-4 border border-gray-100 mb-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t('Search tickets...')}
            className="form-input pl-10 rounded-full bg-gray-50 border-gray-200 focus:border-blue-400 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        <div className="relative w-full sm:w-48">
            <select
            className="form-input pr-10 rounded-full bg-gray-50 border-gray-200 focus:border-blue-400 w-full"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t('All Status')}</option>
              <option value="open">{t('Open')}</option>
              <option value="in_progress">{t('In Progress')}</option>
              <option value="pending">{t('Pending')}</option>
              <option value="resolved">{t('Resolved')}</option>
              <option value="closed">{t('Closed')}</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="card overflow-hidden shadow-lg border border-gray-100 mb-4">
        {isLoading ? (
          <LoadingOverlay />
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600">{t('Error loading tickets')}: {error.message}</p>
          </div>
        ) : ticketsData?.tickets?.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">{t('No tickets found')}</p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 rounded-lg overflow-hidden text-xs sm:text-sm">
            <thead className="bg-blue-50 dark:bg-gray-800">
              <tr>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-bold text-blue-700 dark:text-white uppercase tracking-wider">{t('Ticket')}</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-bold text-blue-700 dark:text-white uppercase tracking-wider">{t('Title')}</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-bold text-blue-700 dark:text-white uppercase tracking-wider">{t('Status')}</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-bold text-blue-700 dark:text-white uppercase tracking-wider hidden xs:table-cell">{t('Created')}</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-bold text-blue-700 dark:text-white uppercase tracking-wider hidden xs:table-cell">{t('Created By')}</th>
                <th className="relative px-2 sm:px-6 py-2 sm:py-3"><span className="sr-only">{t('Actions')}</span></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {ticketsData?.tickets?.map((ticket, idx) => (
                <tr
                  key={ticket.id}
                  className={`${idx % 2 === 0 ? 'bg-gray' : 'bg-gray'} hover:bg-blue-50 transition ${isErrandRequest(ticket) ? 'border-l-4 border-green-500' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={e => {
                    // Prevent row click if clicking on an action button
                    if (
                      e.target.closest('button') ||
                      e.target.closest('a')
                    ) return;
                    navigate(`/tickets/${ticket.id}`);
                  }}
                >
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap truncate max-w-[80px] sm:max-w-none">
                    <div className="text-sm font-bold text-blue-800 dark:text-white">#{ticket.id}</div>
                    {isErrandRequest(ticket) && (
                      <div className="text-xs text-green-600 font-medium mt-1">
                        📋 {t('Errand Request')}
                      </div>
                    )}
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap break-words max-w-[120px] sm:max-w-none">
                    <div className="text-sm text-gray-900 dark:text-white font-medium truncate">{ticket.title || <span className="text-gray-400">—</span>}</div>
                    {isErrandRequest(ticket) && (
                      <div className="text-xs text-gray-500 mt-1">
                        {t('Requires approval')}
                      </div>
                    )}
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <span className={`${getStatusBadge(ticket.status)} capitalize text-xs font-semibold px-3 py-1 rounded-full`}>{t(ticket.status.replace('_', ' '))}</span>
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden xs:table-cell">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden xs:table-cell">
                    {ticket.creator ? `${ticket.creator.firstName} ${ticket.creator.lastName}` : ticket.createdBy}
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                    <Link
                      to={`/tickets/${ticket.id}`}
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-100 transition"
                        title={t('View Ticket')}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </Link>
                        {/* Errand Approval Buttons - Only show for pending errand requests */}
                        {isErrandRequest(ticket) && ticket.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveErrand(ticket)}
                              className="text-green-600 hover:text-green-900 p-2 rounded-full hover:bg-green-100 transition"
                              title={t('Approve Errand')}
                              disabled={approveErrandMutation.isLoading || rejectErrandMutation.isLoading}
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleRejectErrand(ticket)}
                              className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100 transition"
                              title={t('Reject Errand')}
                              disabled={approveErrandMutation.isLoading || rejectErrandMutation.isLoading}
                            >
                              <XIcon className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        {/* Remove Edit Ticket Button */}
                        <button
                          onClick={() => handleDeleteTicket(ticket)}
                        className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100 transition"
                        title={t('Delete Ticket')}
                        >
                        <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Pagination */}
      {ticketsData?.totalPages > 1 && (
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="text-sm text-gray-700">
            {t('Showing page')} {currentPage} {t('of')} {ticketsData.totalPages}
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
              onClick={() => setCurrentPage(prev => Math.min(ticketsData.totalPages, prev + 1))}
              disabled={currentPage === ticketsData.totalPages}
              className="btn-secondary disabled:opacity-50 rounded-full px-4"
            >
              {t('Next')}
            </button>
          </div>
        </div>
      )}

      {/* Errand Requests Section */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-green-600" />
            {t('Errand Requests')}
          </h2>
          <div className="text-sm text-gray-500">
            {errandRequests?.length || 0} {t('request(s)')}
          </div>
        </div>

        <div className="card overflow-hidden shadow-lg border border-gray-100">
          {errandLoading ? (
            <LoadingOverlay />
          ) : errandRequests?.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">{t('No errand requests found')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 rounded-lg overflow-hidden">
                <thead className="bg-green-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-green-700 dark:text-white uppercase tracking-wider">{t('ID')}</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-green-700 dark:text-white uppercase tracking-wider">{t('Reason')}</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-green-700 dark:text-white uppercase tracking-wider">{t('Location')}</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-green-700 dark:text-white uppercase tracking-wider">{t('Requester')}</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-green-700 dark:text-white uppercase tracking-wider">{t('Request Date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-green-700 dark:text-white uppercase tracking-wider">{t('Priority')}</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-green-700 dark:text-white uppercase tracking-wider">{t('Status')}</th>
                    <th className="relative px-6 py-3"><span className="sr-only">{t('Actions')}</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {errandRequests?.map((errand, idx) => (
                    <tr key={errand.id} className={`${idx % 2 === 0 ? 'bg-gray' : 'bg-gray-100 dark:bg-gray-800'} hover:bg-green-50 transition`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-green-800 dark:text-white">#{errand.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white font-medium">{errand.reason}</div>
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {errand.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{errand.location}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white font-medium">{errand.requesterName}</div>
                        <div className="text-xs text-gray-500">{errand.requesterEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {new Date(errand.requestDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`${getPriorityBadge(errand.priority)} capitalize text-xs font-semibold px-3 py-1 rounded-full`}>
                          {t(errand.priority)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`${getStatusBadge(errand.status)} capitalize text-xs font-semibold px-3 py-1 rounded-full`}>
                          {t(errand.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Approval/Rejection Buttons - Only show for pending requests and admin/manager */}
                          {errand.status === 'pending' && (user?.role === 'admin' || user?.role === 'manager') && (
                            <>
                              <button
                                onClick={() => handleApproveErrand(errand)}
                                className="text-green-600 hover:text-green-900 p-2 rounded-full hover:bg-green-100 transition"
                                title={t('Approve Errand')}
                                disabled={approveErrandMutation.isLoading || rejectErrandMutation.isLoading}
                              >
                                <Check className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleRejectErrand(errand)}
                                className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100 transition"
                                title={t('Reject Errand')}
                                disabled={approveErrandMutation.isLoading || rejectErrandMutation.isLoading}
                              >
                                <XIcon className="w-5 h-5" />
                              </button>
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
      </div>

      {/* Modals */}
      <TicketModal
        isOpen={isTicketModalOpen}
        onClose={() => {
          setIsTicketModalOpen(false);
          setSelectedTicket(null);
        }}
        onSubmit={handleTicketSubmit}
        ticket={selectedTicket}
        isLoading={createTicketMutation.isLoading || updateTicketMutation.isLoading}
      />

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setSelectedTicket(null);
        }}
        onConfirm={handleConfirmDelete}
        title={t('Delete Ticket')}
        message={t('Are you sure you want to delete this ticket?')}
        isLoading={deleteTicketMutation.isLoading}
      />

      {/* Errand Request Modal */}
      <ErrandRequestModal
        isOpen={isErrandModalOpen}
        onClose={() => setIsErrandModalOpen(false)}
        onSubmit={handleErrandSubmit}
        isLoading={createErrandMutation.isLoading}
      />
    </div>
  );
};

export default Tickets;
