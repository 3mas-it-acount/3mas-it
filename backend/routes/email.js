const express = require('express');
const { body, validationResult } = require('express-validator');
const Imap = require('imap');
const nodemailer = require('nodemailer');
const { EmailConfig, User } = require('../models');
const { authenticateToken, requireAdminOrManager } = require('../middleware/auth');
const mailcomposer = require('mailcomposer');
const util = require('util');
const multer = require('multer');
const iconv = require('iconv-lite');
let recursionLevel = 0;

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10485760, files: 10 } // 10MB per file, up to 10 files
});

// Get user's email configurations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const emailConfigs = await EmailConfig.findAll({
      where: { userId: req.user.id },
      attributes: { exclude: ['password'] } // Don't send password in response
    });
    
    res.json(emailConfigs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch email configurations', message: error.message });
  }
});

// Get specific email configuration
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const emailConfig = await EmailConfig.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!emailConfig) {
      return res.status(404).json({ error: 'Email configuration not found' });
    }
    
    // Check if user owns this configuration or is admin
    if (req.user.role !== 'admin' && emailConfig.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(emailConfig);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch email configuration', message: error.message });
  }
});

// Create new email configuration
router.post('/',
  authenticateToken,
  body('emailType').isIn(['imap', 'outlook']),
  body('host').notEmpty(),
  body('port').isInt({ min: 1, max: 65535 }),
  body('username').notEmpty(),
  body('password').notEmpty(),
  body('smtpHost').notEmpty(),
  body('smtpPort').isInt({ min: 1, max: 65535 }),
  body('smtpUsername').notEmpty(),
  body('smtpPassword').notEmpty(),
  body('signature').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { emailType, host, port, username, password, secure, smtpHost, smtpPort, smtpUsername, smtpPassword, smtpSecure, signature } = req.body;
      
      // Test IMAP connection before saving
      const imapTestResult = await testEmailConnection({
        emailType,
        host,
        port: parseInt(port),
        username,
        password,
        secure: secure !== false
      });
      
      if (!imapTestResult.success) {
        return res.status(400).json({ 
          error: 'IMAP connection test failed', 
          message: imapTestResult.error 
        });
      }

      // Test SMTP connection before saving
      const smtpTestResult = await testSmtpConnection({
        host: smtpHost,
        port: parseInt(smtpPort),
        username: smtpUsername,
        password: smtpPassword,
        secure: smtpSecure !== false
      });
      
      if (!smtpTestResult.success) {
        return res.status(400).json({ 
          error: 'SMTP connection test failed', 
          message: smtpTestResult.error 
        });
      }
      
      const emailConfig = await EmailConfig.create({
        userId: req.user.id,
        emailType,
        host,
        port: parseInt(port),
        username,
        password, // In production, this should be encrypted
        secure: secure !== false,
        smtpHost,
        smtpPort: parseInt(smtpPort),
        smtpUsername,
        smtpPassword, // In production, this should be encrypted
        smtpSecure: smtpSecure !== false,
        signature
      });
      
      // Remove passwords from response
      const configResponse = emailConfig.toJSON();
      delete configResponse.password;
      delete configResponse.smtpPassword;
      
      res.status(201).json(configResponse);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create email configuration', message: error.message });
    }
  }
);

// Update email configuration
router.put('/:id',
  authenticateToken,
  body('emailType').optional().isIn(['imap', 'outlook']),
  body('host').optional().notEmpty(),
  body('port').optional().isInt({ min: 1, max: 65535 }),
  body('username').optional().notEmpty(),
  body('signature').optional().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const emailConfig = await EmailConfig.findByPk(req.params.id);
      if (!emailConfig) {
        return res.status(404).json({ error: 'Email configuration not found' });
      }
      
      // Check ownership
      if (req.user.role !== 'admin' && emailConfig.userId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const updateData = { ...req.body };
      if (updateData.port) {
        updateData.port = parseInt(updateData.port);
      }
      
      // Test connection if credentials are being updated
      if (updateData.host || updateData.port || updateData.username || updateData.password) {
        const testConfig = {
          emailType: updateData.emailType || emailConfig.emailType,
          host: updateData.host || emailConfig.host,
          port: updateData.port || emailConfig.port,
          username: updateData.username || emailConfig.username,
          password: updateData.password || emailConfig.password,
          secure: updateData.secure !== undefined ? updateData.secure : emailConfig.secure
        };
        
        const testResult = await testEmailConnection(testConfig);
        if (!testResult.success) {
          return res.status(400).json({ 
            error: 'Email connection test failed', 
            message: testResult.error 
          });
        }
      }
      
      await emailConfig.update(updateData);
      
      // Remove password from response
      const configResponse = emailConfig.toJSON();
      delete configResponse.password;
      delete configResponse.smtpPassword;
      
      res.json(configResponse);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update email configuration', message: error.message });
    }
  }
);

// Test email connection
router.post('/:id/test', authenticateToken, async (req, res) => {
  try {
    const emailConfig = await EmailConfig.findByPk(req.params.id);
    if (!emailConfig) {
      return res.status(404).json({ error: 'Email configuration not found' });
    }
    
    // Check ownership
    if (req.user.role !== 'admin' && emailConfig.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const testResult = await testEmailConnection({
      emailType: emailConfig.emailType,
      host: emailConfig.host,
      port: emailConfig.port,
      username: emailConfig.username,
      password: emailConfig.password,
      secure: emailConfig.secure
    });
    
    res.json(testResult);
  } catch (error) {
    res.status(500).json({ error: 'Failed to test email connection', message: error.message });
  }
});

// Get emails from configured account
router.get('/:id/emails', authenticateToken, async (req, res) => {
  try {
    const emailConfig = await EmailConfig.findByPk(req.params.id);
    if (!emailConfig) {
      return res.status(404).json({ error: 'Email configuration not found' });
    }
    
    // Check ownership
    if (req.user.role !== 'admin' && emailConfig.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const limit = parseInt(req.query.limit) || 50;
    const folder = req.query.folder || 'INBOX';
    
    const emails = await fetchEmails(emailConfig, folder, limit);
    res.json(emails);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch emails', message: error.message });
  }
});

// Sanitize headers to fix "Invalid character in header content" errors
function sanitizeHeaders(headers) {
  const sanitized = {};
  for (const [key, values] of Object.entries(headers)) {
    if (Array.isArray(values)) {
      sanitized[key] = values.map(value => {
        if (typeof value === 'string') {
          // Remove or replace invalid characters in header values
          return value
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
            .replace(/[^\x20-\x7E]/g, '?') // Replace non-ASCII with '?'
            .trim();
        }
        return value;
      });
    } else {
      sanitized[key] = values;
    }
  }
  return sanitized;
}

// Decode content based on charset and encoding
function decodeContent(content, charset, headers) {
  try {
    let decoded = content;
    
    // Handle quoted-printable encoding
    if (headers['content-transfer-encoding']?.[0]?.toLowerCase() === 'quoted-printable') {
      // More robust quoted-printable decoding
      decoded = content.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
      // Handle soft line breaks
      decoded = decoded.replace(/=\r?\n/g, '');
    }
    
    // Handle base64 encoding
    if (headers['content-transfer-encoding']?.[0]?.toLowerCase() === 'base64') {
      try {
        // Remove any whitespace and line breaks from base64
        const cleanBase64 = content.replace(/\s/g, '');
        const buf = Buffer.from(cleanBase64, 'base64');
        decoded = iconv.decode(buf, charset || 'utf-8');
      } catch (e) {
        console.log('Base64 decoding failed:', e.message);
      }
    }
    
    // Handle 8bit encoding (no transformation needed)
    if (headers['content-transfer-encoding']?.[0]?.toLowerCase() === '8bit') {
      // No transformation needed for 8bit
    }
    
    // Fallback: جرب utf-8 ثم windows-1256 إذا كانت النتيجة غير مقروءة أو charset غير معرف
    let tryCharsets = [charset, 'utf-8', 'windows-1256'].filter(Boolean);
    let bestDecoded = decoded;
    let bestScore = -1;
    for (let cs of tryCharsets) {
      try {
        const buf = Buffer.from(decoded, 'binary');
        const candidate = iconv.decode(buf, cs);
        // تقييم: إذا احتوى على حروف عربية أو كان أقل رموز غريبة
        const arabic = /[\u0600-\u06FF]/;
        const score = (arabic.test(candidate) ? 10 : 0) - (candidate.match(/[\uFFFD]/g) || []).length;
        if (score > bestScore) {
          bestScore = score;
          bestDecoded = candidate;
        }
      } catch (e) {
        // تجاهل الخطأ
      }
    }
    return bestDecoded;
  } catch (error) {
    console.error('Error decoding content:', error);
    return content;
  }
}

// Improved MIME parser function (recursive, robust, with debug logging)
function parseMimeContent(rawContent, headers) {
  recursionLevel++;
  const result = {
    text: '',
    html: '',
    attachments: []
  };
  try {
    // Sanitize headers to prevent "Invalid character in header content" errors
    const sanitizedHeaders = sanitizeHeaders(headers);
    const contentType = sanitizedHeaders['content-type']?.[0] || '';
    const charsetMatch = contentType.match(/charset=([^;\s]+)/i);
    const charset = charsetMatch ? charsetMatch[1].toLowerCase() : 'utf-8';
    console.log(`[MIME][Level ${recursionLevel}] Content-Type:`, contentType);
    // Handle multipart emails recursively
    if (contentType.includes('multipart')) {
      const boundaryMatch = contentType.match(/boundary=([^;\s]+)/i);
      if (boundaryMatch) {
        let boundary = boundaryMatch[1].replace(/(^["']|["']$)/g, ''); // Remove quotes if present
        console.log(`[MIME][Level ${recursionLevel}] Found boundary:`, boundary);
        // Split by boundary, ignore the first empty part and the last '--' part
        const parts = rawContent.split('--' + boundary).slice(1, -1);
        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed) continue;
          // Find the end of headers (double CRLF)
          const headerEnd = trimmed.indexOf('\r\n\r\n');
          if (headerEnd === -1) continue;
          const partHeaderRaw = trimmed.substring(0, headerEnd);
          const rawPartHeaders = Imap.parseHeader(partHeaderRaw);
          const partHeaders = sanitizeHeaders(rawPartHeaders);
          const partContent = trimmed.substring(headerEnd + 4);
          const partContentType = partHeaders['content-type']?.[0] || '';
          const partCharset = partContentType.match(/charset=([^;\s]+)/i)?.[1]?.toLowerCase() || charset;
          console.log(`[MIME][Level ${recursionLevel}] Part Content-Type:`, partContentType);
          console.log(`[MIME][Level ${recursionLevel}] Part Headers:`, util.inspect(partHeaders, { depth: 2 }));
          // Recursively handle nested multiparts
          if (partContentType.includes('multipart')) {
            const nested = parseMimeContent(partContent, partHeaders);
            if (nested.text) result.text += (result.text ? '\n---\n' : '') + nested.text;
            if (nested.html) result.html += (result.html ? '<hr>' : '') + nested.html;
            if (nested.attachments.length) result.attachments.push(...nested.attachments);
          }
          // Attachments
          else if (
            partHeaders['content-disposition']?.[0]?.includes('attachment') ||
            partContentType.includes('image/') ||
            partContentType.includes('application/')
          ) {
            // Extract filename from content-disposition or content-type (name=...)
            let filename = 'attachment';
            let filenameMatch = null;
            if (partHeaders['content-disposition']) {
              filenameMatch = partHeaders['content-disposition'][0].match(/filename="([^"]+)"/i) ||
                              partHeaders['content-disposition'][0].match(/filename=([^;\s]+)/i);
            }
            if (!filenameMatch && partHeaders['content-type']) {
              filenameMatch = partHeaders['content-type'][0].match(/name="([^"]+)"/i) ||
                              partHeaders['content-type'][0].match(/name=([^;\s]+)/i);
            }
            if (filenameMatch) {
              filename = filenameMatch[1];
            }
            result.attachments.push({
              filename: filename,
              contentType: partContentType,
              size: partContent.length,
              content: partContent,
              headers: partHeaders
            });
            console.log(`[MIME][Level ${recursionLevel}] Attachment found:`, filename);
          }
          // HTML
          else if (partContentType.includes('text/html')) {
            const html = decodeContent(partContent, partCharset, partHeaders);
            result.html += (result.html ? '<hr>' : '') + html;
            console.log(`[MIME][Level ${recursionLevel}] HTML part found.`);
          }
          // Plain text
          else if (partContentType.includes('text/plain')) {
            const text = decodeContent(partContent, partCharset, partHeaders);
            result.text += (result.text ? '\n---\n' : '') + text;
            console.log(`[MIME][Level ${recursionLevel}] Text part found.`);
          }
        }
      }
    } else {
      // Single part email
      const contentStart = rawContent.indexOf('\r\n\r\n');
      if (contentStart !== -1) {
        const bodyContent = rawContent.substring(contentStart + 4);
        if (contentType.includes('text/html')) {
          result.html = decodeContent(bodyContent, charset, headers);
        } else {
          result.text = decodeContent(bodyContent, charset, headers);
        }
      }
    }
    // Clean up text content
    if (result.text) {
      result.text = result.text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }
    if (result.html) {
      result.html = result.html
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
    }
  } catch (error) {
    console.error('Error parsing MIME content:', error);
    // Fallback: try to extract any readable content
    const contentStart = rawContent.indexOf('\r\n\r\n');
    if (contentStart !== -1) {
      result.text = rawContent.substring(contentStart + 4);
    }
  }
  recursionLevel--;
  return result;
}

// Fallback: Use mailparser if custom parser fails
const { simpleParser } = require('mailparser');

async function robustParseMimeContent(rawContent) {
  try {
    // Try custom parser first
    const rawHeaders = Imap.parseHeader(rawContent.split('\r\n\r\n')[0] || '');
    const headers = sanitizeHeaders(rawHeaders);
    const parsed = parseMimeContent(rawContent, headers);
    if (parsed.text || parsed.html || (parsed.attachments && parsed.attachments.length > 0)) {
      return parsed;
    }
    // If nothing found, use mailparser
    console.log('[MIME] Falling back to mailparser...');
    const mail = await simpleParser(rawContent);
    return {
      text: mail.text || '',
      html: mail.html || '',
      attachments: (mail.attachments || []).map(att => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
        content: att.content,
        headers: att.headers
      }))
    };
  } catch (err) {
    console.error('[MIME] mailparser fallback failed:', err);
    return { text: '', html: '', attachments: [] };
  }
}

// Get full content of a specific email
router.get('/:id/emails/:seqno', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching email content - ID:', req.params.id, 'User ID:', req.user.id, 'Folder:', req.query.folder);
    const emailConfig = await EmailConfig.findByPk(req.params.id);
    console.log('Email config found:', emailConfig ? 'Yes' : 'No');
    if (!emailConfig) {
      console.log('Email config not found for ID:', req.params.id);
      return res.status(404).json({ error: 'Email configuration not found' });
    }
    if (req.user.role !== 'admin' && emailConfig.userId !== req.user.id) {
      console.log('Access denied - User ID:', req.user.id, 'Config User ID:', emailConfig.userId);
      return res.status(403).json({ error: 'Access denied' });
    }
    const seqno = req.params.seqno;
    const folder = req.query.folder || 'INBOX';
    const imap = new Imap({
      user: emailConfig.username,
      password: emailConfig.password,
      host: emailConfig.host,
      port: emailConfig.port,
      tls: emailConfig.secure,
      tlsOptions: { rejectUnauthorized: false }
    });
    imap.once('ready', () => {
      imap.openBox(folder, true, (err, box) => {
        if (err) {
          imap.end();
          return res.status(500).json({ error: 'Failed to open folder', message: err.message });
        }
        const f = imap.seq.fetch(seqno, { bodies: '', struct: true });
        let fullEmail = { seqno };
        f.on('message', (msg) => {
          let parsePromise = new Promise((resolve) => {
            msg.on('body', (stream, info) => {
              let buffer = '';
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });
              stream.once('end', () => {
                fullEmail.raw = buffer;
              });
            });
            msg.once('attributes', (attrs) => {
              fullEmail.attrs = attrs;
            });
            msg.once('end', async () => {
              // Parse headers and body
              const rawHeaders = Imap.parseHeader(fullEmail.raw);
              fullEmail.headers = sanitizeHeaders(rawHeaders);
              // Comprehensive email content parsing with Arabic support and attachments
              let parsedContent = await robustParseMimeContent(fullEmail.raw);
              console.log('Parsed HTML:', parsedContent.html ? parsedContent.html.substring(0, 500) : 'No HTML');
              fullEmail.attachments = parsedContent.attachments;
              fullEmail.text = parsedContent.text;
              fullEmail.html = parsedContent.html;
              resolve();
            });
          });
          // Save the promise so we can await it later
          fullEmail.parsePromise = parsePromise;
        });
        f.once('error', (err) => {
          imap.end();
          return res.status(500).json({ error: 'Failed to fetch email', message: err.message });
        });
        f.once('end', async () => {
          // Wait for parsing to finish before sending the response
          if (fullEmail.parsePromise) {
            await fullEmail.parsePromise;
          }
          imap.end();
          res.json(fullEmail);
        });
      });
    });
    imap.once('error', (err) => {
      res.status(500).json({ error: 'Failed to connect to IMAP', message: err.message });
    });
    imap.connect();
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch email', message: error.message });
  }
});

// Delete email configuration
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const emailConfig = await EmailConfig.findByPk(req.params.id);
    if (!emailConfig) {
      return res.status(404).json({ error: 'Email configuration not found' });
    }
    
    // Check ownership
    if (req.user.role !== 'admin' && emailConfig.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await emailConfig.destroy();
    res.json({ message: 'Email configuration deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete email configuration', message: error.message });
  }
});

// Send email (with attachments support)
router.post('/:id/send', authenticateToken, upload.array('attachments', 10), async (req, res) => {
  try {
    // Support both JSON and multipart/form-data
    const isMultipart = req.is('multipart/form-data');
    let to, cc, bcc, subject, text, html;
    if (isMultipart) {
      to = req.body.to;
      cc = req.body.cc;
      bcc = req.body.bcc;
      subject = req.body.subject;
      text = req.body.text;
      html = req.body.html;
    } else {
      ({ to, cc, bcc, subject, text, html } = req.body);
    }
    // Validate required fields
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        message: 'to, subject, and either text or html are required' 
      });
    }
    const emailConfig = await EmailConfig.findByPk(req.params.id);
    if (!emailConfig) {
      return res.status(404).json({ error: 'Email configuration not found' });
    }
    if (req.user.role !== 'admin' && emailConfig.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    // Use SMTP settings for sending emails
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtpHost,
      port: emailConfig.smtpPort,
      secure: emailConfig.smtpSecure,
      auth: {
        user: emailConfig.smtpUsername,
        pass: emailConfig.smtpPassword
      }
    });
    // Prepare attachments for nodemailer
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype
      }));
    }
    // Send email
    const mailOptions = {
      from: emailConfig.smtpUsername,
      to,
      cc,
      bcc,
      subject,
      text,
      html,
      attachments
    };
    const info = await transporter.sendMail(mailOptions);
    // --- Append to Sent folder ---
    // Compose raw message
    const mail = mailcomposer({ ...mailOptions });
    mail.build(async (err, message) => {
      if (err) {
        console.error('Failed to build raw message for Sent folder:', err);
        return res.json({ 
          success: true, 
          message: 'Email sent successfully (but not saved to Sent folder)',
          messageId: info.messageId 
        });
      }
      // Fallbacks for Sent folder
      const sentFolders = ['Sent', 'INBOX.Sent', '[Gmail]/Sent Mail', '[Gmail]/Sent'];
      const imap = new Imap({
        user: emailConfig.username,
        password: emailConfig.password,
        host: emailConfig.host,
        port: emailConfig.port,
        tls: emailConfig.secure,
        tlsOptions: { rejectUnauthorized: false }
      });
      imap.once('ready', () => {
        let idx = 0;
        function tryNextSentFolder() {
          if (idx >= sentFolders.length) {
            imap.end();
            console.error('Could not append to any Sent folder');
            return res.json({ 
              success: true, 
              message: 'Email sent successfully (but not saved to Sent folder)',
              messageId: info.messageId 
            });
          }
          const folder = sentFolders[idx++];
          imap.openBox(folder, false, (err) => {
            if (err) {
              tryNextSentFolder();
              return;
            }
            imap.append(message, { mailbox: folder }, (err) => {
              imap.end();
              if (err) {
                console.error('Failed to append to Sent folder:', folder, err);
                return res.json({ 
                  success: true, 
                  message: 'Email sent successfully (but not saved to Sent folder)',
                  messageId: info.messageId 
                });
              }
              // Success!
              return res.json({ 
                success: true, 
                message: 'Email sent and saved to Sent folder',
                messageId: info.messageId 
              });
            });
          });
        }
        tryNextSentFolder();
      });
      imap.once('error', (err) => {
        console.error('IMAP error while appending to Sent:', err);
        return res.json({ 
          success: true, 
          message: 'Email sent successfully (but not saved to Sent folder)',
          messageId: info.messageId 
        });
      });
      imap.connect();
    });
    // --- End append to Sent ---
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ 
      error: 'Failed to send email', 
      message: error.message 
    });
  }
});

// List all IMAP folders with unread/total counts
router.get('/:id/folders', authenticateToken, async (req, res) => {
  try {
    const emailConfig = await EmailConfig.findByPk(req.params.id);
    if (!emailConfig) {
      return res.status(404).json({ error: 'Email configuration not found' });
    }
    if (req.user.role !== 'admin' && emailConfig.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const imap = new Imap({
      user: emailConfig.username,
      password: emailConfig.password,
      host: emailConfig.host,
      port: emailConfig.port,
      tls: emailConfig.secure,
      tlsOptions: { rejectUnauthorized: false }
    });
    imap.once('ready', () => {
      imap.getBoxes((err, boxes) => {
        if (err) {
          imap.end();
          return res.status(500).json({ error: 'Failed to list folders', message: err.message });
        }
        // Flatten boxes
        function flatten(boxes, prefix = '') {
          let out = [];
          for (const [name, box] of Object.entries(boxes)) {
            const key = prefix ? `${prefix}${box.delimiter}${name}` : name;
            out.push({ key, label: name });
            if (box.children) {
              out = out.concat(flatten(box.children, key));
            }
          }
          return out;
        }
        const folders = flatten(boxes);
        // For each folder, get status (unread/total)
        let done = 0;
        folders.forEach((f, i) => {
          imap.status(f.key, (err2, status) => {
            folders[i].unread = status ? status.unseen : 0;
            folders[i].total = status ? status.messages : 0;
            done++;
            if (done === folders.length) {
              imap.end();
              res.json(folders);
            }
          });
        });
        if (folders.length === 0) {
          imap.end();
          res.json([]);
        }
      });
    });
    imap.once('error', (err) => {
      res.status(500).json({ error: 'IMAP error', message: err.message });
    });
    imap.connect();
  } catch (error) {
    res.status(500).json({ error: 'Failed to list folders', message: error.message });
  }
});

// Helper function to test email connection
async function testEmailConnection(config) {
  console.log('IMAP testEmailConnection config:', config);
  return new Promise((resolve) => {
    if (config.emailType === 'imap') {
      const imap = new Imap({
        user: config.username,
        password: config.password,
        host: config.host,
        port: config.port,
        tls: config.secure,
        tlsOptions: { rejectUnauthorized: false }
      });
      imap.once('ready', () => {
        imap.end();
        resolve({ success: true, message: 'Connection successful' });
      });
      imap.once('error', (err) => {
        console.error('IMAP connection error:', err);
        resolve({ success: false, error: err.message + (err.stack ? ('\n' + err.stack) : '') });
      });
      try {
        imap.connect();
      } catch (err) {
        console.error('IMAP connect() threw:', err);
        resolve({ success: false, error: err.message + (err.stack ? ('\n' + err.stack) : '') });
      }
    } else {
      // For Outlook/Exchange, you would implement different logic here
      // This is a simplified implementation
      resolve({ success: true, message: 'Outlook configuration saved (test not implemented)' });
    }
  });
}

// Helper function to test SMTP connection
async function testSmtpConnection(config) {
  return new Promise(async (resolve) => {
    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.username,
          pass: config.password
        }
      });
      
      // Verify SMTP connection
      await transporter.verify();
      resolve({ success: true, message: 'SMTP connection successful' });
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
}

// Helper function to fetch emails
async function fetchEmails(emailConfig, folder, limit) {
  // Fallbacks for common folders
  const folderFallbacks = {
    'Drafts': ['Drafts', 'INBOX.Drafts', '[Gmail]/Drafts'],
    'Sent': ['Sent', 'INBOX.Sent', '[Gmail]/Sent Mail', '[Gmail]/Sent'],
    'Junk': ['Junk', 'INBOX.Junk', '[Gmail]/Spam', 'Spam'],
    'Trash': ['Trash', 'INBOX.Trash', '[Gmail]/Trash'],
  };
  const tryFolders = folderFallbacks[folder] || [folder];

  return new Promise((resolve, reject) => {
    if (emailConfig.emailType === 'imap') {
      const imap = new Imap({
        user: emailConfig.username,
        password: emailConfig.password,
        host: emailConfig.host,
        port: emailConfig.port,
        tls: emailConfig.secure,
        tlsOptions: { rejectUnauthorized: false }
      });
      
      imap.once('ready', () => {
        // Try each folder variant in order
        let idx = 0;
        function tryNextFolder() {
          if (idx >= tryFolders.length) {
            imap.end();
            return reject(new Error('This folder does not exist for your account.'));
          }
          const tryFolder = tryFolders[idx++];
          imap.openBox(tryFolder, true, (err, box) => {
            if (err) {
              tryNextFolder();
              return;
          }
            if (!box || box.messages.total === 0) {
              // Folder exists but is empty
              imap.end();
              resolve([]);
              return;
            }
          const range = Math.max(1, box.messages.total - limit + 1) + ':*';
          const f = imap.seq.fetch(range, {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
            struct: true
          });
          const emails = [];
          f.on('message', (msg, seqno) => {
            const email = { seqno };
            msg.on('body', (stream, info) => {
              let buffer = '';
              stream.on('data', (chunk) => {
                buffer += chunk.toString('ascii');
              });
              stream.once('end', () => {
                email.headers = Imap.parseHeader(buffer);
              });
            });
            msg.once('end', () => {
              emails.push(email);
            });
          });
          f.once('error', (err) => {
            imap.end();
            reject(err);
          });
          f.once('end', () => {
            imap.end();
            resolve(emails.reverse()); // Newest first
          });
        });
        }
        tryNextFolder();
      });
      imap.once('error', (err) => {
        reject(err);
      });
      imap.connect();
    } else {
      // Implement Outlook/Exchange logic here
      resolve([]);
    }
  });
}

// Serve attachment by CID for inline images
router.get('/:id/emails/:seqno/attachment/:cid', authenticateToken, async (req, res) => {
  console.log('Attachment endpoint hit:', req.originalUrl);
  let imap = null;
  
  try {
    const emailConfig = await EmailConfig.findByPk(req.params.id);
    if (!emailConfig) {
      return res.status(404).json({ error: 'Email configuration not found' });
    }
    if (req.user.role !== 'admin' && emailConfig.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const seqno = req.params.seqno;
    const folder = req.query.folder || 'INBOX';
    const rawRequestedCid = req.params.cid;
    const cid = decodeURIComponent(rawRequestedCid).replace(/[<>]/g, '');
    
    const Imap = require('imap');
    imap = new Imap({
      user: emailConfig.username,
      password: emailConfig.password,
      host: emailConfig.host,
      port: emailConfig.port,
      tls: emailConfig.secure,
      tlsOptions: { rejectUnauthorized: false }
    });

    // Add timeout to prevent hanging connections
    const timeout = setTimeout(() => {
      if (imap) {
        imap.end();
      }
      if (!res.headersSent) {
        res.status(408).json({ error: 'Request timeout' });
      }
    }, 30000); // 30 second timeout

    imap.once('ready', () => {
      imap.openBox(folder, true, (err, box) => {
        if (err) {
          clearTimeout(timeout);
          imap.end();
          return res.status(500).json({ error: 'Failed to open folder', message: err.message });
        }
        
        const f = imap.seq.fetch(seqno, { bodies: '', struct: true });
        let raw = '';
        
        f.on('message', (msg) => {
          msg.on('body', (stream) => {
            stream.on('data', (chunk) => {
              raw += chunk.toString('utf8');
            });
          });
          
          msg.once('end', async () => {
            try {
              let parsedContent = await robustParseMimeContent(raw);
              
              // Debug: log all available CIDs and the requested CID
              const availableCids = (parsedContent.attachments || []).map(att => {
                return att.headers && att.headers['content-id'] ? att.headers['content-id'][0] : '';
              });
              const availableFilenames = (parsedContent.attachments || []).map(att => att.filename);
              console.log('Requested CID or filename:', cid);
              console.log('Available CIDs:', availableCids);
              console.log('Available attachment filenames:', availableFilenames);
              
              // Try to find by CID first
              let attachment = (parsedContent.attachments || []).find(att => {
                // Some content-ids are wrapped in <...>
                const attCid = att.headers && att.headers['content-id'] ? att.headers['content-id'][0].replace(/[<>]/g, '') : '';
                return attCid === cid;
              });
              
              // Fallback: try to find by filename if not found by CID
              if (!attachment) {
                attachment = (parsedContent.attachments || []).find(att => att.filename === cid);
              }
              
              if (!attachment) {
                clearTimeout(timeout);
                imap.end();
                return res.status(404).json({ error: 'Attachment not found' });
              }
              
              console.log('Attachment debug:', {
                filename: attachment.filename,
                encoding: (attachment.headers && attachment.headers['content-transfer-encoding'] && attachment.headers['content-transfer-encoding'][0]) || '',
                contentType: attachment.contentType,
                contentIsBuffer: Buffer.isBuffer(attachment.content),
                contentTypeOf: typeof attachment.content,
                contentPreview: Buffer.isBuffer(attachment.content)
                  ? attachment.content.slice(0, 20).toString('hex')
                  : (typeof attachment.content === 'string' ? attachment.content.slice(0, 100) : String(attachment.content).slice(0, 100)),
                contentLength: Buffer.isBuffer(attachment.content)
                  ? attachment.content.length
                  : (typeof attachment.content === 'string' ? attachment.content.length : String(attachment.content).length)
              });
              
              res.setHeader('Content-Type', (attachment.contentType?.split(';')[0] || 'application/octet-stream'));
              // Sanitize filename for Content-Disposition header to prevent "Invalid character" errors
              const sanitizedFilename = (attachment.filename || cid || 'attachment')
                .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
                .replace(/[^\x20-\x7E]/g, '_') // Replace non-ASCII with '_'
                .substring(0, 100); // Limit length
              res.setHeader('Content-Disposition', `inline; filename="${sanitizedFilename}"`);
              
              console.log('Sending image buffer:', {
                filename: attachment.filename,
                bufferLength: Buffer.isBuffer(attachment.content) ? attachment.content.length : String(attachment.content).length,
                bufferPreview: Buffer.isBuffer(attachment.content) ? attachment.content.slice(0, 20).toString('hex') : String(attachment.content).slice(0, 20)
              });
              
              let contentBuffer;
              if (Buffer.isBuffer(attachment.content)) {
                contentBuffer = attachment.content;
              } else if (typeof attachment.content === 'string') {
                // Try to detect base64 encoding
                const encoding = (attachment.headers && attachment.headers['content-transfer-encoding'] && attachment.headers['content-transfer-encoding'][0]) || '';
                if (encoding.toLowerCase() === 'base64') {
                  contentBuffer = Buffer.from(attachment.content.replace(/\s/g, ''), 'base64');
                } else {
                  contentBuffer = Buffer.from(attachment.content, 'utf8');
                }
              } else {
                contentBuffer = Buffer.from(String(attachment.content));
              }
              
              clearTimeout(timeout);
              res.end(contentBuffer);
              imap.end();
              
            } catch (parseError) {
              console.error('Error parsing email content:', parseError);
              clearTimeout(timeout);
              imap.end();
              if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to parse email content', message: parseError.message });
              }
            }
          });
        });
        
        f.once('error', (err) => {
          console.error('Fetch error:', err);
          clearTimeout(timeout);
          imap.end();
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to fetch email', message: err.message });
          }
        });
      });
    });
    
    imap.once('error', (err) => {
      console.error('IMAP connection error:', err);
      clearTimeout(timeout);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to connect to IMAP', message: err.message });
      }
    });
    
    imap.once('end', () => {
      clearTimeout(timeout);
    });
    
    imap.connect();
    
  } catch (error) {
    console.error('Attachment route error:', error);
    if (imap) {
      imap.end();
    }
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to fetch attachment', message: error.message });
    }
  }
});

// Delete an email by seqno and folder (move to Trash)
router.delete('/:id/emails/:seqno', authenticateToken, async (req, res) => {
  try {
    const emailConfig = await EmailConfig.findByPk(req.params.id);
    if (!emailConfig) {
      return res.status(404).json({ error: 'Email configuration not found' });
    }
    if (req.user.role !== 'admin' && emailConfig.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const seqno = req.params.seqno;
    const folder = req.query.folder || 'INBOX';
    const trashFolders = ['INBOX.Trash'];
    const Imap = require('imap');
    const imap = new Imap({
      user: emailConfig.username,
      password: emailConfig.password,
      host: emailConfig.host,
      port: emailConfig.port,
      tls: emailConfig.secure,
      tlsOptions: { rejectUnauthorized: false }
    });
    imap.once('ready', () => {
      imap.openBox(folder, false, (err, box) => {
        if (err) {
          imap.end();
          return res.status(500).json({ error: 'Failed to open folder', message: err.message });
        }
        // Fetch the raw message
        const f = imap.seq.fetch(seqno, { bodies: '', struct: true });
        let raw = '';
        f.on('message', (msg) => {
          msg.on('body', (stream) => {
            stream.on('data', (chunk) => {
              raw += chunk.toString('utf8');
            });
          });
        });
        f.once('end', () => {
          // Try to copy to Trash
          function tryNextTrash(idx) {
            if (idx >= trashFolders.length) {
              // Could not copy to any Trash folder
              markAndExpunge();
              return;
            }
            const trash = trashFolders[idx];
            imap.copy(seqno, trash, (err) => {
              if (err) {
                // Try next trash folder
                tryNextTrash(idx + 1);
              } else {
                // Success, now mark as deleted and expunge
                markAndExpunge();
              }
            });
          }
          function markAndExpunge() {
            imap.seq.addFlags(seqno, '\\Deleted', (err) => {
              if (err) {
                imap.end();
                return res.status(500).json({ error: 'Failed to mark email as deleted', message: err.message });
              }
              imap.expunge((err) => {
                imap.end();
                if (err) {
                  return res.status(500).json({ error: 'Failed to expunge email', message: err.message });
                }
                res.json({ message: 'Email moved to Trash' });
              });
            });
          }
          tryNextTrash(0);
        });
        f.once('error', (err) => {
          imap.end();
          return res.status(500).json({ error: 'Failed to fetch email for deletion', message: err.message });
        });
      });
    });
    imap.once('error', (err) => {
      res.status(500).json({ error: 'Failed to connect to IMAP', message: err.message });
    });
    imap.connect();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete email', message: error.message });
  }
});

// Mark email as read/unread
router.patch('/:id/emails/:seqno/read', authenticateToken, async (req, res) => {
  try {
    const emailConfig = await EmailConfig.findByPk(req.params.id);
    if (!emailConfig) {
      return res.status(404).json({ error: 'Email configuration not found' });
    }
    if (req.user.role !== 'admin' && emailConfig.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const folder = req.query.folder || 'INBOX';
    const markRead = req.body.read;
    const imap = new Imap({
      user: emailConfig.username,
      password: emailConfig.password,
      host: emailConfig.host,
      port: emailConfig.port,
      tls: emailConfig.secure,
      tlsOptions: { rejectUnauthorized: false }
    });
    imap.once('ready', () => {
      imap.openBox(folder, false, (err, box) => {
        if (err) {
          imap.end();
          return res.status(500).json({ error: 'Failed to open folder', message: err.message });
        }
        const seqno = req.params.seqno;
        const cb = (err2) => {
          imap.end();
          if (err2) {
            return res.status(500).json({ error: 'Failed to update read status', message: err2.message });
          }
          res.json({ success: true });
        };
        if (markRead) {
          imap.seq.addFlags(seqno, '\\Seen', cb);
        } else {
          imap.seq.delFlags(seqno, '\\Seen', cb);
        }
      });
    });
    imap.once('error', (err) => {
      res.status(500).json({ error: 'IMAP error', message: err.message });
    });
    imap.connect();
  } catch (error) {
    res.status(500).json({ error: 'Failed to update read status', message: error.message });
  }
});

// Move email to another folder
router.post('/:id/emails/:seqno/move', authenticateToken, async (req, res) => {
  try {
    const emailConfig = await EmailConfig.findByPk(req.params.id);
    if (!emailConfig) {
      return res.status(404).json({ error: 'Email configuration not found' });
    }
    if (req.user.role !== 'admin' && emailConfig.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const seqno = req.params.seqno;
    const sourceFolder = req.query.folder || 'INBOX';
    const targetFolder = req.body.targetFolder;
    if (!targetFolder) {
      return res.status(400).json({ error: 'Target folder is required' });
    }
    const imap = new Imap({
      user: emailConfig.username,
      password: emailConfig.password,
      host: emailConfig.host,
      port: emailConfig.port,
      tls: emailConfig.secure,
      tlsOptions: { rejectUnauthorized: false }
    });
    imap.once('ready', () => {
      imap.openBox(sourceFolder, false, (err, box) => {
        if (err) {
          imap.end();
          return res.status(500).json({ error: 'Failed to open source folder', message: err.message });
        }
        imap.copy(seqno, targetFolder, (err2) => {
          if (err2) {
            imap.end();
            return res.status(500).json({ error: 'Failed to copy email', message: err2.message });
          }
          // Mark as deleted in source and expunge
          imap.seq.addFlags(seqno, '\\Deleted', (err3) => {
            if (err3) {
              imap.end();
              return res.status(500).json({ error: 'Failed to mark as deleted', message: err3.message });
            }
            imap.expunge((err4) => {
              imap.end();
              if (err4) {
                return res.status(500).json({ error: 'Failed to expunge email', message: err4.message });
              }
              res.json({ success: true });
            });
          });
        });
      });
    });
    imap.once('error', (err) => {
      res.status(500).json({ error: 'IMAP error', message: err.message });
    });
    imap.connect();
  } catch (error) {
    res.status(500).json({ error: 'Failed to move email', message: error.message });
  }
});

module.exports = router;
