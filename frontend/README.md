# IT Support App - Frontend

A modern, responsive React application for IT support management with enhanced UI/UX components.

## 🚀 Features

### Core Features
- **User Authentication & Authorization**
- **Employee Management**
- **Ticket Management**
- **Device Management**
- **Permission Requests**
- **Manager Dashboard**
- **Admin Panel**

### UI/UX Enhancements
- **Dark Mode Support** - Complete dark theme with toggle
- **Responsive Design** - Works on all devices
- **Accessibility** - WCAG compliant with ARIA labels
- **Smooth Animations** - Professional transitions and effects
- **Modern Components** - Reusable, customizable UI components

## 🎨 UI Components

### Core Components

#### 1. DarkModeToggle
A smooth animated toggle for switching between light and dark themes.

```jsx
import DarkModeToggle from '../components/DarkModeToggle';

<DarkModeToggle />
```

**Features:**
- Persistent theme preference
- System preference detection
- Smooth icon transitions
- Accessible with ARIA labels

#### 2. Tooltip
Smart positioning tooltip component with multiple positions.

```jsx
import Tooltip from '../components/Tooltip';

<Tooltip content="Helpful hint" position="top">
  <button>Hover me</button>
</Tooltip>
```

**Features:**
- Multiple positions (top, bottom, left, right)
- Viewport boundary detection
- Smooth animations
- Accessibility support

#### 3. ActivityFeed
Real-time activity display component for dashboards.

```jsx
import ActivityFeed from '../components/ActivityFeed';

<ActivityFeed activities={activities} />
```

**Features:**
- Time-ago formatting
- Color-coded activity types
- Empty state handling
- Sample data generation

#### 4. ConfirmationDialog
Reusable confirmation dialog for critical actions.

```jsx
import ConfirmationDialog from '../components/ConfirmationDialog';

<ConfirmationDialog
  isOpen={showDialog}
  onClose={() => setShowDialog(false)}
  onConfirm={handleConfirm}
  title="Delete Item"
  message="Are you sure you want to delete this item?"
  type="danger"
/>
```

**Features:**
- Multiple types (warning, danger, info)
- Loading states
- Customizable buttons
- Smooth animations

#### 5. Pagination
Comprehensive pagination component with items per page selection.

```jsx
import Pagination from '../components/Pagination';

<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={handlePageChange}
  totalItems={totalItems}
  itemsPerPage={itemsPerPage}
  showItemsPerPage={true}
  onItemsPerPageChange={handleItemsPerPageChange}
/>
```

**Features:**
- Smart page number display
- Items per page selection
- Accessibility support
- Responsive design

#### 6. DataTable
Advanced data table with sorting, filtering, and pagination.

```jsx
import DataTable from '../components/DataTable';

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', filterable: true },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> }
];

<DataTable
  data={data}
  columns={columns}
  title="Users"
  searchable={true}
  filterable={true}
  sortable={true}
  pagination={true}
  exportable={true}
  onExport={handleExport}
/>
```

**Features:**
- Column sorting
- Global search
- Column filtering
- Pagination
- Export functionality
- Loading states
- Empty states

#### 7. Notification System
Comprehensive notification system with multiple types and positions.

```jsx
import { useNotifications, NotificationContainer } from '../components/Notification';

const { showSuccess, showError, showWarning, showInfo, notifications, removeNotification } = useNotifications();

// Show notifications
showSuccess('Operation completed successfully!');
showError('Something went wrong');
showWarning('Please check your input');
showInfo('New update available');

// Render container
<NotificationContainer 
  notifications={notifications} 
  onClose={removeNotification}
  position="top-right"
/>
```

**Features:**
- Multiple types (success, error, warning, info)
- Auto-dismiss with progress bar
- Multiple positions
- Action buttons
- Persistent notifications

## 🎯 Manager Dashboard Features

### Enhanced Dashboard
- **Quick Stats Cards** - Visual representation of key metrics
- **Activity Feed** - Real-time activity display
- **Dark Mode Toggle** - Theme switching
- **Enhanced Tables** - Better styling and interactions
- **Improved Modals** - Better user experience
- **Search & Filter** - Advanced filtering capabilities
- **Export Functionality** - Excel export with better error handling

### Key Improvements
- **Responsive Design** - Works perfectly on all screen sizes
- **Accessibility** - Full ARIA support and keyboard navigation
- **Smooth Animations** - Professional transitions
- **Better UX** - Loading states, error handling, user feedback
- **Modern UI** - Clean, professional design

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

### Environment Variables
Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENVIRONMENT=development
```

## 📁 Project Structure

```
frontend/
├── public/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── DarkModeToggle.jsx
│   │   ├── Tooltip.jsx
│   │   ├── ActivityFeed.jsx
│   │   ├── ConfirmationDialog.jsx
│   │   ├── Pagination.jsx
│   │   ├── DataTable.jsx
│   │   └── Notification.jsx
│   ├── pages/              # Page components
│   │   ├── ManagerDashboard.jsx
│   │   ├── AdminDashboard.jsx
│   │   └── ...
│   ├── services/           # API services
│   ├── hooks/              # Custom hooks
│   ├── utils/              # Utility functions
│   ├── index.css           # Global styles
│   └── App.js              # Main app component
├── package.json
└── README.md
```

## 🎨 Styling

### CSS Framework
- **Tailwind CSS** - Utility-first CSS framework
- **Custom Components** - Reusable component classes
- **Dark Mode** - Complete dark theme support
- **Animations** - Smooth transitions and effects

### Key CSS Classes
- `.btn-primary`, `.btn-secondary` - Button styles
- `.card` - Card container
- `.form-input`, `.form-select` - Form elements
- `.badge-*` - Status badges
- `.animate-*` - Animation classes
- `.dark:` - Dark mode variants

## ♿ Accessibility

### Features
- **ARIA Labels** - Screen reader support
- **Keyboard Navigation** - Full keyboard accessibility
- **Focus Management** - Proper focus indicators
- **Color Contrast** - WCAG compliant contrast ratios
- **Semantic HTML** - Proper HTML structure

### Best Practices
- All interactive elements have proper ARIA labels
- Keyboard navigation works throughout the app
- Focus indicators are visible and clear
- Color is not the only way to convey information
- Text alternatives for non-text content

## 🔧 Customization

### Theme Customization
The app uses CSS custom properties for easy theming:

```css
:root {
  --primary-color: #3b82f6;
  --secondary-color: #6b7280;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
}
```

### Component Customization
All components accept className props for custom styling:

```jsx
<DarkModeToggle className="custom-toggle" />
<Tooltip className="custom-tooltip" />
```

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Responsive Features
- Mobile-first design approach
- Flexible layouts
- Touch-friendly interactions
- Optimized for all screen sizes

## 🚀 Performance

### Optimizations
- **Code Splitting** - Lazy loading of components
- **Memoization** - React.memo and useMemo for expensive operations
- **Bundle Optimization** - Tree shaking and minification
- **Image Optimization** - Optimized images and lazy loading

### Best Practices
- Components are optimized for re-renders
- Large lists use virtualization
- Images are optimized and lazy-loaded
- Bundle size is minimized

## 🧪 Testing

### Testing Strategy
- **Unit Tests** - Component testing with Jest and React Testing Library
- **Integration Tests** - API integration testing
- **E2E Tests** - End-to-end testing with Cypress

### Running Tests
```bash
# Run unit tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run E2E tests
npm run cypress:open
```

## 📦 Deployment

### Build Process
```bash
# Create production build
npm run build

# Test production build
npm run serve
```

### Deployment Options
- **Netlify** - Static site hosting
- **Vercel** - React app hosting
- **AWS S3** - Static website hosting
- **Docker** - Containerized deployment

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Standards
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Type safety (optional)
- **Conventional Commits** - Commit message format

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Built with ❤️ using React, Tailwind CSS, and modern web technologies.** 