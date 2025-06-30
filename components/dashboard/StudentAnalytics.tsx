import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, BookOpen, Award, TrendingUp, User } from 'lucide-react';

interface StudentAnalyticsProps {
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    rollNumber?: string;
    section?: string;
    department: string;
    isActive: boolean;
  };
  analytics: {
    attendance: {
      total: number;
      present: number;
      percentage: number;
    };
    assignments: {
      total: number;
      submitted: number;
      averageGrade: number;
    };
    tests: {
      total: number;
      attended: number;
      averageGrade: number;
    };
  };
  getDepartmentName: (departmentId: string) => string;
}

export default function StudentAnalytics({
  student,
  analytics,
  getDepartmentName
}: StudentAnalyticsProps) {
  return (
    <div className="space-y-6">
      {/* Student Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Basic Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Full Name</p>
              <p className="text-lg font-semibold">{student.firstName} {student.lastName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-lg">{student.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Roll Number</p>
              <p className="text-lg font-mono">{student.rollNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Section</p>
              <p className="text-lg">Section {student.section}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Department</p>
              <p className="text-lg">{getDepartmentName(student.department)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <Badge className={student.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {student.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{analytics.attendance.percentage}%</p>
            <p className="text-sm text-gray-600">Attendance Rate</p>
            <p className="text-xs text-gray-500 mt-1">
              {analytics.attendance.present}/{analytics.attendance.total} classes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <BookOpen className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{analytics.assignments.averageGrade}%</p>
            <p className="text-sm text-gray-600">Assignment Average</p>
            <p className="text-xs text-gray-500 mt-1">
              {analytics.assignments.submitted}/{analytics.assignments.total} submitted
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Award className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{analytics.tests.averageGrade}%</p>
            <p className="text-sm text-gray-600">Test Average</p>
            <p className="text-xs text-gray-500 mt-1">
              {analytics.tests.attended}/{analytics.tests.total} attended
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Performance Trend</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Performance chart will be displayed here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 