'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users, Bell
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { getFirebaseApp } from '@/lib/firebase';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
  }, []);

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

  return (
    <DashboardLayout role="teacher">
      <div className="p-6 space-y-6">
        {/* Header with Theme Toggle */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Welcome back, Prof. {user?.firstName || 'Teacher'}!</h1>
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