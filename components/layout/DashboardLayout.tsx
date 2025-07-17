'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { Bell, Search, Menu, X, Inbox } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import apiClient from '@/lib/api';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: string;
}

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [notifUnread, setNotifUnread] = useState(false);
  const notifRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.replace('/auth/login'); // Use replace to avoid stacking history
    } else {
      setUser(JSON.parse(userData));
    }
    setCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    // Fetch recent notifications
    apiClient.getNotifications({ limit: 5 }).then(res => {
      const notifs = res.data?.notifications || res.notifications || [];
      setRecentNotifications(notifs);
      setNotifUnread(notifs.some((n: any) => !n.isRead));
    });
  }, [user, notifOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener('mousedown', handleClick);
    } else {
      document.removeEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [notifOpen]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:transform-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar role={role} onClose={() => setSidebarOpen(false)} />
      </div>
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>

              {/* Search Bar */}
              <div className="hidden sm:block flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                  <Input
                    placeholder="Search..."
                    className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-600 transition-colors text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Mobile Search Button */}
              <Button variant="ghost" size="sm" className="sm:hidden">
                <Search className="w-5 h-5" />
              </Button>

              {/* Notifications */}
              <div className="relative">
                <Button ref={notifRef} variant="ghost" size="sm" className="relative" onClick={() => setNotifOpen(v => !v)} aria-label="Notifications">
                  <Bell className="w-5 h-5" />
                  {notifUnread && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>}
                </Button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 max-w-xs bg-white dark:bg-gray-800 shadow-lg rounded-lg z-50 border border-gray-200 dark:border-gray-700 animate-fade-in flex flex-col"
                    style={{ minWidth: '18rem' }}>
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                      <span className="font-semibold text-gray-900 dark:text-white">Notifications</span>
                      <Button variant="ghost" size="sm" onClick={() => setNotifOpen(false)} aria-label="Close"><X className="w-4 h-4" /></Button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                      {recentNotifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 flex flex-col items-center">
                          <Inbox className="w-8 h-8 mb-2" />
                          No notifications
                        </div>
                      ) : recentNotifications.map((notif, idx) => (
                        <button
                          key={notif._id || idx}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none ${!notif.isRead ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                          onClick={() => {
                            setNotifOpen(false);
                            if (role === 'student') {
                              window.location.href = '/dashboard/student/notifications';
                            } else if (role === 'teacher') {
                              window.location.href = '/dashboard/teacher/notifications?tab=received';
                            } else if (role === 'super-admin') {
                              window.location.href = '/dashboard/super-admin/notifications?tab=received';
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900 dark:text-white truncate">{notif.title}</span>
                            <span className="text-xs text-gray-500 ml-2">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="text-xs text-gray-500 truncate">From: {notif.senderName || 'System'}</div>
                        </button>
                      ))}
                    </div>
                    <div className="p-2 border-t border-gray-100 dark:border-gray-700 text-center">
                      <Button variant="link" size="sm" className="w-full" onClick={() => {
                        setNotifOpen(false);
                        if (role === 'student') {
                          window.location.href = '/dashboard/student/notifications';
                        } else if (role === 'teacher') {
                          window.location.href = '/dashboard/teacher/notifications?tab=received';
                        } else if (role === 'super-admin') {
                          window.location.href = '/dashboard/super-admin/notifications?tab=received';
                        }
                      }}>
                        View all notifications
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              {/* Theme Toggle */}
              <ThemeToggle />
              {/* Profile Avatar */}
              
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="sm:hidden mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <Input
                placeholder="Search..."
                className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-600 transition-colors text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}