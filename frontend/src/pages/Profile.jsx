import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { User, Mail, Shield, Globe, Calendar, Building, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [language, setLanguage] = useState(i18n.language || 'en');
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('Not available');
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-8 relative">
      {/* Close (X) icon to go to dashboard */}
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className={`absolute top-0 ${language === 'ar' ? 'left-0 ml-4' : 'right-0 mr-4'} mt-4 p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-red-100 hover:scale-110 transition-all duration-200 group z-10`}
        title={t('Close and go to dashboard')}
        aria-label={t('Close and go to dashboard')}
      >
        <X className="w-7 h-7 text-red-500 group-hover:text-red-700 transition-colors duration-200" />
        <span className="sr-only">{t('Close and go to dashboard')}</span>
      </button>
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-white text-2xl font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </span>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 capitalize">
            {user?.role} • {t('Member since')} {formatDate(user?.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Personal Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Personal Information')}</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <User className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('Full Name')}</p>
                <p className="font-medium text-gray-900 dark:text-white">{user?.firstName} {user?.lastName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Mail className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('Email Address')}</p>
                <p className="font-medium text-gray-900 dark:text-white">{user?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Shield className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('Role')}</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">{user?.role}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Building className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('Department')}</p>
                <p className="font-medium text-gray-900 dark:text-white">{user?.department || t('Not specified')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('Account Created')}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatDate(user?.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Language Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Language Settings')}</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('Interface Language')}
              </label>
              <select
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                value={language}
                onChange={handleLanguageChange}
              >
                <option value="en">🇺🇸 English</option>
                <option value="ar">🇸🇦 العربية</option>
              </select>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>{t('Note:')}</strong> {t('Language changes will be applied immediately and saved for future sessions.')}
              </p>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Available Languages')}</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-lg">🇺🇸</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">English</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Default language</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-lg">🇸🇦</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">العربية</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Right-to-left support</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('Account Overview')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('Account Status')}</p>
                <p className="font-semibold text-gray-900 dark:text-white">{t('Active')}</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('Security Level')}</p>
                <p className="font-semibold text-gray-900 dark:text-white">{t('Standard')}</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('Current Language')}</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {language === 'en' ? 'English' : 'العربية'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
