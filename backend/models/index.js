const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Initialize Sequelize with MySQL
// Required .env variables:
// DB_HOST=localhost
// DB_PORT=3306
// DB_NAME=it_support
// DB_USER=it_user
// DB_PASS=yourpassword
const sequelize = new Sequelize(
  process.env.DB_NAME || 'it_support',
  process.env.DB_USER || 'it_user',
  process.env.DB_PASS || 'yourpassword',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Use SQLite for local development
// const sequelize = new Sequelize({
//   dialect: 'sqlite',
//   storage: './backend/database/it_support.db',
//   logging: false
// });

// User Model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'user'),
    defaultValue: 'user'
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  department: {
    type: DataTypes.STRING
  },
  phone: {
    type: DataTypes.STRING
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE
  },
  emailSignature: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

// Support Ticket Model
const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'pending', 'resolved', 'closed'),
    defaultValue: 'open'
  },
  category: {
    type: DataTypes.STRING
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  createdBy: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  resolvedAt: {
    type: DataTypes.DATE
  },
  dueDate: {
    type: DataTypes.DATE
  },
  report: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  indexes: [
    { fields: ['createdBy'] },
    { fields: ['assignedTo'] },
    { fields: ['status'] },
    { fields: ['priority'] }
  ]
});

// Ticket Comment Model
const TicketComment = sequelize.define('TicketComment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  ticketId: {
    type: DataTypes.INTEGER,
    references: {
      model: Ticket,
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  isInternal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// Ticket Attachment Model
const TicketAttachment = sequelize.define('TicketAttachment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  originalName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fileSize: {
    type: DataTypes.INTEGER
  },
  mimeType: {
    type: DataTypes.STRING
  },
  ticketId: {
    type: DataTypes.INTEGER,
    references: {
      model: Ticket,
      key: 'id'
    }
  },
  uploadedBy: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  commentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'TicketComments',
      key: 'id'
    }
  }
});

// Employee Model
const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  employeeId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true
    }
  },
  emailPass: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING
  },
  device: {
    type: DataTypes.JSON
  },
  location: {
    type: DataTypes.ENUM('factor', 'maadi', 'oroba', 'mansoria', 'banisuef'),
    allowNull: false
  },
  position: {
    type: DataTypes.STRING
  },
  systemCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  systemPass1: {
    type: DataTypes.STRING,
    allowNull: true
  },
  systemPass2: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
});

// Custom Data Table Model (for flexible data storage)
const CustomDataTable = sequelize.define('CustomDataTable', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tableName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tableData: {
    type: DataTypes.TEXT, // JSON string
    allowNull: false
  },
  createdBy: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  }
});

// Email Configuration Model
const EmailConfig = sequelize.define('EmailConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  emailType: {
    type: DataTypes.ENUM('imap', 'outlook'),
    allowNull: false
  },
  // IMAP settings for receiving emails
  host: {
    type: DataTypes.STRING,
    allowNull: false
  },
  port: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  secure: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // SMTP settings for sending emails
  smtpHost: {
    type: DataTypes.STRING,
    allowNull: false
  },
  smtpPort: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  smtpUsername: {
    type: DataTypes.STRING,
    allowNull: false
  },
  smtpPassword: {
    type: DataTypes.STRING,
    allowNull: false
  },
  smtpSecure: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  signature: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

// Permission Request Model
const PermissionRequest = sequelize.define('PermissionRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  pageName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  requestedBy: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  attachment: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['requestedBy'] },
    { fields: ['status'] }
  ]
});

// UserSetting Model
const UserSetting = sequelize.define('UserSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    },
    unique: true
  },
  theme: {
    type: DataTypes.STRING,
    defaultValue: 'light'
  },
  notifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

User.hasOne(UserSetting, { foreignKey: 'userId', as: 'settings', onDelete: 'CASCADE' });
UserSetting.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

// Define Associations with cascade deletes
User.hasMany(Ticket, { foreignKey: 'createdBy', as: 'createdTickets', onDelete: 'CASCADE' });
User.hasMany(Ticket, { foreignKey: 'assignedTo', as: 'assignedTickets', onDelete: 'SET NULL' });
Ticket.belongsTo(User, { foreignKey: 'createdBy', as: 'creator', onDelete: 'CASCADE' });
Ticket.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee', onDelete: 'SET NULL' });

Ticket.hasMany(TicketComment, { foreignKey: 'ticketId', as: 'comments', onDelete: 'CASCADE' });
TicketComment.belongsTo(Ticket, { foreignKey: 'ticketId', onDelete: 'CASCADE' });
TicketComment.belongsTo(User, { foreignKey: 'userId', as: 'author', onDelete: 'CASCADE' });

Ticket.hasMany(TicketAttachment, { foreignKey: 'ticketId', as: 'attachments', onDelete: 'CASCADE' });
TicketAttachment.belongsTo(Ticket, { foreignKey: 'ticketId', onDelete: 'CASCADE' });
TicketAttachment.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader', onDelete: 'SET NULL' });
TicketAttachment.belongsTo(TicketComment, { foreignKey: 'commentId', as: 'comment', onDelete: 'CASCADE' });
TicketComment.hasMany(TicketAttachment, { foreignKey: 'commentId', as: 'attachments', onDelete: 'CASCADE' });

User.hasMany(EmailConfig, { foreignKey: 'userId', as: 'emailConfigs', onDelete: 'CASCADE' });
EmailConfig.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });

User.hasMany(CustomDataTable, { foreignKey: 'createdBy', as: 'customTables', onDelete: 'CASCADE' });
CustomDataTable.belongsTo(User, { foreignKey: 'createdBy', as: 'creator', onDelete: 'CASCADE' });

User.hasMany(PermissionRequest, { foreignKey: 'requestedBy', as: 'permissionRequests', onDelete: 'CASCADE' });
PermissionRequest.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester', onDelete: 'CASCADE' });

// Errand Request Model
const ErrandRequest = sequelize.define('ErrandRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  requestDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  requesterName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  requesterEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  requesterPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  requestedBy: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['requestedBy'] },
    { fields: ['status'] },
  ]
});

// Errand Request Associations
User.hasMany(ErrandRequest, { foreignKey: 'requestedBy', as: 'errandRequests', onDelete: 'CASCADE' });
ErrandRequest.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester', onDelete: 'CASCADE' });

// Errand Model (separate from ErrandRequest)
const Errand = sequelize.define('Errand', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  requestDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  requesterName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  requesterEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  requesterPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  indexes: [
    { fields: ['userId'] },
    { fields: ['status'] },
  ]
});

// Todo Model
const Todo = sequelize.define('Todo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  text: {
    type: DataTypes.STRING,
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium'
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdBy: {
    type: DataTypes.INTEGER,
    field: 'created_by', // Explicitly specify the column name
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  tableName: 'Todos',
  indexes: [
    { fields: ['created_by'] }, // <-- استخدم اسم العمود الفعلي
    { fields: ['completed'] },
    { fields: ['priority'] }
  ]
});

// Todo Share Model
const TodoShare = sequelize.define('TodoShare', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  todoId: {
    type: DataTypes.INTEGER,
    references: {
      model: Todo,
      key: 'id'
    }
  },
  sharedWithUserId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  timestamps: true,
  createdAt: 'shared_at',
  updatedAt: false
});

// Todo Associations
User.hasMany(Todo, { foreignKey: 'createdBy', as: 'todos', onDelete: 'CASCADE' });
Todo.belongsTo(User, { foreignKey: 'createdBy', as: 'creator', onDelete: 'CASCADE' });

Todo.hasMany(TodoShare, { foreignKey: 'todoId', as: 'shares', onDelete: 'CASCADE' });
TodoShare.belongsTo(Todo, { foreignKey: 'todoId', onDelete: 'CASCADE' });
TodoShare.belongsTo(User, { foreignKey: 'sharedWithUserId', as: 'sharedWith', onDelete: 'CASCADE' });

// SharedTask model
const SharedTask = sequelize.define('SharedTask', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  text: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'created_by',
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true, // Make this field optional
    field: 'assigned_to',
  },
  frequency: {
    type: DataTypes.ENUM('daily', 'once'),
    allowNull: false,
    defaultValue: 'once',
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at',
    defaultValue: null,
  },
  completedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'completed_by',
    defaultValue: null,
  },
  completionHistory: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'completion_history',
    defaultValue: null,
  },
}, {
  tableName: 'shared_tasks',
  timestamps: false,
});

SharedTask.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });
SharedTask.belongsTo(User, { as: 'assignee', foreignKey: 'assignedTo' });
SharedTask.belongsTo(User, { as: 'completer', foreignKey: 'completedBy' });

// Notification model
const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  text: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'created_by',
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at',
  },
}, {
  tableName: 'notifications',
  timestamps: true,
  updatedAt: 'updated_at',
  createdAt: 'created_at',
});

Notification.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });

// ManagerPermission model
const ManagerPermission = sequelize.define('ManagerPermission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  managerId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  resourceType: { // 'page' or 'table'
    type: DataTypes.STRING,
    allowNull: false
  },
  resourceName: { // e.g., 'Tickets', 'Employees', 'Dashboard'
    type: DataTypes.STRING,
    allowNull: false
  }
});

// Anydesk Device Model
const AnydeskDevice = sequelize.define('AnydeskDevice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  anydeskId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  branch: {
    type: DataTypes.STRING,
    allowNull: false
  },
  notes: {
    type: DataTypes.STRING,
    allowNull: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = {
  sequelize,
  User,
  Ticket,
  TicketComment,
  TicketAttachment,
  Employee,
  CustomDataTable,
  EmailConfig,
  PermissionRequest,
  ErrandRequest,
  UserSetting,
  Todo,
  TodoShare,
  SharedTask,
  Notification,
  ManagerPermission,
  AnydeskDevice,
  Errand
};
