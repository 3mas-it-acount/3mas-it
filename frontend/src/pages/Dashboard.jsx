import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketsAPI } from '../services/api';
import { usersAPI } from '../services/api';
import { employeesAPI } from '../services/api';
import { io } from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Circle, Plus, Trash2, Edit2, Save, Users } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { sharedTasksAPI } from '../services/api';
import { notificationAPI } from '../services/api';
import { useSocket } from '../App';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  // console.log('Rendering Dashboard for user:', user);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('activities'); // 'todo' or 'activities'
  const [stats, setStats] = useState({
    openTickets: 0,
    resolvedTickets: 0,
    totalUsers: 0,
    totalEmployees: 0,
    onlineUsers: 0,
  });
  const [onlineUserList, setOnlineUserList] = useState([]);
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);
  const [recentTickets, setRecentTickets] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentEmployees, setRecentEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState('medium');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedTodoForSharing, setSelectedTodoForSharing] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsersToShare, setSelectedUsersToShare] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [todosLoading, setTodosLoading] = useState(false);
  const [sharedTasks, setSharedTasks] = useState([]);
  const [showFrequency, setShowFrequency] = useState('all'); // 'all', 'daily', 'once'
  const [newSharedTaskText, setNewSharedTaskText] = useState('');
  const [newSharedTaskFrequency, setNewSharedTaskFrequency] = useState('once');
  const [sharedTasksLoading, setSharedTasksLoading] = useState(false);
  const [sharedTaskUsers, setSharedTaskUsers] = useState([]);
  const socketRef = useRef(null);
  const [notification, setNotification] = useState(null);
  const [notificationInput, setNotificationInput] = useState('');
  const [notificationLoading, setNotificationLoading] = useState(false);
  const socket = useSocket();
  const [detailsTask, setDetailsTask] = useState(null);

  // State for TE login form
  const [tePhone, setTePhone] = useState('');
  const [tePassword, setTePassword] = useState('');
  const [showCopyMsg, setShowCopyMsg] = useState(false);

  // Auto-fill script for TE login
  const autofillScript = `(() => {
    const phone = '${tePhone}';
    const password = '${tePassword}';
    function fill() {
      const phoneInput = document.querySelector('input[type="text"], input[name*="phone"], input[name*="msisdn"]');
      const passInput = document.querySelector('input[type="password"]');
      if (phoneInput) phoneInput.value = phone;
      if (passInput) passInput.value = password;
      if (phoneInput) phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
      if (passInput) passInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    setTimeout(fill, 1000);
  })();`;

  const handleTELink = () => {
    window.open('https://my.te.eg/echannel/#/login', '_blank');
    setShowCopyMsg(true);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(autofillScript);
    toast.success(t('Auto-fill script copied! Now paste it in the browser console of the new tab.'));
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch tickets
      const ticketRes = await ticketsAPI.getTickets({ page: 1, limit: 100 });
      const tickets = ticketRes.tickets || [];
      setStats(s => ({
        ...s,
        openTickets: tickets.filter(t => t.status === 'open').length,
        resolvedTickets: tickets.filter(t => t.status === 'resolved').length,
      }));
      setRecentTickets(tickets.slice(0, 5));
      // Fetch users (only for admin users)
      try {
        if (user?.role === 'admin') {
          const userRes = await usersAPI.getUsers({ page: 1, limit: 1000 });
          setStats(s => ({
            ...s,
            totalUsers: userRes.totalUsers || 0,
            onlineUsers: (userRes.users || []).filter(u => u.isActive).length
          }));
          setRecentUsers(userRes.users || []);
        } else {
          // For non-admins, fetch minimal user list for sharing
          // This part is removed as per the edit hint.
        }
      } catch (err) {
        console.log('User fetching failed (likely not admin):', err.message);
        // Set default values for non-admin users
        setStats(s => ({
          ...s,
          totalUsers: 0,
          onlineUsers: 0
        }));
        setRecentUsers([]);
        setAvailableUsers([]);
      }
      // Fetch employees
      try {
        const empRes = await employeesAPI.getEmployees({ params: { page: 1, limit: 5 } });
        setStats(s => ({ ...s, totalEmployees: empRes.data?.totalEmployees || 0 }));
        setRecentEmployees(empRes.data?.employees || []);
      } catch (err) {
        console.log('Employee fetching failed (likely not admin):', err.message);
        // Set default values for non-admin users
        setStats(s => ({ ...s, totalEmployees: 0 }));
        setRecentEmployees([]);
      }
      // Fetch initial online user count from backend
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/online-users`);
        const data = await res.json();
        setStats(s => ({ ...s, onlineUsers: data.online }));
        // Fetch initial online user list
        const res2 = await fetch(`${apiUrl}/api/online-user-list`);
        const data2 = await res2.json();
        setOnlineUserList(data2.users || []);
      } catch (err) {
        console.log('Online users fetching failed:', err.message);
        // Keep existing online user count from users API if available
      }
    } catch (err) {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Socket.io real-time online user count
    const token = localStorage.getItem('token');
    if (token) {
      const socket = io('http://localhost:3000', {
        auth: { token },
        transports: ['websocket'],
      });
      socketRef.current = socket;
      socket.on('onlineUserCount', (count) => {
        setStats(s => ({ ...s, onlineUsers: count }));
      });
      socket.on('onlineUserList', (users) => {
        setOnlineUserList(users || []);
      });
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user?.id]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadSharedTasks();
      usersAPI.getUsers({ page: 1, limit: 1000 }).then(res => {
        setSharedTaskUsers(res.users || []);
        // console.log('Shared task users:', res.users);
      });
    }
  }, [user?.id]);

  useEffect(() => {
    if (!socket) return;
    socket.on('sharedTaskCreated', loadSharedTasks);
    socket.on('sharedTaskUpdated', loadSharedTasks);
    socket.on('sharedTaskDeleted', loadSharedTasks);
    socket.on('notificationUpdated', loadNotification);
    // Real-time statistics
    socket.on('ticketCreated', fetchStats);
    socket.on('ticketUpdated', fetchStats);
    socket.on('ticketDeleted', fetchStats);
    socket.on('userCreated', fetchStats);
    socket.on('userUpdated', fetchStats);
    socket.on('userDeleted', fetchStats);
    socket.on('employeeCreated', fetchStats);
    socket.on('employeeUpdated', fetchStats);
    socket.on('employeeDeleted', fetchStats);
    return () => {
      socket.off('sharedTaskCreated', loadSharedTasks);
      socket.off('sharedTaskUpdated', loadSharedTasks);
      socket.off('sharedTaskDeleted', loadSharedTasks);
      socket.off('notificationUpdated', loadNotification);
      socket.off('ticketCreated', fetchStats);
      socket.off('ticketUpdated', fetchStats);
      socket.off('ticketDeleted', fetchStats);
      socket.off('userCreated', fetchStats);
      socket.off('userUpdated', fetchStats);
      socket.off('userDeleted', fetchStats);
      socket.off('employeeCreated', fetchStats);
      socket.off('employeeUpdated', fetchStats);
      socket.off('employeeDeleted', fetchStats);
    };
  }, [socket]);

  // Fetch notification on mount
  useEffect(() => {
    loadNotification();
  }, []);

  const loadNotification = async () => {
    setNotificationLoading(true);
    try {
      const notif = await notificationAPI.getNotification();
      setNotification(notif);
      setNotificationInput(notif?.text || '');
    } catch (e) {
      setNotification(null);
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleSaveNotification = async () => {
    setNotificationLoading(true);
    try {
      await notificationAPI.setNotification(notificationInput);
      loadNotification();
      toast.success(t('Notification updated'));
    } catch (e) {
      toast.error(t('Failed to update notification'));
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleClearNotification = async () => {
    setNotificationInput('');
    setNotificationLoading(true);
    try {
      await notificationAPI.setNotification('');
      loadNotification();
      toast.success(t('Notification cleared'));
    } catch (e) {
      toast.error(t('Failed to clear notification'));
    } finally {
      setNotificationLoading(false);
    }
  };

  // Load todos on component mount
  useEffect(() => {
    // loadTodos(); // This function is no longer needed
  }, []);

  // Todo functions
  // const addTodo = async () => { // This function is no longer needed
  //   if (newTodoText.trim()) {
  //     try {
  //       const newTodo = await todosAPI.createTodo({
  //         text: newTodoText.trim(),
  //         priority: newTodoPriority
  //       });
  //       setTodoItems([...todoItems, newTodo]);
  //       setNewTodoText('');
  //       setNewTodoPriority('medium'); // Reset priority after adding
  //       toast.success(t('Task added successfully'));
  //     } catch (error) {
  //       console.error('Error adding todo:', error);
  //       toast.error(t('Failed to add task'));
  //     }
  //   }
  // };

  // const toggleTodo = async (id) => { // This function is no longer needed
  //   try {
  //     const todo = todoItems.find(t => t.id === id);
  //     if (!todo) return;
      
  //     const updatedTodo = await todosAPI.updateTodo(id, {
  //       completed: !todo.completed
  //     });
      
  //     setTodoItems(todoItems.map(todo => 
  //       todo.id === id ? updatedTodo : todo
  //     ));
  //     toast.success(t('Task updated successfully'));
  //   } catch (error) {
  //     console.error('Error updating todo:', error);
  //     toast.error(t('Failed to update task'));
  //   }
  // };

  // const deleteTodo = async (id) => { // This function is no longer needed
  //   try {
  //     await todosAPI.deleteTodo(id);
  //     setTodoItems(todoItems.filter(todo => todo.id !== id));
  //     toast.success(t('Task deleted successfully'));
  //   } catch (error) {
  //     console.error('Error deleting todo:', error);
  //     toast.error(t('Failed to delete task'));
  //   }
  // };

  // const saveTodos = () => { // This function is no longer needed
  //   // This function is no longer needed since todos are saved automatically
  //   setHasUnsavedChanges(false);
  //   toast.success(t('All changes saved'));
  // };

  // const loadTodos = async () => { // This function is no longer needed
  //   try {
  //     setTodosLoading(true);
  //     const todos = await todosAPI.getTodos();
  //     setTodoItems(todos);
  //   } catch (error) {
  //     console.error('Error loading todos:', error);
  //     toast.error(t('Failed to load tasks'));
  //   } finally {
  //     setTodosLoading(false);
  //   }
  // };

  // const shareTodo = (todo) => { // This function is no longer needed
  //   console.log('Share button clicked for todo:', todo);
  //   console.log('Current availableUsers:', availableUsers);
  //   setSelectedTodoForSharing(todo);
  //   setSelectedUsersToShare([]);
  //   setIsShareModalOpen(true);
  //   console.log('Modal should be open now, isShareModalOpen will be:', true);
  // };

  // const handleShareSubmit = async () => { // This function is no longer needed
  //   console.log('Share submit clicked');
  //   console.log('selectedTodoForSharing:', selectedTodoForSharing);
  //   console.log('selectedUsersToShare:', selectedUsersToShare);
    
  //   if (selectedTodoForSharing && selectedUsersToShare.length > 0) {
  //     try {
  //       const userIds = selectedUsersToShare.map(user => user.id);
  //       await todosAPI.shareTodo(selectedTodoForSharing.id, userIds);
        
  //       // Update the local todo to show it's shared
  //       setTodoItems(todoItems.map(todo => 
  //         todo.id === selectedTodoForSharing.id 
  //           ? { ...todo, sharedWith: [...(todo.sharedWith || []), ...selectedUsersToShare] }
  //           : todo
  //       ));
        
  //       setIsShareModalOpen(false);
  //       setSelectedTodoForSharing(null);
  //       setSelectedUsersToShare([]);
  //       toast.success(t('Task shared successfully'));
  //       console.log('Share completed successfully');
  //     } catch (error) {
  //       console.error('Error sharing todo:', error);
  //       toast.error(t('Failed to share task'));
  //     }
  //   } else {
  //     console.log('Share submit failed - missing todo or no users selected');
  //   }
  // };

  // const getPriorityColor = (priority) => { // This function is no longer needed
  //   switch (priority) {
  //     case 'high': return 'text-red-600';
  //     case 'medium': return 'text-yellow-600';
  //     case 'low': return 'text-green-600';
  //     default: return 'text-gray-600';
  //   }
  // };

  // const getPriorityBg = (priority) => { // This function is no longer needed
  //   switch (priority) {
  //     case 'high': return 'bg-red-100';
  //     case 'medium': return 'bg-yellow-100';
  //     case 'low': return 'bg-green-100';
  //     default: return 'bg-gray-100';
  //   }
  // };

  // Share Modal Component
  // const ShareTodoModal = ({ isOpen, onClose, todo, users, selectedUsers, onUserSelect, onSubmit }) => {
  //   console.log('ShareTodoModal render - isOpen:', isOpen, 'todo:', todo, 'users:', users);
    
  //   if (!isOpen || !todo) {
  //     console.log('Modal not rendering - isOpen:', isOpen, 'todo:', todo);
  //     return null;
  //   }

  //   return (
  //     <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
  //       <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
  //         <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
  //         <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
  //         <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
  //           <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
  //             <div className="flex items-center justify-between mb-4">
  //               <h3 className="text-lg font-medium text-gray-900">{t('Share Task')}</h3>
  //               <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none text-2xl">&times;</button>
  //             </div>
              
  //             <div className="mb-4">
  //               <p className="text-sm text-gray-600 mb-2">{t('Task')}:</p>
  //               <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded">{todo.text}</p>
  //             </div>

  //             <div className="mb-4">
  //               <label className="block text-sm font-medium text-gray-700 mb-2">
  //                 {t('Select users to share with')}:
  //               </label>
  //               {users.length === 0 ? (
  //                 <div className="text-center py-6 text-gray-500">
  //                   <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
  //                   <p className="text-sm">{t('No users available for sharing')}</p>
  //                   <p className="text-xs text-gray-400 mt-1">{t('Only admin users can share tasks with other users')}</p>
  //                 </div>
  //               ) : (
  //                 <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md">
  //                   {users.map(user => (
  //                     <label key={user.id} className="flex items-center p-2 hover:bg-gray-50">
  //                       <input
  //                         type="checkbox"
  //                         checked={selectedUsers.some(u => u.id === user.id)}
  //                         onChange={(e) => {
  //                           if (e.target.checked) {
  //                             onUserSelect([...selectedUsers, user]);
  //                           } else {
  //                             onUserSelect(selectedUsers.filter(u => u.id !== user.id));
  //                           }
  //                         }}
  //                         className="mr-2"
  //                       />
  //                       <span className="text-sm text-gray-700">
  //                         {user.firstName} {user.lastName} ({user.email})
  //                       </span>
  //                     </label>
  //                   ))}
  //                 </div>
  //               )}
  //             </div>

  //             <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end space-x-2">
  //               <button onClick={onClose} className="btn-secondary">
  //                 {t('Cancel')}
  //               </button>
  //               <button 
  //                 onClick={onSubmit}
  //                 disabled={selectedUsers.length === 0 || users.length === 0}
  //                 className="btn-primary disabled:opacity-50"
  //               >
  //                 {t('Share')}
  //               </button>
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // };

  // Combine recent activities
  const recentActivities = [
    ...recentTickets.map(t => ({
      type: 'ticket',
      id: t.id,
      title: t.title,
      user: t.creator ? `${t.creator.firstName} ${t.creator.lastName}` : '',
      time: t.createdAt,
      status: t.status,
    })),
    ...recentUsers.map(u => ({
      type: 'user',
      id: u.id,
      title: `${u.firstName} ${u.lastName}`,
      user: u.email,
      time: u.createdAt,
    })),
    ...recentEmployees.map(e => ({
      type: 'employee',
      id: e.id,
      title: e.fullName,
      user: e.email,
      time: e.createdAt,
    })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

  // Simple modal for online users
  const OnlineUsersModal = ({ isOpen, onClose, users }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{t('Online Users')}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none text-2xl">&times;</button>
              </div>
              <ul className="space-y-2">
                {users.length === 0 && <li className="text-gray-400 text-sm">{t('No users online.')}</li>}
                {users.map(u => (
                  <li key={u.id} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded px-2 py-1">
                    <span className="font-bold text-blue-700">{u.firstName} {u.lastName}</span>
                    <span className="text-gray-400">({u.email})</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end">
              <button onClick={onClose} className="btn-secondary">{t('Close')}</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const loadSharedTasks = async () => {
    setSharedTasksLoading(true);
    try {
      const tasks = await sharedTasksAPI.getSharedTasks();
      setSharedTasks(tasks);
    } catch (e) {
      toast.error(t('Failed to load shared tasks'));
    } finally {
      setSharedTasksLoading(false);
    }
  };

  const handleAddSharedTask = async () => {
    if (!newSharedTaskText.trim()) return;
    try {
      await sharedTasksAPI.createSharedTask({
        text: newSharedTaskText.trim(),
        frequency: newSharedTaskFrequency
      });
      setNewSharedTaskText('');
      setNewSharedTaskFrequency('once');
      loadSharedTasks();
      toast.success(t('Shared task added'));
    } catch (e) {
      toast.error(t('Failed to add shared task'));
    }
  };

  const handleCompleteSharedTask = async (task) => {
    try {
      await sharedTasksAPI.updateSharedTask(task.id, { completed: !task.completed });
      loadSharedTasks();
    } catch (e) {
      toast.error(t('Failed to update shared task'));
    }
  };

  const handleDeleteSharedTask = async (task) => {
    if (!window.confirm(t('Are you sure you want to delete this shared task?'))) return;
    try {
      await sharedTasksAPI.deleteSharedTask(task.id);
      loadSharedTasks();
      toast.success(t('Shared task deleted'));
    } catch (e) {
      toast.error(t('Failed to delete shared task'));
    }
  };

  const [editTask, setEditTask] = useState(null);
  const [editText, setEditText] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editFrequency, setEditFrequency] = useState('once');

  const openEditModal = (task) => {
    setEditTask(task);
    setEditText(task.text);
    setEditNotes(task.notes || '');
    setEditFrequency(task.frequency);
  };
  const closeEditModal = () => {
    setEditTask(null);
    setEditText('');
    setEditNotes('');
    setEditFrequency('once');
  };
  const handleEditSave = async () => {
    if (!editTask) return;
    try {
      await sharedTasksAPI.updateSharedTask(editTask.id, {
        text: editText,
        notes: editNotes,
        frequency: editFrequency
      });
      closeEditModal();
      loadSharedTasks();
      toast.success(t('Task updated successfully'));
    } catch (e) {
      toast.error(t('Failed to update task'));
    }
  };

  // Filtered shared tasks
  const filteredSharedTasks = sharedTasks.filter(task =>
    showFrequency === 'all' ? true : task.frequency === showFrequency
  );

  return (
    <div className="space-y-8 min-h-screen from-blue-50 via-white to-blue-100 p-2 sm:p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
        <div className="card p-5 sm:p-6 flex flex-col items-center justify-center text-center shadow-xl border border-gray-100 rounded-xl bg-white hover:shadow-2xl transition">
          <span className="text-3xl font-extrabold text-yellow-600 bg-yellow-50 rounded-full w-16 h-16 flex items-center justify-center mb-2 shadow-inner">{stats.openTickets}</span>
          <span className="text-gray-600 mt-1 font-medium">{t('Open Tickets')}</span>
        </div>
        <div className="card p-5 sm:p-6 flex flex-col items-center justify-center text-center shadow-xl border border-gray-100 rounded-xl bg-white hover:shadow-2xl transition">
          <span className="text-3xl font-extrabold text-green-700 bg-green-50 rounded-full w-16 h-16 flex items-center justify-center mb-2 shadow-inner">{stats.resolvedTickets}</span>
          <span className="text-gray-600 mt-1 font-medium">{t('Resolved Tickets')}</span>
        </div>
        <div className="card p-5 sm:p-6 flex flex-col items-center justify-center text-center shadow-xl border border-gray-100 rounded-xl bg-white hover:shadow-2xl transition">
          <span className="text-3xl font-extrabold text-indigo-700 bg-indigo-50 rounded-full w-16 h-16 flex items-center justify-center mb-2 shadow-inner">{stats.totalUsers}</span>
          <span className="text-gray-600 mt-1 font-medium">{t('Total Users')}</span>
        </div>
        <div className="card p-5 sm:p-6 flex flex-col items-center justify-center text-center shadow-xl border border-gray-100 rounded-xl bg-white hover:shadow-2xl transition">
          <span className="text-3xl font-extrabold text-green-600 bg-green-50 rounded-full w-16 h-16 flex items-center justify-center mb-2 shadow-inner">{stats.onlineUsers}</span>
          <span className="text-gray-600 mt-1 font-medium">{t('User Online')}</span>
          <button
            className="btn-primary mt-3 text-xs px-3 py-1 shadow hover:scale-105 transition-transform"
            onClick={() => setIsOnlineModalOpen(true)}
            disabled={onlineUserList.length === 0}
          >
            {t('View Online Users')}
          </button>
        </div>
        <div className="card p-5 sm:p-6 flex flex-col items-center justify-center text-center shadow-xl border border-gray-100 rounded-xl bg-white hover:shadow-2xl transition">
          <span className="text-3xl font-extrabold text-pink-700 bg-pink-50 rounded-full w-16 h-16 flex items-center justify-center mb-2 shadow-inner">{stats.totalEmployees}</span>
          <span className="text-gray-600 mt-1 font-medium">{t('Total Employees')}</span>
        </div>
      </div>

      {/* Notification Bar */}
      {user?.role === 'admin' && (
        <div className="card shadow-xl border border-red-500 mb-4 bg-red-50 rounded-xl">
          <div className="flex items-center justify-between p-3">
            <div className="flex-1">
              <input
                type="text"
                value={notificationInput}
                onChange={e => setNotificationInput(e.target.value)}
                placeholder={t('Add a notification for all users...')}
                className="form-input w-full border-red-300 bg-red-100 text-red-900 placeholder-red-400 rounded-lg"
                disabled={notificationLoading}
              />
            </div>
            <div className="flex gap-2 ml-2">
              <button
                className="btn-primary btn-sm rounded-lg"
                onClick={handleSaveNotification}
                disabled={notificationLoading || !notificationInput.trim()}
              >{t('Save')}</button>
              <button
                className="btn-secondary btn-sm rounded-lg"
                onClick={handleClearNotification}
                disabled={notificationLoading || !notification?.text}
              >{t('Clear')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Tasks (Admin) */}
      {user?.role === 'admin' && (
        <div className="card shadow-xl border border-gray-100 mb-8 rounded-xl bg-white">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold">{t('Shared Tasks')}</h2>
            <div>
              <button
                className={`btn-sm rounded-lg ${showFrequency === 'all' ? 'btn-primary' : 'btn-secondary'} mr-2`}
                onClick={() => setShowFrequency('all')}
              >{t('All')}</button>
              <button
                className={`btn-sm rounded-lg ${showFrequency === 'daily' ? 'btn-primary' : 'btn-secondary'} mr-2`}
                onClick={() => setShowFrequency('daily')}
              >{t('Daily')}</button>
              <button
                className={`btn-sm rounded-lg ${showFrequency === 'once' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setShowFrequency('once')}
              >{t('Once')}</button>
            </div>
          </div>
          <div className="p-4">
            <div className="mb-4 flex gap-2 items-end">
              <input
                type="text"
                value={newSharedTaskText}
                onChange={e => setNewSharedTaskText(e.target.value)}
                placeholder={t('Add a shared task...')}
                className="form-input flex-1 rounded-lg"
              />
              <select
                value={newSharedTaskFrequency}
                onChange={e => setNewSharedTaskFrequency(e.target.value)}
                className="form-input w-32 rounded-lg"
              >
                <option value="once">{t('Once')}</option>
                <option value="daily">{t('Daily')}</option>
              </select>
              <button className="btn-primary rounded-lg" onClick={handleAddSharedTask}>
                <Plus className="w-4 h-4" /> {t('Add')}
              </button>
            </div>
            {sharedTasksLoading ? (
              <div className="text-center py-8 text-gray-500">{t('Loading shared tasks...')}</div>
            ) : filteredSharedTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">{t('No shared tasks.')}</div>
            ) : (
              <ul className="space-y-2">
                {filteredSharedTasks.map(task => (
                  <li key={task.id} className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow transition">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleCompleteSharedTask(task)}
                        className="flex-shrink-0"
                        title={t('Mark as completed')}
                      >
                        {Number(task.completed) === 1 ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                      <span className={`flex-1 text-sm ${Number(task.completed) === 1 ? 'line-through text-gray-500' : 'text-gray-700'}`}>{task.text}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                        {t(task.frequency.charAt(0).toUpperCase() + task.frequency.slice(1))}
                      </span>
                      <button
                        onClick={() => setDetailsTask(task)}
                        className="ml-2 text-gray-500 hover:text-blue-700"
                        title={t('Task Details')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </button>
                      <button
                        onClick={() => openEditModal(task)}
                        className="ml-2 text-blue-500 hover:text-blue-700"
                        title={t('Edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSharedTask(task)}
                        className="ml-1 text-red-500 hover:text-red-700"
                        title={t('Delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {/* فقط النص والملاحظات في القائمة */}
                    {task.notes && (
                      <div className="text-xs text-gray-600 bg-gray-100 rounded p-2 mt-1 whitespace-pre-line">
                        <strong>{t('Notes')}:</strong> {task.notes}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      {/* Tabbed Interface */}
      <div className="card shadow-xl border border-gray-100 rounded-xl bg-white">
        {/* Tab Headers */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('activities')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors duration-150
                ${activeTab === 'activities'
                  ? ''
                  : 'border-transparent text-gray-500 hover:text-blue-700 hover:border-blue-300'}
              `}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2h2m2-4h4a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2V6a2 2 0 012-2z" />
              </svg>
              {t('Recent Activities')}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'activities' && (
            <div>
              {loading ? (
                <div className="text-gray-400">{t('Loading...')}</div>
              ) : (
                <ul role="list" className="divide-y divide-gray-200">
                  {recentActivities.length === 0 && (
                    <li className="py-3 text-gray-400">{t('No recent activities.')}</li>
                  )}
                  {recentActivities.map((a, idx) => (
                    <li key={a.type + '-' + a.id + '-' + idx} className="py-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {a.type === 'ticket' && <span className="inline-block bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs font-bold">{t('Ticket')}</span>}
                        {a.type === 'user' && <span className="inline-block bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 text-xs font-bold">{t('User')}</span>}
                        {a.type === 'employee' && <span className="inline-block bg-pink-100 text-pink-700 rounded-full px-2 py-0.5 text-xs font-bold">{t('Employee')}</span>}
                        <span className="text-gray-700 font-medium">{a.title}</span>
                        {a.type === 'ticket' && (
                          <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${a.status === 'resolved' ? 'bg-green-100 text-green-700' : a.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{t(a.status)}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{a.time ? new Date(a.time).toLocaleString() : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
      <OnlineUsersModal isOpen={isOnlineModalOpen} onClose={() => setIsOnlineModalOpen(false)} users={onlineUserList} />
      {/* Edit Task Modal */}
      {editTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={closeEditModal}
              aria-label={t('Close')}
            >
              &times;
            </button>
            <h3 className="text-lg font-bold mb-4">{t('Edit Task')}</h3>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">{t('Task Text')}</label>
              <input
                type="text"
                className="form-input w-full"
                value={editText}
                onChange={e => setEditText(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">{t('Notes')}</label>
              <textarea
                className="form-input w-full"
                rows={3}
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">{t('Frequency')}</label>
              <select
                className="form-input w-full"
                value={editFrequency}
                onChange={e => setEditFrequency(e.target.value)}
              >
                <option value="once">Once</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn-secondary" onClick={closeEditModal}>{t('Cancel')}</button>
              <button className="btn-primary" onClick={handleEditSave}>{t('Save')}</button>
            </div>
          </div>
        </div>
      )}
      {/* نافذة التفاصيل */}
      {detailsTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setDetailsTask(null)}
              aria-label={t('Close')}
            >
              &times;
            </button>
            <h3 className="text-lg font-bold mb-4">{t('Task Details')}</h3>
            <div className="mb-2"><strong>{t('Task Text')}:</strong> {detailsTask.text}</div>
            <div className="mb-2"><strong>{t('Added')}:</strong> {detailsTask.createdAt ? new Date(detailsTask.createdAt).toLocaleString() : '-'}</div>
            <div className="mb-2"><strong>{t('Created by')}:</strong> {detailsTask.creator ? `${detailsTask.creator.firstName} ${detailsTask.creator.lastName}` : (detailsTask.createdBy || '-')}</div>
            <div className="mb-2"><strong>{t('Completed at')}:</strong> {detailsTask.completedAt ? new Date(detailsTask.completedAt).toLocaleString() : '-'}</div>
            <div className="mb-2"><strong>{t('Completed by')}:</strong> {detailsTask.completer ? `${detailsTask.completer.firstName} ${detailsTask.completer.lastName}` : (detailsTask.completedBy || '-')}</div>
            <div className="mb-2"><strong>{t('Notes')}:</strong> {detailsTask.notes || '-'}</div>
            <div className="mb-2">
              <strong>{t('Completion History')}:</strong>
              <ul className="list-disc ml-4">
                {(() => {
                  try {
                    const history = JSON.parse(detailsTask.completionHistory || '[]');
                    if (Array.isArray(history) && history.length > 0) {
                      return history.map((h, i) => {
                        // ابحث عن اسم المستخدم في قائمة المستخدمين المرتبطين بالمهام أو sharedTaskUsers
                        let userName = '-';
                        if (h.userId) {
                          let user = null;
                          if (detailsTask.completer && detailsTask.completer.id === h.userId) user = detailsTask.completer;
                          else if (detailsTask.creator && detailsTask.creator.id === h.userId) user = detailsTask.creator;
                          else if (Array.isArray(sharedTaskUsers)) user = sharedTaskUsers.find(u => u.id === h.userId);
                          if (user) userName = `${user.firstName} ${user.lastName}`;
                          else userName = `(User: ${h.userId})`;
                        }
                        return (
                          <li key={i}>{h.date ? new Date(h.date).toLocaleString() : ''} {userName}</li>
                        );
                      });
                    }
                  } catch {}
                  return <li>{t('No completion history')}</li>;
                })()}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

