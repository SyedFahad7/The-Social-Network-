'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api';

interface AttendanceRecord {
  hour: number;
  subject: {
    name: string;
    code: string;
  } | null;
  status: 'present' | 'absent' | 'late' | 'not_marked';
  markedBy: {
    firstName: string;
    lastName: string;
  } | null;
  timestamp: string | null;
  comments?: string;
}

interface AttendanceData {
  date: string;
  student: {
    name: string;
    rollNumber: string;
    section: string;
    year: number;
    semester: number;
  };
  summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    not_marked: number;
  };
  attendance: AttendanceRecord[];
}

export default function StudentAttendancePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = async (date: Date) => {
    setLoading(true);
    setError(null);
    
    try {
      const dateString = format(date, 'yyyy-MM-dd');
      console.log('Fetching attendance for date:', dateString);
      
      const response = await apiClient.getStudentDailyAttendance(dateString);
      console.log('Attendance response:', response);
      
      if (response.success) {
        setAttendanceData(response.data);
      } else {
        setError(response.message || 'Failed to fetch attendance data');
      }
    } catch (err: any) {
      console.error('Error fetching attendance:', err);
      if (err.message?.includes('fetch')) {
        setError('Network error: Unable to connect to server. Please check your internet connection.');
      } else if (err.message?.includes('401')) {
        setError('Authentication error: Please log in again.');
      } else {
        setError(err.message || 'Failed to fetch attendance data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance(selectedDate);
  }, [selectedDate]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'late':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'not_marked':
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Present</Badge>;
      case 'absent':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Absent</Badge>;
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Late</Badge>;
      case 'not_marked':
        return <Badge variant="outline" className="text-gray-500">Not Marked</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-500">Unknown</Badge>;
    }
  };

  const getAttendancePercentage = () => {
    if (!attendanceData) return 0;
    const { present, late, total } = attendanceData.summary;
    return Math.round(((present + late) / total) * 100);
  };

  return (
    <DashboardLayout role="student">
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Attendance</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Check your daily attendance records
            </p>
          </div>
          
          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-auto justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                disabled={(date) => date > new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600 dark:text-gray-300">Loading attendance data...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attendance Data */}
        {attendanceData && !loading && (
          <>
            {/* Student Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {attendanceData.student.name}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                      Roll No: {attendanceData.student.rollNumber} | 
                      Section: {attendanceData.student.section} | 
                      Year: {attendanceData.student.year} | 
                      Semester: {attendanceData.student.semester}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {format(new Date(attendanceData.date), "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Present</p>
                      <p className="text-xl font-bold text-green-600">
                        {attendanceData.summary.present}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Absent</p>
                      <p className="text-xl font-bold text-red-600">
                        {attendanceData.summary.absent}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Late</p>
                      <p className="text-xl font-bold text-yellow-600">
                        {attendanceData.summary.late}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Not Marked</p>
                      <p className="text-xl font-bold text-gray-600 dark:text-gray-300">
                        {attendanceData.summary.not_marked}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Attendance Percentage */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Daily Attendance
                  </h3>
                  <span className="text-2xl font-bold text-blue-600">
                    {getAttendancePercentage()}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${getAttendancePercentage()}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Table */}
            <Card>
              <CardHeader>
                <CardTitle>Hourly Attendance</CardTitle>
                <CardDescription>
                  Detailed breakdown of your attendance for each hour
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {attendanceData.attendance.map((record) => (
                    <div
                      key={record.hour}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(record.status)}
                          <span className="font-semibold text-gray-900 dark:text-white">
                            Hour {record.hour}
                          </span>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                          {record.subject ? (
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {record.subject.name}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {record.subject.code}
                              </p>
                            </div>
                          ) : (
                            <p className="text-gray-500 dark:text-gray-400">No subject assigned</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                        {getStatusBadge(record.status)}
                        
                        {record.markedBy && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            By: {record.markedBy.firstName} {record.markedBy.lastName}
                          </div>
                        )}
                        
                        {record.timestamp && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {format(new Date(record.timestamp), "HH:mm")}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* No Data State */}
        {!loading && !error && !attendanceData && (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Attendance Data
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                No attendance records found for the selected date.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
} 