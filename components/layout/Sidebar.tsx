'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  Home, 
  FileText, 
  Calendar, 
  Upload, 
  Users, 
  BookOpen, 
  MessageSquare, 
  Settings, 
  LogOut,
  ClipboardList,
  Award,
  BarChart3,
  Shield,
  Bell,
  X
} from 'lucide-react';
import { apiClient } from '@/lib/api';

interface SidebarProps {
  role: string;
  onClose?: () => void;
}

const roleMenus = {
  student: [
    { icon: Home, label: 'Dashboard', href: '/dashboard/student' },
    { icon: ClipboardList, label: 'Attendance', href: '/dashboard/student/attendance' },
  ],
  teacher: [
    { icon: Home, label: 'Dashboard', href: '/dashboard/teacher' },
    { icon: BookOpen, label: 'My Sections', href: '/dashboard/teacher/sections' },
    { icon: ClipboardList, label: 'Attendance', href: '/dashboard/teacher/attendance' },
  ],
  'super-admin': [
    { icon: Home, label: 'Dashboard', href: '/dashboard/super-admin' },
    { icon: BookOpen, label: 'My Sections', href: '/dashboard/super-admin/my-sections' },
    // { icon: Users, label: 'Sections Management', href: '/dashboard/super-admin/sections' },
    // { icon: BarChart3, label: 'Analytics', href: '/dashboard/super-admin/analytics' },
    // { icon: Users, label: 'All Users', href: '/dashboard/super-admin/users' },
    // { icon: Bell, label: 'Notifications', href: '/dashboard/super-admin/notifications' },
    {icon:Users, label:'My Faculty', href:'/dashboard/super-admin/my-faculty'}
  ],
};

export default function Sidebar({ role, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      router.push('/auth/login');
    }
  };

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const menuItems = roleMenus[role as keyof typeof roleMenus] || [];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'student': return 'text-blue-600';
      case 'teacher': return 'text-green-600';
      case 'super-admin': return 'text-purple-600';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'student': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'teacher': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'super-admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Social Network</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Academic Portal</p>
            </div>
          </div>
          {/* Mobile Close Button */}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden">
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
              {user.profilePicture ? (
                <img 
                  src={user.profilePicture} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user.firstName ? user.firstName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
              </p>
              <span className={cn(
                "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize",
                getRoleBadgeColor(role)
              )}>
                {role.replace('-', ' ')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200",
                isActive
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        {/* Commented out Settings link
        <Link
          href={`/dashboard/${role}/settings`}
          onClick={handleLinkClick}
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </Link>
        */}
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}