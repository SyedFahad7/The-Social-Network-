'use client';

import { useState, useEffect } from 'react';
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
  Award,
  Loader2,
  Eye
} from 'lucide-react';
import { useSections } from '@/hooks/use-sections';
import apiClient, { getUserAssignments } from '@/lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function TeacherSections() {
  const router = useRouter();
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [studentModal, setStudentModal] = useState<any>(null);
  const [studentStats, setStudentStats] = useState<any>(null);
  const [studentStatsLoading, setStudentStatsLoading] = useState(false);
  const [studentStatsError, setStudentStatsError] = useState<string | null>(null);
  // Add state for student counts
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});

  // Fetch attendance stats when studentModal is opened
  useEffect(() => {
    if (!studentModal) return;
    setStudentStats(null);
    setStudentStatsLoading(true);
    setStudentStatsError(null);
    apiClient.getStudentAttendanceStats(studentModal._id)
      .then(res => setStudentStats(res.data?.stats || res.data))
      .catch(err => setStudentStatsError(err.message))
      .finally(() => setStudentStatsLoading(false));
  }, [studentModal]);

  useEffect(() => {
    async function fetchSections() {
      setLoading(true);
      setError(null);
      try {
        // Get teacher from localStorage (or context if available)
        const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
        const userId = user._id || user.id;
        if (!user || !userId) {
          setError('User not found. Please login again.');
          setLoading(false);
          return;
        }
        // Fetch assignments for this teacher
        const res = await apiClient.getTeacherAssignments(userId);
        const classTeacherAssignments = res.data?.classTeacherAssignments || res.classTeacherAssignments || [];
        setSections(classTeacherAssignments);
        // Fetch student counts for each section
        const counts: Record<string, number> = {};
        await Promise.all(classTeacherAssignments.map(async (assignment: any) => {
          const department = assignment.department?._id || assignment.department;
          const academicYear = assignment.academicYear?._id || assignment.academicYear;
          const year = assignment.year;
          const section = typeof assignment.section === 'string' ? assignment.section : assignment.section?.name || assignment.section?._id;
          // Use a composite key for mapping
          const sectionKey = `${year}-${section}-${academicYear}`;
          try {
            const res = await apiClient.getUsers({
              role: 'student',
              department,
              academicYear,
              year,
              section,
              limit: 1 // Only need the count
            });
            const count = res.data?.pagination?.totalUsers || res.data?.data?.pagination?.totalUsers || 0;
            counts[sectionKey] = count;
          } catch (err) {
            counts[sectionKey] = 0;
          }
        }));
        setStudentCounts(counts);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch sections');
      } finally {
        setLoading(false);
      }
    }
    fetchSections();
  }, []);

  // Fetch students when detail view is opened
  useEffect(() => {
    if (!selectedSection) return;
    setStudentsLoading(true);
    setStudentsError(null);
    setStudents([]);
    // Extract params
    const department = selectedSection.department?._id || selectedSection.department;
    const academicYear = selectedSection.academicYear?._id || selectedSection.academicYear;
    const year = selectedSection.year;
    const section = typeof selectedSection.section === 'string' ? selectedSection.section : selectedSection.section?.name || selectedSection.section?._id;
    apiClient.getUsers({
      role: 'student',
      department,
      academicYear,
      year,
      section,
      limit: 1000
    })
      .then(res => setStudents(res.data.users || res.data))
      .catch(err => setStudentsError(err.message))
      .finally(() => setStudentsLoading(false));
  }, [selectedSection]);

  const handleSectionClick = (assignment: any) => {
    // Use a composite key for section details: year-section-academicYear
    const sectionKey = `${assignment.year}-${assignment.section}-${assignment.academicYear?._id || assignment.academicYear}`;
    router.push(`/dashboard/teacher/sections/${sectionKey}`);
  };

  if (loading) {
    return (
      <DashboardLayout role="teacher">
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading sections...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout role="teacher">
        <div className="p-6">
          <div className="text-center">
            <p className="text-red-600">Error: {error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Remove selectedSection and all tab logic
  // Only show the list of sections with Manage button

  return (
    <DashboardLayout role="teacher">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Sections</h1>
          <p className="text-gray-600">Manage your class teacher sections and student data</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading sections...</span>
          </div>
        ) : error ? (
          <div className="text-center">
            <p className="text-red-600">Error: {error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </div>
        ) : sections.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Sections Assigned</h3>
              <p className="text-gray-600 mb-4">You are not a class teacher for any section yet.</p>
              <p className="text-sm text-gray-500">Contact your administrator to get assigned as a class teacher.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {sections.map((section) => {
              const department = section.department?._id || section.department;
              const academicYear = section.academicYear?._id || section.academicYear;
              const year = section.year;
              const sec = typeof section.section === 'string' ? section.section : section.section?.name || section.section?._id;
              const sectionKey = `${year}-${sec}-${academicYear}`;
              return (
              <div key={section._id} className="section-card border rounded p-4 flex items-center justify-between">
                <div>
                    <div><b>Section:</b> {sec}</div>
                    <div><b>Year:</b> {year}</div>
                  <div><b>Semester:</b> {section.semester}</div>
                  <div><b>Academic Year:</b> {section.academicYear?.yearLabel || section.academicYear?.name || section.academicYear?._id}</div>
                    <div><b>Students:</b> {studentCounts[sectionKey] ?? <Loader2 className="inline w-4 h-4 animate-spin text-blue-600" />}</div>
                </div>
                <Button onClick={() => handleSectionClick(section)}>Manage</Button>
              </div>
              );
            })}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(studentCounts).reduce((sum, count) => sum + (typeof count === 'number' ? count : 0), 0)}
              </p>
              <p className="text-sm text-gray-600">Total Students</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}