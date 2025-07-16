'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Calendar, Check, X, Save, Search, Filter, Download, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function TeacherAttendance() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [years] = useState([2, 3, 4]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [semesters, setSemesters] = useState<any[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedHours, setSelectedHours] = useState<string[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [showStudents, setShowStudents] = useState(false);
  const [marking, setMarking] = useState<Record<string, 'present' | 'absent'>>({});
  const [late, setLate] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [commentDialog, setCommentDialog] = useState<{ open: boolean; studentId: string | null }>({ open: false, studentId: null });
  const [commentInput, setCommentInput] = useState('');
  const { toast } = useToast();
  const [tab, setTab] = useState<'mark' | 'history' | 'view'>('mark');
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editMarking, setEditMarking] = useState<Record<string, string>>({});
  const [editLate, setEditLate] = useState<Record<string, boolean>>({});
  const [editComments, setEditComments] = useState<Record<string, string>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  // Add filter state for history tab
  const [historyDate, setHistoryDate] = useState(selectedDate);
  const [historyHour, setHistoryHour] = useState(selectedHours.length > 0 ? selectedHours[0] : '');
  const [historySuccess, setHistorySuccess] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [attendanceAlreadyMarked, setAttendanceAlreadyMarked] = useState(false);
  // Add state to store present/absent counts after submission
  const [attendanceSummary, setAttendanceSummary] = useState<{ present: number; absent: number } | null>(null);
  // Add state for view attendance
  const [viewAttendanceLoading, setViewAttendanceLoading] = useState(false);
  const [viewAttendanceResults, setViewAttendanceResults] = useState<any[]>([]);
  const [viewAttendanceError, setViewAttendanceError] = useState('');
  // Add state to track which hours are already marked
  const [markedHours, setMarkedHours] = useState<number[]>([]);
  // Add state to detect mobile/tablet width
  const [isMobile, setIsMobile] = useState(false);
  const [teachingAssignments, setTeachingAssignments] = useState<any[]>([]);
  const [classTeacherAssignments, setClassTeacherAssignments] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [processLog, setProcessLog] = useState<string[]>([]);

  // Helper to add to process log
  const logProcess = (msg: string, data?: any) => {
    setProcessLog(prev => [
      `${new Date().toLocaleTimeString()} | ${msg}${data !== undefined ? ': ' + (typeof data === 'string' ? data : JSON.stringify(data)) : ''}`,
      ...prev.slice(0, 49) // keep last 50 logs
    ]);
  };

  // Auto-dismiss Mark Attendance messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => { setSuccess(''); setError(''); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);
  // Auto-dismiss History messages
  useEffect(() => {
    if (historySuccess || historyError) {
      const timer = setTimeout(() => { setHistorySuccess(''); setHistoryError(''); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [historySuccess, historyError]);

  // Fetch academic years on mount
  useEffect(() => {
    apiClient.getAcademicYears?.().then(res => {
      if (res?.success) setAcademicYears(res.data);
    });
  }, []);

  // Fetch semesters when year or academic year changes
  useEffect(() => {
    if (selectedAcademicYear && selectedYear) {
      const yearLabel = years[parseInt(selectedYear) - 2] + 'nd';
      const ay = academicYears.find((y: any) => y._id === selectedAcademicYear);
      if (ay && ay.currentSemesterMap) {
        const sem = ay.currentSemesterMap[selectedYear + 'nd'] || ay.currentSemesterMap[selectedYear + 'rd'] || ay.currentSemesterMap[selectedYear + 'th'];
        setSemesters([sem, sem + 1]);
      }
    }
  }, [selectedAcademicYear, selectedYear, academicYears]);

  // Fetch user from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let u = JSON.parse(localStorage.getItem('user') || '{}');
      if (u.id && !u._id) u._id = u.id; // Patch: map id to _id if needed
      setUser(u);
      logProcess('Loaded user from localStorage', u);
    }
  }, []);

  // Fetch teacher assignments after user is loaded
  useEffect(() => {
    if (!user || !user._id) return;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const url = backendUrl
      ? `${backendUrl}/api/users/${user._id}/assignments`
      : `/api/users/${user._id}/assignments`;
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setTeachingAssignments(data.teachingAssignments || []);
        setClassTeacherAssignments(data.classTeacherAssignments || []);
        logProcess('[ASSIGNMENTS ROUTE] teachingAssignments', data.teachingAssignments);
        logProcess('[ASSIGNMENTS ROUTE] classTeacherAssignments', data.classTeacherAssignments);
        logProcess('[ASSIGNMENTS ROUTE] Sending response', {
          teachingAssignmentsLength: Array.isArray(data.teachingAssignments) ? data.teachingAssignments.length : 0,
          classTeacherAssignmentsLength: Array.isArray(data.classTeacherAssignments) ? data.classTeacherAssignments.length : 0
        });
      })
      .catch(err => {
        logProcess('[ASSIGNMENTS ROUTE] ERROR', err?.message || err);
        setTeachingAssignments([]);
        setClassTeacherAssignments([]);
      });
  }, [user]);

  // Filter sections based on assignments and selected filters
  useEffect(() => {
    if (!selectedAcademicYear || !selectedYear || !selectedSemester) {
      setSections([]);
      setSelectedSection('');
      return;
    }
    // Only show sections the teacher is assigned to for the selected filters
    const filtered = teachingAssignments.filter(a =>
      String(a.academicYear?._id || a.academicYear) === String(selectedAcademicYear) &&
      String(a.year) === String(selectedYear) &&
      String(a.semester) === String(selectedSemester)
    );
    const uniqueSections = Array.from(new Set(filtered.map(a => a.section))).filter(Boolean);
    setSections(uniqueSections);
    // If current selectedSection is not in the new list, reset it
    if (!uniqueSections.includes(selectedSection)) setSelectedSection('');
  }, [teachingAssignments, selectedAcademicYear, selectedYear, selectedSemester]);

  // Filter subjects based on assignments and selected section
  useEffect(() => {
    if (!selectedAcademicYear || !selectedYear || !selectedSemester || !selectedSection) {
      setSubjects([]);
      return;
    }
    // Only show subjects the teacher is assigned to for the selected section/year/semester/AY
    const filteredAssignments = teachingAssignments.filter(a =>
      String(a.section) === String(selectedSection) &&
      String(a.year) === String(selectedYear) &&
      String(a.semester) === String(selectedSemester) &&
      (
        String(a.academicYear?._id || a.academicYear) === String(selectedAcademicYear)
      )
    );
    // Map to subject objects (populated from backend)
    const uniqueSubjects = Array.from(
      new Map(filteredAssignments.map(a => [a.subject._id, a.subject])).values()
    );
    setSubjects(uniqueSubjects);
  }, [selectedAcademicYear, selectedYear, selectedSemester, selectedSection, teachingAssignments]);

  // Fetch all students for department and year (for sections dropdown)
  useEffect(() => {
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    const department = user.department;
    if (department && selectedYear) {
      console.log('[ATTENDANCE] Fetching students for sections dropdown with:', {
        role: 'student',
        department,
        year: selectedYear,
        limit: 1000 // Ensure all students are fetched
      });
      apiClient.getUsers({
        role: 'student',
        department,
        year: selectedYear,
        limit: 1000 // Ensure all students are fetched
      }).then(res => {
        if (res?.success && res.data?.users) {
          setAllStudents(res.data.users);
        } else {
          setAllStudents([]);
        }
      });
    } else {
      setAllStudents([]);
    }
  }, [selectedYear]);

  // Extract unique sections from allStudents (for dropdown)
  useEffect(() => {
    const uniqueSections = Array.from(new Set(allStudents.map(s => s.section))).filter(Boolean);
    setSections(uniqueSections);
    if (uniqueSections.length === 0) {
      console.warn('[ATTENDANCE] No sections found for selected year/department');
    }
  }, [allStudents]);

  // Fetch students for attendance marking (with all filters)
  useEffect(() => {
    if (selectedAcademicYear && selectedYear && selectedSemester && selectedSection) {
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      const department = user.department;
      console.log('[ATTENDANCE] Fetching students for attendance marking with:', {
        role: 'student',
        department,
        year: selectedYear,
        academicYear: selectedAcademicYear,
        section: selectedSection,
        limit: 1000 // Ensure all students are fetched
      });
      apiClient.getUsers({
        role: 'student',
        department,
        year: selectedYear,
        academicYear: selectedAcademicYear,
        section: selectedSection,
        limit: 1000 // Ensure all students are fetched
      }).then(res => {
        if (res?.success) {
          if (Array.isArray(res.data)) {
            console.log('[ATTENDANCE] Setting students from array:', res.data.length);
            setStudents(res.data);
          } else if (res.data?.users) {
            console.log('[ATTENDANCE] Setting students from users:', res.data.users.length);
            setStudents(res.data.users);
          } else {
            console.log('[ATTENDANCE] No students found in response');
            setStudents([]);
          }
        } else {
          console.log('[ATTENDANCE] API call failed:', res);
          setStudents([]);
        }
      }).catch(err => {
        console.error('[ATTENDANCE] Error fetching students:', err);
        setStudents([]);
      });
    } else {
      console.log('[ATTENDANCE] Not all required filters selected, clearing students');
      setStudents([]);
    }
  }, [selectedAcademicYear, selectedYear, selectedSemester, selectedSection]);

  // Update the useEffect that checks for already marked attendance:
  useEffect(() => {
    if (selectedAcademicYear && selectedYear && selectedSemester && selectedSection && selectedSubject && selectedDate && selectedHours.length > 0) {
      setLoading(true);
      setAttendanceAlreadyMarked(false);
      setShowStudents(false);
      setMarkedHours([]);
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      const department = user.department;
      // For each selected hour, check if attendance exists
      Promise.all(selectedHours.map(async h => {
        const res = await apiClient.getAttendance?.({
          academicYear: selectedAcademicYear,
          department,
          year: selectedYear,
          semester: selectedSemester,
          section: selectedSection,
          date: selectedDate,
          hour: h
        });
        return res?.success && res.data.length > 0 ? Number(h) : null;
      })).then(results => {
        const alreadyMarked = results.filter(h => h !== null) as number[];
        setMarkedHours(alreadyMarked);
        if (alreadyMarked.length === selectedHours.length) {
          setAttendanceAlreadyMarked(true);
          setError('Attendance already marked for all selected hours. To edit, use Check History.');
          setShowStudents(false);
          setAttendance({});
          setMarking({});
          setLate({});
          setComments({});
        } else if (alreadyMarked.length > 0) {
          setAttendanceAlreadyMarked(false);
          setError(`Attendance already marked for hour(s): ${alreadyMarked.join(', ')}. You can mark the others.`);
        } else {
          setAttendanceAlreadyMarked(false);
          setError('');
        }
      }).finally(() => setLoading(false));
    } else {
      setAttendanceAlreadyMarked(false);
      setError('');
      setMarkedHours([]);
    }
  }, [selectedAcademicYear, selectedYear, selectedSemester, selectedSection, selectedSubject, selectedDate, selectedHours]);

  // Log allStudents and sections after fetching
  useEffect(() => {
    console.log('[ATTENDANCE] allStudents count:', allStudents.length);
    if (allStudents.length === 0) {
      console.warn('[ATTENDANCE] No students found for selected filters');
    }
  }, [allStudents]);

  useEffect(() => {
    console.log('[ATTENDANCE] sections:', sections);
    if (sections.length === 0) {
      console.warn('[ATTENDANCE] No sections found for selected filters');
    }
  }, [sections]);

  // Log subjects after fetching
  useEffect(() => {
    console.log('[ATTENDANCE] subjects:', subjects);
    if (subjects.length === 0) {
      console.warn('[ATTENDANCE] No subjects found for selected filters');
    }
  }, [subjects]);

  // Log students after fetching
  useEffect(() => {
    console.log('[ATTENDANCE] students array updated:', students.length, 'students');
    if (students.length === 0) {
      console.warn('[ATTENDANCE] Students array is empty');
    } else {
      console.log('[ATTENDANCE] First few students:', students.slice(0, 3).map(s => ({ 
      name: s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : (s.firstName || s.lastName || 'Unknown Student'), 
      rollNumber: s.rollNumber 
    })));
    }
  }, [students]);

  // Auto-show students when they are fetched and attendance is not already marked
  useEffect(() => {
    // Remove auto-show behavior - let user click "Fetch Students" button
    if (students.length === 0 && !attendanceAlreadyMarked && selectedHours.length > 0) {
      console.log('[ATTENDANCE] No students found but attendance not marked, this might be an error');
    }
  }, [students, attendanceAlreadyMarked, selectedHours]);

  // Ensure students are available when hour changes and attendance is not marked
  useEffect(() => {
    if (selectedHours.length === 0 && !attendanceAlreadyMarked && students.length === 0 && 
        selectedAcademicYear && selectedYear && selectedSemester && selectedSection) {
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      const department = user.department;
      
      apiClient.getUsers({
        role: 'student',
        department,
        year: selectedYear,
        academicYear: selectedAcademicYear,
        section: selectedSection,
        limit: 1000
      }).then(res => {
        if (res?.success) {
          if (Array.isArray(res.data)) {
            console.log('[ATTENDANCE] Setting students from refetch array:', res.data.length);
            setStudents(res.data);
          } else if (res.data?.users) {
            console.log('[ATTENDANCE] Setting students from refetch users:', res.data.users.length);
            setStudents(res.data.users);
          } else {
            console.log('[ATTENDANCE] No students in refetch response');
            setStudents([]);
          }
        } else {
          console.log('[ATTENDANCE] Refetch API call failed:', res);
          setStudents([]);
        }
      }).catch(err => {
        console.error('[ATTENDANCE] Error refetching students:', err);
        setStudents([]);
      });
    }
  }, [selectedHours, attendanceAlreadyMarked, students.length, selectedAcademicYear, selectedYear, selectedSemester, selectedSection]);

  // Fetch history when tab is 'history' and filters are selected
  useEffect(() => {
    // Remove auto-fetching - let user click "Fetch Attendance" button
    if (tab === 'history') {
      console.log('[ATTENDANCE] History tab active, waiting for user to click Fetch Attendance');
      setHistoryRecords([]);
    }
  }, [tab, selectedAcademicYear, selectedYear, selectedSemester, selectedSection, historyDate, historyHour]);

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendance((prev: Record<string, string>) => ({ ...prev, [studentId]: status }));
  };

  const allMarked = students.length > 0 && students.every(s => attendance[s._id]);

  // Helper to reset all filters and relevant state
  const resetFilters = () => {
    setSelectedAcademicYear('');
    setSelectedYear('');
    setSelectedSemester('');
    setSelectedSection('');
    setSelectedSubject('');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedHours([]);
    setShowStudents(false);
    setStudents([]);
    setAttendance({});
    setMarking({});
    setLate({});
    setComments({});
    setAttendanceAlreadyMarked(false);
    // Don't clear error if it's an "already marked" message
    if (!error || !error.includes('already marked')) {
      setError('');
    }
    // When resetting filters, also reset attendanceSummary
    setAttendanceSummary(null);
  };

  // Handler for Fetch Students button
  const handleFetchStudents = () => {
    console.log('[ATTENDANCE] handleFetchStudents called', {
      attendanceAlreadyMarked,
      studentsLength: students.length,
      showStudents,
      selectedAcademicYear,
      selectedYear,
      selectedSemester,
      selectedSection,
      selectedSubject,
      selectedDate,
      selectedHours
    });
    
    // If attendance is already marked, do not show students
    if (attendanceAlreadyMarked) {
      console.log('[ATTENDANCE] Attendance already marked, not showing students');
      setShowStudents(false);
      return;
    }
    
    // If students are already shown, just toggle visibility
    if (showStudents) {
      console.log('[ATTENDANCE] Students already shown, toggling visibility');
      setShowStudents(false);
      return;
    }
    
    console.log('[ATTENDANCE] Setting showStudents to true, students count:', students.length);
    setShowStudents(true);
    
    // Only initialize if not already initialized
    if (Object.keys(marking).length === 0) {
      const initialMarking: Record<string, 'present' | 'absent'> = {};
      const initialLate: Record<string, boolean> = {};
      const initialComments: Record<string, string> = {};
      students.forEach(s => {
        initialMarking[s._id] = 'absent'; // Default to absent
        initialLate[s._id] = false;
        initialComments[s._id] = '';
      });
      console.log('[ATTENDANCE] Initialized attendance state for', students.length, 'students');
      setMarking(initialMarking);
      setLate(initialLate);
      setComments(initialComments);
    }
  };

  // Handler for Fetch Attendance button (History tab)
  const handleFetchAttendance = () => {
    console.log('[ATTENDANCE] handleFetchAttendance called', {
      selectedAcademicYear,
      selectedYear,
      selectedSemester,
      selectedSection,
      historyDate,
      historyHour
    });
    
    setHistoryLoading(true);
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    const department = user.department;
    
    console.log('[ATTENDANCE] Fetching attendance history with filters:', {
      academicYear: selectedAcademicYear,
      department,
      year: selectedYear,
      semester: selectedSemester,
      section: selectedSection,
      date: historyDate,
      hour: historyHour
    });
    
    // Fetch attendance for this hour/date/section combination (any subject)
    apiClient.getAttendance?.({
      academicYear: selectedAcademicYear,
      department,
      year: selectedYear,
      semester: selectedSemester,
      section: selectedSection,
      date: historyDate,
      hour: historyHour
    }).then(res => {
      console.log('[ATTENDANCE] History response:', res);
      if (res?.success && res.data.length > 0) {
        setHistoryRecords(res.data);
        setHistorySuccess(`Found ${res.data.length} attendance record(s)`);
      } else {
        setHistoryRecords([]);
        setHistoryError('No attendance records found for the selected filters.');
      }
    }).catch(err => {
      console.error('[ATTENDANCE] Error fetching history:', err);
      setHistoryRecords([]);
      setHistoryError('Failed to fetch attendance records.');
    }).finally(() => {
      setHistoryLoading(false);
    });
  };

  // After save, reset all filters and hide student list, show success for 5s
  const handleSaveAttendance = async () => {
    setError(''); setSuccess('');
    if (students.length === 0) {
      setError('No students to mark attendance for.');
      return;
    }
    if (attendanceAlreadyMarked) {
      return;
    }
    // Build students array for POST
    const studentsData = students.map(s => ({
      studentId: s._id,
      status: marking[s._id],
      late: !!late[s._id],
      comments: comments[s._id] || undefined
    }));
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    const department = user.department;
    // When saving attendance, only send unmarked hours
    const unmarkedHours = selectedHours.filter(h => !markedHours.includes(Number(h)));
    const postBody = {
      academicYear: selectedAcademicYear,
      department,
      year: selectedYear,
      semester: selectedSemester,
      section: selectedSection,
      subject: selectedSubject,
      date: selectedDate,
      hours: unmarkedHours.map(Number),
      students: studentsData
    };
    setLoading(true);
    try {
      const res = await apiClient.markAttendance?.(postBody);
      if (res?.success) {
        setSuccess('Attendance saved!');
        toast({ title: 'Attendance saved!', description: 'Attendance has been marked successfully.' });
        // Count present/absent
        const presentCount = studentsData.filter(s => s.status === 'present').length;
        const absentCount = studentsData.filter(s => s.status === 'absent').length;
        setAttendanceSummary({ present: presentCount, absent: absentCount });
        resetFilters();
        // Show success for 5s, then clear
        setTimeout(() => setSuccess(''), 5000);
        return;
      } else {
        setError(res?.message || 'Failed to save attendance.');
        toast({ title: 'Error', description: res?.message || 'Failed to save attendance.', variant: 'destructive' });
      }
    } catch (e) {
      setError('Failed to save attendance.');
      toast({ title: 'Error', description: 'Failed to save attendance.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Handler for opening comments dialog
  const openCommentDialog = (studentId: string) => {
    setCommentInput(comments[studentId] || '');
    setCommentDialog({ open: true, studentId });
  };
  // Handler for saving comment
  const saveComment = () => {
    if (commentDialog.studentId) {
      setComments(prev => ({ ...prev, [commentDialog.studentId!]: commentInput }));
    }
    setCommentDialog({ open: false, studentId: null });
    setCommentInput('');
  };

  // Handler to start editing a record
  const handleEditRecord = (rec: any) => {
    const att: Record<string, 'present' | 'absent'> = {};
    const lateMap: Record<string, boolean> = {};
    const commentsMap: Record<string, string> = {};
    (rec.students as any[]).forEach((s: any) => {
      att[s.studentId._id || s.studentId] = s.status;
      lateMap[s.studentId._id || s.studentId] = !!s.late;
      commentsMap[s.studentId._id || s.studentId] = s.comments || '';
    });
    setEditingRecord(rec);
    setEditMarking(att);
    setEditLate(lateMap);
    setEditComments(commentsMap);
  };

  // Handler to save edited record
  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    setEditLoading(true);
    const studentsData = editingRecord.students.map((s: any) => ({
      studentId: s.studentId._id || s.studentId,
      status: editMarking[s.studentId._id || s.studentId],
      late: !!editLate[s.studentId._id || s.studentId],
      comments: editComments[s.studentId._id || s.studentId] || undefined
    }));
    try {
      const res = await apiClient.updateAttendance?.(editingRecord._id, { students: studentsData });
      if (res?.success) {
        setEditingRecord(null);
        setHistorySuccess('Attendance updated successfully!');
        toast({ title: 'Attendance updated!', description: 'Attendance record has been updated successfully.' });
        
        // Reset filters and clear history records (same as mark attendance tab)
        setSelectedAcademicYear('');
        setSelectedYear('');
        setSelectedSemester('');
        setSelectedSection('');
        setSelectedSubject('');
        setHistoryDate(new Date().toISOString().split('T')[0]);
        setHistoryHour(selectedHours.length > 0 ? selectedHours[0] : '');
        setHistoryRecords([]);
        setEditMarking({});
        setEditLate({});
        setEditComments({});
        
        // Show success for 5s, then clear
        setTimeout(() => setHistorySuccess(''), 5000);
      } else {
        setHistoryError(res?.message || 'Failed to update attendance.');
        toast({ title: 'Error', description: res?.message || 'Failed to update attendance.', variant: 'destructive' });
      }
    } catch (e) {
      setHistoryError('Failed to update attendance.');
      toast({ title: 'Error', description: 'Failed to update attendance.', variant: 'destructive' });
    } finally {
      setEditLoading(false);
    }
  };

  // Handler for View Attendance fetch
  const handleViewAttendance = async () => {
    setViewAttendanceLoading(true);
    setViewAttendanceError('');
    setViewAttendanceResults([]);
    try {
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      const department = user.department;
      const hours = selectedHours.length > 0 ? selectedHours : (historyHour ? [historyHour] : []);
      const results: any[] = [];
      for (const hour of hours) {
        const res = await apiClient.getAttendance?.({
          academicYear: selectedAcademicYear,
          department,
          year: selectedYear,
          semester: selectedSemester,
          section: selectedSection,
          date: selectedDate,
          hour: hour
        });
        if (res?.success && res.data.length > 0) {
          const record = res.data[0];
          const total = record.students.length;
          const present = record.students.filter((s: any) => s.status === 'present').length;
          const absent = record.students.filter((s: any) => s.status === 'absent').length;
          const subject = record.subject?.name || record.subject?.code || 'N/A';
          const shortName = record.subject?.shortName || subject.substring(0, 10); // Fallback to first 10 chars if no shortName
          results.push({ hour, subject, shortName, total, present, absent });
        } else {
          results.push({ hour, subject: 'N/A', shortName: 'N/A', total: 0, present: 0, absent: 0 });
        }
      }
      setViewAttendanceResults(results);
    } catch (e) {
      setViewAttendanceError('Failed to fetch attendance records.');
    } finally {
      setViewAttendanceLoading(false);
    }
  };

  // Add state to detect mobile/tablet width
  useEffect(() => {
    const checkWidth = () => setIsMobile(window.innerWidth < 600);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Add a debug dump panel (only in development)
  const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  // Log dropdown selections
  useEffect(() => {
    if (selectedAcademicYear) logProcess('Selected Academic Year', selectedAcademicYear);
  }, [selectedAcademicYear]);
  useEffect(() => {
    if (selectedYear) logProcess('Selected Year', selectedYear);
  }, [selectedYear]);
  useEffect(() => {
    if (selectedSemester) logProcess('Selected Semester', selectedSemester);
  }, [selectedSemester]);
  useEffect(() => {
    if (selectedSection) logProcess('Selected Section', selectedSection);
  }, [selectedSection]);
  useEffect(() => {
    if (selectedSubject) logProcess('Selected Subject', selectedSubject);
  }, [selectedSubject]);

  const selectedSubjectObj = subjects.find((s: any) => s._id === selectedSubject);

  return (
    <DashboardLayout role="teacher">
      <div className="p-6 space-y-6">
        <Tabs value={tab} onValueChange={v => setTab(v as 'mark' | 'history' | 'view')}> 
          <TabsList className="md:mb-4 md:flex-row md:justify-start justify-start items-start flex flex-col mb-20">
            <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
            <TabsTrigger value="history">Check History</TabsTrigger>
            <TabsTrigger value="view">View Attendance</TabsTrigger>
          </TabsList>
          <TabsContent value="mark">
          <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
        <Card>
          <CardHeader >
                <CardTitle className='text-sm md:text-lg'>Select Academic Year, Year, Semester, Section, Subject, Date & Hour.</CardTitle>
                <CardDescription>Choose all fields to mark the attendance.</CardDescription>
          </CardHeader>
          <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label>Academic Year</label>
                    <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {academicYears.map((y: any) => (
                          <SelectItem key={y._id} value={y._id}>{y.yearLabel}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label>Year</label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {years.map(y => (
                          <SelectItem key={y} value={y.toString()}>{y} Year</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label>Semester</label>
                    <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {semesters.map(s => (
                          <SelectItem key={s} value={s.toString()}>Sem {s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label>Section</label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {sections.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label>Subject</label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger className="text-left pl-3">
                        <SelectValue placeholder="Select" >
                          {selectedSubjectObj ? `${selectedSubjectObj.name}${selectedSubjectObj.code ? ` (${selectedSubjectObj.code})` : ''}` : ''}
                        </SelectValue>
                      </SelectTrigger>
                  <SelectContent>
                        {subjects.map((sub: any) => (
                          <SelectItem key={sub._id} value={sub._id} className="text-left">
                            {sub.name}{sub.code ? ` (${sub.code})` : ''}
                          </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
                  <div>
                    <label>Date</label>
                    <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                  </div>
                  <div>
                    <label>Hours</label>
                    <div className="flex flex-wrap gap-2">
                      {[1,2,3,4,5,6].map(h => (
                        <label key={h} className="flex items-center gap-1">
                          <Checkbox
                            checked={selectedHours.includes(h.toString())}
                            onCheckedChange={checked => {
                              setSelectedHours(prev =>
                                checked ? [...prev, h.toString()] : prev.filter(x => x !== h.toString())
                              );
                            }}
                          />
                          Hour {h}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    onClick={handleFetchStudents}
                    disabled={
                      !!loading ||
                      !selectedAcademicYear ||
                      !selectedYear ||
                      !selectedSemester ||
                      !selectedSection ||
                      !selectedSubject ||
                      !selectedDate ||
                      selectedHours.length === 0 ||
                      attendanceAlreadyMarked
                    }
                  >
                    Fetch Students
                  </Button>
                </div>
          </CardContent>
        </Card>
            {tab === 'mark' && error && <div className="text-red-600 font-medium">{error}</div>}
            {tab === 'mark' && success && <div className="text-green-600 font-medium">{success}</div>}
            {tab === 'mark' && attendanceSummary && (
  <div className="text-blue-700 font-medium mt-2">
    Attendance Summary: {attendanceSummary.present} present, {attendanceSummary.absent} absent
  </div>
)}
            {/* Student List for Attendance Marking */}
            {showStudents && !attendanceAlreadyMarked && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Mark Attendance for Section {selectedSection}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="animate-spin h-8 w-8 text-gray-500" />
                      <span className="ml-2">Loading students...</span>
                    </div>
                  ) : students.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">No students found for the selected filters.</div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {students.map(student => (
                          <div
                            key={student._id}
                            className="flex flex-col sm:flex-row sm:items-center gap-4 border-b pb-4 pt-2 px-2 rounded-lg bg-gray-50 dark:bg-gray-800 shadow-sm"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium break-words">
                                {student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : (student.firstName || student.lastName || 'Unknown Student')}
                                <span className="text-xs text-gray-500 ml-1">({student.rollNumber})</span>
                              </div>
                            </div>
                            <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
                              <div
                                className="relative w-20 h-8 flex items-center cursor-pointer select-none mx-2"
                                onClick={e => {
                                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                                  const x = (e as React.MouseEvent).clientX - rect.left;
                                  setMarking(prev => ({
                                    ...prev,
                                    [student._id]: x < rect.width / 2 ? 'absent' : 'present',
                                  }));
                                }}
                              >
                                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-400 via-gray-200 to-green-400" />
                                <div
                                  className={`absolute top-1 left-1 w-6 h-6 rounded-full shadow transition-transform duration-200 ${marking[student._id] === 'present' ? 'translate-x-10 bg-green-500' : 'translate-x-0 bg-red-500'}`}
                                  style={{ zIndex: 2 }}
                                />
                                <span className="absolute left-2 text-xs text-white z-10">A</span>
                                <span className="absolute right-2 text-xs text-white z-10">P</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Checkbox checked={!!late[student._id]} onCheckedChange={v => setLate(prev => ({ ...prev, [student._id]: !!v }))} />
                                <span className="text-xs sm:text-sm">Late</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-start gap-1 min-w-[100px] w-full sm:w-auto">
                              <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => openCommentDialog(student._id)}>
                                {comments[student._id] ? 'Edit Comment' : 'Add Comment'}
                              </Button>
                              {comments[student._id] && (
                                <span className="text-xs text-gray-600 bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 mt-1 max-w-full truncate" title={comments[student._id]}>
                                  {comments[student._id]}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 flex flex-col sm:flex-row justify-end gap-2">
                        <Button onClick={handleSaveAttendance} disabled={!!loading || attendanceAlreadyMarked} className="w-full sm:w-auto">
                          Save Attendance
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
            {loading && showStudents && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="animate-spin h-8 w-8 text-gray-500" />
              </div>
            )}
            {tab === 'mark' && markedHours.length > 0 && markedHours.length < selectedHours.length && (
  <div className="text-yellow-700 font-medium mt-2">
    Already marked for hour(s): {markedHours.join(', ')}. You can mark the others.
  </div>
)}

            {/* Comments Dialog */}
            <Dialog open={commentDialog.open} onOpenChange={open => setCommentDialog({ open, studentId: open ? commentDialog.studentId : null })}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enter Comment</DialogTitle>
                </DialogHeader>
                <Input value={commentInput} onChange={e => setCommentInput(e.target.value)} placeholder="Enter comment (optional)" />
                <DialogFooter>
                  <Button onClick={saveComment}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
          <TabsContent value="history">
            <h1 className="text-2xl font-bold text-gray-900">Check Attendance History</h1>
            <Card>
              <CardHeader>
                <CardTitle className='text-sm md:text-lg'>Select Academic Year, Year, Semester, Section, Date & Hour</CardTitle>
                <CardDescription>Choose all fields to fetch and edit attendance records</CardDescription>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <label>Academic Year</label>
                    <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {academicYears.map((y: any) => (
                          <SelectItem key={y._id} value={y._id}>{y.yearLabel}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label>Year</label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {years.map(y => (
                          <SelectItem key={y} value={y.toString()}>{y} Year</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label>Semester</label>
                    <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {semesters.map(s => (
                          <SelectItem key={s} value={s.toString()}>Sem {s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label>Section</label>
                    <Select value={selectedSection} onValueChange={setSelectedSection}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {sections.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label>Date</label>
                    <Input type="date" value={historyDate} onChange={e => setHistoryDate(e.target.value)} />
                  </div>
                  <div>
                    <label>Hour</label>
                    <Select value={historyHour} onValueChange={setHistoryHour}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6].map(h => (
                          <SelectItem key={h} value={h.toString()}>Hour {h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    onClick={handleFetchAttendance}
                    disabled={
                      !!historyLoading ||
                      !selectedAcademicYear ||
                      !selectedYear ||
                      !selectedSemester ||
                      !selectedSection ||
                      !historyDate ||
                      !historyHour
                    }
                  >
                    {historyLoading ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Fetching...
                      </>
                    ) : (
                      'Fetch Attendance'
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                                {historyLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="animate-spin h-8 w-8 text-gray-500" />
                    <span className="ml-2">Loading history...</span>
                  </div>
                ) : historyRecords.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">No attendance records found for the selected filters.</div>
                ) : (
                  <div className="space-y-4">
                    {historyRecords.map(rec => (
                      <Card key={rec._id} className="p-4">
                        <div className="flex items-center justify-between mb-4 flex-col gap-5">
                          <div className="flex-col items-center space-y-2">
                            <div className="font-medium text-lg">Date: {rec.date} | Hour: {rec.hour}</div>
                            {rec.subject && (
                              <Badge variant="secondary" className="text-sm bg-green-400 text-black">
                                {rec.subject?.name || rec.subject?.code || 'Unknown Subject'}
                              </Badge>
                            )}
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleEditRecord(rec)}>
                            Edit Attendance
                          </Button>
                        </div>
                                          {editingRecord && editingRecord._id === rec._id && (
  <div className="mt-4 space-y-2 border-t pt-4">
    <h4 className="font-medium">Edit Attendance for {rec.subject?.name || 'Subject'}</h4>
    {editingRecord.students.map((student: any) => (
      <div
        key={student.studentId._id || student.studentId}
        className="flex flex-col sm:flex-row sm:items-center gap-4 border-b pb-4 pt-2 px-2 rounded-lg bg-gray-50 dark:bg-gray-800 shadow-sm"
      >
        <div className="flex-1 min-w-0">
          <div className="font-medium break-words">
            {student.studentId.firstName && student.studentId.lastName ?
              `${student.studentId.firstName} ${student.studentId.lastName}` :
              (student.studentId.firstName || student.studentId.lastName || 'Unknown Student')
            }
            <span className="text-xs text-gray-500 ml-1">({student.studentId.rollNumber})</span>
          </div>
        </div>
        <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
          <div
            className="relative w-20 h-8 flex items-center cursor-pointer select-none mx-2"
            onClick={e => {
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              const x = (e as React.MouseEvent).clientX - rect.left;
              setEditMarking(prev => ({
                ...prev,
                [student.studentId._id || student.studentId]: x < rect.width / 2 ? 'absent' : 'present',
              }));
            }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-400 via-gray-200 to-green-400" />
            <div
              className={`absolute top-1 left-1 w-6 h-6 rounded-full shadow transition-transform duration-200 ${editMarking[student.studentId._id || student.studentId] === 'present' ? 'translate-x-10 bg-green-500' : 'translate-x-0 bg-red-500'}`}
              style={{ zIndex: 2 }}
            />
            <span className="absolute left-2 text-xs text-white z-10">A</span>
            <span className="absolute right-2 text-xs text-white z-10">P</span>
          </div>
          <div className="flex items-center gap-1">
            <Checkbox checked={!!editLate[student.studentId._id || student.studentId]} onCheckedChange={v => setEditLate(prev => ({ ...prev, [student.studentId._id || student.studentId]: !!v }))} />
            <span className="text-xs sm:text-sm">Late</span>
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 min-w-[100px] w-full sm:w-auto">
          <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => {
            const currentComment = editComments[student.studentId._id || student.studentId] || '';
            const newComment = prompt('Enter comment', currentComment);
            if (newComment !== null) {
              setEditComments(prev => ({ ...prev, [student.studentId._id || student.studentId]: newComment }));
            }
          }}>
            {editComments[student.studentId._id || student.studentId] ? 'Edit Comment' : 'Add Comment'}
          </Button>
          {editComments[student.studentId._id || student.studentId] && (
            <span className="text-xs text-gray-600 bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 mt-1 max-w-full truncate" title={editComments[student.studentId._id || student.studentId]}>
              {editComments[student.studentId._id || student.studentId]}
            </span>
          )}
        </div>
      </div>
    ))}
    <div className="mt-4 flex flex-col sm:flex-row gap-2">
      <Button size="sm" onClick={handleSaveEdit} disabled={editLoading} className="w-full sm:w-auto">
        {editLoading ? (
          <>
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
            Saving...
          </>
        ) : (
          'Save Changes'
        )}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setEditingRecord(null)} className="w-full sm:w-auto">Cancel</Button>
    </div>
  </div>
)}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            {tab === 'history' && historyError && <div className="text-red-600 font-medium">{historyError}</div>}
            {tab === 'history' && historySuccess && <div className="text-green-600 font-medium">{historySuccess}</div>}
          </TabsContent>
          <TabsContent value="view">
            <h1 className="text-2xl font-bold text-gray-900">View Attendance</h1>
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
                <CardDescription>Choose filters and click Fetch Attendance to view summary. Subject is not used for summary.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label>Academic Year</label>
                    <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {academicYears.map((y: any) => (
                          <SelectItem key={y._id} value={y._id}>{y.yearLabel}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label>Year</label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {years.map(y => (
                          <SelectItem key={y} value={y.toString()}>{y} Year</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label>Semester</label>
                    <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {semesters.map(s => (
                          <SelectItem key={s} value={s.toString()}>Sem {s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label>Section</label>
                    <Select value={selectedSection} onValueChange={setSelectedSection}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {sections.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label>Date</label>
                    <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                  </div>
                  <div>
                    <label>Hours</label>
                    <div className="flex flex-wrap gap-2">
                      {[1,2,3,4,5,6].map(h => (
                        <label key={h} className="flex items-center gap-1">
                          <Checkbox
                            checked={selectedHours.includes(h.toString())}
                            onCheckedChange={checked => {
                              setSelectedHours(prev =>
                                checked ? [...prev, h.toString()] : prev.filter(x => x !== h.toString())
                              );
                            }}
                          />
                          Hour {h}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={handleViewAttendance} disabled={viewAttendanceLoading || !selectedAcademicYear || !selectedYear || !selectedSemester || !selectedSection || !selectedDate || selectedHours.length === 0}>
                    Fetch Attendance
                  </Button>
                  <Button variant="outline" onClick={() => { setSelectedHours(['1','2','3','4','5','6']); handleViewAttendance(); }} disabled={viewAttendanceLoading || !selectedAcademicYear || !selectedYear || !selectedSemester || !selectedSection || !selectedDate}>
                    Full Day Attendance
                  </Button>
                </div>
                {viewAttendanceError && <div className="text-red-600 font-medium mt-2">{viewAttendanceError}</div>}
                {viewAttendanceResults.length > 0 && (
                  <div className="mt-6 overflow-x-auto w-full">
                    <table className="min-w-full border text-center whitespace-nowrap">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border px-4 py-2">Hour</th>
                          <th className="border px-4 py-2">Subject</th>
                          <th className="border px-4 py-2">Total Students</th>
                          <th className="border px-4 py-2">Present</th>
                          <th className="border px-4 py-2">Absent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewAttendanceResults.map(r => (
                          <tr key={r.hour}>
                            <td className="border px-4 py-2">{r.hour}</td>
                            <td className="border px-4 py-2 max-w-[120px] truncate">{r.shortName}</td>
                            <td className="border px-4 py-2">{r.total}</td>
                            <td className="border px-4 py-2">{r.present}</td>
                            <td className="border px-4 py-2">{r.absent}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {isMobile && viewAttendanceResults.length > 0 && (
  <div className="text-sm text-gray-500 mb-2">Swipe to see more &rarr;</div>
)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}