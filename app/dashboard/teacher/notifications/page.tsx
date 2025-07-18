'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Inbox, Send, Settings, Check, AlertCircle, CheckCircle } from 'lucide-react';
import apiClient from '@/lib/api';
import SendNotificationForm from '@/components/notifications/SendNotificationForm';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import PushNotificationSetup from '@/components/notifications/PushNotificationSetup';

export default function TeacherNotificationsPage() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [sentNotifications, setSentNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tabParam = searchParams.get('tab');
  const [tab, setTab] = useState(tabParam || 'send');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const u = localStorage.getItem('user');
      if (u) setUser(JSON.parse(u));
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Always sync tab state with URL
  useEffect(() => {
    if (tabParam && tabParam !== tab) setTab(tabParam);
  }, [tabParam, tab]);

  // When tab changes, update URL
  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', newTab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const [receivedRes, sentRes, unreadRes] = await Promise.all([
        apiClient.getNotifications({ limit: 50 }),
        apiClient.getSentNotifications({ limit: 50 }),
        apiClient.getUnreadNotificationCount()
      ]);

      setNotifications(receivedRes.data?.notifications || receivedRes.notifications || []);
      setSentNotifications(sentRes.data?.notifications || sentRes.notifications || []);
      setUnreadCount(unreadRes.data?.count || unreadRes.count || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.markNotificationAsRead(notificationId);
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n._id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <DashboardLayout role="teacher">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p>Loading notifications...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout role="teacher">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchNotifications}>Retry</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="teacher">
      <PushNotificationSetup userId={user?._id || ''} />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {tab === 'send' && 'Send Notification'}
            {tab === 'received' && 'Received Notifications'}
            {tab === 'sent' && 'Sent Notifications'}
          </h1>
          <p className="text-gray-600">
            {tab === 'send' && 'Send notifications to your students and manage your notifications'}
            {tab === 'received' && 'Notifications you have received'}
            {tab === 'sent' && 'Notifications you have sent'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs
              value={tab}
              onValueChange={handleTabChange}
              className="space-y-6"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="send" className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Send Notification
                </TabsTrigger>
                <TabsTrigger value="received" className="flex items-center gap-2">
                  <Inbox className="w-4 h-4" />
                  Received
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-1">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sent" className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Sent
                </TabsTrigger>
              </TabsList>

              <TabsContent value="send" className="space-y-4">
                <SendNotificationForm 
                  userRole="teacher" 
                  userDepartment={user?.department?._id || user?.department}
                />
              </TabsContent>

              <TabsContent value="received" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Received Notifications</h2>
                  {unreadCount > 0 && (
                    <Button variant="outline" size="sm" onClick={markAllAsRead}>
                      Mark All as Read
                    </Button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Inbox className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No notifications received yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <Card key={notification._id} className={!notification.isRead ? 'border-blue-200 bg-blue-50' : ''}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{notification.title}</h3>
                                <Badge className={getPriorityColor(notification.priority)}>
                                  {notification.priority}
                                </Badge>
                                {!notification.isRead && (
                                  <Badge variant="default" className="bg-blue-600">
                                    New
                                  </Badge>
                                )}
                              </div>
                              <p className="text-gray-600 mb-2">{notification.message}</p>
                              <div className="flex items-center justify-between text-sm text-gray-500">
                                <span>From: {notification.senderName}</span>
                                <span>{formatDate(notification.createdAt)}</span>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              {!notification.isRead && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => markAsRead(notification._id)}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sent" className="space-y-4">
                <h2 className="text-xl font-semibold">Sent Notifications</h2>

                {sentNotifications.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No notifications sent yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {sentNotifications.map((notification) => (
                      <Card key={notification._id}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{notification.title}</h3>
                            <Badge className={getPriorityColor(notification.priority)}>
                              {notification.priority}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-2">{notification.message}</p>
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>To: {notification.totalRecipients} recipients</span>
                            <span>{formatDate(notification.createdAt)}</span>
                          </div>
                          {notification.metadata?.pushNotifications && (
                            <div className="mt-2 text-xs text-gray-500">
                              Push notifications: {notification.metadata.pushNotifications.successCount || 0} delivered
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Push Notification Setup */}

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Notification Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Received:</span>
                  <span className="font-semibold">{notifications.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Unread:</span>
                  <span className="font-semibold text-blue-600">{unreadCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Sent:</span>
                  <span className="font-semibold">{sentNotifications.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Recipients:</span>
                  <span className="font-semibold">
                    {sentNotifications.reduce((total, n) => total + (n.totalRecipients || 0), 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {unreadCount > 0 && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={markAllAsRead}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Mark All as Read
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={fetchNotifications}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Refresh Notifications
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 