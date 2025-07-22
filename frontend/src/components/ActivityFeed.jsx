import { useState, useEffect } from 'react';
import { Clock, User, Shield, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const ActivityFeed = ({ activities = [] }) => {
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    // Generate sample activities if none provided
    if (activities.length === 0) {
      const sampleActivities = [
        {
          id: 1,
          type: 'permission_request',
          title: 'New permission request submitted',
          description: 'John Doe requested access to Admin Panel',
          time: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          icon: Shield,
          color: 'bg-blue-500'
        },
        {
          id: 2,
          type: 'permission_approved',
          title: 'Permission request approved',
          description: 'Access to Reports module approved for Jane Smith',
          time: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
          icon: CheckCircle,
          color: 'bg-green-500'
        },
        {
          id: 3,
          type: 'employee_added',
          title: 'New employee added',
          description: 'Mike Johnson joined the IT department',
          time: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          icon: User,
          color: 'bg-purple-500'
        },
        {
          id: 4,
          type: 'report_exported',
          title: 'Ticket report exported',
          description: 'Monthly ticket report downloaded',
          time: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          icon: FileText,
          color: 'bg-orange-500'
        }
      ];
      setRecentActivities(sampleActivities);
    } else {
      setRecentActivities(activities);
    }
  }, [activities]);

  const getTimeAgo = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getActivityIcon = (activity) => {
    const IconComponent = activity.icon;
    return (
      <div className={`activity-icon ${activity.color} shadow-lg`}>
        <IconComponent className="w-4 h-4" aria-hidden="true" />
      </div>
    );
  };

  return (
    <div className="card bg-white dark:bg-gray-900 dark:border-gray-800 rounded-xl shadow-2xl border border-gray-200 transition-colors duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" aria-hidden="true" />
          Recent Activity
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-300">
          {recentActivities.length} activities
        </span>
      </div>
      
      <div className="space-y-3">
        {recentActivities.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Clock className="w-16 h-16" aria-hidden="true" />
            </div>
            <div className="empty-state-title">No recent activity</div>
            <div className="empty-state-description">Activities will appear here as they happen</div>
          </div>
        ) : (
          recentActivities.map((activity) => (
            <div key={activity.id} className="activity-item group">
              {getActivityIcon(activity)}
              <div className="activity-content">
                <div className="activity-title group-hover:text-blue-600 dark:group-hover:text-blue-400 dark:text-gray-100 transition-colors">
                  {activity.title}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {activity.description}
                </div>
                <div className="activity-time mt-1">
                  {getTimeAgo(activity.time)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {recentActivities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
            View all activities →
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed; 