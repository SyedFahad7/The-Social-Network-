import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  BookOpen, 
  Award, 
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface StudentAnalyticsProps {
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    rollNumber: string;
    email: string;
    department: string;
  };
  analytics: {
    attendance: {
      present: number;
      total: number;
      percentage: number;
    };
    assignments: {
      submitted: number;
      total: number;
      averageGrade: number;
    };
    tests: {
      attended: number;
      total: number;
      averageGrade: number;
    };
    overallPerformance: number;
    trend: 'up' | 'down' | 'stable';
  };
}

export function StudentAnalytics({ student, analytics }: StudentAnalyticsProps) {
  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPerformanceLabel = (percentage: number) => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 80) return 'Good';
    if (percentage >= 70) return 'Average';
    return 'Needs Improvement';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <div className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Student Info Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Student Analytics</span>
            <Badge variant="outline" className="text-blue-600 border-blue-200">
              {student.rollNumber}
            </Badge>
          </CardTitle>
          <CardDescription>
            Performance overview for {student.firstName} {student.lastName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Department</p>
              <p className="font-medium">{student.department}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium text-sm">{student.email}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Performance Trend</p>
              <div className="flex items-center justify-center space-x-1">
                {getTrendIcon(analytics.trend)}
                <span className="text-sm font-medium">
                  {analytics.trend === 'up' ? 'Improving' : 
                   analytics.trend === 'down' ? 'Declining' : 'Stable'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="w-5 h-5" />
            <span>Overall Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Grade</span>
              <span className={`text-lg font-bold ${getPerformanceColor(analytics.overallPerformance)}`}>
                {analytics.overallPerformance}%
              </span>
            </div>
            <Progress value={analytics.overallPerformance} className="h-2" />
            <div className="text-center">
              <Badge className={getPerformanceColor(analytics.overallPerformance)}>
                {getPerformanceLabel(analytics.overallPerformance)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Attendance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Present</span>
                <span className="font-medium text-green-600">
                  {analytics.attendance.present}/{analytics.attendance.total}
                </span>
              </div>
              <Progress value={analytics.attendance.percentage} className="h-2" />
              <div className="text-center">
                <span className={`text-lg font-bold ${getPerformanceColor(analytics.attendance.percentage)}`}>
                  {analytics.attendance.percentage}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5" />
              <span>Assignments</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Submitted</span>
                <span className="font-medium text-blue-600">
                  {analytics.assignments.submitted}/{analytics.assignments.total}
                </span>
              </div>
              <Progress 
                value={(analytics.assignments.submitted / analytics.assignments.total) * 100} 
                className="h-2" 
              />
              <div className="text-center">
                <span className={`text-lg font-bold ${getPerformanceColor(analytics.assignments.averageGrade)}`}>
                  {analytics.assignments.averageGrade}%
                </span>
                <p className="text-xs text-gray-500">Average Grade</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="w-5 h-5" />
              <span>Tests</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Attended</span>
                <span className="font-medium text-purple-600">
                  {analytics.tests.attended}/{analytics.tests.total}
                </span>
              </div>
              <Progress 
                value={(analytics.tests.attended / analytics.tests.total) * 100} 
                className="h-2" 
              />
              <div className="text-center">
                <span className={`text-lg font-bold ${getPerformanceColor(analytics.tests.averageGrade)}`}>
                  {analytics.tests.averageGrade}%
                </span>
                <p className="text-xs text-gray-500">Average Grade</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center space-x-1 mb-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Attendance</span>
              </div>
              <p className={`text-lg font-bold ${getPerformanceColor(analytics.attendance.percentage)}`}>
                {analytics.attendance.percentage}%
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center space-x-1 mb-1">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Assignments</span>
              </div>
              <p className={`text-lg font-bold ${getPerformanceColor(analytics.assignments.averageGrade)}`}>
                {analytics.assignments.averageGrade}%
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Award className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Tests</span>
              </div>
              <p className={`text-lg font-bold ${getPerformanceColor(analytics.tests.averageGrade)}`}>
                {analytics.tests.averageGrade}%
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center space-x-1 mb-1">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium">Overall</span>
              </div>
              <p className={`text-lg font-bold ${getPerformanceColor(analytics.overallPerformance)}`}>
                {analytics.overallPerformance}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 