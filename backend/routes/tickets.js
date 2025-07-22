const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { Ticket, TicketComment, TicketAttachment, User } = require('../models');
const { authenticateToken, requireAdmin, requireAdminOrManager } = require('../middleware/auth');
const ExcelJS = require('exceljs');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow images and common document types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Get all tickets
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const priority = req.query.priority;
    const search = req.query.search;
    
    let where = {};
    
    // Non-admin users can only see their own tickets or tickets assigned to them
    const { Op } = require('sequelize');
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      where = {
        [Op.or]: [
          { createdBy: req.user.id },
          { assignedTo: req.user.id }
        ]
      };
    }
    
    // Add filters
    if (status) where.status = status;
    if (priority) where.priority = priority;
    
    // Add search functionality
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await Ticket.findAndCountAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: TicketComment, as: 'comments', include: [{ model: User, as: 'author', attributes: ['firstName', 'lastName'] }] },
        { model: TicketAttachment, as: 'attachments' }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      tickets: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalTickets: count
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tickets', message: error.message });
  }
});

// Get specific ticket
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { 
          model: TicketComment, 
          as: 'comments', 
          include: [{ model: User, as: 'author', attributes: ['firstName', 'lastName'] }],
          order: [['createdAt', 'ASC']]
        },
        { model: TicketAttachment, as: 'attachments' }
      ]
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Check access permissions
    if (req.user.role !== 'admin' && 
        ticket.createdBy !== req.user.id && 
        ticket.assignedTo !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ticket', message: error.message });
  }
});

// Create new ticket
router.post('/',
  authenticateToken,
  upload.array('attachments', 5),
  body('title').optional(),
  body('description').notEmpty(),
  body('priority').isIn(['low', 'medium', 'high', 'critical']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    console.log('req.body:', req.body);

    try {
      const { title, description, priority, category, dueDate } = req.body;
      
      const ticket = await Ticket.create({
        title,
        description,
        priority,
        category,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdBy: req.user.id
      });
      
      // Handle file attachments
      if (req.files && req.files.length > 0) {
        const attachments = req.files.map(file => ({
          fileName: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          ticketId: ticket.id,
          uploadedBy: req.user.id
        }));
        
        await TicketAttachment.bulkCreate(attachments);
      }
      
      // Fetch the created ticket with associations
      const createdTicket = await Ticket.findByPk(ticket.id, {
        include: [
          { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: TicketAttachment, as: 'attachments' }
        ]
      });
      
      // Emit real-time event for ticket creation
      req.app.get('io')?.emit('ticketCreated', createdTicket);
      
      res.status(201).json(createdTicket);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create ticket', message: error.message });
    }
  }
);

// Update ticket
router.put('/:id',
  authenticateToken,
  body('title').optional().notEmpty(),
  body('description').optional().notEmpty(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('status').optional().isIn(['open', 'in_progress', 'pending', 'resolved', 'closed']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const ticket = await Ticket.findByPk(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }
      
      // Check permissions
      if (req.user.role !== 'admin' && ticket.createdBy !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const updateData = { ...req.body };
      
      // Only admin can assign tickets
      if (req.body.assignedTo && req.user.role !== 'admin') {
        delete updateData.assignedTo;
      }
      
      // Set resolved date when status changes to resolved
      if (req.body.status === 'resolved' && ticket.status !== 'resolved') {
        updateData.resolvedAt = new Date();
      }
      
      await ticket.update(updateData);
      
      const updatedTicket = await Ticket.findByPk(ticket.id, {
        include: [
          { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: TicketAttachment, as: 'attachments' }
        ]
      });
      
      // Emit real-time event for ticket update
      req.app.get('io')?.emit('ticketUpdated', updatedTicket);
      
      res.json(updatedTicket);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update ticket', message: error.message });
    }
  }
);

// Add comment to ticket
router.post('/:id/comments',
  authenticateToken,
  upload.array('attachments', 5),
  body('content').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const ticket = await Ticket.findByPk(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }
      
      // Check access permissions
      if (req.user.role !== 'admin' && 
          ticket.createdBy !== req.user.id && 
          ticket.assignedTo !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const { content, isInternal } = req.body;
      
      const comment = await TicketComment.create({
        content,
        isInternal: isInternal === 'true',
        ticketId: ticket.id,
        userId: req.user.id
      });
      
      // Handle file attachments for comments
      if (req.files && req.files.length > 0) {
        const attachments = req.files.map(file => ({
          fileName: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          ticketId: ticket.id,
          commentId: comment.id,
          uploadedBy: req.user.id
        }));
        
        await TicketAttachment.bulkCreate(attachments);
      }
      
      const createdComment = await TicketComment.findByPk(comment.id, {
        include: [
          { model: User, as: 'author', attributes: ['firstName', 'lastName'] },
          { model: TicketAttachment, as: 'attachments' }
        ]
      });
      
      res.status(201).json(createdComment);
    } catch (error) {
      res.status(500).json({ error: 'Failed to add comment', message: error.message });
    }
  }
);

// Assign ticket (admin only)
router.put('/:id/assign', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const ticket = await Ticket.findByPk(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    if (assignedTo) {
      const assignee = await User.findByPk(assignedTo);
      if (!assignee) {
        return res.status(404).json({ error: 'Assignee not found' });
      }
    }
    
    await ticket.update({ assignedTo });
    
    const updatedTicket = await Ticket.findByPk(ticket.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });
    
    res.json(updatedTicket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign ticket', message: error.message });
  }
});

// Delete ticket (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    await ticket.destroy();
    // Emit real-time event for ticket deletion
    req.app.get('io')?.emit('ticketDeleted', { id: req.params.id });
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete ticket', message: error.message });
  }
});

// Download ticket attachment
router.get('/attachment/:attachmentId', authenticateToken, async (req, res) => {
  try {
    const attachment = await TicketAttachment.findByPk(req.params.attachmentId, {
      include: [{ model: Ticket, as: 'Ticket' }]
    });
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    // Check access permissions
    const ticket = await Ticket.findByPk(attachment.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (
      req.user.role !== 'admin' &&
      ticket.createdBy !== req.user.id &&
      ticket.assignedTo !== req.user.id
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }
    // Serve the file
    const filePath = path.join(__dirname, '..', attachment.filePath);
    if (attachment.mimeType) {
      res.setHeader('Content-Type', attachment.mimeType);
    }
    res.download(filePath, attachment.originalName);
  } catch (error) {
    res.status(500).json({ error: 'Failed to download attachment', message: error.message });
  }
});

// Get all comments for a ticket
router.get('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    const comments = await TicketComment.findAll({
      where: { ticketId: ticket.id },
      include: [
        { model: User, as: 'author', attributes: ['firstName', 'lastName'] },
        { model: TicketAttachment, as: 'attachments' } // مهم لإرجاع المرفقات مع كل تعليق
      ],
      order: [['createdAt', 'ASC']]
    });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments', message: error.message });
  }
});

// Get all attachments for a ticket (including comment attachments)
router.get('/:id/all-attachments', authenticateToken, async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    // Check access permissions
    if (
      req.user.role !== 'admin' &&
      ticket.createdBy !== req.user.id &&
      ticket.assignedTo !== req.user.id
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const attachments = await TicketAttachment.findAll({
      where: { ticketId: ticket.id },
      include: [{ model: User, as: 'uploader', attributes: ['firstName', 'lastName'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(attachments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attachments', message: error.message });
  }
});

// Get the report for a ticket (admin only, but GET can be open if you want to show to all)
router.get('/:id/report', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ report: ticket.report || '' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch report', message: error.message });
  }
});

// Update the report for a ticket (admin only)
router.put('/:id/report', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    ticket.report = req.body.report || '';
    await ticket.save();
    res.json({ report: ticket.report });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update report', message: error.message });
  }
});

// Export tickets to Excel
router.get('/export-excel', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Fetch all tickets with details
    const tickets = await Ticket.findAll({
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: TicketComment, as: 'comments', include: [{ model: User, as: 'author', attributes: ['firstName', 'lastName'] }] },
        { model: TicketAttachment, as: 'attachments' }
      ],
      order: [['createdAt', 'DESC']]
    });

    const workbook = new ExcelJS.Workbook();
    // Sheet 1: All tickets summary
    const summarySheet = workbook.addWorksheet('Tickets Summary');
    summarySheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Priority', key: 'priority', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Assigned To', key: 'assignedTo', width: 20 },
      { header: 'Created By', key: 'createdBy', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Due Date', key: 'dueDate', width: 20 },
      { header: 'Resolved At', key: 'resolvedAt', width: 20 },
    ];
    tickets.forEach(ticket => {
      summarySheet.addRow({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        category: ticket.category,
        assignedTo: ticket.assignee ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}` : '',
        createdBy: ticket.creator ? `${ticket.creator.firstName} ${ticket.creator.lastName}` : '',
        createdAt: ticket.createdAt ? ticket.createdAt.toISOString().slice(0, 19).replace('T', ' ') : '',
        dueDate: ticket.dueDate ? ticket.dueDate.toISOString().slice(0, 19).replace('T', ' ') : '',
        resolvedAt: ticket.resolvedAt ? ticket.resolvedAt.toISOString().slice(0, 19).replace('T', ' ') : '',
      });
    });

    // Sheet per ticket: Detailed info
    for (const ticket of tickets) {
      const sheet = workbook.addWorksheet(`Ticket #${ticket.id}`);
      sheet.addRow(['ID', ticket.id]);
      sheet.addRow(['Title', ticket.title]);
      sheet.addRow(['Description', ticket.description]);
      sheet.addRow(['Priority', ticket.priority]);
      sheet.addRow(['Status', ticket.status]);
      sheet.addRow(['Category', ticket.category]);
      sheet.addRow(['Assigned To', ticket.assignee ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}` : '']);
      sheet.addRow(['Created By', ticket.creator ? `${ticket.creator.firstName} ${ticket.creator.lastName}` : '']);
      sheet.addRow(['Created At', ticket.createdAt ? ticket.createdAt.toISOString().slice(0, 19).replace('T', ' ') : '']);
      sheet.addRow(['Due Date', ticket.dueDate ? ticket.dueDate.toISOString().slice(0, 19).replace('T', ' ') : '']);
      sheet.addRow(['Resolved At', ticket.resolvedAt ? ticket.resolvedAt.toISOString().slice(0, 19).replace('T', ' ') : '']);
      sheet.addRow([]);
      // Comments
      sheet.addRow(['Comments']);
      sheet.addRow(['Author', 'Content', 'Created At']);
      (ticket.comments || []).forEach(comment => {
        sheet.addRow([
          comment.author ? `${comment.author.firstName} ${comment.author.lastName}` : '',
          comment.content,
          comment.createdAt ? comment.createdAt.toISOString().slice(0, 19).replace('T', ' ') : ''
        ]);
      });
      sheet.addRow([]);
      // Attachments
      sheet.addRow(['Attachments']);
      sheet.addRow(['File Name', 'Original Name', 'Size', 'Uploaded By']);
      (ticket.attachments || []).forEach(att => {
        sheet.addRow([
          att.fileName,
          att.originalName,
          att.fileSize,
          att.uploadedBy
        ]);
      });
      sheet.addRow([]);
      // Report
      sheet.addRow(['Report']);
      sheet.addRow([ticket.report || '']);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="tickets_report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to export tickets', message: error.message });
  }
});

module.exports = router;
