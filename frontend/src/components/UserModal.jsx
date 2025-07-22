import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Eye, EyeOff } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

const UserModal = ({ isOpen, onClose, onSubmit, user = null, isLoading = false }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isEdit = !!user;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    getValues
  } = useForm();

  useEffect(() => {
    if (isOpen) {
      if (user) {
        reset({
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          department: user.department,
          phone: user.phone,
        });
      } else {
        reset({
          username: '',
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          role: 'user',
          department: '',
          phone: '',
        });
      }
    }
  }, [isOpen, user, reset]);

  const onSubmitForm = (data) => {
    // Combine username and domain for email
    const email = (data.emailUsername || '').trim() + '@3mas.com';
    onSubmit({ ...data, email });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40 dark:bg-opacity-60">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {isEdit ? 'Edit User' : 'Add New User'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label text-gray-700 dark:text-gray-200">First Name</label>
              <input
                {...register('firstName', { required: 'First name is required' })}
                type="text"
                className="form-input dark:bg-gray-900 dark:text-white dark:border-gray-700"
                placeholder="Enter first name"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="form-label text-gray-700 dark:text-gray-200">Last Name</label>
              <input
                {...register('lastName', { required: 'Last name is required' })}
                type="text"
                className="form-input dark:bg-gray-900 dark:text-white dark:border-gray-700"
                placeholder="Enter last name"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="form-label text-gray-700 dark:text-gray-200">Username</label>
            <input
              {...register('username', { 
                required: 'Username is required',
                minLength: { value: 3, message: 'Username must be at least 3 characters' }
              })}
              type="text"
              className="form-input dark:bg-gray-900 dark:text-white dark:border-gray-700"
              placeholder="Enter username"
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="form-label text-gray-700 dark:text-gray-200">Email</label>
            <div className="flex items-center gap-0.5">
              <input
                {...register('emailUsername', {
                  required: 'Username is required',
                  pattern: {
                    value: /^[a-zA-Z0-9._-]+$/,
                    message: 'Invalid username',
                  },
                })}
                type="text"
                className="form-input rounded-r-none dark:bg-gray-900 dark:text-white dark:border-gray-700"
                placeholder="Enter username"
                autoComplete="username"
                style={{width: '60%'}}
              />
              <input
                type="text"
                value="@3mas.com"
                readOnly
                tabIndex={-1}
                className="form-input rounded-l-none bg-gray-100 border-l-0 text-gray-500 cursor-default w-36 dark:bg-gray-800 dark:text-gray-400"
                style={{width: '40%'}}
              />
            </div>
            {errors.emailUsername && (
              <p className="mt-1 text-sm text-red-600">{errors.emailUsername.message}</p>
            )}
          </div>

          {!isEdit && (
            <div>
              <label className="form-label text-gray-700 dark:text-gray-200">Password</label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="form-input pr-10 dark:bg-gray-900 dark:text-white dark:border-gray-700"
                  placeholder="Enter password"
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
          )}

          <div>
            <label className="form-label text-gray-700 dark:text-gray-200">Role</label>
            <select
              {...register('role', { required: 'Role is required' })}
              className="form-input dark:bg-gray-900 dark:text-white dark:border-gray-700"
            >
              <option value="user">User</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
            )}
          </div>

          <div>
            <label className="form-label text-gray-700 dark:text-gray-200">Department</label>
            <input
              {...register('department')}
              type="text"
              className="form-input dark:bg-gray-900 dark:text-white dark:border-gray-700"
              placeholder="Enter department (optional)"
            />
          </div>

          <div>
            <label className="form-label text-gray-700 dark:text-gray-200">Phone</label>
            <input
              {...register('phone')}
              type="tel"
              className="form-input dark:bg-gray-900 dark:text-white dark:border-gray-700"
              placeholder="Enter phone number (optional)"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {isEdit ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEdit ? 'Update User' : 'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
