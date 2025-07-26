import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { X, Upload, Trash2, File as FileIcon } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

const TicketModal = ({ isOpen, onClose, onSubmit, ticket = null, isLoading = false }) => {
  const [attachments, setAttachments] = useState([]);
  const isEdit = !!ticket;
  const firstInputRef = useRef(null);

  const {
    register,
    getValues,
    reset,
    setFocus,
    formState: { errors },
    handleSubmit,
  } = useForm({
    defaultValues: {
      title: ticket ? ticket.title : '',
      description: ticket ? ticket.description : '',
      priority: ticket ? ticket.priority : 'medium',
      category: ticket ? ticket.category : '',
      dueDate: ticket ? (ticket.dueDate ? new Date(ticket.dueDate).toISOString().split('T')[0] : '') : '',
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (ticket) {
        reset({
          title: ticket.title,
          description: ticket.description,
          priority: ticket.priority,
          category: ticket.category,
          dueDate: ticket.dueDate ? new Date(ticket.dueDate).toISOString().split('T')[0] : '',
        });
        setAttachments(ticket.attachments || []);
      } else {
        reset({
          title: '',
          description: '',
          priority: 'medium',
          category: '',
          dueDate: '',
        });
        setAttachments([]);
      }
      setTimeout(() => {
        setFocus('title');
      }, 0);
    }
  }, [isOpen, ticket, reset, setFocus]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmitForm = (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      formData.append(key, data[key] ?? '');
    });
    attachments.forEach(file => {
      formData.append('attachments', file);
    });
    onSubmit(formData);
    reset();
    setAttachments([]);
  };

  const handleClose = () => {
    reset();
    setAttachments([]);
    onClose();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40 dark:bg-opacity-60  overflow-y-auto ">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-800 w-full max-w-2xl transition-colors duration-300  overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 id="ticket-modal-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isEdit ? 'Edit Ticket' : 'Create New Ticket'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Close modal"
          >
            <X className="w-6 h-6 " />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div>
            <label className="form-label text-gray-700 dark:text-gray-200">Title</label>
            <input
              {...register('title', { required: 'Title is required' })}
              type="text"
              className="form-input dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 transition-colors duration-300"
              placeholder="Enter ticket title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>
          <div>
            <label className="form-label text-gray-700 dark:text-gray-200">Description</label>
            <textarea
              {...register('description', { required: 'Description is required' })}
              rows={4}
              className="form-input dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 transition-colors duration-300"
              placeholder="Describe the issue in detail"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label text-gray-700 dark:text-gray-200">Category</label>
              <select
                {...register('category')}
                className="form-input dark:bg-gray-900 dark:text-white dark:border-gray-700"
              >
                <option value="">Select category</option>
                <option value="Hardware">Hardware</option>
                <option value="Software">Software</option>
                <option value="Network">Network</option>
                <option value="Account">Account Access</option>
                <option value="Email">Email</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label text-gray-700 dark:text-gray-200">Due Date (Optional)</label>
            <input
              {...register('dueDate')}
              type="date"
              className="form-input dark:bg-gray-900 dark:text-white dark:border-gray-700"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="form-label text-gray-700 dark:text-gray-200">Attachments (Optional)</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                    <span>Upload files</span>
                    <input
                      type="file"
                      multiple
                      className="sr-only"
                      onChange={handleFileChange}
                      accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, PDF, DOC up to 10MB each
                </p>
              </div>
            </div>
          </div>

          {/* Attachment List */}
          {attachments.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">Attached Files</h4>
              <div className="space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border border-gray-200 rounded-md ">
                    <div className="flex items-center">
                      <FileIcon className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {file.originalName || file.name}
                      </span>
                      {file.size && (
                        <span className="text-xs text-gray-500 ml-2">
                          ({formatFileSize(file.size)})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary dark:bg-gray-700 dark:text-gray-200"
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
                isEdit ? 'Update Ticket' : 'Create Ticket'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TicketModal;
