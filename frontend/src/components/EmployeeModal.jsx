import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { useForm as useDeviceForm } from 'react-hook-form';

const DEVICE_TYPES = ['pc', 'lap', 'tab'];
const LOCATIONS = ['factor', 'maadi', 'oroba', 'mansoria', 'banisuef'];

const DeviceModal = ({ isOpen, onClose, onSubmit, device = {} }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useDeviceForm();

  useEffect(() => {
    if (isOpen) {
      reset({
        snNum: device.snNum || '',
        deviceBrand: device.deviceBrand || '',
        hard: device.hard || '',
        ram: device.ram || '',
        processor: device.processor || '',
        deviceType: device.deviceType || '',
        macIp: device.macIp || '',
        deviceUser: device.deviceUser || '',
        devicePass: device.devicePass || '',
        deviceHost: device.deviceHost || '',
        anydeskNum: device.anydeskNum || '',
        anydeskPass: device.anydeskPass || '',
      });
    }
  }, [isOpen, device, reset]);

  const onSubmitForm = (data) => {
    onSubmit(data);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom bg-white dark:bg-gray-900 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full p-6 border border-gray-200 dark:border-gray-800 transition-colors duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Device Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">SN Num</label>
                <input {...register('snNum')} className="form-input" placeholder="Serial Number" />
              </div>
              <div>
                <label className="form-label">Device Brand</label>
                <input {...register('deviceBrand')} className="form-input" placeholder="Brand" />
              </div>
              <div>
                <label className="form-label">Hard</label>
                <input {...register('hard')} className="form-input" placeholder="Hard" />
              </div>
              <div>
                <label className="form-label">RAM</label>
                <input {...register('ram')} className="form-input" placeholder="RAM" />
              </div>
              <div>
                <label className="form-label">Processor</label>
                <input {...register('processor')} className="form-input" placeholder="Processor" />
              </div>
              <div>
                <label className="form-label">Type of Device</label>
                <select {...register('deviceType')} className="form-input">
                  <option value="">Select type</option>
                  {DEVICE_TYPES.map(type => (
                    <option key={type} value={type}>{type.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">MAC/IP</label>
                <input {...register('macIp')} className="form-input" placeholder="MAC or IP" />
              </div>
              <div>
                <label className="form-label">Device User</label>
                <input {...register('deviceUser')} className="form-input" placeholder="Device User" />
              </div>
              <div>
                <label className="form-label">Device Pass</label>
                <input {...register('devicePass')} className="form-input" placeholder="Device Pass" />
              </div>
              <div>
                <label className="form-label">Device Host</label>
                <input {...register('deviceHost')} className="form-input" placeholder="Device Host" />
              </div>
              <div>
                <label className="form-label">Anydesk Num</label>
                <input {...register('anydeskNum')} className="form-input" placeholder="Anydesk Number" />
              </div>
              <div>
                <label className="form-label">Anydesk Pass</label>
                <input {...register('anydeskPass')} className="form-input" placeholder="Anydesk Pass" />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Save Device</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const EmployeeModal = ({
  isOpen,
  onClose,
  onSubmit,
  employee = null,
  isLoading = false,
  positions = [],
}) => {
  const isEdit = !!employee;
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [device, setDevice] = useState(employee?.device || {});

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (isOpen) {
      if (employee) {
        reset({
          employeeId: employee.employeeId || '',
          fullName: employee.fullName || '',
          email: employee.email || '',
          emailPass: employee.emailPass || '',
          phone: employee.phone || '',
          location: employee.location || '',
          position: employee.position || '',
          systemCode: employee.systemCode || '',
          systemPass1: employee.systemPass1 || '',
          systemPass2: employee.systemPass2 || '',
          status: employee.status || 'active',
        });
        setDevice(employee.device || {});
      } else {
        reset({
          employeeId: '',
          fullName: '',
          email: '',
          emailPass: '',
          phone: '',
          location: '',
          position: '',
          systemCode: '',
          systemPass1: '',
          systemPass2: '',
          status: 'active',
        });
        setDevice({});
      }
    }
  }, [isOpen, employee, reset]);

  const onSubmitForm = (data) => {
    if (data.email === '') delete data.email;
    if (data.emailPass === '') delete data.emailPass;
    onSubmit({ ...data, device });
  };

  const handleClose = () => {
    reset();
    setDevice({});
    onClose();
  };

  const handleDeviceSave = (dev) => {
    setDevice(dev);
    setIsDeviceModalOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom bg-white dark:bg-gray-900 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-200 dark:border-gray-800 transition-colors duration-300">
          <div className="bg-white dark:bg-gray-900 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isEdit ? 'Edit Employee' : 'Add New Employee'}
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
              <div>
                <label className="form-label">Employee ID</label>
                <input
                  {...register('employeeId', { required: 'Employee ID is required' })}
                  type="text"
                  className="form-input"
                  placeholder="Enter employee ID"
                  disabled={isEdit}
                />
                {errors.employeeId && (
                  <p className="mt-1 text-sm text-red-600">{errors.employeeId.message}</p>
                )}
              </div>
              <div>
                <label className="form-label">Full Name</label>
                <input
                  {...register('fullName', { required: 'Full name is required' })}
                  type="text"
                  className="form-input"
                  placeholder="Enter full name"
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
                )}
              </div>
              <div>
                <label className="form-label">Email</label>
                <input
                  {...register('email', {
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  type="email"
                  className="form-input"
                  placeholder="Enter email address"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="form-label">Email Password</label>
                <input
                  {...register('emailPass')}
                  type="text"
                  className="form-input"
                  placeholder="Enter email password"
                />
                {errors.emailPass && (
                  <p className="mt-1 text-sm text-red-600">{errors.emailPass.message}</p>
                )}
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input
                  {...register('phone')}
                  type="tel"
                  className="form-input"
                  placeholder="Enter phone number (optional)"
                />
              </div>
              <div>
                <label className="form-label">Device</label>
                <button
                  type="button"
                  className="btn-secondary ml-2"
                  onClick={() => setIsDeviceModalOpen(true)}
                >
                  {Object.keys(device).length ? 'Edit Device' : 'Add Device'}
                </button>
                {Object.keys(device).length > 0 && (
                  <div className="mt-2 text-xs text-gray-600">
                    <span>Device: {device.snNum || 'N/A'} {device.deviceBrand ? `(${device.deviceBrand})` : ''}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="form-label">Location</label>
                <select
                  {...register('location', { required: 'Location is required' })}
                  className="form-input"
                >
                  <option value="">Select location</option>
                  {LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                {errors.location && (
                  <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
                )}
              </div>
              <div>
                <label className="form-label">Position</label>
                <input
                  {...register('position', { required: 'Position is required' })}
                  type="text"
                  className="form-input"
                  placeholder="Enter position"
                />
                {errors.position && (
                  <p className="mt-1 text-sm text-red-600">{errors.position.message}</p>
                )}
              </div>
              {/* System Code and Passes */}
              <div>
                <label className="form-label">System Code</label>
                <input
                  {...register('systemCode')}
                  type="text"
                  className="form-input"
                  placeholder="Enter system code (optional)"
                />
              </div>
              <div>
                <label className="form-label">System Pass 1</label>
                <input
                  {...register('systemPass1')}
                  type="text"
                  className="form-input"
                  placeholder="Enter system pass 1 (optional)"
                />
              </div>
              <div>
                <label className="form-label">System Pass 2</label>
                <input
                  {...register('systemPass2')}
                  type="text"
                  className="form-input"
                  placeholder="Enter system pass 2 (optional)"
                />
              </div>
              <div>
                <label className="form-label">Status</label>
                <select
                  {...register('status', { required: 'Status is required' })}
                  className="form-input"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
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
                    isEdit ? 'Update Employee' : 'Create Employee'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
        {/* Device Modal */}
        <DeviceModal
          isOpen={isDeviceModalOpen}
          onClose={() => setIsDeviceModalOpen(false)}
          onSubmit={handleDeviceSave}
          device={device}
        />
      </div>
    </div>
  );
};

export default EmployeeModal; 