'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Crown, 
  Shield, 
  Database, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  Server,
  Users,
  BarChart3,
  Settings,
  Eye,
  Download,
  GraduationCap,
  UserCheck,
  FileText,
  Award
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { StatsCard } from '@/components/dashboard';
import { AttendanceOverview } from '@/components/dashboard/AttendanceOverview';

interface Department {
  _id: string;
  name: string;
  code: string;
  description: string;
}

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher' | 'admin' | 'super-admin';
  department: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string; // Added for recent activity
  rollNumber?: string; // Added for recent activity
}

interface DepartmentStats {
  department: string;
  students: number;
  teachers: number;
  activeRate: string;
  trend: 'up' | 'down';
}

export default function SuperAdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemStats, setSystemStats] = useState<any[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  // Add separate state for teachers and students
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching dashboard data...');
      // Fetch all data in parallel
      const [departmentsResponse, teachersResponse, studentsResponse, attendanceResponse] = await Promise.all([
        apiClient.getDepartments(),
        apiClient.getUsers({ role: 'teacher', limit: 1000 }),
        apiClient.getUsers({ role: 'student', limit: 1000 }),
        apiClient.getAttendance()
      ]);
      
      // Debug: print raw API responses
      console.log('RAW departmentsResponse:', JSON.stringify(departmentsResponse, null, 2));
      console.log('RAW usersResponse:', JSON.stringify(teachersResponse, null, 2));
      console.log('RAW attendanceResponse:', JSON.stringify(studentsResponse, null, 2));
      console.log('RAW attendanceResponse:', JSON.stringify(attendanceResponse, null, 2));
      
      // Handle departments
      let deptData = [];
      if (departmentsResponse.success) {
        deptData = departmentsResponse.data || departmentsResponse.departments || [];
        setDepartments(deptData);
      }
      // Debug: print processed departments
      console.log('Processed departments:', deptData);
      
      // Handle teachers
      let teacherData = [];
      if (teachersResponse.success) {
        teacherData = teachersResponse.data?.users || teachersResponse.users || teachersResponse.data || [];
        setTeachers(teacherData);
      }
      // Debug: print processed teachers
      console.log('Processed teachers:', teacherData);
      
      // Handle students
      let studentData = [];
      if (studentsResponse.success) {
        studentData = studentsResponse.data?.users || studentsResponse.users || studentsResponse.data || [];
        setStudents(studentData);
      }
      // Debug: print processed students
      console.log('Processed students:', studentData);
      
      // Handle attendance
      let attendanceData = [];
      if (attendanceResponse.success) {
        attendanceData = attendanceResponse.data || attendanceResponse.attendance || [];
        setAttendanceRecords(attendanceData);
      }
      // Debug: print processed attendance records
      console.log('Processed attendanceRecords:', attendanceData);
      
      setTimeout(() => {
        calculateSystemStats();
        calculateDepartmentStats();
      }, 100);
    } catch (error: any) {
      setError(error.message || 'Error fetching dashboard data');
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchDashboardData();
    // eslint-disable-next-line
  }, []);

  // Add more debug logs after setting users, departments, attendanceRecords
  useEffect(() => {
    console.log('DEBUG: users state:', teachers);
    console.log('DEBUG: attendanceRecords state:', attendanceRecords);
  }, [teachers, departments, attendanceRecords]);

  // Filter out malformed users (only students and teachers with a role)
  // const validUsers = teachers.filter(u => u && (u.role === 'student' || u.role === 'teacher'));

  const calculateSystemStats = () => {
    console.log('Calculating system stats with:', { users: teachers.length + students.length, attendance: attendanceRecords.length });
    
    const totalUsers = teachers.length + students.length;
    const activeUsers = teachers.filter(u => u.isActive).length + students.filter(u => u.isActive).length;
    const stats = [
      {
        title: 'Total Users',
        value: totalUsers.toString(),
        change: `${activeUsers} active`,
        icon: Users,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
      },
      {
        title: 'Students',
        value: students.length.toString(),
        change: totalUsers > 0 ? `${Math.round((students.length / totalUsers) * 100)}% of total` : '0% of total',
        icon: GraduationCap,
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      },
      {
        title: 'Teachers',
        value: teachers.length.toString(),
        change: totalUsers > 0 ? `${Math.round((teachers.length / totalUsers) * 100)}% of total` : '0% of total',
        icon: UserCheck,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100'
      },
      {
        title: 'Attendance Records',
        value: attendanceRecords.length.toString(),
        change: '',
        icon: Activity,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100'
      }
    ];
    
    console.log('System stats calculated:', stats);
    setSystemStats(stats);
  };

  const calculateDepartmentStats = () => {
    const deptStats: DepartmentStats[] = departments.map((dept: Department) => {
      // Only use teachers array for teachers, students array for students
      const deptTeachers: User[] = teachers.filter((u: User) => u.department === dept._id);
      const deptStudents: User[] = students.filter((u: User) => u.department === dept._id);
      const activeTeachers: number = deptTeachers.filter((u: User) => u.isActive).length;
      const activeStudents: number = deptStudents.filter((u: User) => u.isActive).length;
      const totalDeptUsers: number = deptTeachers.length + deptStudents.length;
      const activeRate: number = totalDeptUsers > 0 ? Math.round(((activeTeachers + activeStudents) / totalDeptUsers) * 100) : 0;
      return {
        department: dept.name,
        students: deptStudents.length,
        teachers: deptTeachers.length,
        activeRate: `${activeRate}%`,
        trend: 'up' as const
      };
    });
    console.log('Department stats calculated:', deptStats);
    setDepartmentStats(deptStats);
  };

  const handleRetry = () => {
    fetchDashboardData();
  };

  // --- Add this helper for formatting date ---
  function formatDateTime(date: string | number | Date | null | undefined) {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString();
  }

  // Improve loading experience: only show dashboard when not loading and data is available
  if (loading || (teachers.length === 0 && students.length === 0) || departments.length === 0) {
    return (
      <DashboardLayout role="super-admin">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout role="super-admin">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleRetry} variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="super-admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center space-x-3">
            <Crown className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
              <p className="text-purple-100">Complete system oversight and control panel for Head of Department.</p>
            </div>
          </div>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {systemStats.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Attendance Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceOverview />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Quick Actions</span>
              </CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Activity className="h-4 w-4 mr-2" />
                Attendance Reports
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>Latest student logins</CardDescription>
          </CardHeader>
          <CardContent>
            {students.filter(u => u.lastLogin).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent student logins to display</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 border">Name</th>
                      <th className="px-4 py-2 border">Roll Number</th>
                      <th className="px-4 py-2 border">Last Login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students
                      .filter(u => u.lastLogin)
                      .sort((a, b) => new Date(b.lastLogin as any).getTime() - new Date(a.lastLogin as any).getTime())
                      .slice(0, 5)
                      .map((u, idx) => (
                        <tr key={u._id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2 border">{u.firstName} {u.lastName}</td>
                          <td className="px-4 py-2 border">{(u as any).rollNumber || '-'}</td>
                          <td className="px-4 py-2 border">{formatDateTime((u as any).lastLogin)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}