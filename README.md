# IT Support Web Application

A comprehensive IT support and helpdesk management system built with Node.js, Express, React, and SQLite.

## Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin/User)
- Secure password hashing

### 🎫 Support Ticket System
- Create, view, and manage support tickets
- File attachments (images, documents)
- Comments and internal notes
- Ticket status tracking and assignments
- Priority levels (low, medium, high, critical)

### 👥 User Management (Admin)
- Create and manage user accounts
- Role assignment and permissions
- User activation/deactivation

### 🏢 Employee Database (Admin)
- Comprehensive employee records
- Department and position tracking
- Search and filter capabilities

### 📧 Email Integration
- **Easy Account Setup**: Auto-detect and configure popular email providers (Gmail, Outlook, Yahoo, iCloud)
- **Send to Any Recipient**: Send emails to any email address using your configured accounts
- **IMAP & SMTP Support**: Full email reading and sending capabilities
- **Multiple Accounts**: Manage multiple email accounts in one interface
- **Rich Email Features**: 
  - HTML email composition with signatures
  - File attachments
  - Reply, Reply All, Forward functionality
  - Email search and filtering
  - Folder management (Inbox, Sent, Drafts, etc.)
  - Read/unread status tracking
  - Email deletion and moving between folders

### 📊 Custom Data Tables (Admin)
- Flexible data storage system
- Custom table creation and management

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Copy `.env` file and update with your settings
   - Default admin credentials are provided

4. Start the backend server:
```bash
npm start
```

The backend will run on `http://localhost:3000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3001`

## Default Login Credentials

**Admin Account:**
- Email: `admin@company.com`
- Password: `admin123456`

## Email Setup Instructions

### Gmail
1. Enable 2-Factor Authentication in your Google Account
2. Generate an App Password: Google Account → Security → App Passwords
3. Use the App Password instead of your regular password

### Outlook/Hotmail
1. Enable 2-Factor Authentication if not already enabled
2. Generate an App Password in your Microsoft Account settings
3. Use the App Password for authentication

### Yahoo Mail
1. Go to Yahoo Account Security settings
2. Generate an App Password
3. Use the App Password instead of your regular password

### iCloud Mail
1. Enable 2-Factor Authentication in your Apple ID settings
2. Generate an App Password
3. Use the App Password for authentication

### Custom IMAP/SMTP
- Enter your own server settings for custom email providers
- Ensure SSL/TLS settings match your provider's requirements

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Users (Admin only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Tickets
- `GET /api/tickets` - Get user's tickets
- `POST /api/tickets` - Create new ticket
- `GET /api/tickets/:id` - Get ticket details
- `PUT /api/tickets/:id` - Update ticket
- `POST /api/tickets/:id/comments` - Add comment

### Employees (Admin only)
- `GET /api/employees` - Get all employees
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Email
- `GET /api/email` - Get email configurations
- `POST /api/email` - Create email config
- `GET /api/email/:id/emails` - Fetch emails

## Technology Stack

### Backend
- **Node.js & Express** - Server framework
- **SQLite & Sequelize** - Database and ORM
- **JWT** - Authentication
- **Multer** - File uploads
- **Nodemailer & IMAP** - Email integration
- **bcryptjs** - Password hashing

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **React Query** - Data fetching
- **React Hook Form** - Form management
- **Axios** - HTTP client
- **Lucide React** - Icons

## Project Structure

```
it-support-app/
├── backend/
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Authentication middleware
│   ├── uploads/         # File uploads
│   ├── server.js        # Express server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   ├── services/    # API services
│   │   └── utils/       # Utility functions
│   ├── public/
│   └── package.json
└── database/
    └── it_support.db    # SQLite database
```

## Development

### Adding New Features
1. Backend: Add routes in `/backend/routes/`
2. Frontend: Add components in `/frontend/src/components/`
3. Update API services in `/frontend/src/services/api.js`

### Database Changes
- Models are defined in `/backend/models/index.js`
- Sequelize will auto-sync changes in development

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- Input validation and sanitization
- File type restrictions for uploads
- Rate limiting on API endpoints
- CORS protection

## Future Enhancements

- Real-time notifications
- Advanced reporting and analytics
- Mobile application
- Multi-language support
- Advanced email templates
- Integration with external tools

## License

MIT License - see LICENSE file for details

## Support

For support and questions, please create an issue in the repository or contact the development team.
