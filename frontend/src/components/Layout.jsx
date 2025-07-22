import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Ticket,
  Users,
  Building2,
  Mail,
  Database,
  User,
  LogOut,
  Menu,
  X,
  ShieldPlus,
  ShieldCheck,
  Wifi,
  ExternalLink,
  FileText,
  Package,
  Moon,
  Sun
} from 'lucide-react';
import { managerPermissionsAPI } from '../services/api';
import ThreeMasLogo from './ThreeMasLogo.jsx';
import { useTheme } from './ThemeProvider';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();
  const [allowedPages, setAllowedPages] = useState([]);
  const { theme, setTheme } = useTheme();
  const [miniSidebar, setMiniSidebar] = useState(false);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (user?.role === 'manager') {
        const perms = await managerPermissionsAPI.list(user.id);
        const pageKeys = perms.filter(p => p.resourceType === 'page').map(p => p.resourceName);
        setAllowedPages(pageKeys);
        console.log('Manager allowedPages:', pageKeys);
      }
    };
    fetchPermissions();
  }, [user]);

  const navigation = [
    { key: 'dashboard', name: t('Dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { key: 'tickets', name: t('Support Tickets'), href: '/tickets', icon: Ticket },
    { key: 'email', name: t('Email'), href: '/email', icon: Mail },
    { key: 'users', name: t('Users'), href: '/users', icon: Users },
    { key: 'employees', name: t('Employees'), href: '/employees', icon: Building2 },
    { key: 'custom-data', name: t('Custom Data'), href: '/custom-data', icon: Database },
    { key: 'internet-packages', name: t('Internet Packages'), href: '/internet-packages', icon: Wifi },
    { key: 'anydesk', name: t('Anydesk Remote'), href: '/anydesk', icon: ExternalLink },
    { key: 'errands', name: t('Errands'), href: '/errands', icon: FileText },
    { key: 'purchases', name: t('Purchases'), href: '/purchases', icon: Package },
    { key: 'admin-permission-requests', name: t('System Permission Requests'), href: '/admin-permission-requests', icon: ShieldCheck },
    { key: 'add-system-permission', name: t('Add System Permission'), href: '/add-system-permission', icon: ShieldPlus },
  ];

  let filteredNavigation;
  if (user?.role === 'user') {
    filteredNavigation = navigation.filter(item => ['tickets', 'email', 'add-system-permission'].includes(item.key));
  } else if (user?.role === 'manager') {
    filteredNavigation = navigation.filter(item => allowedPages.includes(item.key));
  } else {
    filteredNavigation = navigation;
  }

  const isActive = (href) => location.pathname === href;

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950 transition-colors duration-300">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden backdrop-blur-sm bg-black/30 transition-opacity duration-300 opacity-100"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 
        h-screen overflow-y-auto
        ${miniSidebar ? 'w-16' : 'w-64'}
        bg-gradient-to-b from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 shadow-2xl transform rounded-r-xl transition-all duration-300
        ${sidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}
        lg:translate-x-0 lg:opacity-100 lg:static lg:inset-0
      `}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <ThreeMasLogo className="mt-4" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMiniSidebar(!miniSidebar)}
              className="hidden lg:inline-flex p-2 rounded-md text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-white"
              title={miniSidebar ? t('Expand sidebar') : t('Collapse sidebar')}
            >
              {miniSidebar ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-6 space-y-2">
          {filteredNavigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-2 py-2 rounded-lg font-medium transition-all duration-150
                  ${active ? 'bg-blue-100 dark:bg-blue-800 dark:text-blue-100 shadow-md scale-[1.03]' : 'text-gray-700 dark:text-blue-400 hover:bg-blue-50 hover:text-blue-900'}
                  focus:outline-none focus:ring-2 focus:ring-blue-200`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className={`flex items-center justify-center rounded-md p-1.5 transition-all duration-150
                  ${active ? 'bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-100' : 'bg-gray-100 dark:bg-blue-800 text-gray-400 dark:text-gray-100 group-hover:bg-blue-100 group-hover:text-blue-700'}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className={`truncate transition-all duration-200 
                  ${miniSidebar ? 'hidden' : 'inline'}
                  sm:inline 
                  max-[400px]:hidden`}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User menu */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 mt-4">
          <div className="space-y-1">
            <Link
              to="/profile"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-500 hover:text-blue-700 transition-all duration-150 ${miniSidebar ? 'justify-center' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <User className="h-4 w-4" />
              <span className={`${miniSidebar ? 'hidden' : 'inline'} sm:inline max-[400px]:hidden`}>{t('Profile')}</span>
            </Link>
            <button
              onClick={logout}
              className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-100 transition-all duration-150 ${miniSidebar ? 'justify-center' : ''}`}
            >
              <LogOut className="h-4 w-4" />
              <span className={`${miniSidebar ? 'hidden' : 'inline'} sm:inline max-[400px]:hidden`}>{t('Sign out')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navigation */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Remove Close (X) icon to go to dashboard */}
            <div className="flex-1 lg:ml-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white capitalize">
                {t(location.pathname.split('/')[1] || 'Dashboard')}
              </h2>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                title={theme === 'dark' ? t('Switch to light mode') : t('Switch to dark mode')}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>
              {/* Remove Profile icon and link from top bar */}
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-300 capitalize">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-950 p-6 transition-colors duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
