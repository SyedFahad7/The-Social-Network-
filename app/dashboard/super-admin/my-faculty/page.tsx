'use client';
// Defensive logging for debugging
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Plus, Trash2, Search } from 'lucide-react';
import apiClient from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

type User = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  department?: string | { _id: string; name?: string };
  isActive?: boolean;
  role?: string;
  classTeacherAssignments?: any[];
  teachingAssignments?: any[];
};

console.log('DEBUG apiClient:', apiClient);

export default function MyFacultyPage() {
  const [tab, setTab] = useState('view');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [assignments, setAssignments] = useState<any>(null);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const { toast } = useToast();

  // Get role from localStorage (client-side only)
  let role = 'super-admin';
  if (typeof window !== 'undefined') {
    try {
      const user = localStorage.getItem('user');
      if (user) {
        const parsed = JSON.parse(user);
        if (parsed.role) role = parsed.role;
      }
    } catch {}
  }

  // Add state for search
  const [searchTerm, setSearchTerm] = useState('');

  // Filter teachers by search term
  const filteredTeachers = teachers.filter((t: User) => {
    const name = `${t.firstName ?? ''} ${t.lastName ?? ''}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  // Fetch all teachers
  useEffect(() => {
    setLoading(true);
    apiClient.getUsers({ role: 'teacher', limit: 1000 })
      .then(res => {
        console.log('DEBUG getUsers result:', res);
        setTeachers(res.data.users);
      })
      .catch(err => {
        setError(err.message);
        console.error('DEBUG getUsers error:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch departments, academic years, and subjects for assignment forms
  useEffect(() => {
    apiClient.getDepartments()
      .then(res => {
        console.log('DEBUG getDepartments result:', res);
        setDepartments(res.data.departments || res.data);
      })
      .catch(err => console.error('DEBUG getDepartments error:', err));
    apiClient.getAcademicYears().then(res => setAcademicYears(res.data.academicYears || res.data)).catch(() => {});
    apiClient.getSubjects().then(res => setSubjects(res.data.subjects || res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    console.log('DEBUG teachers state:', teachers);
    console.log('DEBUG departments state:', departments);
    console.log('DEBUG error state:', error);
  }, [teachers, departments, error]);

  // Fetch assignments for selected teacher
  const fetchAssignments = async (teacher: any) => {
    setAssignmentsLoading(true);
    try {
      const res = await apiClient.getTeacherAssignments(teacher._id);
      console.log('DEBUG getTeacherAssignments response:', res);
      // Always set assignments to the expected structure
      let assignmentsObj = res.data && res.data.data
        ? res.data.data
        : res.data
          ? res.data
          : res;
      // Defensive: wrap if not already
      if (!('teachingAssignments' in assignmentsObj) || !('classTeacherAssignments' in assignmentsObj)) {
        assignmentsObj = {
          teachingAssignments: assignmentsObj.teachingAssignments || [],
          classTeacherAssignments: assignmentsObj.classTeacherAssignments || []
        };
      }
      setAssignments(assignmentsObj);
      console.log('DEBUG setAssignments (after):', assignmentsObj);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setAssignmentsLoading(false);
    }
  };

  // Add/Remove teaching assignment
  const handleAddTeachingAssignment = async (teacherId: string, assignment: any) => {
    try {
      await apiClient.addTeachingAssignment(teacherId, assignment);
      toast({ title: 'Success', description: 'Teaching assignment added.' });
      fetchAssignments({ _id: teacherId });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };
  const handleRemoveTeachingAssignment = async (teacherId: string, assignment: any) => {
    try {
      await apiClient.removeTeachingAssignment(teacherId, assignment);
      toast({ title: 'Success', description: 'Teaching assignment removed.' });
      fetchAssignments({ _id: teacherId });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Add/Remove class teacher assignment
  const handleAddClassTeacherAssignment = async (teacherId: string, assignment: any) => {
    try {
      await apiClient.addClassTeacherAssignment(teacherId, assignment);
      toast({ title: 'Success', description: 'Class teacher assignment added.' });
      fetchAssignments({ _id: teacherId });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };
  const handleRemoveClassTeacherAssignment = async (teacherId: string, assignment: any) => {
    try {
      await apiClient.removeClassTeacherAssignment(teacherId, assignment);
      toast({ title: 'Success', description: 'Class teacher assignment removed.' });
      fetchAssignments({ _id: teacherId });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Assignment form state
  const [newTeachingAssignment, setNewTeachingAssignment] = useState<any>({});
  const [newClassTeacherAssignment, setNewClassTeacherAssignment] = useState<any>({});

  // State for class teacher assignment filters
  const [ctaAcademicYear, setCtaAcademicYear] = useState('');
  const [ctaYear, setCtaYear] = useState('');
  const [ctaSemester, setCtaSemester] = useState('');
  const [ctaSection, setCtaSection] = useState('');
  const [ctaSections, setCtaSections] = useState<string[]>([]);
  const [ctaStudents, setCtaStudents] = useState<any[]>([]);
  const [ctaCheckLoading, setCtaCheckLoading] = useState(false);
  const [ctaExists, setCtaExists] = useState<null | { exists: boolean; teacher?: any }>();
  const [ctaConfirmOpen, setCtaConfirmOpen] = useState(false);

  // Add state for CT-exists and teacher CT-in-year check
  const [ctExists, setCtExists] = useState<{ exists: boolean; teacherName?: string } | null>(null);
  const [teacherCTInYear, setTeacherCTInYear] = useState<{ exists: boolean; section?: string } | null>(null);

  // Fetch students for section dropdown when filters change
  useEffect(() => {
    setCtaSections([]);
    setCtaSection('');
    if (ctaAcademicYear && ctaYear) {
      // Fetch students for department/year/academicYear
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      const department = user.department;
      if (department) {
        apiClient.getUsers({
          role: 'student',
          department,
          year: ctaYear,
          academicYear: ctaAcademicYear,
          limit: 1000
        }).then(res => {
          const students = res.data?.users || [];
          setCtaStudents(students);
          // Extract unique sections
          const uniqueSections = Array.from(new Set(students.map((s: any) => s.section))).filter(Boolean) as string[];
          setCtaSections(uniqueSections);
        });
      }
    } else {
      setCtaStudents([]);
    }
  }, [ctaAcademicYear, ctaYear]);

  // When section/year/academicYear changes, check if CT exists
  useEffect(() => {
    if (ctaSection && ctaYear && ctaSemester && ctaAcademicYear) {
      apiClient.classTeacherExists({
        section: ctaSection,
        year: ctaYear,
        semester: ctaSemester,
        academicYear: ctaAcademicYear,
      }).then((res) => {
        setCtExists(res.success && res.data && res.data.teacherName ? { exists: true, teacherName: res.data.teacherName } : { exists: false });
      }).catch(() => setCtExists(null));
    } else {
      setCtExists(null);
    }
  }, [ctaSection, ctaYear, ctaSemester, ctaAcademicYear]);

  // When teacher or year changes, check if teacher is already CT for any section in the same year
  useEffect(() => {
    if (selectedTeacher && ctaYear) {
      const found = selectedTeacher.classTeacherAssignments?.find((a: any) => a.year === Number(ctaYear));
      if (found) {
        setTeacherCTInYear({ exists: true, section: found.section });
      } else {
        setTeacherCTInYear({ exists: false });
      }
    } else {
      setTeacherCTInYear(null);
    }
  }, [selectedTeacher, ctaYear]);

  // Set semesters based on year (like teacher attendance page)
  const getSemestersForYear = (year: string) => {
    if (year === '2') return ['3', '4'];
    if (year === '3') return ['5', '6'];
    if (year === '4') return ['7', '8'];
    return [];
  };

  // Handler for Add Class Teacher Assignment
  const handleClassTeacherAssignmentCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setCtaCheckLoading(true);
    setCtaExists(null);
    try {
      // Use fetch directly since apiClient does not have a generic get method
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        section: ctaSection,
        year: ctaYear,
        semester: ctaSemester,
        academicYear: ctaAcademicYear
      });
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/users/class-teacher-exists?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCtaExists(data);
      if (data.exists) {
        toast({ title: 'Error', description: 'This section already has a class teacher.', variant: 'destructive' });
      } else {
        setCtaConfirmOpen(true);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCtaCheckLoading(false);
    }
  };

  // Handler for confirming assignment
  const handleClassTeacherAssignmentConfirm = async () => {
    setCtaCheckLoading(true);
    try {
      await apiClient.addClassTeacherAssignment(selectedTeacher._id, {
        section: ctaSection,
        year: Number(ctaYear),
        semester: Number(ctaSemester),
        academicYear: ctaAcademicYear
      });
      toast({ title: 'Success', description: 'Class teacher assignment added.' });
      setCtaConfirmOpen(false);
      setCtaExists(null);
      setCtaAcademicYear('');
      setCtaYear('');
      setCtaSemester('');
      setCtaSection('');
      fetchAssignments(selectedTeacher);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setCtaConfirmOpen(false); // Always close modal on error
    } finally {
      setCtaCheckLoading(false);
    }
  };

  // UI for assignment forms
  const TeachingAssignmentForm = () => {
    // State for teaching assignment filters
    const [taAcademicYear, setTaAcademicYear] = useState('');
    const [taYear, setTaYear] = useState('');
    const [taSemester, setTaSemester] = useState('');
    const [taSubject, setTaSubject] = useState('');
    const [taSection, setTaSection] = useState('');
    const [taSubjects, setTaSubjects] = useState<any[]>([]);
    const [taSections, setTaSections] = useState<string[]>([]);
    const [taStudents, setTaStudents] = useState<any[]>([]);
    const [taCheckLoading, setTaCheckLoading] = useState(false);
    const [taAssigned, setTaAssigned] = useState<null | { exists: boolean; teacher?: any }>(null);
    // Fetch subjects for selected year/semester/academic year
    useEffect(() => {
      setTaSubjects([]);
      setTaSubject('');
      if (taAcademicYear && taYear && taSemester) {
        apiClient.getSubjects({
          academicYear: taAcademicYear,
          year: taYear,
          semester: taSemester
        }).then(res => {
          setTaSubjects(res.data.subjects || res.data);
        });
      }
    }, [taAcademicYear, taYear, taSemester]);
    // Fetch students for section dropdown
    useEffect(() => {
      setTaSections([]);
      setTaSection('');
      if (taAcademicYear && taYear) {
        const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
        const department = user.department;
        if (department) {
          apiClient.getUsers({
            role: 'student',
            department,
            year: taYear,
            academicYear: taAcademicYear,
            limit: 1000
          }).then(res => {
            const students = res.data?.users || [];
            setTaStudents(students);
            const uniqueSections = Array.from(new Set(students.map((s: any) => s.section))).filter(Boolean) as string[];
            setTaSections(uniqueSections);
          });
        }
      } else {
        setTaStudents([]);
      }
    }, [taAcademicYear, taYear]);
    // Get semesters for year
    const getSemestersForYear = (year: string) => {
      if (year === '2') return ['3', '4'];
      if (year === '3') return ['5', '6'];
      if (year === '4') return ['7', '8'];
      return [];
    };
    // Check if subject is already assigned to another teacher for this section/year/semester/AY
    const checkSubjectAssigned = async (e: React.FormEvent) => {
      e.preventDefault();
      setTaCheckLoading(true);
      setTaAssigned(null);
      try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({
          section: taSection,
          year: taYear,
          semester: taSemester,
          academicYear: taAcademicYear,
          subject: taSubject
        });
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/users/subject-assigned-exists?${params.toString()}`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setTaAssigned(data);
        if (data.exists) {
          toast({ title: 'Error', description: `This subject is already assigned to ${data.teacher?.firstName || 'another teacher'}.`, variant: 'destructive' });
        } else {
          // Proceed to assign
          handleAddTeachingAssignment(selectedTeacher._id, {
            subject: taSubject,
            section: taSection,
            year: taYear,
            semester: taSemester,
            academicYear: taAcademicYear
          });
          setTaAcademicYear('');
          setTaYear('');
          setTaSemester('');
          setTaSubject('');
          setTaSection('');
        }
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      } finally {
        setTaCheckLoading(false);
      }
    };
    useEffect(() => {
      // Only check if all filters are selected
      if (taAcademicYear && taYear && taSemester && taSubject && taSection) {
        setTaCheckLoading(true);
        setTaAssigned(null);
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({
          section: taSection,
          year: taYear,
          semester: taSemester,
          academicYear: taAcademicYear,
          subject: taSubject
        });
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/users/subject-assigned-exists?${params.toString()}`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => setTaAssigned(data))
          .finally(() => setTaCheckLoading(false));
      } else {
        setTaAssigned(null);
      }
    }, [taAcademicYear, taYear, taSemester, taSubject, taSection]);
    // Determine if the assignment is already assigned to another teacher
    const assignedToAnother = taAssigned && taAssigned.exists && taAssigned.teacher && taAssigned.teacher._id !== selectedTeacher._id;
    const alreadyAssigned = assignments && assignments.teachingAssignments && assignments.teachingAssignments.some(
      (a: any) =>
        (a.subject?._id || a.subject) === taSubject &&
        a.section === taSection &&
        a.year == taYear &&
        a.semester == taSemester &&
        (a.academicYear === taAcademicYear || a.academicYear?._id === taAcademicYear)
    );
    return (
      <form className="space-y-2" onSubmit={checkSubjectAssigned}>
        <select
          className="border rounded px-2 py-1 w-full"
          value={taAcademicYear}
          onChange={e => { setTaAcademicYear(e.target.value); setTaYear(''); setTaSemester(''); setTaSubject(''); setTaSection(''); }}
          required
        >
          <option value="">Select Academic Year</option>
          {academicYears.map((ay: any) => (
            <option key={ay._id} value={ay._id}>{ay.yearLabel || ay.name}</option>
          ))}
        </select>
        <select
          className="border rounded px-2 py-1 w-full"
          value={taYear}
          onChange={e => { setTaYear(e.target.value); setTaSemester(''); setTaSubject(''); setTaSection(''); }}
          required
          disabled={!taAcademicYear}
        >
          <option value="">Select Year</option>
          {[2, 3, 4].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          className="border rounded px-2 py-1 w-full"
          value={taSemester}
          onChange={e => { setTaSemester(e.target.value); setTaSubject(''); setTaSection(''); }}
          required
          disabled={!taYear}
        >
          <option value="">Select Semester</option>
          {getSemestersForYear(taYear).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className="border rounded px-2 py-1 w-full"
          value={taSubject}
          onChange={e => setTaSubject(e.target.value)}
          required
          disabled={!taSemester}
        >
          <option value="">Select Subject</option>
          {taSubjects.map((s: any) => (
            <option key={s._id} value={s._id}>{s.shortName || s.name}</option>
          ))}
        </select>
        <select
          className="border rounded px-2 py-1 w-full"
          value={taSection}
          onChange={e => setTaSection(e.target.value)}
          required
          disabled={!taSubject || taSections.length === 0}
        >
          <option value="">Select Section</option>
          {taSections.map(sec => (
            <option key={sec} value={sec}>{sec}</option>
          ))}
        </select>
        <Button
          type="submit"
          size="sm"
          className="w-full mt-2"
          disabled={!!(taCheckLoading || !taAcademicYear || !taYear || !taSemester || !taSubject || !taSection || alreadyAssigned || assignedToAnother || !assignments)}
        >
          {taCheckLoading ? 'Checking...' : <><Plus className="w-4 h-4 mr-1" />Add Teaching Assignment</>}
        </Button>
        {alreadyAssigned && (
          <div className="text-red-600 text-sm mt-2">
            This subject is already assigned to this teacher for this section/year/semester/academic year.
          </div>
        )}
        {assignedToAnother && (
          <div className="text-red-600 text-sm mt-2">
            This subject is already assigned to {taAssigned.teacher?.firstName || 'another teacher'} for this section/year/semester/academic year.
          </div>
        )}
      </form>
    );
  };

  // Class Teacher Assignment Form UI
  const ClassTeacherAssignmentForm = () => {
    console.log('DEBUG MODAL assignments:', assignments);
    console.log('DEBUG MODAL assignments.classTeacherAssignments:', assignments?.classTeacherAssignments);
    // Find if teacher already has a CT assignment for this year/semester/AY
    const alreadyAssignedSection = (assignments && assignments.classTeacherAssignments ? (assignments.classTeacherAssignments ?? []).find(
      (a: any) => a.year == ctaYear && a.semester == ctaSemester && String(a.academicYear?._id || a.academicYear) === String(ctaAcademicYear)
    ) : undefined);
    // Filter sections to exclude those already assigned to this teacher for this year/semester/AY
    const availableSections = ctaSections.filter(sec =>
      !(assignments && assignments.classTeacherAssignments ? (assignments.classTeacherAssignments ?? []).some((a: any) => a.section === sec && a.year == ctaYear && a.semester == ctaSemester && String(a.academicYear?._id || a.academicYear) === String(ctaAcademicYear)) : false)
    );
    // In the Assign button and modal, add validation logic
    const assignDisabled = ctExists?.exists || teacherCTInYear?.exists;
    return (
      <form className="space-y-2" onSubmit={handleClassTeacherAssignmentCheck}>
        <select
          className="border rounded px-2 py-1 w-full"
          value={ctaAcademicYear}
          onChange={e => { setCtaAcademicYear(e.target.value); setCtaYear(''); setCtaSemester(''); setCtaSection(''); }}
          required
        >
          <option value="">Select Academic Year</option>
          {academicYears.map((ay: any) => (
            <option key={ay._id} value={ay._id}>{ay.yearLabel || ay.name}</option>
          ))}
        </select>
        <select
          className="border rounded px-2 py-1 w-full"
          value={ctaYear}
          onChange={e => { setCtaYear(e.target.value); setCtaSemester(''); setCtaSection(''); }}
          required
          disabled={!ctaAcademicYear}
        >
          <option value="">Select Year</option>
          {[2, 3, 4].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          className="border rounded px-2 py-1 w-full"
          value={ctaSemester}
          onChange={e => { setCtaSemester(e.target.value); setCtaSection(''); }}
          required
          disabled={!ctaYear}
        >
          <option value="">Select Semester</option>
          {getSemestersForYear(ctaYear).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className="border rounded px-2 py-1 w-full"
          value={ctaSection}
          onChange={e => setCtaSection(e.target.value)}
          required
          disabled={!ctaSemester || availableSections.length === 0 || alreadyAssignedSection}
        >
          <option value="">Select Section</option>
          {availableSections.map(sec => (
            <option key={sec} value={sec}>{sec}</option>
          ))}
        </select>
        <Button
          type="submit"
          size="sm"
          className="w-full mt-2"
          disabled={ctaCheckLoading || !ctaAcademicYear || !ctaYear || !ctaSemester || !ctaSection || alreadyAssignedSection || assignDisabled}
        >
          {ctaCheckLoading ? 'Checking...' : <><Plus className="w-4 h-4 mr-1" />Add Class Teacher Assignment</>}
        </Button>
        {alreadyAssignedSection && (
          <div className="text-red-600 text-sm mt-2">
            This teacher is already class teacher for Section {alreadyAssignedSection.section}, Year {alreadyAssignedSection.year}, Semester {alreadyAssignedSection.semester}, Academic Year {(() => { const ay = academicYears.find(ay => ay._id === (alreadyAssignedSection.academicYear?._id || alreadyAssignedSection.academicYear)); return ay ? (ay.yearLabel || ay.name) : (alreadyAssignedSection.academicYear?.name || alreadyAssignedSection.academicYear?._id || alreadyAssignedSection.academicYear); })()}.
          </div>
        )}
        {ctExists?.exists && (
          <div className="text-red-600 mt-2">
            For Section {ctaSection}, Year {ctaYear}, class teacher {ctExists.teacherName} is already assigned.
          </div>
        )}
        {teacherCTInYear?.exists && (
          <div className="text-red-600 mt-2">
            This teacher is already class teacher for Section {teacherCTInYear.section}, Year {ctaYear}.
          </div>
        )}
        {/* Confirmation Dialog */}
        {ctaConfirmOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
              <h2 className="text-lg font-bold mb-2">Confirm Assignment</h2>
              <p>Are you sure you want to assign <b>{selectedTeacher.firstName} {selectedTeacher.lastName}</b> as class teacher for Section {ctaSection}, Year {ctaYear}, Semester {ctaSemester}, Academic Year {academicYears.find(ay => ay._id === ctaAcademicYear)?.name || String(ctaAcademicYear)}?</p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCtaConfirmOpen(false)}>Cancel</Button>
                <Button onClick={handleClassTeacherAssignmentConfirm} disabled={assignDisabled || ctaCheckLoading}>{ctaCheckLoading ? 'Assigning...' : 'Yes, Assign'}</Button>
              </div>
            </div>
          </div>
        )}
      </form>
    );
  };

  // 3. De-assign (delete) functionality for class teacher assignments
  const [ctaDeleteIdx, setCtaDeleteIdx] = useState<number | null>(null);
  const [ctaDeleteLoading, setCtaDeleteLoading] = useState(false);
  const handleDeleteClassTeacherAssignment = async (assignment: any) => {
    setCtaDeleteLoading(true);
    try {
      await apiClient.removeClassTeacherAssignment(selectedTeacher._id, {
        section: assignment.section,
        year: Number(assignment.year),
        semester: Number(assignment.semester),
        academicYear: assignment.academicYear?._id || assignment.academicYear
      });
      toast({ title: 'Success', description: 'Class teacher assignment removed.' });
      fetchAssignments(selectedTeacher);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCtaDeleteLoading(false);
      setCtaDeleteIdx(null);
    }
  };

  // Add state for teaching assignment delete confirmation
  const [taDeleteIdx, setTaDeleteIdx] = useState<number | null>(null);
  const [taDeleteLoading, setTaDeleteLoading] = useState(false);

  return (
    <DashboardLayout role={role}>
      <div className="container mx-auto py-8 px-8">
        <h1 className="text-3xl font-bold mb-6">My Faculty</h1>
        {(!apiClient.getUsers || !apiClient.getTeacherAssignments) && (
          <div className="text-red-600 font-bold">API client methods are undefined. Please check your import and build setup.</div>
        )}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="view">View</TabsTrigger>
            <TabsTrigger value="manage">Manage Assignments</TabsTrigger>
          </TabsList>
          <TabsContent value="view">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>All Teachers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search teacher by name..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="border rounded px-2 py-1 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full divide-y divide-gray-200 bg-white">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">S.No</th>
                          <th className="text-left border px-2 py-1">Name</th>
                          <th className="text-left border px-2 py-1">Email</th>
                          <th className="text-center border px-2 py-1">View</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredTeachers.map((teacher: User, idx: number) => (
                          <tr key={teacher._id} className="hover:bg-blue-50 transition">
                            <td className="px-4 py-2 text-sm text-gray-700">{idx + 1}</td>
                            <td className="border px-2 py-1">{teacher.firstName} {teacher.lastName}</td>
                            <td className="border px-2 py-1">{teacher.email}</td>
                            <td className="border px-2 py-1 text-center">
                              <Button size="icon" variant="ghost" onClick={async () => { setSelectedTeacher(teacher); await fetchAssignments(teacher); setShowTeacherModal(true); }}>
                                <Eye className="w-4 h-4 text-blue-600" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Teacher details modal */}
                {showTeacherModal && selectedTeacher && (
                  <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                      <h2 className="text-xl font-bold mb-2">Teacher Details</h2>
                      <p><b>Name:</b> {selectedTeacher.firstName} {selectedTeacher.lastName}</p>
                      <p><b>Email:</b> {selectedTeacher.email}</p>
                      <p><b>Department:</b> {departments.find(d => d._id === (selectedTeacher.department?._id || selectedTeacher.department))?.name || selectedTeacher.department?.name || selectedTeacher.department?._id || selectedTeacher.department?.toString() || selectedTeacher.department}</p>
                      <div className="mt-4">
                        <h3 className="font-semibold">Assignments</h3>
                        {assignmentsLoading ? <div>Loading assignments...</div> : assignments && assignments.classTeacherAssignments ? (
                          <>
                            <div className="mt-2">
                              <b>Class Teacher Assignments:</b>
                              {(assignments?.classTeacherAssignments ?? []).length > 0 ? (
                                <ul className="list-disc ml-5">
                                  {(assignments?.classTeacherAssignments ?? []).map((a: any, idx: number) => (
                                    <li key={idx}>
                                      Section {a.section}, Year {a.year}, Sem {a.semester}, AY: {(() => { const ay = academicYears.find(ay => ay._id === (a.academicYear?._id || a.academicYear)); return ay ? (ay.yearLabel || ay.name) : (a.academicYear?.name || a.academicYear?._id || a.academicYear?.toString() || a.academicYear); })()}
                                    </li>
                                  ))}
                                </ul>
                              ) : <span className="text-gray-500 ml-2">None</span>}
                            </div>
                            <div className="mt-2">
                              <b>Teaching Assignments:</b>
                              {(assignments?.teachingAssignments ?? []).length > 0 ? (
                                <ul className="list-disc ml-5">
                                  {(assignments?.teachingAssignments ?? []).map((a: any, idx: number) => (
                                    <li key={idx}>
                                      {subjects.find(s => s._id === (a.subject?._id || a.subject))?.shortName || a.subject?.shortName || a.subject?.name || a.subject?._id || a.subject?.toString() || a.subject} | Section {a.section}, Year {a.year}, Sem {a.semester}, AY: {(() => { const ay = academicYears.find(ay => ay._id === (a.academicYear?._id || a.academicYear)); return ay ? (ay.yearLabel || ay.name) : (a.academicYear?.name || a.academicYear?._id || a.academicYear?.toString() || a.academicYear); })()}
                                    </li>
                                  ))}
                                </ul>
                              ) : <span className="text-gray-500 ml-2">None</span>}
                            </div>
                          </>
                        ) : <div className="text-gray-500">No assignments found.</div>}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button onClick={() => setShowTeacherModal(false)}>Close</Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="manage">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Manage Teacher Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search teacher by name..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="border rounded px-2 py-1 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full divide-y divide-gray-200 bg-white">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">S.No</th>
                          <th className="text-left border px-2 py-1">Name</th>
                          <th className="text-left border px-2 py-1">Email</th>
                          <th className="text-left border px-2 py-1">Department</th>
                          <th className="text-center border px-2 py-1">Edit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredTeachers.map((teacher: User, idx: number) => (
                          <tr key={teacher._id} className="hover:bg-blue-50 transition">
                            <td className="px-4 py-2 text-sm text-gray-700">{idx + 1}</td>
                            <td className="border px-2 py-1">{teacher.firstName} {teacher.lastName}</td>
                            <td className="border px-2 py-1">{teacher.email}</td>
                            <td className="border px-2 py-1">{departments.find(d => d._id === teacher.department)?.name || teacher.department}</td>
                            <td className="border px-2 py-1 text-center">
                              <Button size="icon" variant="ghost" onClick={async () => { setSelectedTeacher(teacher); await fetchAssignments(teacher); setShowEditModal(true); }}>
                                <Edit className="w-4 h-4 text-blue-600" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Edit assignments modal */}
                {showEditModal && selectedTeacher && (
                  (() => {
                    // DEBUG: Log assignments and assignments.classTeacherAssignments just before modal render
                    console.log('DEBUG MODAL (parent) assignments:', assignments);
                    console.log('DEBUG MODAL (parent) assignments.classTeacherAssignments:', assignments?.classTeacherAssignments);
                    return (
                      <div key={JSON.stringify(assignments)} className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                          <h2 className="text-xl font-bold mb-2">Manage Assignments for {selectedTeacher.firstName} {selectedTeacher.lastName}</h2>
                          <Tabs defaultValue="class" className="mt-4">
                            <TabsList>
                              <TabsTrigger value="class">Class Teacher Assignment</TabsTrigger>
                              <TabsTrigger value="subject">Subject Assignment</TabsTrigger>
                            </TabsList>
                            <TabsContent value="class">
                              <div className="mt-4">
                                <ClassTeacherAssignmentForm />
                                {assignmentsLoading ? (
                                  <div style={{ textAlign: 'center', padding: '1rem' }}>Loading assignments...</div>
                                ) : assignments && Array.isArray(assignments.classTeacherAssignments) && assignments.classTeacherAssignments.length > 0 ? (
                                  <ul className="mt-4 space-y-2">
                                    {(assignments?.classTeacherAssignments ?? []).map((a: any, idx: number) => (
                                      <li key={idx} className="flex items-center justify-between border rounded px-2 py-1">
                                        <span>Section {a.section}, Year {a.year}, Sem {a.semester}, AY: {(() => { const ay = academicYears.find(ay => ay._id === (a.academicYear?._id || a.academicYear)); return ay ? (ay.yearLabel || ay.name) : (a.academicYear?.name || a.academicYear?._id || a.academicYear?.toString() || a.academicYear); })()}</span>
                                        <Button size="icon" variant="ghost" onClick={() => setCtaDeleteIdx(idx)}><Trash2 className="w-4 h-4" /></Button>
                                        {ctaDeleteIdx === idx && (
                                          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                                            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                                              <h2 className="text-lg font-bold mb-2">Confirm De-assign</h2>
                                              <p>Do you want to de-assign <b>{selectedTeacher.firstName} {selectedTeacher.lastName}</b> from Section {a.section}, Year {a.year}, Sem {a.semester}, AY: {academicYears.find(ay => ay._id === (a.academicYear?._id || a.academicYear))?.name || a.academicYear?.name || a.academicYear?._id || a.academicYear?.toString() || a.academicYear}?</p>
                                              <div className="mt-4 flex justify-end gap-2">
                                                <Button variant="outline" onClick={() => setCtaDeleteIdx(null)}>Cancel</Button>
                                                <Button onClick={() => handleDeleteClassTeacherAssignment(a)} disabled={ctaDeleteLoading}>{ctaDeleteLoading ? 'Removing...' : 'Yes, De-assign'}</Button>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                ) : assignments && Array.isArray(assignments.classTeacherAssignments) && assignments.classTeacherAssignments.length === 0 ? (
                                  <div style={{ color: '#6b7280', padding: '1rem' }}>No class teacher assignments.</div>
                                ) : null}
                              </div>
                            </TabsContent>
                            <TabsContent value="subject">
                              <div className="mt-4">
                                {assignmentsLoading || !assignments
                                  ? <div>Loading...</div>
                                  : <TeachingAssignmentForm />}
                                {(assignments?.teachingAssignments ?? []).length > 0 ? (
                                  <ul className="mt-4 space-y-2">
                                    {(assignments?.teachingAssignments ?? []).map((a: any, idx: number) => (
                                      <li key={idx} className="flex items-center justify-between border rounded px-2 py-1">
                                        <span>{subjects.find(s => s._id === (a.subject?._id || a.subject))?.shortName || a.subject?.shortName || a.subject?.name || a.subject?._id || a.subject?.toString() || a.subject} | Section {a.section}, Year {a.year}, Sem {a.semester}, AY: {(() => { const ay = academicYears.find(ay => ay._id === (a.academicYear?._id || a.academicYear)); return ay ? (ay.yearLabel || ay.name) : (a.academicYear?.name || a.academicYear?._id || a.academicYear?.toString() || a.academicYear); })()}</span>
                                        <Button size="icon" variant="ghost" onClick={() => setTaDeleteIdx(idx)}><Trash2 className="w-4 h-4" /></Button>
                                        {taDeleteIdx === idx && (
                                          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                                            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                                              <h2 className="text-lg font-bold mb-2">Confirm De-assign</h2>
                                              <p>Do you want to de-assign <b>{selectedTeacher.firstName} {selectedTeacher.lastName}</b> from {subjects.find(s => s._id === (a.subject?._id || a.subject))?.shortName || a.subject?.shortName || a.subject?.name || a.subject?._id || a.subject?.toString() || a.subject} | Section {a.section}, Year {a.year}, Sem {a.semester}, AY: {(() => { const ay = academicYears.find(ay => ay._id === (a.academicYear?._id || a.academicYear)); return ay ? (ay.yearLabel || ay.name) : (a.academicYear?.name || a.academicYear?._id || a.academicYear?.toString() || a.academicYear); })()}?</p>
                                              <div className="mt-4 flex justify-end gap-2">
                                                <Button variant="outline" onClick={() => setTaDeleteIdx(null)}>Cancel</Button>
                                                <Button onClick={async () => {
                                                  setTaDeleteLoading(true);
                                                  await handleRemoveTeachingAssignment(selectedTeacher._id, {
                                                    subject: (a.subject?._id || a.subject).toString(),
                                                    section: a.section,
                                                    year: Number(a.year),
                                                    semester: Number(a.semester),
                                                    academicYear: (a.academicYear?._id || a.academicYear).toString()
                                                  });
                                                  setTaDeleteLoading(false);
                                                  setTaDeleteIdx(null);
                                                }} disabled={taDeleteLoading}>{taDeleteLoading ? 'Removing...' : 'Yes, De-assign'}</Button>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                ) : <div className="text-gray-500 mt-2">No teaching assignments.</div>}
                              </div>
                            </TabsContent>
                          </Tabs>
                          <div className="mt-4 flex justify-end">
                            <Button onClick={() => setShowEditModal(false)}>Close</Button>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 