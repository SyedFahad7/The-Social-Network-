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
  Download
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const systemStats = [
    {
      title: 'System Uptime',
      value: '99.98%',
      change: '720 days',
      icon: Server,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Database Size',
      value: '2.4 GB',
      change: '+12 MB today',
      icon: Database,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Active Users',
      value: '1,247',
      change: '+23 this week',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'API Requests',
      value: '45.2K',
      change: '+15% today',
      icon: Activity,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  const departmentStats = [
    {
      department: 'Computer Science',
      students: 456,
      teachers: 28,
      activeRate: '94%',
      trend: 'up'
    },
    {
      department: 'Information Technology',
      students: 389,
      teachers: 22,
      activeRate: '91%',
      trend: 'up'
    },
    {
      department: 'Electronics & Communication',
      students: 234,
      teachers: 18,
      activeRate: '88%',
      trend: 'down'
    },
    {
      department: 'Mechanical Engineering',
      students: 168,
      teachers: 12,
      activeRate: '85%',
      trend: 'up'
    }
  ];

  const criticalAlerts = [
    {
      type: 'critical',
      message: 'Server disk usage above 85%',
      time: '15 minutes ago',
      action: 'required'
    },
    {
      type: 'warning',
      message: 'Unusual login pattern detected',
      time: '1 hour ago',
      action: 'review'
    },
    {
      type: 'info',
      message: 'Scheduled maintenance in 2 days',
      time: '2 hours ago',
      action: 'planned'
    }
  ];

  const auditLogs = [
    {
      user: 'admin@university.edu',
      action: 'User account created',
      resource: 'john.doe@student.edu',
      timestamp: '2025-01-13 14:23:45',
      ip: '192.168.1.100'
    },
    {
      user: 'teacher@university.edu',
      action: 'Assignment uploaded',
      resource: 'CS401_Assignment_3.pdf',
      timestamp: '2025-01-13 13:45:22',
      ip: '192.168.1.105'
    },
    {
      user: 'admin@university.edu',
      action: 'Certificate approved',
      resource: 'AWS_Cert_Student123',
      timestamp: '2025-01-13 12:30:15',
      ip: '192.168.1.100'
    }
  ];

  return (
    <DashboardLayout role="super-admin">
      <div className="p-6 space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white">
          <div className="flex items-center space-x-3">
            <Crown className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold mb-2">Super Admin Dashboard</h1>
              <p className="text-purple-100">Complete system oversight and control panel for Head of Department.</p>
            </div>
          </div>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {systemStats.map((stat, index) => (
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

        {/* Department Overview & Critical Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Department Overview</span>
              </CardTitle>
              <CardDescription>Performance metrics across all departments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departmentStats.map((dept, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{dept.department}</h4>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className={`w-4 h-4 ${
                          dept.trend === 'up' ? 'text-green-500' : 'text-red-500'
                        }`} />
                        <span className="text-sm font-medium">{dept.activeRate}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Students</p>
                        <p className="font-medium text-blue-600">{dept.students}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Teachers</p>
                        <p className="font-medium text-green-600">{dept.teachers}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Active Rate</p>
                        <p className="font-medium text-purple-600">{dept.activeRate}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Critical Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span>Critical Alerts</span>
              </CardTitle>
              <CardDescription>System alerts requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {criticalAlerts.map((alert, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          alert.type === 'critical' ? 'bg-red-500' :
                          alert.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                          <p className="text-xs text-gray-500">{alert.time}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={alert.action === 'required' ? 'destructive' : 
                                 alert.action === 'review' ? 'default' : 'secondary'}
                      >
                        {alert.action}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Logs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Recent Audit Logs</span>
                </CardTitle>
                <CardDescription>System activity and security logs</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  View All
                </Button>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-gray-600">User</th>
                    <th className="text-left p-3 font-medium text-gray-600">Action</th>
                    <th className="text-left p-3 font-medium text-gray-600">Resource</th>
                    <th className="text-left p-3 font-medium text-gray-600">Timestamp</th>
                    <th className="text-left p-3 font-medium text-gray-600">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-gray-900">{log.user}</td>
                      <td className="p-3 text-gray-700">{log.action}</td>
                      <td className="p-3 text-gray-700 font-mono text-xs">{log.resource}</td>
                      <td className="p-3 text-gray-500">{log.timestamp}</td>
                      <td className="p-3 text-gray-500 font-mono text-xs">{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* System Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer group">
            <CardContent className="p-6 text-center">
              <Database className="w-12 h-12 text-blue-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-gray-900 mb-2">Database Management</h3>
              <p className="text-sm text-gray-600">Backup, restore, optimize</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer group">
            <CardContent className="p-6 text-center">
              <Settings className="w-12 h-12 text-green-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-gray-900 mb-2">System Configuration</h3>
              <p className="text-sm text-gray-600">Global settings and policies</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer group">
            <CardContent className="p-6 text-center">
              <Shield className="w-12 h-12 text-purple-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-gray-900 mb-2">Security Center</h3>
              <p className="text-sm text-gray-600">Access controls and monitoring</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer group">
            <CardContent className="p-6 text-center">
              <BarChart3 className="w-12 h-12 text-orange-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-gray-900 mb-2">Analytics & Reports</h3>
              <p className="text-sm text-gray-600">Comprehensive insights</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}