import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Edit, Trash2, UserCheck, UserX, Search, Filter, Plus, Users as UsersIcon, Lock } from 'lucide-react';
import { usersAPI } from '../services/api';
import UserModal from '../components/UserModal';
import ConfirmModal from '../components/ConfirmModal';
import PasswordChangeModal from '../components/PasswordChangeModal';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useSocket } from '../App';
import { managerPermissionsAPI } from '../services/api';

import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const Users = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Check if user is admin, if not redirect to dashboard
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(null); // 'delete', 'activate', 'deactivate'
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const queryClient = useQueryClient();
  const socket = useSocket();

  // Add state for permission management
  const [selectedManager, setSelectedManager] = useState(null);
  const [managerPermissions, setManagerPermissions] = useState([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [newResourceType, setNewResourceType] = useState('page');
  const [newResourceName, setNewResourceName] = useState('');

  // List of available pages for permission assignment (use unique keys)
  const availablePages = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'tickets', label: 'Support Tickets' },
    { key: 'email', label: 'Email' },
    { key: 'users', label: 'Users' },
    { key: 'employees', label: 'Employees' },
    { key: 'custom-data', label: 'Custom Data' },
    { key: 'admin-permission-requests', label: 'System Permission Requests' },
    { key: 'add-system-permission', label: 'Add System Permission' },
    { key: 'settings', label: 'Settings' }
  ];

  // Add state for selected page keys
  const [selectedPages, setSelectedPages] = useState([]);

  useEffect(() => {
    if (!socket) return;
    const refetch = () => queryClient.invalidateQueries(['users']);
    socket.on('userCreated', refetch);
    socket.on('userUpdated', refetch);
    socket.on('userDeleted', refetch);
    return () => {
      socket.off('userCreated', refetch);
      socket.off('userUpdated', refetch);
      socket.off('userDeleted', refetch);
    };
  }, [socket, queryClient]);

  // Fetch users
  const { data: usersData, isLoading, error } = useQuery(
    ['users', currentPage, searchTerm, roleFilter],
    () => usersAPI.getUsers({ 
      page: currentPage, 
      limit: 10,
      search: searchTerm,
      role: roleFilter !== 'all' ? roleFilter : undefined
    }),
    {
      keepPreviousData: true,
    }
  );

  // Create user mutation
  const createUserMutation = useMutation(usersAPI.createUser, {
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setIsUserModalOpen(false);
      setSelectedUser(null);
      toast.success('User created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create user');
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation(
    ({ id, data }) => usersAPI.updateUser(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['users']);
        setIsUserModalOpen(false);
        setSelectedUser(null);
        toast.success('User updated successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update user');
      },
    }
  );

  // Delete user mutation
  const deleteUserMutation = useMutation(usersAPI.deleteUser, {
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setIsConfirmModalOpen(false);
      setSelectedUser(null);
      toast.success('User deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    },
  });

  // Activate user mutation
  const activateUserMutation = useMutation(usersAPI.activateUser, {
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setIsConfirmModalOpen(false);
      setSelectedUser(null);
      toast.success('User activated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to activate user');
    },
  });

  // Deactivate user mutation
  const deactivateUserMutation = useMutation(usersAPI.deactivateUser, {
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setIsConfirmModalOpen(false);
      setSelectedUser(null);
      toast.success('User deactivated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to deactivate user');
    },
  });

  // Change user password mutation
  const changePasswordMutation = useMutation(
    ({ id, newPassword }) => usersAPI.changeUserPassword(id, newPassword),
    {
      onSuccess: () => {
        setIsPasswordModalOpen(false);
        setSelectedUser(null);
        toast.success('Password changed successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to change password');
      },
    }
  );

  // Function to open permission modal for a manager
  const handleManagePermissions = async (manager) => {
    setSelectedManager(manager);
    setShowPermissionModal(true);
    const perms = await managerPermissionsAPI.list(manager.id);
    setManagerPermissions(perms);
    setSelectedPages(perms.filter(p => p.resourceType === 'page').map(p => p.resourceName));
  };

  // Function to assign permission
  const handleAssignPermission = async () => {
    console.log('Assigning pages to manager:', selectedManager?.id, selectedPages);
    // Add new permissions
    for (const pageKey of selectedPages) {
      if (!managerPermissions.some(p => p.resourceType === 'page' && p.resourceName === pageKey)) {
        console.log('Assigning page:', pageKey);
        await managerPermissionsAPI.assign({
          managerId: selectedManager.id,
          resourceType: 'page',
          resourceName: pageKey
        });
      }
    }
    // Remove permissions that are no longer selected
    for (const perm of managerPermissions.filter(p => p.resourceType === 'page')) {
      if (!selectedPages.includes(perm.resourceName)) {
        console.log('Removing page:', perm.resourceName);
        await managerPermissionsAPI.remove(perm.id);
      }
    }
    const perms = await managerPermissionsAPI.list(selectedManager.id);
    setManagerPermissions(perms);
    console.log('Final permissions for manager:', perms.map(p => p.resourceName));
  };

  // Function to remove permission
  const handleRemovePermission = async (id, resourceName) => {
    await managerPermissionsAPI.remove(id);
    const perms = await managerPermissionsAPI.list(selectedManager.id);
    setManagerPermissions(perms);
    setSelectedPages(selectedPages.filter(page => page !== resourceName));
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setActionType('delete');
    setIsConfirmModalOpen(true);
  };

  const handleToggleUserStatus = (user) => {
    setSelectedUser(user);
    setActionType(user.isActive ? 'deactivate' : 'activate');
    setIsConfirmModalOpen(true);
  };

  const handleChangePassword = (user) => {
    setSelectedUser(user);
    setIsPasswordModalOpen(true);
  };

  const handlePasswordSubmit = (newPassword, currentPassword) => {
    changePasswordMutation.mutate({ id: selectedUser.id, newPassword, currentPassword });
  };

  const handleUserSubmit = (data) => {
    if (selectedUser) {
      updateUserMutation.mutate({ id: selectedUser.id, data });
    } else {
      createUserMutation.mutate(data);
    }
  };

  const handleConfirmAction = () => {
    if (!selectedUser) return;

    switch (actionType) {
      case 'delete':
        deleteUserMutation.mutate(selectedUser.id);
        break;
      case 'activate':
        activateUserMutation.mutate(selectedUser.id);
        break;
      case 'deactivate':
        deactivateUserMutation.mutate(selectedUser.id);
        break;
      default:
        break;
    }
  };

  const getStatusBadge = (isActive) => {
    return isActive ? 'badge-success' : 'badge-gray';
  };

  const getRoleBadge = (role) => {
    return role === 'admin' ? 'badge-primary' : 'badge-gray';
  };

  const getConfirmModalProps = () => {
    switch (actionType) {
      case 'delete':
        return {
          title: t('Delete User'),
          message: t('Are you sure you want to delete user', { name: `${selectedUser?.firstName} ${selectedUser?.lastName}` }),
          confirmText: t('Delete'),
          variant: 'danger'
        };
      case 'activate':
        return {
          title: t('Activate User'),
          message: t('Are you sure you want to activate user', { name: `${selectedUser?.firstName} ${selectedUser?.lastName}` }),
          confirmText: t('Activate'),
          variant: 'info'
        };
      case 'deactivate':
        return {
          title: t('Deactivate User'),
          message: t('Are you sure you want to deactivate user', { name: `${selectedUser?.firstName} ${selectedUser?.lastName}` }),
          confirmText: t('Deactivate'),
          variant: 'warning'
        };
      default:
        return {};
    }
  };

  const stats = {
    total: usersData?.total || 0,
    admins: usersData?.users?.filter(u => u.role === 'admin').length || 0,
    active: usersData?.users?.filter(u => u.isActive).length || 0,
    inactive: usersData?.users?.filter(u => !u.isActive).length || 0,
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading users: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="card dark:bg-gray-800 dark:border-gray-700 mb-6">
        <div className="flex pl-4 pr-4 pt-4 items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Users')}</h1>
          <button
            className="hidden lg:inline-flex items-center gap-2 px-6 py-2 rounded-lg shadow bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            onClick={handleCreateUser}
          >
            <Plus className="text-lg" />
            {t('Add User')}
          </button>
        </div>
        {/* Responsive Users Table */}
        <div className="hidden lg:block card dark:bg-gray-800 dark:border-gray-700 mb-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {usersData?.users?.map((user) => (
                <tr key={user.id} className={`hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors ${user.isActive ? '' : 'opacity-70'}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow">
                          <span className="text-white text-sm font-bold">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-white">
                          @{user.username}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{user.role}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">{user.department || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{user.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="text-blue-600 hover:text-blue-900 p-1 transition-transform hover:scale-110"
                      title={t('Edit user')}
                    >
                      <UsersIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleChangePassword(user)}
                      className="text-orange-600 hover:text-orange-900 p-1 transition-transform hover:scale-110"
                      title={t('Change password')}
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleUserStatus(user)}
                      className={user.isActive ? 'text-yellow-600 hover:text-yellow-900 p-1 transition-transform hover:scale-110' : 'text-green-600 hover:text-green-900 p-1 transition-transform hover:scale-110'}
                      title={user.isActive ? 'Deactivate user' : 'Activate user'}
                    >
                      {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="text-red-600 hover:text-red-900 p-1 transition-transform hover:scale-110"
                      title={t('Delete user')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {/* {user.role === 'manager' && (
                      <button onClick={() => handleManagePermissions(user)} className="text-purple-600 hover:text-purple-900 p-1 transition-transform hover:scale-110" title={t('Manage Permissions')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0-3 3V6a3 3 0 1 0 3-3 3 3 0 0 1 3 3v12a3 3 0 1 1-6 0V9a3 3 0 0 1 3-3 3 3 0 0 1 3 3"/></svg>
                      </button>
                    )} */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile & Tablet Cards */}
        <div className="lg:hidden flex flex-col gap-4 mt-4">
          {usersData?.users?.map((user) => (
            <div key={user.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow">
                  <span className="text-white text-lg font-bold">{user.firstName?.[0]}{user.lastName?.[0]}</span>
                </div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">{user.firstName} {user.lastName}</div>
                  <div className="text-xs text-gray-500 dark:text-white">@{user.username}</div>
                </div>
              </div>
              <div className="text-sm text-gray-900 dark:text-white break-all">{user.email}</div>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{user.role}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{user.isActive ? 'Active' : 'Inactive'}</span>
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{user.department || '-'}</span>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleEditUser(user)} className="flex-1 text-blue-600 hover:text-blue-900 p-2 rounded bg-blue-50 dark:bg-blue-900/20" title={t('Edit user')}><UsersIcon className="w-5 h-5 mx-auto" /></button>
                <button onClick={() => handleChangePassword(user)} className="flex-1 text-orange-600 hover:text-orange-900 p-2 rounded bg-orange-50 dark:bg-orange-900/20" title={t('Change password')}><Lock className="w-5 h-5 mx-auto" /></button>
                <button onClick={() => handleToggleUserStatus(user)} className={`flex-1 p-2 rounded ${user.isActive ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 hover:text-yellow-900' : 'text-green-600 bg-green-50 dark:bg-green-900/20 hover:text-green-900'}`} title={user.isActive ? 'Deactivate user' : 'Activate user'}>{user.isActive ? <UserX className="w-5 h-5 mx-auto" /> : <UserCheck className="w-5 h-5 mx-auto" />}</button>
                <button onClick={() => handleDeleteUser(user)} className="flex-1 text-red-600 hover:text-red-900 p-2 rounded bg-red-50 dark:bg-red-900/20" title={t('Delete user')}><Trash2 className="w-5 h-5 mx-auto" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    {/* Pagination Controls */}
    {usersData?.totalPages > 1 && (
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="text-sm text-gray-700">
          {t('Showing page')} {currentPage} {t('of')} {usersData.totalPages}
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
            onClick={() => setCurrentPage(prev => Math.min(usersData.totalPages, prev + 1))}
            disabled={currentPage === usersData.totalPages}
            className="btn-secondary disabled:opacity-50 rounded-full px-4"
          >
            {t('Next')}
          </button>
        </div>
      </div>
    )}
      {/* Floating Action Button for Add User (mobile) */}
              <button
        className="lg:hidden fixed bottom-6 right-6 z-30 flex items-center gap-2 px-6 py-4 rounded-full shadow-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-lg transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 transform hover:scale-105"
        onClick={handleCreateUser}
      >
        <Plus className="text-xl" />
                  </button>
      {/* User Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={handleUserSubmit}
        user={selectedUser}
        isLoading={createUserMutation.isLoading || updateUserMutation.isLoading}
      />
      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setSelectedUser(null);
          setActionType(null);
        }}
        onConfirm={handleConfirmAction}
        isLoading={
          deleteUserMutation.isLoading || 
          activateUserMutation.isLoading || 
          deactivateUserMutation.isLoading
        }
        {...getConfirmModalProps()}
      />

      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={handlePasswordSubmit}
        user={selectedUser}
        isLoading={changePasswordMutation.isLoading}
      />
      {/* Permission Management Modal */}
      {showPermissionModal && (
        <div className="modal">
                          <h3>{t('Manage Permissions for')} {selectedManager.firstName} {selectedManager.lastName}</h3>
          <div>
            {availablePages.map(page => (
              <label key={page.key} style={{ display: 'block', marginBottom: 4 }}>
                <input
                  type="checkbox"
                  checked={selectedPages.includes(page.key)}
                  onChange={e => {
                    if (e.target.checked) {
                      setSelectedPages([...selectedPages, page.key]);
                    } else {
                      setSelectedPages(selectedPages.filter(p => p !== page.key));
                    }
                  }}
                /> {page.label}
              </label>
            ))}
          </div>
          <button onClick={handleAssignPermission}>Save Permissions</button>
          <button onClick={() => setShowPermissionModal(false)}>Close</button>
          <ul>
            {managerPermissions.filter(p => p.resourceType === 'page').map(perm => {
              const page = availablePages.find(p => p.key === perm.resourceName);
              return (
                <li key={perm.id}>{page ? page.label : perm.resourceName} <button onClick={() => handleRemovePermission(perm.id, perm.resourceName)}>{t('Remove')}</button></li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Users;
