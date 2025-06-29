'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  BookOpen, 
  FileText, 
  TrendingUp,
  ArrowRight,
  Calendar,
  Award
} from 'lucide-react';

export default function TeacherSections() {
  const router = useRouter();
  
  const sections = [
    {
      id: 'section-a',
      name: 'Section A',
      subject: 'Data Structures',
      code: 'CS301',
      students: 52,
      avgAttendance: '92%',
      assignments: 3,
      tests: 2,
      lastClass: '2025-01-13'
    },
    {
      id: 'section-b',
      name: 'Section B',
      subject: 'Database Management',
      code: 'CS302',
      students: 48,
      avgAttendance: '87%',
      assignments: 2,
      tests: 1,
      lastClass: '2025-01-12'
    },
    {
      id: 'section-c',
      name: 'Section C',
      subject: 'Web Development',
      code: 'CS303',
      students: 56,
      avgAttendance: '88%',
      assignments: 4,
      tests: 3,
      lastClass: '2025-01-13'
    }
  ];

  const handleSectionClick = (sectionId: string) => {
    router.push(`/dashboard/teacher/sections/${sectionId}`);
  };

  return (
    <DashboardLayout role="teacher">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Sections</h1>
          <p className="text-gray-600">Manage your teaching sections and student data</p>
        </div>

        <div className="grid gap-6">
          {sections.map((section) => (
            <Card key={section.id} className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{section.name}</h3>
                        <p className="text-gray-600">{section.subject} ({section.code})</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{section.students}</p>
                        <p className="text-sm text-gray-600">Students</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{section.avgAttendance}</p>
                        <p className="text-sm text-gray-600">Attendance</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">{section.assignments}</p>
                        <p className="text-sm text-gray-600">Assignments</p>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">{section.tests}</p>
                        <p className="text-sm text-gray-600">Tests</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-900">{section.lastClass}</p>
                        <p className="text-sm text-gray-600">Last Class</p>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        Active
                      </Badge>
                      <Badge variant="secondary">
                        {section.students} enrolled
                      </Badge>
                    </div>
                  </div>

                  <Button 
                    onClick={() => handleSectionClick(section.id)}
                    className="bg-green-600 hover:bg-green-700 group-hover:scale-105 transition-transform"
                  >
                    Manage Section
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">156</p>
              <p className="text-sm text-gray-600">Total Students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">9</p>
              <p className="text-sm text-gray-600">Total Assignments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Award className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">6</p>
              <p className="text-sm text-gray-600">Total Tests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">89%</p>
              <p className="text-sm text-gray-600">Avg Attendance</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}