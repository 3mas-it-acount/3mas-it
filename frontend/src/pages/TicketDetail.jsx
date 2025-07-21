import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { ticketsAPI } from '../services/api';
import LoadingOverlay from '../components/LoadingOverlay';
import InlineImage from '../components/InlineImage';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';

const TicketDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [previewImage, setPreviewImage] = useState(null);
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(['ticket', id], () =>
    ticketsAPI.getTicket(id)
  );
  const [status, setStatus] = useState('');
  useEffect(() => {
    if (data) setStatus(data.status);
  }, [data]);
  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    await ticketsAPI.updateTicket(id, { status: newStatus });
    refetch();
  };

  // Chat state
  const { data: comments = [], refetch: refetchComments, isLoading: loadingComments } = useQuery(
    ['ticketComments', id],
    () => ticketsAPI.getTicketComments(id),
    { enabled: !!id }
  );
  const [comment, setComment] = useState('');
  const [commentFiles, setCommentFiles] = useState([]);
  const fileInputRef = useRef();
  const addCommentMutation = useMutation(
    (formData) => ticketsAPI.addComment(id, formData),
    {
      onSuccess: () => {
        setComment('');
        setCommentFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        refetchComments();
      },
    }
  );
  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!comment.trim() && commentFiles.length === 0) return;
    const formData = new FormData();
    formData.append('content', comment);
    commentFiles.forEach(file => formData.append('attachments', file));
    addCommentMutation.mutate(formData);
  };

  const [allAttachments, setAllAttachments] = useState([]);
  useEffect(() => {
    if (id) {
      ticketsAPI.getAllTicketAttachments(id).then(setAllAttachments);
    }
  }, [id, comments]); // refetch when comments change

  // Tab state
  const [activeTab, setActiveTab] = useState('details');

  // Report state (admin only)
  const isAdmin = user?.role === 'admin';
  const { data: reportData, refetch: refetchReport } = useQuery(
    ['ticketReport', id],
    () => ticketsAPI.getTicketReport(id),
    { enabled: isAdmin }
  );
  const [reportEdit, setReportEdit] = useState('');
  useEffect(() => {
    if (reportData && typeof reportData.report === 'string') setReportEdit(reportData.report);
  }, [reportData]);
  const updateReportMutation = useMutation(
    (newReport) => ticketsAPI.updateTicketReport(id, newReport),
    { onSuccess: refetchReport }
  );
  const handleReportSave = () => {
    updateReportMutation.mutate(reportEdit);
  };

  if (isLoading) return <LoadingOverlay />;
  if (error) return <div className="p-8 text-center text-red-600">Error loading ticket.</div>;

  const ticket = data;

  // Helper to check if file is an image
  const isImage = (filename) => /\.(jpg|jpeg|png|gif)$/i.test(filename);

  return (
    <>
      <div className="max-w-2xl mx-auto card p-8 mt-2 space-y-6 relative">
        {/* Close icon */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl focus:outline-none"
          onClick={() => navigate('/tickets')}
          title="Close"
        >
          &times;
        </button>
        {/* Tabs */}
        <div className="flex gap-4 border-b mb-4">
          <button
            className={`py-2 px-4 -mb-px border-b-2 ${activeTab === 'details' ? 'border-blue-600 text-blue-700 font-bold' : 'border-transparent text-gray-500'}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button
            className={`py-2 px-4 -mb-px border-b-2 ${activeTab === 'chat' ? 'border-blue-600 text-blue-700 font-bold' : 'border-transparent text-gray-500'}`}
            onClick={() => setActiveTab('chat')}
          >
            Chat
          </button>
          {isAdmin && (
            <button
              className={`py-2 px-4 -mb-px border-b-2 ${activeTab === 'report' ? 'border-blue-600 text-blue-700 font-bold' : 'border-transparent text-gray-500'}`}
              onClick={() => setActiveTab('report')}
            >
              Report
            </button>
          )}
        </div>
        {/* Tab content */}
        {activeTab === 'details' && (
          <div>
            {/* Details content (existing details section) */}
            <div className="border-b pb-4 mb-4">
              <h1 className="text-3xl font-extrabold text-blue-800 mb-2 flex items-center gap-2">
                <span className="inline-block bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-lg font-bold">#{ticket.id}</span>
                <span>{ticket.title}</span>
              </h1>
              <div className="text-gray-600 mb-2">{ticket.description}</div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span><strong>Status:</strong> {user?.role === 'admin' ? (
                  <select value={status} onChange={handleStatusChange} className="form-input inline-block w-auto ml-2">
                    <option value="open">{t('Open')}</option>
                    <option value="in_progress">{t('In Progress')}</option>
                    <option value="pending">{t('Pending')}</option>
                    <option value="resolved">{t('Resolved')}</option>
                    <option value="closed">{t('Closed')}</option>
                  </select>
                ) : ticket.status}</span>
                <span><strong>Category:</strong> {ticket.category}</span>
                <span><strong>Created By:</strong> <span className="font-semibold text-gray-700">{ticket.creator?.firstName} {ticket.creator?.lastName}</span></span>
                <span><strong>Created At:</strong> {new Date(ticket.createdAt).toLocaleString()}</span>
              </div>
            </div>
            {/* Attachments section (existing) */}
            {allAttachments && allAttachments.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded shadow flex flex-col gap-2">
                                  <span className="font-semibold text-base text-yellow-800 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l7.071-7.071a4 4 0 00-5.657-5.657l-7.071 7.07a6 6 0 108.485 8.486L19 13" /></svg>
                  {t('All Attachments')}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allAttachments.map(att => (
                    <div key={att.id} className="flex items-center gap-2 bg-white rounded p-2 shadow-sm border border-gray-100">
                      {isImage(att.originalName) ? (
                        <button
                          type="button"
                          className="text-blue-600 underline hover:text-blue-800 font-medium"
                          onClick={() => setPreviewImage(`/api/tickets/attachment/${att.id}`)}
                        >
                          <svg className="w-5 h-5 inline-block mr-1 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v10H4V5zm2 2a1 1 0 100 2 1 1 0 000-2zm0 4a1 1 0 100 2 1 1 0 000-2zm8-2a1 1 0 100 2 1 1 0 000-2zm0 4a1 1 0 100 2 1 1 0 000-2z" /></svg>
                          {att.originalName}
                        </button>
                      ) : (
                        <a
                          href={`/api/tickets/attachment/${att.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline hover:text-blue-800 font-medium"
                        >
                          <svg className="w-5 h-5 inline-block mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M8 2a2 2 0 00-2 2v12a2 2 0 002 2h4a2 2 0 002-2V4a2 2 0 00-2-2H8zm0 2h4v12H8V4z" /></svg>
                          {att.originalName}
                        </a>
                      )}
                      <span className="text-xs text-gray-400">{att.createdAt ? new Date(att.createdAt).toLocaleString() : ''}{att.uploader ? ` | by ${att.uploader.firstName} ${att.uploader.lastName}` : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'chat' && (
          <div className="mt-4">
            {/* Chat/Comments Section (existing) */}
            <h2 className="text-xl font-bold mb-4 border-b pb-2 text-blue-700 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2h2m2-4h4a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2V6a2 2 0 012-2z" /></svg>
              {t('Chat')}
            </h2>
            {loadingComments ? (
              <div>{t('Loading chat...')}</div>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto bg-gray-50 p-4 rounded border border-gray-100">
                {/* Chat messages without attachments */}
                {comments.length === 0 ? (
                  <div className="text-gray-400">{t('No messages yet.')}</div>
                ) : (
                  comments.map((c) => (
                    (c.content && c.content.trim() !== '') ? (
                      <div key={c.id} className="flex items-start gap-3 mb-2">
                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center font-bold text-blue-700 text-lg shadow-sm">
                          {c.author ? (c.author.firstName[0] + (c.author.lastName ? c.author.lastName[0] : '')) : 'U'}
                        </div>
                        <div className="flex-1">
                          <span className="font-semibold text-sm">
                            {c.author ? `${c.author.firstName} ${c.author.lastName}` : 'User'}
                            {c.author?.role === 'admin' && <span className="ml-2 text-xs text-blue-600">[Admin]</span>}
                          </span>
                          <div className="text-gray-800 text-sm bg-white rounded px-3 py-2 mt-1 shadow-sm border border-gray-100">
                            {c.content}
                          </div>
                          {/* Attachments for this comment */}
                          {c.attachments && c.attachments.length > 0 && (
                            <div className="flex flex-col gap-1 mt-2">
                              {c.attachments.map(att => (
                                <div key={att.id} className="flex items-center gap-2 bg-gray-50 rounded p-1 border border-gray-100">
                                  {isImage(att.originalName) ? (
                                    <button
                                      type="button"
                                      className="text-blue-600 underline hover:text-blue-800 font-medium"
                                      onClick={() => setPreviewImage(`/api/tickets/attachment/${att.id}`)}
                                    >
                                      <svg className="w-4 h-4 inline-block mr-1 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v10H4V5zm2 2a1 1 0 100 2 1 1 0 000-2zm0 4a1 1 0 100 2 1 1 0 000-2zm8-2a1 1 0 100 2 1 1 0 000-2zm0 4a1 1 0 100 2 1 1 0 000-2z" /></svg>
                                      {att.originalName}
                                    </button>
                                  ) : (
                                    <a
                                      href={`/api/tickets/attachment/${att.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 underline hover:text-blue-800 font-medium"
                                    >
                                      <svg className="w-4 h-4 inline-block mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M8 2a2 2 0 00-2 2v12a2 2 0 002 2h4a2 2 0 002-2V4a2 2 0 00-2-2H8zm0 2h4v12H8V4z" /></svg>
                                      {att.originalName}
                                    </a>
                                  )}
                                  <span className="text-xs text-gray-400">{att.createdAt ? new Date(att.createdAt).toLocaleString() : ''}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <span className="text-xs text-gray-400 mt-1 block">{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ) : null
                  ))
                )}
              </div>
            )}
            {isAuthenticated && (
              <form onSubmit={handleCommentSubmit} className="flex flex-col mt-2 gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="form-input flex-1"
                    placeholder={t('Type a message...')}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={addCommentMutation.isLoading}
                  />
                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    className="form-input w-48"
                    onChange={e => setCommentFiles(Array.from(e.target.files))}
                    disabled={addCommentMutation.isLoading}
                  />
                  <button type="submit" className="btn-primary" disabled={addCommentMutation.isLoading || (!comment.trim() && commentFiles.length === 0)}>
                    {t('Send')}
                  </button>
                </div>
                {commentFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {commentFiles.map((file, idx) => (
                      <span key={idx} className="bg-gray-200 px-2 py-1 rounded text-xs">{file.name}</span>
                    ))}
                  </div>
                )}
              </form>
            )}
          </div>
        )}
        {activeTab === 'report' && isAdmin && (
          <div className="mt-4">
            <h2 className="text-xl font-bold mb-4 border-b pb-2 text-blue-700 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h4" /></svg>
              {t('Ticket Report')}
            </h2>
            <textarea
              className="form-input w-full min-h-[120px]"
              value={reportEdit}
              onChange={e => setReportEdit(e.target.value)}
              placeholder={t('Enter report details...')}
              disabled={updateReportMutation.isLoading}
            />
            <div className="flex gap-2 mt-2">
              <button
                className="btn-primary"
                onClick={handleReportSave}
                disabled={updateReportMutation.isLoading}
              >
                {t('Save Report')}
              </button>
                              {updateReportMutation.isLoading && <span className="text-gray-500">{t('Saving...')}</span>}
            </div>
          </div>
        )}
      </div>
      {/* Image Preview Modal (move this outside tab conditions) */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-white rounded shadow-lg p-4 max-w-lg w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-black text-2xl"
              onClick={() => setPreviewImage(null)}
              aria-label={t('Close preview')}
            >
              &times;
            </button>
            <InlineImage src={previewImage} alt={t('Attachment preview')} className="max-w-full max-h-[70vh] mx-auto" />
          </div>
        </div>
      )}
    </>
  );
};

export default TicketDetail;
