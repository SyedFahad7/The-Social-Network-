'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  FileText, 
  Calendar, 
  BookOpen, 
  TrendingUp, 
  Clock,
  Plus,
  Eye,
  Upload
} from 'lucide-react';

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const stats = [
    {
      title: 'Total Students',
      value: '156',
      change: '3 sections',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Assignments',
      value: '12',
      change: '4 pending review',
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Question Banks',
      value: '8',
      change: '2 subjects',
      icon: BookOpen,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Avg. Attendance',
      value: '89%',
      change: '+5% this month',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  const mySections = [
    {
      section: 'Section A',
      subject: 'Data Structures',
      students: 52,
      avgAttendance: '92%',
      pendingAssignments: 2
    },
    {
      section: 'Section B',
      subject: 'Database Management',
      students: 48,
      avgAttendance: '87%',
      pendingAssignments: 1
    },
    {
      section: 'Section C',
      subject: 'Web Development',
      students: 56,
      avgAttendance: '88%',
      pendingAssignments: 3
    }
  ];

  const recentActivities = [
    {
      title: 'Assignment 3 submitted by Section A',
      time: '1 hour ago',
      type: 'assignment',
      count: 45
    },
    {
      title: 'Attendance marked for Database class',
      time: '3 hours ago',
      type: 'attendance',
      count: 48
    },
    {
      title: 'New question bank uploaded',
      time: '1 day ago',
      type: 'resource',
      count: 1
    },
    {
      title: 'Feedback responses received',
      time: '2 days ago',
      type: 'feedback',
      count: 23
    }
  ];

  return (
    <DashboardLayout role="teacher">
      <div className="p-6 space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Good morning, Prof. {user?.name?.split(' ')[0] || 'Teacher'}!</h1>
          <p className="text-green-100">Manage your classes and track student progress effectively.</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Sections */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>My Sections</span>
                  </CardTitle>
                  <CardDescription>Overview of your teaching sections</CardDescription>
                </div>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Section
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mySections.map((section, index) => (
                  <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{section.section}</h4>
                        <p className="text-sm text-gray-600">{section.subject}</p>
                      </div>
                      <Badge variant="outline">{section.students} students</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Attendance</p>
                        <p className="font-medium text-green-600">{section.avgAttendance}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Pending Reviews</p>
                        <p className="font-medium text-orange-600">{section.pendingAssignments}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      <Button size="sm" variant="outline">
                        <Calendar className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Recent Activities</span>
              </CardTitle>
              <CardDescription>Latest updates from your classes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                    <Badge variant="secondary">{activity.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer group">
            <CardContent className="p-6 text-center">
              <Upload className="w-12 h-12 text-blue-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-gray-900 mb-2">Upload Assignment</h3>
              <p className="text-sm text-gray-600">Create new assignment</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer group">
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 text-green-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-gray-900 mb-2">Mark Attendance</h3>
              <p className="text-sm text-gray-600">Record class attendance</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer group">
            <CardContent className="p-6 text-center">
              <BookOpen className="w-12 h-12 text-purple-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-gray-900 mb-2">Question Bank</h3>
              <p className="text-sm text-gray-600">Manage question banks</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer group">
            <CardContent className="p-6 text-center">
              <Calendar className="w-12 h-12 text-orange-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-gray-900 mb-2">Timetable</h3>
              <p className="text-sm text-gray-600">Update class schedule</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}