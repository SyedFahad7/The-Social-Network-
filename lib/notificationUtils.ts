// Notification utilities for localStorage-based read status

const NOTIFICATION_READ_KEY = 'notification_read_status';

export interface NotificationReadStatus {
  [notificationId: string]: {
    read: boolean;
    readAt: string;
  };
}

// Get all read status from localStorage
export function getNotificationReadStatus(): NotificationReadStatus {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(NOTIFICATION_READ_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error reading notification status from localStorage:', error);
    return {};
  }
}

// Mark a notification as read
export function markNotificationAsRead(notificationId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const readStatus = getNotificationReadStatus();
    readStatus[notificationId] = {
      read: true,
      readAt: new Date().toISOString()
    };
    localStorage.setItem(NOTIFICATION_READ_KEY, JSON.stringify(readStatus));
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

// Mark all notifications as read
export function markAllNotificationsAsRead(notificationIds: string[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    const readStatus = getNotificationReadStatus();
    const now = new Date().toISOString();
    
    notificationIds.forEach(id => {
      readStatus[id] = {
        read: true,
        readAt: now
      };
    });
    
    localStorage.setItem(NOTIFICATION_READ_KEY, JSON.stringify(readStatus));
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
}

// Check if a notification is read
export function isNotificationRead(notificationId: string): boolean {
  const readStatus = getNotificationReadStatus();
  return readStatus[notificationId]?.read || false;
}

// Get unread count from notifications array
export function getUnreadCount(notifications: any[]): number {
  return notifications.filter(notification => !isNotificationRead(notification._id)).length;
}

// Add read status to notifications array
export function addReadStatusToNotifications(notifications: any[]): any[] {
  return notifications.map(notification => ({
    ...notification,
    isRead: isNotificationRead(notification._id)
  }));
}

// Clear old read status (older than 30 days)
export function cleanupOldReadStatus(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const readStatus = getNotificationReadStatus();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const cleanedStatus: NotificationReadStatus = {};
    Object.entries(readStatus).forEach(([id, status]) => {
      if (new Date(status.readAt) > thirtyDaysAgo) {
        cleanedStatus[id] = status;
      }
    });
    
    localStorage.setItem(NOTIFICATION_READ_KEY, JSON.stringify(cleanedStatus));
  } catch (error) {
    console.error('Error cleaning up old read status:', error);
  }
}