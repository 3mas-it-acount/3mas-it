import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { emailAPI, fetchEmailContent } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import InlineImage from '../components/InlineImage';
import parse, { domToReact } from 'html-react-parser';
import { useTheme } from '../components/ThemeProvider';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../App';

// Helper to rewrite cid: URLs in HTML to use InlineImage component
function renderEmailHtmlWithInlineImages(html, accountId, seqno) {
  // Replace <img src="cid:..."> with a placeholder span
  // We'll use dangerouslySetInnerHTML for the rest, and then replace the placeholders with InlineImage components
  const placeholder = '___INLINE_IMAGE___';
  let imgIndex = 0;
  const imgCids = [];
  const htmlWithPlaceholders = html.replace(/<img[^>]+src=["']cid:([^"']+)["'][^>]*>/g, (match, cid) => {
    imgCids.push(cid);
    return `<span data-inline-image="${imgIndex++}"></span>`;
  });
  // Use a wrapper div to parse the HTML
  const wrapper = document.createElement('div');
  wrapper.innerHTML = htmlWithPlaceholders;
  // Replace placeholders with InlineImage components
  imgCids.forEach((cid, i) => {
    const span = wrapper.querySelector(`span[data-inline-image="${i}"]`);
    if (span) {
      const src = `/api/email/${accountId}/emails/${seqno}/attachment/${encodeURIComponent(cid)}`;
      const imgElem = document.createElement('span');
      // We'll render the React component in place of this span
      imgElem.setAttribute('data-react-inline-image', src);
      span.replaceWith(imgElem);
    }
  });
  // Now, convert the HTML back to a string
  let finalHtml = wrapper.innerHTML;
  // We'll use a custom component to render the InlineImage components in place of the spans
  return finalHtml;
}

// Helper to strip <html>, <head>, <body> tags from email HTML
function stripHtmlDocumentTags(html) {
  return html
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<html[^>]*>/gi, '')
    .replace(/<\/html>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<body[^>]*>/gi, '')
    .replace(/<\/body>/gi, '');
}

// Helper to strip Microsoft Office namespace tags that cause React warnings
function stripOfficeTags(html) {
  return html
    .replace(/<\/?o:p>/g, '') // Remove <o:p> and </o:p> tags
    .replace(/<\/?o:?[^>]*>/g, ''); // Remove any other Office namespace tags
}

const Email = () => {
  const { t } = useTranslation();
  
  const FOLDERS = [
    { key: 'INBOX', label: t('Inbox') },
    { key: 'INBOX.Sent', label: t('Sent') },
    { key: 'Sent', label: t('Sent (alt)') },
    { key: 'Sent Mail', label: t('Sent Mail') },
    { key: 'Sent Items', label: t('Sent Items') },
    { key: 'Drafts', label: t('Drafts') },
    { key: 'Junk', label: t('Junk') },
    { key: 'Trash', label: t('Trash') },
  ];
  const { theme } = useTheme();
  const [form, setForm] = useState({
    email: '',
    emailType: 'imap',
    host: '',
    port: '',
    username: '',
    password: '',
    secure: true,
    smtpHost: '',
    smtpPort: '',
    smtpUsername: '',
    smtpPassword: '',
    smtpSecure: true,
    signature: ''
  });
  const [showAdd, setShowAdd] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [fullEmail, setFullEmail] = useState(null);
  const [isFullEmailLoading, setIsFullEmailLoading] = useState(false);
  const [fullEmailError, setFullEmailError] = useState(null);
  const [search, setSearch] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [composeForm, setComposeForm] = useState({ to: '', cc: '', bcc: '', subject: '', message: '' });
  const [composeAttachments, setComposeAttachments] = useState([]);
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [signature, setSignature] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const EMAILS_PER_PAGE = 20;
  const [showEdit, setShowEdit] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [statusMap, setStatusMap] = useState({}); // { accountId: 'connected' | 'error' | 'syncing' }
  const [folders, setFolders] = useState(FOLDERS);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [foldersError, setFoldersError] = useState(null);
  const socket = useSocket();

  // Fetch email configs
  const { data: emailConfigs = [], isLoading: isLoadingAccounts } = useQuery('emailConfigs', () => emailAPI.getEmailConfigs().then(res => res.data));

  // Fetch emails for selected account and folder
  const { data: emails = [], isLoading: isEmailsLoading, refetch: refetchEmails } = useQuery(
    ['emails', selectedAccount?.id, selectedFolder],
    () => selectedAccount ? emailAPI.getEmails(selectedAccount.id, { folder: selectedFolder }).then(res => res.data) : [],
    { enabled: !!selectedAccount }
  );

  const mutation = useMutation(emailAPI.createEmailConfig, {
    onSuccess: (data) => {
      toast.success(t('Email configuration added!'));
      setShowAdd(false);
      setForm({ email: '', emailType: 'imap', host: '', port: '', username: '', password: '', secure: true, smtpHost: '', smtpPort: '', smtpUsername: '', smtpPassword: '', smtpSecure: true, signature: '' });
      queryClient.invalidateQueries(['emailConfigs']);
      setSelectedAccount(data); // Show the new account
      setSelectedFolder('INBOX');
      setSelectedEmail(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('Failed to add email config'));
    },
  });

  const sendEmailMutation = useMutation(
    (emailData) => emailAPI.sendEmail(selectedAccount.id, emailData),
    {
      onSuccess: () => {
        toast.success(t('Email sent successfully!'));
        setShowCompose(false);
        setComposeForm({ to: '', cc: '', bcc: '', subject: '', message: '' });
        // Refresh emails to show the sent email
        refetchEmails();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('Failed to send email'));
      },
    }
  );

  // Add markEmailRead mutation
  const markEmailReadMutation = useMutation(
    ({ seqno, read }) => emailAPI.markEmailRead(selectedAccount.id, seqno, read, selectedFolder),
    {
      onSuccess: (_, { seqno, read }) => {
        // Update local email list state
        queryClient.invalidateQueries(['emails', selectedAccount?.id, selectedFolder]);
        // Optionally update selectedEmail
        setSelectedEmail(sel => sel ? { ...sel, seen: read } : sel);
        toast.success(read ? t('Marked as read') : t('Marked as unread'));
      },
      onError: () => toast.error(t('Failed to update read status')),
    }
  );

  // Add moveEmail mutation
  const moveEmailMutation = useMutation(
    ({ seqno, targetFolder }) => emailAPI.moveEmail(selectedAccount.id, seqno, targetFolder, selectedFolder),
    {
      onSuccess: () => {
        toast.success(t('Email moved to folder'));
        setSelectedEmail(null);
        queryClient.invalidateQueries(['emails', selectedAccount?.id, selectedFolder]);
      },
      onError: () => toast.error(t('Failed to move email')),
    }
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Special handling for email field
    if (name === 'email') {
      handleEmailChange(e);
      return;
    }
    
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  // Compose handlers
  const handleComposeChange = (e) => {
    const { name, value } = e.target;
    setComposeForm(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (composeErrors[name]) {
      setComposeErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  const handleComposeFileChange = (e) => {
    const files = Array.from(e.target.files);
    setComposeAttachments(prev => [...prev, ...files]);
  };
  const removeComposeAttachment = (index) => {
    setComposeAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Provider autofill logic
  const PROVIDERS = {
    gmail: {
      label: 'Gmail',
      imap: { host: 'imap.gmail.com', port: 993, secure: true },
      smtp: { host: 'smtp.gmail.com', port: 587, secure: false },
      help: 'For Gmail, you must use an App Password (not your regular password). See Google Account > Security > App Passwords.'
    },
    outlook: {
      label: 'Outlook/Hotmail',
      imap: { host: 'outlook.office365.com', port: 993, secure: true },
      smtp: { host: 'smtp-mail.outlook.com', port: 587, secure: true },
      help: 'For Outlook, you may need to use an App Password if 2FA is enabled.'
    },
    yahoo: {
      label: 'Yahoo Mail',
      imap: { host: 'imap.mail.yahoo.com', port: 993, secure: true },
      smtp: { host: 'smtp.mail.yahoo.com', port: 587, secure: true },
      help: 'For Yahoo, you need to generate an App Password in your Yahoo Account Security settings.'
    },
    icloud: {
      label: 'iCloud Mail',
      imap: { host: 'imap.mail.me.com', port: 993, secure: true },
      smtp: { host: 'smtp.mail.me.com', port: 587, secure: true },
      help: 'For iCloud, you need to enable 2FA and generate an App Password in your Apple ID settings.'
    },
    protonmail: {
      label: 'ProtonMail',
      imap: { host: '127.0.0.1', port: 1143, secure: false },
      smtp: { host: '127.0.0.1', port: 1025, secure: false },
      help: 'ProtonMail requires the ProtonMail Bridge application to be running. Install it from protonmail.com/bridge'
    },
    custom: {
      label: 'Custom IMAP/SMTP',
      imap: { host: '', port: '', secure: true },
      smtp: { host: '', port: '', secure: true },
      help: 'Enter your own IMAP and SMTP server settings.'
    }
  };
  const [provider, setProvider] = useState('custom');

  const handleProviderChange = (e) => {
    const val = e.target.value;
    setProvider(val);
    const p = PROVIDERS[val];
    
    // Safety check - if provider doesn't exist, use custom
    if (!p) {
      console.warn(`Provider '${val}' not found, using custom`);
      setProvider('custom');
      return;
    }
    
    // Auto-fill email and username based on provider
    let autoEmail = form.email;
    let autoUsername = form.username;
    
    if (val === 'gmail' && form.email && form.email.includes('@gmail.com')) {
      autoUsername = form.email;
    } else if (val === 'outlook' && form.email && (form.email.includes('@outlook.com') || form.email.includes('@hotmail.com'))) {
      autoUsername = form.email;
    } else if (val === 'yahoo' && form.email && form.email.includes('@yahoo.com')) {
      autoUsername = form.email;
    } else if (val === 'icloud' && form.email && form.email.includes('@icloud.com')) {
      autoUsername = form.email;
    }
    
    setForm(f => ({
      ...f,
      host: p.imap.host,
      port: p.imap.port,
      secure: p.imap.secure,
      smtpHost: p.smtp.host,
      smtpPort: p.smtp.port,
      smtpSecure: p.smtp.secure,
      username: autoUsername,
      smtpUsername: autoUsername
    }));
  };

  // Auto-detect provider when email changes
  const handleEmailChange = (e) => {
    const email = e.target.value;
    setForm(f => ({ ...f, email }));
    
    // Auto-detect provider based on email domain
    if (email.includes('@gmail.com')) {
      setProvider('gmail');
      const p = PROVIDERS.gmail;
      if (p) {
        setForm(f => ({
          ...f,
          email,
          host: p.imap.host,
          port: p.imap.port,
          secure: p.imap.secure,
          smtpHost: p.smtp.host,
          smtpPort: p.smtp.port,
          smtpSecure: p.smtp.secure,
          username: email,
          smtpUsername: email
        }));
      }
    } else if (email.includes('@outlook.com') || email.includes('@hotmail.com')) {
      setProvider('outlook');
      const p = PROVIDERS.outlook;
      if (p) {
        setForm(f => ({
          ...f,
          email,
          host: p.imap.host,
          port: p.imap.port,
          secure: p.imap.secure,
          smtpHost: p.smtp.host,
          smtpPort: p.smtp.port,
          smtpSecure: p.smtp.secure,
          username: email,
          smtpUsername: email
        }));
      }
    } else if (email.includes('@yahoo.com')) {
      setProvider('yahoo');
      const p = PROVIDERS.yahoo;
      if (p) {
        setForm(f => ({
          ...f,
          email,
          host: p.imap.host,
          port: p.imap.port,
          secure: p.imap.secure,
          smtpHost: p.smtp.host,
          smtpPort: p.smtp.port,
          smtpSecure: p.smtp.secure,
          username: email,
          smtpUsername: email
        }));
      }
    } else if (email.includes('@icloud.com')) {
      setProvider('icloud');
      const p = PROVIDERS.icloud;
      if (p) {
        setForm(f => ({
          ...f,
          email,
          host: p.imap.host,
          port: p.imap.port,
          secure: p.imap.secure,
          smtpHost: p.smtp.host,
          smtpPort: p.smtp.port,
          smtpSecure: p.smtp.secure,
          username: email,
          smtpUsername: email
        }));
      }
    }
  };

  // Helper to detect mobile (sm, md, lg, up to 1280px)
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 1279px)').matches;

  // When an email is selected, open drawer only on mobile
  const handleSelectEmail = async (email) => {
    setSelectedEmail(email);
    setFullEmail(null);
    setFullEmailError(null);
    setIsFullEmailLoading(true);
    try {
      const seqno = email.seqno || email.attrs?.uid || email.attrs?.seqno || email.uid;
      console.log('Fetching email content - Account ID:', selectedAccount.id, 'Folder:', selectedFolder, 'Seqno:', seqno);
      const content = await fetchEmailContent(selectedAccount.id, selectedFolder, seqno);
      setFullEmail(content);
    } catch (err) {
      console.error('Error fetching email content:', err);
      setFullEmailError('Failed to load email content');
    } finally {
      setIsFullEmailLoading(false);
    }
    if (isMobile) setMobilePreviewOpen(true);
  };
  // When closing preview on mobile
  const handleClosePreview = () => {
    setMobilePreviewOpen(false);
    setSelectedEmail(null);
  };

  // Show modal when an email is selected
  const handleCloseEmailModal = () => {
    setSelectedEmail(null);
    setMobilePreviewOpen(false);
  };

  // Handler for reply, reply all, forward
  const handleReply = (type) => {
    if (!fullEmail) return;
    const headers = fullEmail.headers || {};
    const from = headers.from?.[0] || '';
    const to = headers.to?.[0] || '';
    const cc = headers.cc?.[0] || '';
    const subject = headers.subject?.[0] || '';
    const myEmail = selectedAccount?.email || selectedAccount?.username || '';
    let replyTo = '';
    let replySubject = '';
    let replyBody = '';
    if (type === 'reply') {
      replyTo = from;
      replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
    } else if (type === 'replyAll') {
      // Reply to all except yourself
      const allRecipients = [from, ...to.split(','), ...cc.split(',')]
        .map(e => e.trim())
        .filter(e => e && e !== myEmail);
      replyTo = Array.from(new Set(allRecipients)).join(', ');
      replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
    } else if (type === 'forward') {
      replyTo = '';
      replySubject = subject.startsWith('Fwd:') ? subject : `Fwd: ${subject}`;
    }
    // Quoted body
    let originalBody = '';
    if (fullEmail.text) {
      originalBody = fullEmail.text;
    } else if (fullEmail.html) {
      // Strip HTML tags for quoting
      const tmp = document.createElement('div');
      tmp.innerHTML = fullEmail.html;
      originalBody = tmp.textContent || tmp.innerText || '';
    }
    replyBody = `\n\nOn ${headers.date ? new Date(headers.date[0]).toLocaleString() : ''}, ${from} wrote:\n> ` + originalBody.replace(/\n/g, '\n> ');
    setComposeForm({
      to: replyTo,
      subject: replySubject,
      message: replyBody
    });
    setShowCompose(true);
  };

  // Handler for delete
  const handleDeleteEmail = async () => {
    if (!selectedAccount || !fullEmail) return;
    try {
      await emailAPI.deleteEmail(selectedAccount.id, selectedFolder, fullEmail.seqno);
      toast.success('Email deleted');
      setSelectedEmail(null);
      setFullEmail(null);
      refetchEmails();
    } catch (err) {
      toast.error('Failed to delete email');
    }
  };

  // When an account is selected, set the signature state to the account's signature
  useEffect(() => {
    if (selectedAccount && selectedAccount.signature) {
      setSignature(selectedAccount.signature);
    }
  }, [selectedAccount]);

  // When showCompose is set to true, set signature to selectedAccount.signature
  useEffect(() => {
    if (showCompose && selectedAccount && selectedAccount.signature) {
      setSignature(selectedAccount.signature);
    }
  }, [showCompose, selectedAccount]);

  // Filter emails by search (using headers)
  const filteredEmails = emails.filter(email => {
    const h = email.headers || {};
    return (
      (h.subject?.[0] || '').toLowerCase().includes(search.toLowerCase()) ||
      (h.from?.[0] || '').toLowerCase().includes(search.toLowerCase()) ||
      (h.to?.[0] || '').toLowerCase().includes(search.toLowerCase())
    );
  });

  // Sorting and filtering logic
  const sortedFilteredEmails = filteredEmails.slice().sort((a, b) => {
    const hA = a.headers || {};
    const hB = b.headers || {};
    let valA, valB;
    if (sortBy === 'date') {
      valA = new Date(hA.date?.[0] || 0);
      valB = new Date(hB.date?.[0] || 0);
    } else if (sortBy === 'subject') {
      valA = (hA.subject?.[0] || '').toLowerCase();
      valB = (hB.subject?.[0] || '').toLowerCase();
    } else if (sortBy === 'from') {
      valA = (hA.from?.[0] || '').toLowerCase();
      valB = (hB.from?.[0] || '').toLowerCase();
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
  const totalEmails = sortedFilteredEmails.length;
  const totalPages = Math.ceil(totalEmails / EMAILS_PER_PAGE);
  const paginatedEmails = sortedFilteredEmails.slice((currentPage - 1) * EMAILS_PER_PAGE, currentPage * EMAILS_PER_PAGE);

  // Fetch account status (simulate for now)
  useEffect(() => {
    if (emailConfigs.length > 0) {
      // Simulate status: all connected for now
      const map = {};
      emailConfigs.forEach(acc => { map[acc.id] = 'connected'; });
      setStatusMap(map);
    }
  }, [emailConfigs]);

  // Fetch folders when account changes
  useEffect(() => {
    if (selectedAccount) {
      setIsLoadingFolders(true);
      setFoldersError(null);
      emailAPI.getFolders(selectedAccount.id)
        .then(f => {
          setFolders(f && f.length > 0 ? f : FOLDERS);
          setFoldersError(null);
        })
        .catch((err) => {
          setFolders(FOLDERS);
          setFoldersError('Could not load folders for this account. Showing default folders.');
        })
        .finally(() => setIsLoadingFolders(false));
    }
  }, [selectedAccount]);

  // Enhanced compose form validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateEmailList = (emailList) => {
    if (!emailList.trim()) return true;
    const emails = emailList.split(',').map(e => e.trim()).filter(e => e);
    return emails.every(validateEmail);
  };

  const [composeErrors, setComposeErrors] = useState({});

  const validateComposeForm = () => {
    const errors = {};
    
    if (!composeForm.to.trim()) {
      errors.to = 'Recipient is required';
    } else if (!validateEmailList(composeForm.to)) {
      errors.to = 'Invalid email address(es)';
    }
    
    if (composeForm.cc && !validateEmailList(composeForm.cc)) {
      errors.cc = 'Invalid email address(es)';
    }
    
    if (composeForm.bcc && !validateEmailList(composeForm.bcc)) {
      errors.bcc = 'Invalid email address(es)';
    }
    
    if (!composeForm.subject.trim()) {
      errors.subject = 'Subject is required';
    }
    
    if (!composeForm.message.trim()) {
      errors.message = 'Message is required';
    }
    
    setComposeErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSend = (e) => {
    e.preventDefault();
    
    if (!selectedAccount) {
      toast.error('Please select an email account first');
      return;
    }
    
    if (!validateComposeForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    const formData = new FormData();
    // Append signature to message (HTML)
    const htmlMessage = composeForm.message.replace(/\n/g, '<br>') + '<br><br>' + signature;
    // For plain text, strip HTML tags from signature
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = signature;
    const plainSignature = tempDiv.textContent || tempDiv.innerText || '';
    const textMessage = composeForm.message + '\n\n' + plainSignature;
    formData.append('to', composeForm.to);
    formData.append('cc', composeForm.cc);
    formData.append('bcc', composeForm.bcc);
    formData.append('subject', composeForm.subject);
    formData.append('text', textMessage);
    formData.append('html', htmlMessage);
    composeAttachments.forEach(file => {
      formData.append('attachments', file);
    });
    sendEmailMutation.mutate(formData);
  };

  useEffect(() => {
    if (!socket) return;
    const emailRefetch = () => queryClient.invalidateQueries(['emails']);
    socket.on('emailReceived', emailRefetch);
    return () => {
      socket.off('emailReceived', emailRefetch);
    };
  }, [socket, queryClient]);

  return (
      
      <div className={`flex flex-col xl:flex-row h-[80vh] bg-white/80 rounded-2xl shadow-2xl overflow-hidden relative mt-8 mx-auto max-w-7xl ${theme === 'dark' ? 'bg-gray-800/90' : ''}`}> 
      {/* Sidebar: Accounts and Folders */}
        <div className={`fixed xl:static z-[100] top-0 left-0 h-full xl:h-auto from-blue-100 to-blue-50 transition-transform duration-200 xl:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} xl:relative w-80 border-b xl:border-b-0 xl:border-r flex flex-col rounded-r-2xl shadow-lg ${theme === 'dark' ? 'bg-gray-900/90' : ''}`}> 
          <div className="p-6 border-b flex items-center justify-between bg-white/100 dark:bg-gray-700 rounded-t-2xl shadow-sm">
            <span className="font-bold text-lg tracking-wide text-blue-900 dark:text-white">Accounts</span>
            <button className="btn-primary text-xs px-3 py-1 rounded-full shadow hover:bg-blue-600 transition" onClick={() => setShowAdd(true)}>
              <svg className="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Add
            </button>
        </div>
          <div className="flex-1 overflow-y-auto min-w-[10rem] xl:min-w-0 px-2 py-4 bg-white/100 dark:bg-gray-700 space-y-2">
          {isLoadingAccounts ? (
            <div className="p-4 text-gray-500">Loading...</div>
          ) : emailConfigs.length === 0 ? (
              <div className="p-4 text-gray-400 italic">No accounts</div>
          ) : (
            emailConfigs.map(acc => (
              <div
                key={acc.id}
                  className={`p-3 cursor-pointer rounded-xl flex items-center justify-between group shadow-sm transition border border-transparent hover:border-blue-300 hover:bg-blue-100/60 ${selectedAccount?.id === acc.id ? 'bg-blue-200/80 border-blue-400 font-bold shadow-md' : 'bg-white/80'}`}
                onClick={() => {
                  setSelectedAccount(acc);
                  setSelectedFolder('INBOX');
                  setSelectedEmail(null);
                  setSidebarOpen(false);
                }}
              >
                  <div className="flex items-center gap-3">
                    {/* Status dot */}
                    <span className={`inline-block w-2 h-2 rounded-full ${statusMap[acc.id] === 'connected' ? 'bg-green-500' : statusMap[acc.id] === 'error' ? 'bg-red-500' : 'bg-yellow-400'}`} title={statusMap[acc.id] || 'unknown'}></span>
                    <div>
                      <div className="font-medium text-blue-900 truncate">{acc.email || acc.username}</div>
                      <div className="text-xs text-gray-500">{acc.emailType}</div>
                    </div>
                  </div>
                    <button
                    className="ml-2 p-1 rounded-full text-red-500 hover:bg-red-100 hover:text-white transition-colors duration-150 group-hover:visible visible shadow"
                      style={{ minWidth: 32, minHeight: 32 }}
                      title="Log out (remove this account)"
                      onClick={e => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to log out (remove) this email account?')) {
                          emailAPI.deleteEmailConfig(acc.id)
                            .then(() => {
                              toast.success('Logged out from account');
                              queryClient.invalidateQueries(['emailConfigs']);
                              if (selectedAccount?.id === acc.id) {
                                setSelectedAccount(null);
                                setSelectedFolder('INBOX');
                                setSelectedEmail(null);
                              }
                            })
                            .catch(() => toast.error('Failed to log out from account'));
                        }
                      }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" /></svg>
                    </button>
              </div>
            ))
          )}
        </div>
        {selectedAccount && (
            <div className="border-t p-4 bg-white/70 dark:bg-gray-800 rounded-b-2xl shadow-inner">
            {isLoadingFolders ? (
              <div className="p-2 text-gray-400">Loading folders...</div>
            ) : (
              <>
                {foldersError && (
                  <div className="p-2 mb-2 bg-yellow-100 text-yellow-800 border-l-4 border-yellow-400 text-xs rounded">{foldersError}</div>
                )}
                {(() => {
                  // Normalize folders to always be objects with key/label
                  const normalizedFolders = folders.map(f => typeof f === 'string' ? { key: f, label: f } : f);
                  // Preferred folder order
                  const preferredOrder = [
                    'INBOX', 'Sent', 'Junk', 'Trash', 'Drafts', 'Archive', 'spam'
                  ];
                  const sortedFolders = normalizedFolders.slice().sort((a, b) => {
                    const aIdx = preferredOrder.indexOf(a.label);
                    const bIdx = preferredOrder.indexOf(b.label);
                    if (aIdx === -1 && bIdx === -1) return a.label.localeCompare(b.label);
                    if (aIdx === -1) return 1;
                    if (bIdx === -1) return -1;
                    return aIdx - bIdx;
                  });
                  if (normalizedFolders.length === 0) {
                    return <div className="p-2 text-gray-400">No folders found.</div>;
                  }
                  return sortedFolders.map(f => (
                    <div
                      key={f.key}
                        className={`p-2 pl-4 cursor-pointer rounded-lg hover:bg-blue-200/60 transition flex items-center justify-between ${selectedFolder === f.key ? 'bg-blue-300/80 font-bold' : ''}`}
                      onClick={() => {
                        setSelectedFolder(f.key);
                        setSelectedEmail(null);
                        refetchEmails();
                        setSidebarOpen(false);
                      }}
                    >
                      <span>{f.label}</span>
                      {typeof f.unread === 'number' && (
                        <span className="ml-2 text-xs text-blue-600 font-semibold">{f.unread > 0 ? `(${f.unread})` : ''}</span>
                      )}
                    </div>
                  ));
                })()}
              </>
            )}
          </div>
        )}
      </div>
      {/* Overlay for sidebar on mobile/tablet only */}
      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-30 z-0 xl:hidden" onClick={() => setSidebarOpen(false)} />}
      {/* Center: Email List */}
        <div className="flex-1 flex flex-col xl:w-1/2 bg-white/90 dark:bg-gray-800 p-6 overflow-y-auto">
        {/* Top bar: search, sort, refresh, compose */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center border-b border-gray-600 p-4 gap-4 bg-white/80 dark:bg-gray-700 rounded-t-xl shadow-sm mb-4">
            {/* Hamburger icon at far left of top bar for all screens below xl */}
            <button
              className="inline-flex xl:hidden items-center justify-center bg-white/90 shadow rounded-full p-2 border border-gray-200 hover:bg-blue-100 transition focus:outline-none focus:ring-2 focus:ring-blue-200 mr-2"
              style={{ height: '36px', width: '36px' }}
              onClick={() => setSidebarOpen(v => !v)}
            >
              <span className="sr-only">Toggle sidebar</span>
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {/* Search bar container */}
            <div className="relative flex-1 shadow-sm rounded-xl">
          <input
                className="form-input w-full rounded-xl border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition pl-4 placeholder-gray-400"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            disabled={!selectedAccount}
          />
            </div>
          <select
              className="form-input w-40 rounded-lg border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            disabled={!selectedAccount}
          >
            <option value="date">Sort by Date</option>
            <option value="subject">Sort by Subject</option>
            <option value="from">Sort by Sender</option>
          </select>
          <button
              className="btn-secondary text-xs px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
            onClick={() => setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))}
            disabled={!selectedAccount}
            title="Toggle sort order"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
          <div className="flex gap-2">
              <button className="btn-secondary px-4 py-2 rounded-lg border border-gray-300 hover:bg-blue-100 transition shadow-sm" onClick={() => refetchEmails()} disabled={!selectedAccount}>Refresh</button>
              <button className="btn-primary px-5 py-2 rounded-full shadow-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition flex items-center gap-2" onClick={() => setShowCompose(true)} disabled={!selectedAccount}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Compose
              </button>
          </div>
        </div>
        {/* Email list */}
          <div className="flex-1 overflow-y-auto space-y-3 pb-4">
            {isEmailsLoading ? (
              <div className="flex justify-center items-center h-40 text-blue-500"><LoadingSpinner /></div>
            ) : emails.length === 0 ? (
              <div className="flex justify-center items-center h-40 text-gray-400 italic">No emails found</div>
            ) : (
              paginatedEmails.map((email, idx) => {
                const isUnread = !email.seen;
                return (
                  <div
                    key={email.seqno || idx}
                    className={`flex items-center gap-4 p-4 rounded-xl shadow-sm border border-gray-200 bg-white/90 dark:bg-gray-800 hover:bg-blue-50 transition cursor-pointer ${isUnread ? 'font-semibold border-blue-300 shadow-md' : ''}`}
                    onClick={() => handleSelectEmail(email)}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-lg shadow-inner">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 01-8 0 4 4 0 018 0z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="truncate text-blue-900 text-base">{email.subject || email.headers?.subject?.[0] || '(No subject)'}</span>
                        {isUnread && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 ml-1" title="Unread"></span>}
                    </div>
                      <div className="text-xs text-gray-500 truncate">From: {email.from?.[0] || email.headers?.from?.[0] || ''}</div>
                      <div className="text-xs text-gray-400 truncate">{email.date ? new Date(email.date).toLocaleString() : ''}</div>
                    </div>
                  </div>
                );
              })
          )}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 my-2">
                <button className="btn-secondary px-2 py-1 rounded-lg border border-gray-300 hover:bg-gray-100 transition" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Prev</button>
                <span className="text-gray-600">Page {currentPage} of {totalPages}</span>
                <button className="btn-secondary px-2 py-1 rounded-lg border border-gray-300 hover:bg-gray-100 transition" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next</button>
            </div>
          )}
        </div>
      </div>
      {/* Email content modal (all devices) */}
      {selectedEmail && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto relative p-8">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 text-2xl" onClick={handleCloseEmailModal}>&times;</button>
            {isFullEmailLoading ? (
              <div className="flex justify-center items-center h-40"><LoadingSpinner /></div>
            ) : fullEmailError ? (
              <div className="text-red-500 text-center">{fullEmailError}</div>
            ) : fullEmail ? (
              <>
                <div className="mb-4">
                  <div className="text-xl font-bold mb-1">{fullEmail.headers?.subject?.[0]}</div>
                  <div className="text-xs text-gray-500 mb-2">From: {fullEmail.headers?.from?.[0]}</div>
                  <div className="text-xs text-gray-500 mb-2">To: {fullEmail.headers?.to?.[0]}</div>
                  <div className="text-xs text-gray-500 mb-2">Date: {fullEmail.headers?.date ? new Date(fullEmail.headers.date[0]).toLocaleString() : ''}</div>
                </div>
                <div className="border-t pt-4 mb-4">
                  {fullEmail.html ? (
                    <RenderEmailHtml html={fullEmail.html} accountId={selectedAccount.id} seqno={fullEmail.seqno} />
                  ) : fullEmail.text ? (
                    <pre>{fullEmail.text}</pre>
                  ) : (
                    <div>(No content)</div>
                  )}
                  
                  {/* Attachments */}
                  {fullEmail.attachments && fullEmail.attachments.length > 0 && (
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-semibold mb-2">Attachments ({fullEmail.attachments.length})</h4>
                      <div className="space-y-4">
                        {fullEmail.attachments.map((attachment, index) => {
                          const ext = attachment.filename.split('.').pop().toLowerCase();
                          const isImage = ['jpg','jpeg','png','gif','webp'].includes(ext);
                          const isPdf = ext === 'pdf';
                          const url = `/api/email/${selectedAccount.id}/emails/${fullEmail.seqno}/attachment/${encodeURIComponent(attachment.cid || attachment.filename)}?folder=${encodeURIComponent(selectedFolder)}`;
                          const token = localStorage.getItem('token');
                          if (isImage) {
                            return (
                              <div key={index} className="flex flex-col items-start p-2 bg-gray-50 rounded border">
                                <span className="text-sm font-medium mb-1">{attachment.filename} <span className="text-xs text-gray-500">({Math.round(attachment.size / 1024)} KB)</span></span>
                                <InlineImage src={url} alt={attachment.filename} style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8, border: '1px solid #ddd' }} />
                              </div>
                            );
                          } else if (isPdf) {
                            return (
                              <div key={index} className="flex flex-col items-start p-2 bg-gray-50 rounded border">
                                <span className="text-sm font-medium mb-1">{attachment.filename} <span className="text-xs text-gray-500">({Math.round(attachment.size / 1024)} KB)</span></span>
                                <iframe src={url + `&token=${token}`} title={attachment.filename} style={{ width: '100%', minHeight: 400, border: '1px solid #ddd', borderRadius: 8 }} allow="autoplay" />
                              </div>
                            );
                          } else {
                            return (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                <div className="flex items-center space-x-2">
                                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                  <span className="text-sm font-medium">{attachment.filename}</span>
                                  <span className="text-xs text-gray-500">({Math.round(attachment.size / 1024)} KB)</span>
                                </div>
                                <button className="btn-secondary text-xs px-2 py-1" onClick={() => {
                                  try {
                                    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
                                      .then(res => {
                                        if (!res.ok) throw new Error('Failed to fetch attachment');
                                        return res.blob();
                                      })
                                      .then(blob => {
                                        const a = document.createElement('a');
                                        a.href = URL.createObjectURL(blob);
                                        a.download = attachment.filename;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        URL.revokeObjectURL(a.href);
                                        toast.success(`Downloaded ${attachment.filename}`);
                                      })
                                      .catch(error => {
                                        console.error('Error downloading attachment:', error);
                                        toast.error('Failed to download attachment');
                                      });
                                  } catch (error) {
                                    console.error('Error downloading attachment:', error);
                                    toast.error('Failed to download attachment');
                                  }
                                }}>Download</button>
                              </div>
                            );
                          }
                        })}
                      </div>
                    </div>
                  )}
                </div>
                {/* Action buttons */}
                <div className="border-t pt-3 pb-3 pr-4 flex flex-wrap gap-2 justify-end bg-white dark:bg-gray-800">
                  <button className="btn-primary w-full sm:w-auto" onClick={() => handleReply('reply')}>Reply</button>
                  <button className="btn-primary w-full sm:w-auto" onClick={() => handleReply('replyAll')}>Reply all</button>
                  <button className="btn-primary w-full sm:w-auto" onClick={() => handleReply('forward')}>Forward</button>
                  <button
                    className="btn-secondary w-full sm:w-auto"
                    onClick={() => {
                      if (!selectedEmail) return;
                      markEmailReadMutation.mutate({ seqno: selectedEmail.seqno, read: !selectedEmail.seen });
                    }}
                  >
                    {selectedEmail?.seen ? 'Mark as Unread' : 'Mark as Read'}
                  </button>
                  <button className="btn-danger w-full sm:w-auto" onClick={handleDeleteEmail}>Delete</button>
                  <select
                    className="form-input w-auto"
                    onChange={e => {
                      if (!selectedEmail) return;
                      const targetFolder = e.target.value;
                      if (!targetFolder) return;
                      moveEmailMutation.mutate({ seqno: selectedEmail.seqno, targetFolder });
                      e.target.value = '';
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Move to folder...</option>
                    {FOLDERS.filter(f => f.key !== selectedFolder).map(f => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div className="text-gray-400 text-center">No content</div>
            )}
          </div>
        </div>
      )}
      {/* Add Account Drawer */}
      {showAdd && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto p-2 sm:p-4 md:p-6 overflow-y-auto max-h-[90vh] relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowAdd(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-3">Add Email Account</h2>
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
              <div className="font-semibold mb-1">Quick Setup Guide:</div>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Gmail:</strong> Use App Password (Google Account → Security → App Passwords)</li>
                <li><strong>Outlook/Hotmail:</strong> Use App Password if 2FA is enabled</li>
                <li><strong>Yahoo:</strong> Generate App Password in Account Security settings</li>
                <li><strong>iCloud:</strong> Enable 2FA and generate App Password in Apple ID settings</li>
              </ul>
            </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 bg-gray-50 border border-gray-200 rounded-lg p-2 mb-2">
                <div className="xl:col-span-4">
                  <label className="form-label block mb-1">Provider</label>
                  <select className="form-input w-full" value={provider} onChange={handleProviderChange}>
                    {Object.entries(PROVIDERS).map(([key, p]) => (
                      <option key={key} value={key}>{p.label}</option>
                    ))}
                  </select>
                </div>
                {PROVIDERS[provider]?.help && (
                  <div className="xl:col-span-4 bg-yellow-50 border-l-4 border-yellow-400 p-2 text-sm text-yellow-800 mb-2">
                    <div className="font-semibold">Setup Instructions:</div>
                    {PROVIDERS[provider].help}
                  </div>
                )}
                <div>
                  <label className="form-label block mb-1">Email Address</label>
                  <input 
                    name="email" 
                    type="email" 
                    className="form-input w-full" 
                    value={form.email} 
                    onChange={handleEmailChange} 
                    placeholder="your.email@example.com"
                    required 
                  />
                  <div className="text-xs text-gray-500 mt-1">We'll auto-detect your provider and fill in the settings</div>
                </div>
                <div>
                  <label className="form-label block mb-1">Type</label>
                  <select name="emailType" className="form-input w-full" value={form.emailType} onChange={handleChange} required>
                    <option value="imap">IMAP</option>
                    <option value="outlook">Outlook/Exchange</option>
                  </select>
                </div>
                <div>
                  <label className="form-label block mb-1">Host</label>
                  <input name="host" className="form-input w-full" value={form.host} onChange={handleChange} required />
                </div>
                <div>
                  <label className="form-label block mb-1">Port</label>
                  <input name="port" type="number" className="form-input w-full" value={form.port} onChange={handleChange} required />
                </div>
                <div>
                  <label className="form-label block mb-1">Username</label>
                  <input name="username" className="form-input w-full" value={form.username} onChange={handleChange} required />
                </div>
                <div>
                  <label className="form-label block mb-1">Password/App Password</label>
                  <input name="password" type="password" className="form-input w-full" value={form.password} onChange={handleChange} required />
                  <div className="text-xs text-gray-500 mt-1">Use App Password for Gmail, Yahoo, etc.</div>
                </div>
                <div className="xl:col-span-4 flex items-center">
                  <input name="secure" type="checkbox" checked={form.secure} onChange={handleChange} id="secure" className="mr-2" />
                  <label htmlFor="secure" className="form-label mb-0">Use SSL/TLS</label>
                </div>
                <div className="xl:col-span-4">
                  <label className="form-label block mb-1">Signature (HTML supported)</label>
                  <textarea name="signature" className="form-input w-full min-h-[60px]" value={form.signature} onChange={handleChange} placeholder="--&#10;Your Name&#10;Your Title&#10;Company Name" />
                  <div className="text-xs text-gray-500 mt-1">This signature will be used for this account when composing emails.</div>
                </div>
              </div>
              {/* SMTP Settings */}
                <div className="border-t pt-2 mt-2 bg-gray-50 border border-gray-200 rounded-lg p-2">
                <h3 className="text-lg font-semibold mb-2">SMTP Settings (for sending emails)</h3>
                  <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                  <div>
                    <label className="form-label block mb-1">SMTP Host</label>
                    <input name="smtpHost" className="form-input w-full" value={form.smtpHost} onChange={handleChange} required />
                  </div>
                  <div>
                    <label className="form-label block mb-1">SMTP Port</label>
                    <input name="smtpPort" type="number" className="form-input w-full" value={form.smtpPort} onChange={handleChange} required />
                  </div>
                  <div>
                    <label className="form-label block mb-1">SMTP Username</label>
                    <input name="smtpUsername" className="form-input w-full" value={form.smtpUsername} onChange={handleChange} required />
                  </div>
                  <div>
                    <label className="form-label block mb-1">SMTP Password/App Password</label>
                    <input name="smtpPassword" type="password" className="form-input w-full" value={form.smtpPassword} onChange={handleChange} required />
                  </div>
                  <div className="xl:col-span-4 flex items-center">
                    <input name="smtpSecure" type="checkbox" checked={form.smtpSecure} onChange={handleChange} id="smtpSecure" className="mr-2" />
                    <label htmlFor="smtpSecure" className="form-label mb-0">Use SSL/TLS for SMTP</label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn-primary w-full sm:w-auto" disabled={mutation.isLoading}>
                  {mutation.isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Compose Drawer */}
      {showCompose && (
        <div className="fixed inset-0 z-[300] flex items-center justify-end bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-l-lg shadow-2xl p-4 sm:p-8 w-full max-w-[700px] h-[90vh] flex flex-col relative sm:rounded-l-lg sm:h-full  overflow-y-auto">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => {
              setShowCompose(false);
              setComposeForm({ to: '', cc: '', bcc: '', subject: '', message: '' });
              setComposeAttachments([]);
              setComposeErrors({});
            }}>&times;</button>
            <h2 className="text-xl font-bold mb-4">New Message</h2>
            <div className="mb-2 text-sm text-gray-600">
              Sending from: <span className="font-semibold">{selectedAccount?.email || selectedAccount?.username}</span>
            </div>
            <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              💡 <strong>Tip:</strong> You can send emails to any email address using this account. Just enter the recipient's email address in the "To" field.
            </div>
            <form onSubmit={handleSend} className="space-y-4 flex-1 flex flex-col" encType="multipart/form-data">
              <div>
                <label className="form-label">To *</label>
                <input 
                  name="to" 
                  className={`form-input ${composeErrors.to ? 'border-red-500' : ''}`} 
                  value={composeForm.to} 
                  onChange={handleComposeChange} 
                  placeholder="recipient@example.com"
                  required 
                />
                {composeErrors.to && <div className="text-red-500 text-xs mt-1">{composeErrors.to}</div>}
              </div>
              <div>
                <label className="form-label">CC</label>
                <input 
                  name="cc" 
                  className={`form-input ${composeErrors.cc ? 'border-red-500' : ''}`} 
                  value={composeForm.cc} 
                  onChange={handleComposeChange} 
                  placeholder="cc@example.com"
                />
                {composeErrors.cc && <div className="text-red-500 text-xs mt-1">{composeErrors.cc}</div>}
              </div>
              <div>
                <label className="form-label">BCC</label>
                <input 
                  name="bcc" 
                  className={`form-input ${composeErrors.bcc ? 'border-red-500' : ''}`} 
                  value={composeForm.bcc} 
                  onChange={handleComposeChange} 
                  placeholder="bcc@example.com"
                />
                {composeErrors.bcc && <div className="text-red-500 text-xs mt-1">{composeErrors.bcc}</div>}
              </div>
              <div>
                <label className="form-label">Subject *</label>
                <input 
                  name="subject" 
                  className={`form-input ${composeErrors.subject ? 'border-red-500' : ''}`} 
                  value={composeForm.subject} 
                  onChange={handleComposeChange} 
                  required 
                />
                {composeErrors.subject && <div className="text-red-500 text-xs mt-1">{composeErrors.subject}</div>}
              </div>
              <div className="flex-1">
                <label className="form-label">Message *</label>
                <textarea 
                  name="message" 
                  className={`form-input h-40 ${composeErrors.message ? 'border-red-500' : ''}`} 
                  value={composeForm.message} 
                  onChange={handleComposeChange} 
                  required 
                />
                {composeErrors.message && <div className="text-red-500 text-xs mt-1">{composeErrors.message}</div>}
              </div>
              <div>
                <label className="form-label">Signature</label>
                <textarea className="form-input h-20" value={signature} onChange={e => setSignature(e.target.value)} />
                <div className="text-xs text-gray-500 mt-1">You can edit the signature for this message. To change the default, edit the account settings.</div>
              </div>
              <div>
                <label className="form-label">Attachments</label>
                <input type="file" multiple onChange={handleComposeFileChange} />
                {composeAttachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {composeAttachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-100 rounded px-2 py-1 text-xs">
                        <span>{file.name} ({Math.round(file.size/1024)} KB)</span>
                        <button type="button" className="text-red-500 ml-2" onClick={() => removeComposeAttachment(idx)}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn-primary w-full sm:w-auto" disabled={sendEmailMutation.isLoading}>
                  {sendEmailMutation.isLoading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Account Modal */}
      {showEdit && editAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-2xl relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowEdit(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-3">Edit Email Account</h2>
            <form
              onSubmit={e => {
                e.preventDefault();
                emailAPI.updateEmailConfig(editAccount.id, editForm)
                  .then(() => {
                    toast.success('Account updated');
                    setShowEdit(false);
                    queryClient.invalidateQueries(['emailConfigs']);
                  })
                  .catch(() => toast.error('Failed to update account'));
              }}
              className="space-y-2"
            >
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-2 sm:gap-3">
                <div>
                  <label className="form-label block mb-1">Email</label>
                  <input name="email" type="email" className="form-input w-full" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} required />
                </div>
                <div>
                  <label className="form-label block mb-1">Username</label>
                  <input name="username" className="form-input w-full" value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} required />
                </div>
                <div>
                  <label className="form-label block mb-1">Password</label>
                  <input name="password" type="password" className="form-input w-full" value={editForm.password || ''} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label block mb-1">Signature (HTML supported)</label>
                  <textarea name="signature" className="form-input w-full min-h-[60px]" value={editForm.signature || ''} onChange={e => setEditForm(f => ({ ...f, signature: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn-primary w-full sm:w-auto">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
  );
};

function RenderEmailHtml({ html, accountId, seqno }) {
  // Log the HTML being parsed for debugging
  console.log('Email HTML to parse:', html);
  // Use html-react-parser to transform <img src="cid:..."> to <InlineImage ... />
  const options = {
    replace: (domNode) => {
      if (domNode.name === 'img' && domNode.attribs && domNode.attribs.src && domNode.attribs.src.startsWith('cid:')) {
        console.log('Replacing cid image:', domNode.attribs.src);
        const cid = domNode.attribs.src.slice(4);
        const src = `/api/email/${accountId}/emails/${seqno}/attachment/${encodeURIComponent(cid)}`;
        return <InlineImage src={src} alt={domNode.attribs.alt || ''} style={domNode.attribs.style} />;
      }
    }
  };
  const cleanedHtml = stripHtmlDocumentTags(stripOfficeTags(html));
  return (
    <div className="prose max-w-none whitespace-pre-wrap text-sm leading-relaxed">
      {parse(cleanedHtml, options)}
    </div>
  );
}

export default Email;
