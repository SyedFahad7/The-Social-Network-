'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Bell, Calendar as CalendarIcon } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { getFirebaseApp } from '@/lib/firebase';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Loader2 } from "lucide-react";

// Helper function to get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) {
    return 'st';
  }
  if (j === 2 && k !== 12) {
    return 'nd';
  }
  if (j === 3 && k !== 13) {
    return 'rd';
  }
  return 'th';
}

type TimetableClass = {
  year: number;
  section: string;
  subject: any;
  type: string;
};

type HourlySchedule = { hour: number; classes: TimetableClass[] };

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [classTeacherAssignment, setClassTeacherAssignment] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [chartLoading, setChartLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timetableData, setTimetableData] = useState<any[]>([]);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState(true);
  // Commented out unused state variables since we're only showing Mark Attendance
  // const [stats, setStats] = useState<any>({
  //   totalStudents: 0,
  //   assignments: 0,
  //   questionBanks: 0,
  //   avgAttendance: null
  // });
  // const [sections, setSections] = useState<any[]>([]);
  // const [sectionDetails, setSectionDetails] = useState<any[]>([]);
  // const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (!parsedUser._id && parsedUser.id) {
        parsedUser._id = parsedUser.id;
      }
      console.log('[TEACHER DASHBOARD] Loaded user:', parsedUser);
      setUser(parsedUser);
    }
    
    // Initialize selectedDay to current day (excluding Sunday)
    const today = new Date();
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1; // Sunday becomes 6, Monday 0, etc.
    setSelectedDay(daysOfWeek[dayIndex] || 'monday');
  }, []);

  useEffect(() => {
    if (!user || !user._id) return;

    const fetchTeacherAssignments = async () => {
      console.log('[TIMETABLE] Current user object:', user);
      console.log('[TIMETABLE] fetchTeacherAssignments function called.');
      try {
        setInitialLoading(true);
        setChartLoading(true); // Keep loading for initial data fetch
        setTimetableLoading(true);

        console.log('[TIMETABLE] Fetching teacher assignments for user ID:', user._id);
          const assignments = await apiClient.getTeacherAssignments(user._id);
        console.log('[TEACHER DASHBOARD] Teacher assignments response:', assignments);
          console.log('[TIMETABLE] Teacher assignments data:', assignments.data);

        let classTeacherAssignments = [];
        let teachingAssignments = [];

        if (assignments?.data) {
          classTeacherAssignments = assignments.data.classTeacherAssignments || [];
          teachingAssignments = assignments.data.teachingAssignments || assignments.data.teacherAssignments || [];
        } else if (assignments?.classTeacherAssignments) {
          classTeacherAssignments = assignments.classTeacherAssignments;
          teachingAssignments = assignments.teachingAssignments || assignments.teacherAssignments || [];
        } else if (Array.isArray(assignments)) {
          classTeacherAssignments = assignments.filter(a => a.type === 'classTeacher');
          teachingAssignments = assignments.filter(a => a.type === 'teacher');
        } else {
          console.log('[TEACHER DASHBOARD] Could not find assignments in response');
          classTeacherAssignments = [];
          teachingAssignments = [];
        }

        console.log('[TEACHER DASHBOARD] Extracted classTeacherAssignments:', classTeacherAssignments);
        console.log('[TEACHER DASHBOARD] Extracted teacherAssignments:', teachingAssignments);

        const allAssignments = [...classTeacherAssignments, ...teachingAssignments];
        console.log('[TIMETABLE] Setting teacherAssignments to:', allAssignments);
        setTeacherAssignments(allAssignments);
        if (classTeacherAssignments.length > 0) {
          setClassTeacherAssignment(classTeacherAssignments[0]);
        }
      } catch (error) {
        console.error('Error fetching teacher assignments:', error);
      } finally {
        setInitialLoading(false);
        setChartLoading(false);
        setTimetableLoading(false);
      }
    };

    fetchTeacherAssignments();
  }, [user]);

  useEffect(() => {
    if (!classTeacherAssignment || !user) return;

    const fetchAttendanceData = async () => {
      try {
        setChartLoading(true);
        const currentAssignment = classTeacherAssignment;
        console.log('[TEACHER DASHBOARD] Current assignment for attendance:', currentAssignment);

        const studentsResponse = await apiClient.getUsers({
          role: 'student',
          section: currentAssignment.section,
          year: currentAssignment.year,
          department: user.department?._id || user.department
        });
        const students = studentsResponse?.data?.users || [];
        setTotalStudents(students.length);

        const formattedDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

        // console.log('[ATTENDANCE CHART] Fetching attendance with params:', {
        //   section: currentAssignment.section,
        //   year: currentAssignment.year,
        //   date: formattedDate,
        //   academicYear: currentAssignment.academicYear
        // });

        const attendanceResponse = await apiClient.getAttendance({
          section: currentAssignment.section,
          year: currentAssignment.year,
          date: formattedDate,
          academicYear: currentAssignment.academicYear?._id || currentAssignment.academicYear
        });

        const attendanceRecords = attendanceResponse?.data || [];

        const hourlyData = [];
        const hourLabels = {
          1: '1st Hour',
          2: '2nd Hour',
          3: '3rd Hour',
          4: '4th Hour',
          5: '5th Hour',
          6: '6th Hour'
        };


        for (let hour = 1; hour <= 6; hour++) {
          const hourRecords = attendanceRecords.filter(
            (record: any) => record.hour === hour
          );


          if (hourRecords.length > 0) {
            let presentCount = 0;
            let absentCount = 0;
            let lateCount = 0;

            hourRecords.forEach((record: any) => {
              if (record.students && Array.isArray(record.students)) {
                record.students.forEach((student: any) => {
                  if (student.status === 'present') {
                    presentCount++;
                    if (student.late) lateCount++;
                  } else if (student.status === 'absent') {
                    absentCount++;
                  }
                });
              }
            });


            hourlyData.push({
              hour: hourLabels[hour as keyof typeof hourLabels],
              present: presentCount,
              absent: absentCount,
              late: lateCount,
              total: presentCount + absentCount
            });
          } else {
            hourlyData.push({
              hour: hourLabels[hour as keyof typeof hourLabels],
              present: 0,
              absent: 0,
              late: 0,
              total: 0
            });
          }
        }

        setAttendanceData(hourlyData);
      } catch (error) {
        console.error('Error fetching attendance data:', error);
      } finally {
        setChartLoading(false);
      }
    };

    fetchAttendanceData();
  }, [classTeacherAssignment, selectedDate, user]);

  const fetchTimetableData = async (day?: string) => {
    try {
      setTimetableLoading(true);

      if (!user || !user._id) {
        setTimetableData([]);
        return;
      }

      const response = await fetch(`${apiClient.getBaseUrl()}/timetable/teacher/${user._id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      console.log('[TIMETABLE] Frontend received data:', data);
      
      if (data.success) {
        const teacherSchedule = data.data;
        console.log('[TIMETABLE] Frontend teacher schedule:', teacherSchedule);
        
        // Remove Sunday from the schedule
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDay = day || validDays[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
        
        console.log('[TIMETABLE] Current day:', currentDay);
        console.log('[TIMETABLE] Day data:', teacherSchedule[currentDay]);
        
        if (teacherSchedule && teacherSchedule[currentDay]) {
          const dailySchedule = teacherSchedule[currentDay];
          console.log('[TIMETABLE] Setting timetable data:', dailySchedule);
          setTimetableData(dailySchedule);
        } else {
          // Default empty schedule if no data for the day
          const emptySchedule = Array.from({ length: 6 }, (_, i) => ({
            hour: i + 1,
            classes: []
          }));
          setTimetableData(emptySchedule);
        }
      } else {
        const emptySchedule = Array.from({ length: 6 }, (_, i) => ({
          hour: i + 1,
          classes: []
        }));
        setTimetableData(emptySchedule);
      }
    } catch (error) {
      console.error('[TIMETABLE] Error fetching teacher timetable:', error);
      const emptySchedule = Array.from({ length: 6 }, (_, i) => ({
        hour: i + 1,
        classes: []
      }));
      setTimetableData(emptySchedule);
    } finally {
      setTimetableLoading(false);
    }
  };

  useEffect(() => {
    if (teacherAssignments.length > 0) {
      fetchTimetableData(selectedDay);
    }
  }, [teacherAssignments, selectedDay]);

  useEffect(() => {
    if (!user) return;
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return;
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
          } catch (err) {}
        }
      });
    } else if (Notification.permission === 'granted') {
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
        } catch (err) {}
      })();
    }
  }, [user]);

  // Commented out data fetching since we're only showing Mark Attendance
  // useEffect(() => {
  //   if (!user || !user._id) return;
  //   setLoading(true);
  //   const fetchData = async () => {
  //     try {
  //       // Fetch all students in the teacher's department
  //       const stuRes = await apiClient.getUsers({ role: 'student', department: user.department });
  //       const allStudents = stuRes?.data?.users || [];
  //       console.log('[TEACHER DASHBOARD] Fetched students:', allStudents);
  //       setStudents(allStudents);

  //       // Extract all unique section/year pairs
  //       const sectionYearMap: Record<string, { section: string, year: number, students: any[] }> = {};
  //       allStudents.forEach((s: any) => {
  //         if (!s.section || !s.year) return;
  //         const key = `${s.section}-${s.year}`;
  //         if (!sectionYearMap[key]) {
  //           sectionYearMap[key] = { section: s.section, year: s.year, students: [] };
  //         }
  //         sectionYearMap[key].students.push(s);
  //       });
  //       const sectionYearList = Object.values(sectionYearMap);
  //       console.log('[TEACHER DASHBOARD] sectionYearList:', sectionYearList);

  //       // Compute stats for each section/year
  //       let sectionStats: any[] = [];
  //       sectionYearList.forEach(({ section, year, students }) => {
  //         sectionStats.push({
  //           section,
  //           year,
  //           students: students.length,
  //           avgAttendance: 'N/A',
  //           pendingAssignments: 0
  //         });
  //       });
  //       console.log('[TEACHER DASHBOARD] sectionStats:', sectionStats);

  //       // Compute total students (unique)
  //       let studentIds = new Set<string>();
  //       allStudents.forEach((s: any) => studentIds.add(s._id));

  //       setStats({
  //         totalStudents: studentIds.size,
  //         assignments: 0,
  //         questionBanks: 0,
  //         avgAttendance: 'N/A'
  //       });
  //       setSectionDetails(sectionStats);
  //     } catch (e) {
  //       setStats({ totalStudents: 0, assignments: 0, questionBanks: 0, avgAttendance: 'N/A' });
  //       setSectionDetails([]);
  //       } finally {
  //         setLoading(false);
  //       }
  //     };
  //     fetchData();
  //   }, [user]);

  if (initialLoading) {
    return (
      <DashboardLayout role="teacher">
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-primary"></div>
              <div className="absolute inset-0 animate-ping rounded-full h-20 w-20 border border-primary opacity-20"></div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-xl font-semibold text-gray-800">Loading Dashboard</p>
              <p className="text-sm text-gray-600">Preparing your teaching schedule...</p>
              <div className="flex space-x-1 justify-center mt-4">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="teacher">
      <div className="p-6 space-y-6">
        {/* Header with Theme Toggle */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Welcome back, Prof. {user?.firstName + ' ' + user?.lastName || 'Teacher'}</h1>
          <p className="text-green-100">Manage your classes and track student progress effectively.</p>
        </div>

        {/* Responsive Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer group" onClick={() => window.location.href = '/dashboard/teacher/attendance'}>
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 text-green-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-gray-900 mb-2">Mark Attendance</h3>
              <p className="text-sm text-gray-600">Record class attendance</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer group" onClick={() => window.location.href = '/dashboard/teacher/notifications'}>
            <CardContent className="p-6 text-center">
              <Bell className="w-12 h-12 text-blue-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-gray-900 mb-2">Notifications</h3>
              <p className="text-sm text-gray-600">View your notifications</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer group" onClick={() => window.location.href = '/dashboard/teacher/sections'}>
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 text-purple-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-gray-900 mb-2">My Sections</h3>
              <p className="text-sm text-gray-600">View and manage your sections</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Today's Timetable */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-semibold">Weekly Timetable</CardTitle>
                <CardDescription>
                  Your teaching schedule for {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-1">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                      selectedDay === day
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {timetableLoading ? (
                <div className="flex justify-center items-center p-6">
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="mt-2 text-gray-500">Loading timetable...</span>
                  </div>
                </div>
              ) : timetableData.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 min-w-[600px]">
                    {timetableData.map((hourData, index) => (
                      <div key={index} className="flex flex-col">
                        <div className="text-center font-medium mb-2 bg-gray-100 py-2 rounded-t-md">
                          {hourData.hour}{getOrdinalSuffix(hourData.hour)} Hour
                        </div>
                        {hourData.classes.length > 0 ? (
                          hourData.classes.map((classInfo: TimetableClass, classIndex: number) => {
                            // Extract subject name safely
                            let subjectName = 'Subject';
                            if (classInfo.subject) {
                              if (typeof classInfo.subject === 'string') {
                                subjectName = 'Subject'; // Just show generic if we only have ID
                              } else if (classInfo.subject.name) {
                                subjectName = classInfo.subject.name;
                              }
                            }
                            
                            return (
                              <div 
                                key={classIndex} 
                                className="bg-blue-50 p-3 rounded-md mb-2 border border-blue-100 hover:shadow-md transition-shadow"
                              >
                                <div className="font-medium text-blue-700">Year {classInfo.year} {classInfo.section}</div>
                                <div className="text-sm text-gray-600">
                                  {subjectName}
                                </div>
                                <Badge className="mt-1" variant={classInfo.type === 'lab' ? 'secondary' : 'outline'}>
                                  {classInfo.type || 'lecture'}
                                </Badge>
                              </div>
                            );
                          })
                        ) : (
                          <div className="bg-green-50 p-3 rounded-md border border-green-100 text-center hover:shadow-md transition-shadow">
                            <span className="text-green-600 font-medium">Free</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex justify-center items-center p-6 text-gray-500">
                  <span>No timetable data available</span>
                </div>
              )}
          </CardContent>
        </Card>

        {/* Class Teacher Attendance Chart */}
        {classTeacherAssignment && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-semibold">
                    Attendance - {classTeacherAssignment.section} Year {classTeacherAssignment.year}
                  </CardTitle>
                  <CardDescription>
                    {selectedDate ? format(selectedDate, 'PPP') : 'Today'} - Attendance data for your assigned class
                  </CardDescription>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent>
              {chartLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : attendanceData && attendanceData.length > 0 ? (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="hour" 
                        tick={{ fontSize: 12 }}
                        interval={0}
                      />
                      <YAxis 
                        domain={[0, totalStudents > 0 ? Math.ceil(totalStudents / 10) * 10 : 10]}
                        tick={{ fontSize: 12 }}
                        label={{ value: 'Students', angle: -90, position: 'insideLeft' }}
                        tickCount={5}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                <p className="font-semibold">{label}</p>
                                <p className="text-green-600">Present: {data.present}</p>
                                <p className="text-red-600">Absent: {data.absent}</p>
                                <p className="text-yellow-600">Late: {data.late}</p>
                                <p className="text-gray-600">Total: {data.total}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="present" 
                        fill="#22c55e" 
                        radius={[4, 4, 0, 0]}
                        name="Present"
                        stackId="a"
                      />
                      <Bar 
                        dataKey="absent" 
                        fill="#ef4444" 
                        radius={[4, 4, 0, 0]}
                        name="Absent"
                        stackId="a"
                      />
                      <Bar 
                        dataKey="late" 
                        fill="#f59e0b" 
                        radius={[4, 4, 0, 0]}
                        name="Late"
                        stackId="a"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                                    No attendance data available for today
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Commented out components:
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalStudents ?? 0}</p>
                  <p className="text-sm text-gray-500 mt-1">Across all your sections</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>My Sections</span>
                  </CardTitle>
                  <CardDescription>Overview of your sections</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sectionDetails.length === 0 && (
                  <div className="text-gray-500">No sections found in your department.</div>
                )}
                {sectionDetails.map((section, index) => (
                  <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">Section {section.section} - Year {section.year}</h4>
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
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

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
        */}
      </div>
    </DashboardLayout>
  );
}