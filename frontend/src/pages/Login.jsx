import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import ThreeMasLogo from '../components/ThreeMasLogo';

const Login = () => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Use the full email address
      const result = await login({ ...data, email: data.email });
      if (result.success) {
        toast.success(t('Login successful!'));
        if (result.user && result.user.role === 'user') {
          navigate('/tickets');
        } else {
          navigate('/dashboard');
        }
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(t('Login failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-700 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center mb-">
            <ThreeMasLogo width={400} height={170} />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t('IT Support')}
          </h2>
          
        </div>

        <div className="bg-white dark:bg-gray-600 py-8 px-6 shadow rounded-lg">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="email" className="form-label">
                {t('Email address')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 " />
                </div>
                <input
                  {...register('email', {
                    required: t('Email is required'),
                    pattern: {
                      value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
                      message: t('Invalid email address'),
                    },
                  })}
                  type="email"
                  className="form-input pl-10"
                  placeholder={t('Enter your email address')}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                {t('Password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('password', {
                    required: t('Password is required'),
                    minLength: {
                      value: 6,
                      message: t('Password must be at least 6 characters'),
                    },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="form-input pl-10 pr-10"
                  placeholder={t('Enter your password')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary flex justify-center items-center"
              >
                                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {t('Signing in...')}
                    </>
                  ) : (
                    t('Sign in')
                  )}
              </button>
            </div>
          </form>

          {/* <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Demo Credentials:</h3>
            <p className="text-sm text-blue-700">
              <strong>Admin:</strong> admin@company.com / admin123456
            </p>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default Login;
