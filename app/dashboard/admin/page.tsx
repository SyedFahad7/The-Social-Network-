'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Shield, 
  FileText, 
  Award, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Settings
} from 'lucide-react';

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const stats = [
    {
      title: 'Total Users',
      value: '1,247',
      change: '+23 this week',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Pending Approvals',
      value: '18',
      change: '12 certificates',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'System Health',
      value: '99.9%',
      change: 'All systems operational',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Active Sessions',
      value: '342',
      change: '+12% from yesterday',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  const pendingApprovals = [
    {
      type: 'certificate',
      title: 'AWS Certification - John Doe',
      submittedBy: 'CS2021001',
      time: '2 hours ago',
      priority: 'high'
    },
    {
      type: 'user',
      title: 'New Teacher Registration - Dr. Smith',
      submittedBy: 'System',
      time: '4 hours ago',
      priority: 'medium'
    },
    {
      type: 'content',
      title: 'Assignment Upload - Data Structures',
      submittedBy: 'Prof. Johnson',
      time: '6 hours ago',
      priority: 'low'
    },
    {
      type: 'certificate',
      title: 'Google Cloud Certification - Jane Smith',
      submittedBy: 'CS2021045',
      time: '1 day ago',
      priority: 'medium'
    }
  ];

  const systemAlerts = [
    {
      type: 'warning',
      message: 'Database backup completed with warnings',
      time: '1 hour ago'
    },
    {
      type: 'info',
      message: 'Monthly reports generated successfully',
      time: '3 hours ago'
    },
    {
      type: 'success',
      message: 'Security patch applied successfully',
      time: '1 day ago'
    }
  ];

  const userStats = {
    students: 1156,
    teachers: 78,
    admins: 12,
    superAdmins: 1
  };

  return (
    <DashboardLayout role="admin">
      <div className="p-6 space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Admin Control Panel</h1>
          <p className="text-orange-100">Monitor and manage the entire academic system from here.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{stat.change}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Approvals */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>Pending Approvals</span>
                  </CardTitle>
                  <CardDescription>Items requiring your review and approval</CardDescription>
                </div>
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingApprovals.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500">Submitted by: {item.submittedBy}</p>
                        <p className="text-xs text-gray-400">{item.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={item.priority === 'high' ? 'destructive' : 
                                 item.priority === 'medium' ? 'default' : 'secondary'}
                      >
                        {item.priority}
                      </Badge>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                          <AlertTriangle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>System Status</span>
              </CardTitle>
              <CardDescription>Recent system alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemAlerts.map((alert, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      alert.type === 'warning' ? 'bg-yellow-500' :
                      alert.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <div>
                      <p className="text-sm text-gray-900">{alert.message}</p>
                      <p className="text-xs text-gray-500">{alert.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Distribution & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>User Distribution</span>
              </CardTitle>
              <CardDescription>Current user base breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Students</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{userStats.students}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Teachers</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '15%' }}></div>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{userStats.teachers}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Admins</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-600 h-2 rounded-full" style={{ width: '5%' }}></div>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{userStats.admins}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Super Admins</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: '1%' }}></div>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{userStats.superAdmins}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
                  <Users className="w-6 h-6" />
                  <span className="text-sm">Manage Users</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
                  <Award className="w-6 h-6" />
                  <span className="text-sm">Review Certificates</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
                  <FileText className="w-6 h-6" />
                  <span className="text-sm">Content Moderation</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
                  <BarChart3 className="w-6 h-6" />
                  <span className="text-sm">Generate Reports</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}