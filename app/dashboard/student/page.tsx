'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TextScramble } from '@/components/ui/TextScramble';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PushNotificationSetup from '@/components/notifications/PushNotificationSetup';
import { 
  Calendar, 
  FileText, 
  Award, 
  Clock, 
  TrendingUp, 
  CheckCircle,
  AlertCircle,
  BookOpen,
  Bell,
  Users,
  GraduationCap,
  Target,
  BarChart3,
  BookMarked,
  MessageSquare,
  Settings,
  Star,
  Zap,
  Heart,
  Trophy
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getFirebaseApp } from '@/lib/firebase';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import apiClient from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AttendanceSnapshot from '@/components/dashboard/AttendanceSnapshot';

interface DashboardData {
  attendancePercentage: number;
  totalClassmates: number;
  onlineClassmates: number;
  pendingAssignments: number;
  overdueAssignments: number;
  totalAssignments: number;
  averageMarks: number;
  notifications: any[];
  recentActivity: any[];
  upcomingDeadlines: any[];
  studyStreak: number;
}

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    attendancePercentage: 0,
    totalClassmates: 0,
    onlineClassmates: 0,
    pendingAssignments: 0,
    overdueAssignments: 0,
    totalAssignments: 0,
    averageMarks: 0,
    notifications: [],
    recentActivity: [],
    upcomingDeadlines: [],
    studyStreak: 0
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch all dashboard data in parallel
        const [classmatesStats, attendanceData, notificationsData, unreadRes, assignmentsData] = await Promise.all([
          apiClient.getClassmatesStats(),
          apiClient.getAttendanceStats(),
          apiClient.getNotifications({ limit: 5 }),
          apiClient.getUnreadNotificationCount(),
          apiClient.getStudentAssignments()
        ]);

        // Process assignments data
        const assignments = assignmentsData?.data?.assignments || [];
        const now = new Date();
        const overdueAssignments = assignments.filter((a: any) => new Date(a.dueDate) < now).length;
        
        // Helper function to check if assignment is submitted (has marks)
        const isAssignmentSubmitted = (assignment: any) => {
          if (assignment.marks && assignment.marks.length > 0) {
            const userMark = assignment.marks.find((mark: any) => mark.studentId === user._id);
            return userMark && userMark.marks !== null;
          }
          return false;
        };
        
        const upcomingDeadlines = assignments
          .filter((a: any) => {
            const dueDate = new Date(a.dueDate);
            const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return daysUntilDue <= 7 && daysUntilDue > 0;
          })
          .map((a: any) => ({
            ...a,
            isSubmitted: isAssignmentSubmitted(a)
          }))
          .slice(0, 3);

        // Calculate average marks
        let totalMarks = 0;
        let markedAssignments = 0;
        assignments.forEach((assignment: any) => {
          if (assignment.marks && assignment.marks.length > 0) {
            const userMark = assignment.marks.find((mark: any) => mark.studentId === user._id);
            if (userMark && userMark.marks !== null) {
              totalMarks += userMark.marks;
              markedAssignments++;
            }
          }
        });
        const averageMarks = markedAssignments > 0 ? Math.round((totalMarks / markedAssignments) * 10) / 10 : 0;

        // Get study streak using the new API
        let studyStreak = 0;
        try {
          const streakResponse = await apiClient.getStudentStudyStreak();
          if (streakResponse?.success) {
            studyStreak = streakResponse.data.streak;
          }
        } catch (error) {
          console.error('Error fetching study streak:', error);
          // Fallback to old calculation if new API fails
          const calculateStudyStreak = () => {
            // Get last 30 days of activity
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            let currentStreak = 0;
            let maxStreak = 0;
            let currentDate = new Date();
            
            // Check each day for activity (attendance, assignment submissions, etc.)
            for (let i = 0; i < 30; i++) {
              const checkDate = new Date();
              checkDate.setDate(checkDate.getDate() - i);
              
              // Check if there was activity on this date
              const hasActivity = checkForActivityOnDate(checkDate, assignments, attendanceData);
              
              if (hasActivity) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
              } else {
                currentStreak = 0;
              }
            }
            
            return maxStreak;
          };
          
          const checkForActivityOnDate = (date: Date, assignments: any[], attendanceData: any) => {
            const dateStr = date.toISOString().split('T')[0];
            
            // Check for assignment submissions on this date
            const hasAssignmentActivity = assignments.some((assignment: any) => {
              const assignmentDate = new Date(assignment.createdAt).toISOString().split('T')[0];
              return assignmentDate === dateStr;
            });
            
            // Check for attendance on this date (if available)
            const hasAttendanceActivity = attendanceData?.data?.attendanceRecords?.some((record: any) => {
              const recordDate = new Date(record.date).toISOString().split('T')[0];
              return recordDate === dateStr && record.status === 'present';
            });
            
            // Check for marks received on this date
            const hasMarksActivity = assignments.some((assignment: any) => {
              if (assignment.marks && assignment.marks.length > 0) {
                const userMark = assignment.marks.find((mark: any) => mark.studentId === user._id);
                if (userMark) {
                  const markDate = new Date(userMark.updatedAt).toISOString().split('T')[0];
                  return markDate === dateStr;
                }
              }
              return false;
            });
            
            return hasAssignmentActivity || hasAttendanceActivity || hasMarksActivity;
          };
          
          studyStreak = calculateStudyStreak();
        }

        setDashboardData({
          attendancePercentage: attendanceData?.data?.attendancePercentage || 0,
          totalClassmates: classmatesStats?.data?.totalClassmates || 0,
          onlineClassmates: classmatesStats?.data?.onlineClassmates || 0,
          pendingAssignments: assignments.length,
          overdueAssignments,
          totalAssignments: assignments.length,
          averageMarks,
          notifications: notificationsData?.data?.notifications || [],
          recentActivity: [],
          upcomingDeadlines,
          studyStreak
        });
        setUnreadCount(unreadRes?.data?.count || unreadRes.count || 0);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Only run in browser
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return;
    // Only prompt if not already granted or denied
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(async (permission) => {
        if (permission === 'granted') {
          try {
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidKey) return;
            const app = getFirebaseApp();
            const messaging = getMessaging(app);
            const registration = await navigator.serviceWorker.register('/sw.js');
            const token = await getToken(messaging, {
              vapidKey,
              serviceWorkerRegistration: registration,
            });
            if (token) {
              await apiClient.updateFCMToken(token);
            }
          } catch (err) {
            // Silent fail
          }
        }
      });
    } else if (Notification.permission === 'granted') {
      // Already granted, ensure FCM token is registered
      (async () => {
        try {
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (!vapidKey) return;
          const app = getFirebaseApp();
          const messaging = getMessaging(app);
          const registration = await navigator.serviceWorker.register('/sw.js');
          const token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: registration,
          });
          if (token) {
            await apiClient.updateFCMToken(token);
          }
        } catch (err) {
          // Silent fail
        }
      })();
    }
  }, [user]);

  const quickActions = [
    {
      title: 'Classmates',
      description: 'Connect with your peers',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      hoverColor: 'hover:bg-blue-50 dark:hover:bg-blue-900/50',
      onClick: () => router.push('/dashboard/student/classmates'),
      count: dashboardData.totalClassmates,
      online: dashboardData.onlineClassmates
    },
    {
      title: 'Attendance',
      description: 'Track your attendance',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      hoverColor: 'hover:bg-green-50 dark:hover:bg-green-900/50',
      onClick: () => router.push('/dashboard/student/attendance'),
      percentage: dashboardData.attendancePercentage
    },
    {
      title: 'Assignments',
      description: 'View pending work',
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      hoverColor: 'hover:bg-orange-50 dark:hover:bg-orange-900/50',
      onClick: () => router.push('/dashboard/student/assignments'),
      count: dashboardData.pendingAssignments
    },
    {
      title: 'Notifications',
      description: 'Stay updated',
      icon: Bell,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      hoverColor: 'hover:bg-purple-50 dark:hover:bg-purple-900/50',
      onClick: () => router.push('/dashboard/student/notifications'),
      count: unreadCount // Use unreadCount here
    },
    {
      title: 'Timetable',
      description: 'Check your schedule',
      icon: Calendar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
      hoverColor: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/50',
      onClick: () => router.push('/dashboard/student/timetable')
    },
    {
      title: 'Certificates',
      description: 'Your achievements',
      icon: Trophy,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      hoverColor: 'hover:bg-yellow-50 dark:hover:bg-yellow-900/50',
      onClick: () => router.push('/dashboard/student/certificates')
    }
  ];

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusText = (percentage: number) => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 75) return 'Good';
    return 'Needs Improvement';
  };

  if (loading) {
    return (
      <DashboardLayout role="student">
        <div className="p-4 lg:p-6 space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student">
      <div className="p-4 lg:p-6 space-y-6">
        
        {/* Welcome Header with Profile */}
        <div className="rounded-lg p-4 lg:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1">
          <h1 className="text-xl lg:text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">
            <TextScramble>
              {`Welcome back, ${user?.firstName || ''} ${user?.lastName || 'Student'}!`}
            </TextScramble>
          </h1>
              <TextScramble as="span" className="text-zinc-500 dark:text-zinc-400 text-sm lg:text-base">
                {user?.profile?.status?.text || 'Check what\'s happening with your academic journey.'}
              </TextScramble>
              <div className="flex items-center mt-2 space-x-2">
                <span className="text-2xl">{user?.profile?.status?.emoji || '🎓'}</span>
                <Badge variant="outline" className="text-xs">
                  {user?.section} • Year {user?.year} • Semester {user?.currentSemester}
                </Badge>
              </div>
            </div>
            <Avatar className="w-16 h-16 lg:w-20 lg:h-20 border-4 border-white dark:border-zinc-800 shadow-lg">
              <AvatarImage src={user?.profile?.picture} alt={`${user?.firstName} ${user?.lastName}`} />
              <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Enhanced Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Attendance</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{dashboardData.attendancePercentage}%</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">{getStatusText(dashboardData.attendancePercentage)}</p>
                </div>
                <div className="w-12 h-12 bg-blue-200 dark:bg-blue-800 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Average Marks</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{dashboardData.averageMarks}/10</p>
                  <p className="text-xs text-green-600 dark:text-green-400">academic performance</p>
                </div>
                <div className="w-12 h-12 bg-green-200 dark:bg-green-800 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Assignments</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{dashboardData.totalAssignments}</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400">{dashboardData.overdueAssignments} overdue</p>
                </div>
                <div className="w-12 h-12 bg-orange-200 dark:bg-orange-800 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Study Streak</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{dashboardData.studyStreak} days</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    {dashboardData.studyStreak >= 7 ? '🔥 Amazing!' : 
                     dashboardData.studyStreak >= 3 ? '💪 Great job!' : 'Keep going!'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-200 dark:bg-purple-800 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              {/* Progress bar for streak */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-purple-600 dark:text-purple-400 mb-1">
                  <span>Progress</span>
                  <span>{Math.min(dashboardData.studyStreak, 30)}/30 days</span>
                </div>
                <div className="w-full bg-purple-200 dark:bg-purple-700 rounded-full h-2">
                  <div 
                    className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((dashboardData.studyStreak / 30) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Deadlines */}
        {dashboardData.upcomingDeadlines.length > 0 && (
          <Card className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-700">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>Upcoming Deadlines</span>
              </CardTitle>
              <CardDescription>Assignments due in the next 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.upcomingDeadlines.map((assignment: any, index: number) => {
                  const dueDate = new Date(assignment.dueDate);
                  const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  const isSubmitted = assignment.isSubmitted;
                  
                  return (
                    <div 
                      key={index} 
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                        isSubmitted 
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30' 
                          : 'bg-white dark:bg-zinc-800 border border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20'
                      }`}
                      onClick={() => router.push('/dashboard/student/assignments')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSubmitted 
                            ? 'bg-green-100 dark:bg-green-900/30' 
                            : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                          {isSubmitted ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <FileText className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{assignment.title}</p>
                          {isSubmitted ? (
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                              ✅ Good work! Submitted successfully
                            </p>
                          ) : (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              Due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}
                            </p>
                          )}
                          {isSubmitted && (
                            <p className="text-xs text-green-500 dark:text-green-400 mt-1">
                              Remind your friends to submit too! 🚀
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge 
                        variant={isSubmitted ? "default" : "destructive"} 
                        className={`text-xs ${isSubmitted ? 'bg-green-500 hover:bg-green-600' : ''}`}
                      >
                        {isSubmitted ? 'Submitted' : assignment.type}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {quickActions.map((action, index) => (
            <Card 
              key={index} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-current ${action.hoverColor}`}
              onClick={action.onClick}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${action.bgColor} rounded-xl flex items-center justify-center`}>
                    <action.icon className={`w-6 h-6 ${action.color}`} />
                  </div>
                  {action.count !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      {action.count}
                    </Badge>
                  )}
                  {action.percentage !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      {action.percentage}%
                    </Badge>
                  )}
                  {action.online !== undefined && action.online > 0 && (
                    <Badge variant="default" className="text-xs bg-green-500">
                      {action.online} online
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 mb-2">
                  {action.title}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {action.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Attendance Snapshot Bar Chart */}
        <AttendanceSnapshot userId={user?._id} />

        {/* Recent Notifications */}
        {dashboardData.notifications.length > 0 && (
          <Card className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Bell className="w-5 h-5 text-blue-600" />
                <span>Recent Notifications</span>
              </CardTitle>
              <CardDescription>Your latest updates and announcements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.notifications.slice(0, 3).map((notification: any, index: number) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-white dark:hover:bg-zinc-800 transition-colors">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{notification.title}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{notification.message}</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0 text-xs">
                      {notification.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Bio Section */}
        {user?.profile?.bio && (
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Heart className="w-5 h-5 text-pink-600" />
                <span>About You</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-700 dark:text-zinc-300 italic">
                "{user.profile.bio}"
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}