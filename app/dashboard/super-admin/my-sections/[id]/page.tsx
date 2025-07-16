'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  ArrowLeft, 
  Search,
  Edit,
  Check,
  X,
  Plus,
  FileText,
  Award,
  Eye,
  Calendar as CalendarIcon,
  Edit2,
  Loader2
} from 'lucide-react';
import apiClient from '@/lib/api';

export default function SectionDetails() {
  const params = useParams();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingGrades, setEditingGrades] = useState<{[key: string]: boolean}>({});
  const [tab, setTab] = useState('students');
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]);
  const [markModal, setMarkModal] = useState<{open: boolean, student: any, hour: number, subject: string} | null>(null);
  const [marking, setMarking] = useState(false);
  const [markStatus, setMarkStatus] = useState<'present'|'absent'|'late'>('present');
  const [markComment, setMarkComment] = useState('');
  const [studentStats, setStudentStats] = useState<any>(null);
  const [studentStatsLoading, setStudentStatsLoading] = useState(false);
  const [studentStatsError, setStudentStatsError] = useState<string | null>(null);

  // Attendance Summary State
  const [summaryStart, setSummaryStart] = useState(() => new Date(new Date().setDate(new Date().getDate() - 14)).toISOString().slice(0, 10));
  const [summaryEnd, setSummaryEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<any>(null);

  // Add after other useState hooks
  const [academicYearLabel, setAcademicYearLabel] = useState<string | null>(null);

  // Parse sectionKey: year-section-academicYear
  const [year, section, academicYear] = (params.id as string).split('-');

  // Helper to robustly extract department ObjectId from user object
  function extractDepartmentId(dept: any): string | undefined {
    if (!dept) return undefined;
    if (typeof dept === 'string') return dept;
    if (typeof dept === 'object') {
      if (dept._id) return dept._id;
      if (dept.$oid) return dept.$oid;
    }
    return undefined;
  }

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const u = localStorage.getItem('user');
      if (u) setUser(JSON.parse(u));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const departmentId = extractDepartmentId(user.department);
        if (!departmentId) throw new Error('Department not found for user.');
        const academicYearId = academicYear;
        // Fetch students
        const studentsRes = await apiClient.getUsers({
          role: 'student',
          year,
          section,
          academicYear: academicYearId,
          department: departmentId,
          limit: 1000
        });
        let studentsArr = [];
        if (studentsRes.data?.data?.users) studentsArr = studentsRes.data.data.users;
        else if (studentsRes.data?.users) studentsArr = studentsRes.data.users;
        else if (Array.isArray(studentsRes.data)) studentsArr = studentsRes.data;
        else studentsArr = [];
        setStudents(studentsArr);
        // Fetch subjects
        const subjectsRes = await apiClient.getSubjects({
          year,
          academicYear: academicYearId,
          department: departmentId
        });
        let subjectsArr = [];
        if (subjectsRes.data?.data?.subjects) subjectsArr = subjectsRes.data.data.subjects;
        else if (subjectsRes.data?.subjects) subjectsArr = subjectsRes.data.subjects;
        else if (Array.isArray(subjectsRes.data)) subjectsArr = subjectsRes.data;
        else subjectsArr = [];
        setSubjects(subjectsArr);
        // Fetch attendance
        const attendanceRes = await apiClient.getAttendance({
          year,
          section,
          academicYear: academicYearId,
          date
        });
        setAttendance(attendanceRes.data || attendanceRes.data?.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user, year, section, academicYear, date]);

  useEffect(() => {
    if (!user) return;
    async function fetchAcademicYearLabel() {
      try {
        const res = await apiClient.getAcademicYears();
        const found = res.data?.academicYears?.find((ay: any) => String(ay._id) === String(academicYear));
        setAcademicYearLabel(found?.yearLabel || found?.name || String(academicYear));
      } catch (err: any) {
        setAcademicYearLabel(null);
        console.error('Failed to fetch academic year label:', err);
      }
    }
    fetchAcademicYearLabel();
  }, [user, year, section, academicYear]);

  useEffect(() => {
    if (!showStudentModal || !selectedStudent) return;
    setStudentStats(null);
    setStudentStatsLoading(true);
    setStudentStatsError(null);
    apiClient.getStudentAttendanceStats(selectedStudent._id)
      .then(res => setStudentStats(res.data?.stats || res.data))
      .catch(err => setStudentStatsError(err.message))
      .finally(() => setStudentStatsLoading(false));
  }, [showStudentModal, selectedStudent]);

  const fetchSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    setSummaryData(null);
    try {
      const res = await apiClient.getAttendanceSummary({ section, year, academicYear, startDate: summaryStart, endDate: summaryEnd });
      setSummaryData(res.subjects ? res : res.data);
    } catch (err: any) {
      setSummaryError(err.message);
    } finally {
      setSummaryLoading(false);
    }
  };
  const handleDownloadPDF = async () => {
    const url = `${apiClient.getBaseUrl()}/attendance/summary/pdf?section=${section}&year=${year}&academicYear=${academicYear}&startDate=${summaryStart}&endDate=${summaryEnd}`;
    const token = localStorage.getItem('token');
    const win = window.open('', '_blank');
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        if (win) {
          win.location.href = blobUrl;
        } else {
          window.open(blobUrl, '_blank');
        }
      });
  };

  // Helper: get subject shortName by id or object
  const getSubjectShortName = (subject: any) => {
    if (!subject) return '';
    if (typeof subject === 'string') {
      const subj = subjects.find((s: any) => s._id === subject);
      return subj?.shortName || subj?.name || subject;
    }
    if (typeof subject === 'object') {
      return subject.shortName || subject.name || subject.code || JSON.stringify(subject);
    }
    return String(subject);
  };

  // Helper: get attendance for a student/hour
  const getAttendanceCell = (studentId: string, hour: number) => {
    const record = attendance.find((a: any) => a.hour === hour);
    if (!record) return { status: 'N/A', subject: null, comments: '', late: false };
    const studentRec = record.students.find((s: any) => s.studentId === studentId || s.studentId?._id === studentId);
    return {
      status: studentRec ? (studentRec.late ? 'Late' : studentRec.status) : 'N/A',
      subject: record.subject,
      comments: studentRec?.comments || '',
      late: studentRec?.late || false
    };
  };

  // Add handleMarkAttendance function (place before return)
  const handleMarkAttendance = async () => {
    if (!markModal) return;
    setMarking(true);
    try {
      // Find or create attendance record for this hour/subject/date
      const record = attendance.find((a: any) => a.hour === markModal.hour && a.subject === markModal.subject);
      let studentsArr = record ? [...record.students] : students.map((s: any) => ({ studentId: s._id, status: 'absent', late: false, comments: '' }));
      const idx = studentsArr.findIndex((s: any) => s.studentId === markModal.student._id);
      if (idx !== -1) {
        studentsArr[idx] = { studentId: markModal.student._id, status: markStatus, late: markStatus === 'late', comments: markComment };
      } else {
        studentsArr.push({ studentId: markModal.student._id, status: markStatus, late: markStatus === 'late', comments: markComment });
      }
      // Save via API
      await apiClient.markAttendance({
        academicYear,
        department: markModal.student.department?._id || markModal.student.department,
        year: Number(year),
        semester: markModal.student.currentSemester,
        section,
        subject: markModal.subject,
        date,
        hour: markModal.hour,
        students: studentsArr
      });
      setMarkModal(null);
      setMarkStatus('present');
      setMarkComment('');
      // Refresh attendance
      const attendanceRes = await apiClient.getAttendance({
        year,
        section,
        academicYear,
        date
      });
      setAttendance(attendanceRes.data || attendanceRes.data?.data || []);
    } catch (err) {
      // TODO: show error toast
    } finally {
      setMarking(false);
    }
  };

  return (
    <DashboardLayout role="super-admin">
      <div className="container mx-auto py-8 px-4">
        <div className="p-6 space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => router.back()} className="flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Section {section} - Year {year}</h1>
              <p className="text-gray-600">Academic Year: {academicYearLabel || academicYear}</p>
            </div>
          </div>
          <Tabs value={tab} onValueChange={setTab} className="space-y-6">
            <TabsList className="w-full flex mb-10">
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>
            <TabsContent value="students">
              {loading ? <div>Loading students...</div> : error ? <div className="text-red-600">{error}</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-gray-600">Student</th>
                        <th className="text-left p-3 font-medium text-gray-600">Roll Number</th>
                        <th className="text-left p-3 font-medium text-gray-600">Email</th>
                        <th className="text-center p-3 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student: any) => (
                        <tr key={student._id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-900">{student.firstName} {student.lastName}</td>
                          <td className="p-3 font-mono text-sm">{student.rollNumber}</td>
                          <td className="p-3 text-sm">{student.email}</td>
                          <td className="p-3 text-center">
                            <Button size="icon" variant="ghost" onClick={() => { setSelectedStudent(student); setShowStudentModal(true); }}>
                              <Eye className="w-5 h-5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Student details modal */}
                  {showStudentModal && selectedStudent && (
                    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-2">Student Details</h2>
                        <p><b>Name:</b> {selectedStudent.firstName} {selectedStudent.lastName}</p>
                        <p><b>Email:</b> {selectedStudent.email}</p>
                        <p><b>Roll Number:</b> {selectedStudent.rollNumber}</p>
                        <p><b>Section:</b> {selectedStudent.section}</p>
                        <p><b>Year:</b> {selectedStudent.year}</p>
                        {/* Attendance stats */}
                        <div className="mt-4">
                          <b>Attendance Stats:</b>
                          {studentStatsLoading ? (
                            <div className="text-gray-500 text-sm">Loading attendance stats...</div>
                          ) : studentStatsError ? (
                            <div className="text-red-600 text-sm">{studentStatsError}</div>
                          ) : studentStats ? (
                            <div className="text-sm mt-2">
                              <div><b>Total:</b> {(!isNaN(studentStats.totalPercent) && typeof studentStats.totalPercent === 'number') ? studentStats.totalPercent.toFixed(1) : '0.0'}%</div>
                              <div><b>Present:</b> {studentStats.present}</div>
                              <div><b>Absent:</b> {studentStats.absent}</div>
                              <div><b>Late:</b> {studentStats.late}</div>
                              <div><b>Not Marked:</b> {studentStats.not_marked}</div>
                            </div>
                          ) : (
                            <div className="text-gray-500 text-sm">No stats available.</div>
                          )}
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Button onClick={() => setShowStudentModal(false)}>Close</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            <TabsContent value="attendance">
              <div className="mb-4 flex items-center gap-4">
                <label className="flex items-center gap-2 font-medium">
                  <span>Date:</span>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded px-2 py-1" />
                </label>
              </div>
              {/* Attendance Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full border">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 border">S. No.</th>
                      <th className="px-2 py-1 border">Roll Number</th>
                      <th className="px-2 py-1 border">Name</th>
                      {[1,2,3,4,5,6].map(hour => (
                        <th key={hour} className="px-2 py-1 border">Hour {hour}</th>
                      ))}
                    </tr>
                    <tr>
                      <th className="px-2 py-1 border"></th>
                      <th className="px-2 py-1 border"></th>
                      <th className="px-2 py-1 border"></th>
                      {[1,2,3,4,5,6].map(hour => {
                        const att = attendance.find(a => a.hour === hour);
                        return (
                          <th key={hour} className="px-2 py-1 border text-xs text-gray-500">{getSubjectShortName(att?.subject) || '-'}</th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, idx) => (
                      <tr key={student._id}>
                        <td className="px-2 py-1 border text-center">{idx + 1}</td>
                        <td className="px-2 py-1 border text-center">{student.rollNumber ? String(student.rollNumber).slice(-3) : ''}</td>
                        <td className="px-2 py-1 border whitespace-nowrap">{student.firstName} {student.lastName}</td>
                        {[1,2,3,4,5,6].map(hour => {
                          const att = attendance.find(a => a.hour === hour);
                          const cell = att?.students?.find((s: any) => s.studentId === student._id || s.studentId?._id === student._id);
                          return (
                            <td key={hour} className="px-2 py-1 border text-center">
                              {cell ? (
                                cell.status === 'present' ? <span style={{color: 'green'}}>✔️</span> : cell.status === 'absent' ? <span style={{color: 'red'}}>❌</span> : cell.status
                              ) : 'N/A'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mark/Edit Attendance Modal */}
              {markModal && markModal.open && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                    <h2 className="text-lg font-bold mb-2">Mark/Edit Attendance</h2>
                    <p><b>Student:</b> {markModal.student.firstName} {markModal.student.lastName}</p>
                    <p><b>Hour:</b> {markModal.hour}</p>
                    <p><b>Subject:</b> {typeof getSubjectShortName(markModal.subject) === 'object' ? JSON.stringify(getSubjectShortName(markModal.subject)) : getSubjectShortName(markModal.subject)}</p>
                    <div className="mt-4 space-y-2">
                      <label className="block font-medium">Status:</label>
                      <div className="flex gap-2">
                        <Button size="sm" variant={markStatus==='present'?'default':'outline'} onClick={()=>setMarkStatus('present')}><Check className="w-4 h-4 mr-1"/>Present</Button>
                        <Button size="sm" variant={markStatus==='absent'?'default':'outline'} onClick={()=>setMarkStatus('absent')}><X className="w-4 h-4 mr-1"/>Absent</Button>
                        <Button size="sm" variant={markStatus==='late'?'default':'outline'} onClick={()=>setMarkStatus('late')}>Late</Button>
                      </div>
                      <label className="block font-medium mt-2">Comments:</label>
                      <input type="text" value={markComment} onChange={e=>setMarkComment(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="Optional comment..." />
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <Button variant="outline" onClick={()=>setMarkModal(null)}>Cancel</Button>
                      <Button onClick={handleMarkAttendance} disabled={marking}>{marking?'Saving...':'Save'}</Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="summary">
              <div className="mb-4 flex flex-wrap items-center gap-4">
                <span className="font-medium">Summary:</span>
                <input type="date" value={summaryStart} onChange={e => setSummaryStart(e.target.value)} className="border rounded px-2 py-1" />
                <span>to</span>
                <input type="date" value={summaryEnd} onChange={e => setSummaryEnd(e.target.value)} className="border rounded px-2 py-1" />
                <Button size="sm" onClick={fetchSummary} disabled={summaryLoading}>Show Summary</Button>
                <Button size="sm" variant="outline" onClick={handleDownloadPDF} disabled={!summaryData || summaryLoading}>Download PDF</Button>
              </div>
              {summaryLoading ? (
                <div className="text-gray-500 mt-4">Loading summary...</div>
              ) : summaryError ? (
                <div className="text-red-600 mt-4">{summaryError}</div>
              ) : summaryData && summaryData.subjects && summaryData.students ? (
                <div className="overflow-x-auto mt-6">
                  <table className="min-w-full border border-gray-400 rounded text-xs md:text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-2 py-1 border border-gray-400">S. No.</th>
                        <th className="px-2 py-1 border border-gray-400">Student Name</th>
                        <th className="px-2 py-1 border border-gray-400">Roll Number</th>
                        {summaryData.subjects.map((subj: any) => (
                          <th key={subj._id} className="px-2 py-1 border border-gray-400">{subj.shortName || subj.name}</th>
                        ))}
                        <th className="px-2 py-1 border border-gray-400">Total</th>
                        <th className="px-2 py-1 border border-gray-400">Percent</th>
                      </tr>
                      <tr className="bg-gray-50">
                        <th colSpan={3}></th>
                        {summaryData.subjects.map((subj: any) => (
                          <th key={subj._id} className="px-2 py-1 border border-gray-400">{subj.totalConducted}</th>
                        ))}
                        <th className="px-2 py-1 border border-gray-400 text-center">{summaryData.totalClasses}</th>
                        <th className="px-2 py-1 border border-gray-400"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.students.map((stu: any, idx: number) => (
                        <tr key={stu._id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-1 border border-gray-400 text-center">{idx + 1}</td>
                          <td className="px-2 py-1 border border-gray-400">{stu.name}</td>
                          <td className="px-2 py-1 border border-gray-400 text-center">{stu.rollNumber ? String(stu.rollNumber).slice(-3) : ''}</td>
                          {summaryData.subjects.map((subj: any) => (
                            <td key={subj._id} className="px-2 py-1 border border-gray-400 text-center">{stu.attended[subj._id] || 0}</td>
                          ))}
                          <td className="px-2 py-1 border border-gray-400 text-center">{stu.total}</td>
                          <td className="px-2 py-1 border border-gray-400 text-center">{stu.percent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
} 