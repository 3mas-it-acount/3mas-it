const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const winston = require('winston');
const http = require('http');
const { Server } = require('socket.io');
const cluster = require('cluster');
const os = require('os');
const session = require('express-session');
// const RedisStore = require('connect-redis').default;
// const { createClient } = require('redis');
const MemoryStore = session.MemoryStore;
const cron = require('node-cron');
const { SharedTask } = require('./models');
const { exec } = require('child_process');

// Import database models
const { sequelize, User } = require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const ticketRoutes = require('./routes/tickets');
const employeeRoutes = require('./routes/employees');
const emailRoutes = require('./routes/email');
const customDataRoutes = require('./routes/customData');
const permissionsRoutes = require('./routes/permissions');
const errandRequestsRoutes = require('./routes/errandRequests');
const sharedTasksRoutes = require('./routes/sharedTasks');
const notificationRoutes = require('./routes/notification');
const managerPermissionsRoutes = require('./routes/managerPermissions');
const anydeskDevicesRouter = require('./routes/anydeskDevices');
const errandsRouter = require('./routes/errands');
const mysqldump = require('mysqldump');

const app = express();
const PORT = process.env.PORT || 4000;

// --- CORS configuration (must be first!) ---
app.use(cors({
  origin: [
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'http://10.10.0.82:3002'
  ],
  credentials: true,
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (dev)
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory with cache headers
app.use('/uploads', (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
  next();
}, express.static(uploadsDir));
app.use('/api/uploads', (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'public')));

// Redis client setup (DISABLED for development)
// const redisClient = createClient({
//   socket: { host: '127.0.0.1', port: 6379 }
// });
// redisClient.connect().catch(console.error);

app.use(session({
  store: new MemoryStore(),
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true if using HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/custom-data', customDataRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/errand-requests', errandRequestsRoutes);
app.use('/api/shared-tasks', sharedTasksRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/manager-permissions', managerPermissionsRoutes);
app.use('/api/anydesk-devices', anydeskDevicesRouter);
app.use('/api/errands', errandsRouter);

// Example: Set cache headers for a rarely-changing API endpoint
app.get('/api/app-version', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
  res.json({ version: '1.0.0' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Endpoint for initial online user count
app.get('/api/online-users', (req, res) => {
  res.json({ online: onlineUsers.size });
});

// Endpoint for initial online user list
app.get('/api/online-user-list', (req, res) => {
  res.json({ users: onlineUserDetails });
});

// The "catchall" handler: for any request that doesn't
// match one of the API routes, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware (should be last)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token'
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Winston logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    // You can add file transports here if needed
  ],
});

// --- SOCKET.IO SETUP FOR REAL-TIME ONLINE USERS ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3002',
      'http://127.0.0.1:3002'
    ],
    credentials: true
  }
});

// Make io accessible in routes via req.app.get('io')
app.set('io', io);

const onlineUsers = new Set();
let onlineUserDetails = [];
const jwt = require('jsonwebtoken');

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  console.log('Socket auth token:', token);
  if (!token) return next(new Error('No token provided'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded JWT:', decoded);
    socket.userId = decoded.userId;
    return next();
  } catch (err) {
    console.log('JWT error:', err);
    return next(new Error('Invalid token'));
  }
});

io.on('connection', async (socket) => {
  if (socket.userId) {
    onlineUsers.add(socket.userId);
    // Add user details if not already present
    if (!onlineUserDetails.some(u => u.id === socket.userId)) {
      try {
        const user = await User.findByPk(socket.userId, { attributes: ['id', 'firstName', 'lastName', 'email'] });
        if (user) {
          onlineUserDetails.push(user.toJSON());
        }
      } catch (e) {}
    }
    io.emit('onlineUserCount', onlineUsers.size);
    io.emit('onlineUserList', onlineUserDetails);
  }
  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      // Remove user details if no more sockets for this user
      if (![...io.sockets.sockets.values()].some(s => s.userId === socket.userId)) {
        onlineUserDetails = onlineUserDetails.filter(u => u.id !== socket.userId);
      }
      io.emit('onlineUserCount', onlineUsers.size);
      io.emit('onlineUserList', onlineUserDetails);
    }
  });
});

// جدولة مهمة يومية لإزالة علامة مكتمل من المهام اليومية
cron.schedule('0 0 * * *', async () => {
  try {
    await SharedTask.update(
      { completed: false },
      { where: { frequency: 'daily' } }
    );
    const io = app.get('io');
    if (io) {
      io.emit('sharedTaskUpdated', { frequency: 'daily', completed: false, reset: true });
    }
    console.log(`[CRON] Daily shared tasks reset at ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[CRON] Error resetting daily shared tasks:', err);
  }
});




// cron.schedule('0 2 * * *', async () => {
//   const backupDir = path.join(__dirname, '../database_backups');
//   if (!fs.existsSync(backupDir)) {
//     fs.mkdirSync(backupDir, { recursive: true });
//   }
//   const dateStr = new Date().toISOString().slice(0,10);
//   const backupPath = path.join(backupDir, `backup_${dateStr}.sql`);
//   try {
//     await mysqldump({
//       connection: {
//         host: 'localhost',
//         user: 'it_user',
//         password: 'yourpassword',
//         database: 'it_support',
//       },
//       dumpToFile: backupPath,
//     });
//     console.log(`[BACKUP] Database backup created at ${backupPath}`);
//   } catch (error) {
//     console.error('[BACKUP] Error:', error);
//   }
// });



// Daily -- Backup -- Database
cron.schedule('0 2 * * *', () => {
  const backupDir = path.join(__dirname, '../backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const dateStr = new Date().toISOString().slice(0,10);
  const backupPath = path.join(backupDir, `backup-daily_${dateStr}.sql`);
  const cmd = `"C:\\Program Files\\MySQL\\MySQL Server 9.3\\bin\\mysqldump.exe" -u it_user -p3masadmin it_support > "${backupPath}"`;
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`[BACKUP] Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`[BACKUP] Stderr: ${stderr}`);
      return;
    }
    console.log(`[BACKUP] Database backup created at ${backupPath}`);
  });
});

// Database connection and server startup
async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
    
    // Sync database models
    await sequelize.sync();
    logger.info('Database models synchronized.');
    
    // Create default admin user if it doesn't exist
    await createDefaultAdmin();
    
    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on http://0.0.0.0:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
      logger.info(`Socket.io enabled for real-time online users.`);
    });
  } catch (error) {
    logger.error(`Unable to start server: ${error.stack || error}`);
    process.exit(1);
  }
}

// Create default admin user
async function createDefaultAdmin() {
  try {
    const bcrypt = require('bcryptjs');
    const adminExists = await User.findOne({ where: { role: 'admin' } });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456', 12);
      
      await User.create({
        username: 'admin',
        email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@company.com',
        password: hashedPassword,
        role: 'admin',
        firstName: 'System',
        lastName: 'Administrator',
        department: 'IT',
        isActive: true
      });
      
      logger.info('Default admin user created successfully.');
    }
  } catch (error) {
    logger.error(`Error creating default admin user: ${error.stack || error}`);
  }
}

// Global error handlers to prevent crashes
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.stack || err}`);
  // Don't exit immediately, let the server try to continue
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  // Don't exit immediately, let the server try to continue
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

startServer();
