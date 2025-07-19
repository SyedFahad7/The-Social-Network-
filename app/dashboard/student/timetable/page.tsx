"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import apiClient from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BookOpen, Computer, User2 } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = [1, 2, 3, 4, 5, 6];
const HOUR_LABELS = [
  '9:30–10:30',
  '10:30–11:30',
  '11:30–12:30',
  '12:30–1:30',
  '1:30–2:30',
  '2:30–3:30',
  '3:30–4:30',
];

export default function StudentTimetablePage() {
  const [user, setUser] = useState<any>(null);
  const [timetable, setTimetable] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [legend, setLegend] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const u = localStorage.getItem('user');
      if (u) setUser(JSON.parse(u));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    let completed = 0;
    const done = () => {
      completed += 1;
      if (completed === 3) setLoading(false);
    };
    // Fetch timetable as before
    apiClient.getTimetable({
      section: user.section,
      year: user.year,
      semester: user.currentSemester,
      academicYear: user.academicYear?._id || user.academicYear
    })
      .then(res => {
        console.log('[Timetable API] result:', res);
        setTimetable(res.data);
      })
      .catch(err => {
        console.log('[Timetable API] error:', err);
        setError(err.message || 'Failed to fetch timetable');
      })
      .finally(done);
    // Fetch all subjects for legend
    apiClient.getSubjects({
      department: user.department?._id || user.department,
      year: user.year,
      semester: user.currentSemester
    })
      .then(res => {
        console.log('[Subjects API] result:', res);
        setSubjects(res.data?.subjects || res.data || []);
      })
      .catch(err => {
        console.log('[Subjects API] error:', err);
        setSubjects([]);
      })
      .finally(done);
    // Fetch all teachers for department
    apiClient.getUsers({
      role: 'teacher',
      department: user.department?._id || user.department,
      limit: 1000
    })
      .then(res => {
        console.log('[Teachers API] result:', res);
        if (res.success === false || !res.data) {
          console.log('Teachers fetch failed or forbidden:', res);
          setTeachers([]);
        } else {
          setTeachers(res.data?.users || res.data || []);
        }
      })
      .catch(err => {
        console.log('[Teachers API] error:', err);
        setTeachers([]);
      })
      .finally(done);
  }, [user]);

  // Build legend after subjects and teachers are loaded
  useEffect(() => {
    if (!user || subjects.length === 0) return;
    // For each subject, find the assigned teacher for this section/year/semester/AY
    const legendData = subjects.map((subj: any) => {
      let assignedTeacher = null;
      for (const teacher of teachers) {
        if (!teacher.teachingAssignments) continue;
        for (const ta of teacher.teachingAssignments) {
          if (
            ta.subject?.toString() === subj._id?.toString() &&
            ta.section === user.section &&
            ta.year === user.year &&
            ta.semester === user.currentSemester &&
            (ta.academicYear?.toString() === (user.academicYear?._id?.toString() || user.academicYear?.toString()))
          ) {
            assignedTeacher = teacher;
            break;
          }
        }
        if (assignedTeacher) break;
      }
      return {
        ...subj,
        teacher: assignedTeacher
      };
    });
    console.log('[Legend] Built legend data:', legendData);
    setLegend(legendData);
  }, [subjects, teachers, user]);

  // Responsive: show table on desktop, cards on mobile
  return (
    <DashboardLayout role="student">
      <div className="max-w-8xl mx-auto p-4 px-8">
        <Card className="shadow-2xl border-0 bg-gradient-to-br from-blue-100 via-white to-indigo-100 dark:from-zinc-900 dark:via-zinc-800 dark:to-blue-900 animate-fade-in rounded-3xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-500" />
              Timetable
            </CardTitle>
            <div className="text-muted-foreground text-sm mt-1">Your daily class schedule (Mon–Sat, 6 hours per day)</div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-blue-600 dark:text-blue-300">Loading timetable...</div>
            ) : error ? (
              <div className="py-12 text-center text-red-500">{error}</div>
            ) : !timetable ? (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">No timetable found for your section.</div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0 rounded-2xl bg-white/90 dark:bg-zinc-900/90 shadow-xl border border-zinc-200 dark:border-zinc-800 transition-all duration-300">
                    <thead>
                      <tr>
                        <th className="p-4 bg-zinc-100 dark:bg-zinc-800 text-sm font-bold text-left rounded-tl-2xl border-b border-zinc-200 dark:border-zinc-800">Hour</th>
                        {DAYS.map(day => (
                          <th key={day} className="p-4 bg-zinc-100 dark:bg-zinc-800 text-sm font-bold text-center capitalize border-b border-zinc-200 dark:border-zinc-800">{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {HOUR_LABELS.map((label, i) => {
                        // Insert lunch break row after 3rd hour (index 2)
                        if (i === 3) {
                          return (
                            <tr key="lunch-break">
                              <td className="p-4 bg-zinc-50 text-xl dark:bg-zinc-900 text-center font-bold text-yellow-500" colSpan={DAYS.length + 1}>
                                LUNCH BREAK
                              </td>
                            </tr>
                          );
                        }
                        const hour = HOURS[i < 3 ? i : i - 1]; // Adjust hour index after lunch
                        return (
                          <tr key={label} className="transition-all duration-200">
                            <td className="p-4 bg-zinc-50 dark:bg-zinc-900 text-sm font-semibold border-b border-zinc-200 dark:border-zinc-800 sticky left-0 z-10">{label}</td>
                            {DAYS.map(day => {
                              const slots = timetable.days?.[day.toLowerCase()] || [];
                              const slot = slots.find((s: any) => s.hour === hour);
                              // Special slot rendering
                              if (slot && slot.type === 'special') {
                                return (
                                  <td key={day} className="p-4 border-b border-zinc-200 dark:border-zinc-800 text-center font-bold text-blue-700">{slot.label}</td>
                                );
                              }
                              // Find legend subject for this slot
                              let legendSubj = null;
                              if (slot && slot.subject && slot.subject._id) {
                                legendSubj = legend.find(l => l._id === slot.subject._id);
                              }
                              const teacherToShow = slot?.teacher?.firstName
                                ? slot.teacher
                                : legendSubj?.teacher;
                              // Determine type for this slot
                              let typeToShow = 'Lecture';
                              if (legendSubj?.type) {
                                typeToShow = legendSubj.type.toLowerCase() === 'lab' ? 'Lab' : 'Lecture';
                              } else if (slot && slot.subject && slot.subject.type) {
                                typeToShow = slot.subject.type.toLowerCase() === 'lab' ? 'Lab' : 'Lecture';
                              } else if (slot && slot.type) {
                                typeToShow = slot.type.toLowerCase() === 'lab' ? 'Lab' : 'Lecture';
                              }
                              return (
                                <td key={day} className="p-2 border-b border-zinc-200 dark:border-zinc-800 text-center align-top min-w-[120px] rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors duration-200">
                                  {slot ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="inline-flex items-center gap-2 text-base font-medium">
                                        {slot && ((slot.subject && slot.subject.type === 'Lab') || slot.type === 'Lab') ? <Computer className="w-4 h-4 text-yellow-500" /> : <BookOpen className="w-4 h-4 text-red-500" />}
                                        {slot && slot.subject ? (slot.subject.shortName || slot.subject.name || '—') : '—'}
                                      </span>
                                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                        <User2 className="w-3 h-3" />
                                        {teacherToShow?.firstName
                                          ? `Prof. ${teacherToShow.firstName} ${teacherToShow.lastName}`
                                          : 'Not assigned'}
                                      </span>

                                      <span className="text-[10px] rounded px-2 py-0.5 bg-black/10 dark:bg-blue-900/40 text-green-700 dark:text-blue-200 mt-1">
                                        {typeToShow}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-300 dark:text-zinc-700">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Mobile Cards */}
                <div className="md:hidden flex flex-col gap-4 mt-2">
                  {DAYS.map(day => {
                    const slots = timetable.days?.[day.toLowerCase()] || [];
                    return (
                      <Card key={day} className="border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90">
                        <CardHeader className="flex flex-row items-center gap-2 py-2 px-4 bg-zinc-100 dark:bg-zinc-800 rounded-t-xl">
                          <span className="font-bold text-blue-700 dark:text-blue-200 text-base flex-1">{day}</span>
                        </CardHeader>
                        <CardContent className="p-0">
                          <table className="w-full text-xs">
                            <tbody>
                              {HOUR_LABELS.map((label, i) => {
                                if (i === 3) {
                                  return (
                                    <tr key="lunch-break">
                                      <td className="p-2 font-semibold text-center text-blue-700 bg-zinc-50 dark:bg-zinc-900" colSpan={2}>LUNCH BREAK</td>
                                    </tr>
                                  );
                                }
                                const hour = HOURS[i < 3 ? i : i - 1];
                                const slot = slots.find((s: any) => s.hour === hour);
                                if (slot && slot.type === 'special') {
                                  return (
                                    <tr key={label}>
                                      <td className="p-2 font-semibold w-24 bg-zinc-50 dark:bg-zinc-900 text-xs">{label}</td>
                                      <td className="p-2 text-center font-bold text-pink-700">{slot.label}</td>
                                    </tr>
                                  );
                                }
                                let legendSubj = null;
                                if (slot && slot.subject && slot.subject._id) {
                                  legendSubj = legend.find(l => l._id === slot.subject._id);
                                }
                                const teacherToShow = slot?.teacher?.firstName
                                  ? slot.teacher
                                  : legendSubj?.teacher;
                                let typeToShow = 'Lecture';
                                if (legendSubj?.type) {
                                  typeToShow = legendSubj.type.toLowerCase() === 'lab' ? 'Lab' : 'Lecture';
                                } else if (slot && slot.subject && slot.subject.type) {
                                  typeToShow = slot.subject.type.toLowerCase() === 'lab' ? 'Lab' : 'Lecture';
                                } else if (slot && slot.type) {
                                  typeToShow = slot.type.toLowerCase() === 'lab' ? 'Lab' : 'Lecture';
                                }
                                return (
                                  <tr key={label} className="border-b border-zinc-100 dark:border-zinc-800">
                                    <td className="p-2 font-semibold w-24 bg-zinc-50 dark:bg-zinc-900 text-xs sticky left-0 z-10">{label}</td>
                                    <td className="p-2">
                                      {slot ? (
                                        <div className="flex flex-col items-start gap-1">
                                          <span className="inline-flex items-center gap-2 text-base font-medium">
                                            {slot && ((slot.subject && slot.subject.type === 'lab') || slot.type === 'lab') ? <Computer className="w-4 h-4 text-yellow-500" /> : <BookOpen className="w-4 h-4 text-red-500" />}
                                            {slot && slot.subject ? (slot.subject.shortName || slot.subject.name || '—') : '—'}
                                          </span>
                                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                            <User2 className="w-3 h-3" />
                                            {teacherToShow?.firstName ? `${teacherToShow.firstName} ${teacherToShow.lastName}` : 'Not assigned'}
                                          </span>
                                          <span className="text-[10px] rounded px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 mt-1">
                                            {typeToShow}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-gray-300 dark:text-zinc-700">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {/* Legend Table */}
                {legend.length > 0 && (
                  <div className="mt-10 animate-fade-in">
                    <div className="font-bold text-xl mb-4 text-blue-900 dark:text-blue-200">Legend</div>
                    <div className="overflow-x-auto">
                      <table className="min-w-[500px] w-full border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/90 dark:bg-zinc-900/90 shadow-xl transition-all duration-300">
                        <thead>
                          <tr>
                            <th className="p-3 bg-zinc-100 dark:bg-zinc-800 text-sm font-bold border border-zinc-200 dark:border-zinc-800">SNO</th>
                            <th className="p-3 bg-zinc-100 dark:bg-zinc-800 text-sm font-bold border border-zinc-200 dark:border-zinc-800">Course Code</th>
                            <th className="p-3 bg-zinc-100 dark:bg-zinc-800 text-sm font-bold border border-zinc-200 dark:border-zinc-800">Subject/Lab</th>
                            <th className="p-3 bg-zinc-100 dark:bg-zinc-800 text-sm font-bold border border-zinc-200 dark:border-zinc-800">Acronym</th>
                            <th className="p-3 bg-zinc-100 dark:bg-zinc-800 text-sm font-bold border border-zinc-200 dark:border-zinc-800">Faculty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {legend.filter(subj => subj.type !== 'special').map((subj, idx) => (
                            <tr key={subj._id}>
                              <td className="p-2 border border-zinc-200 dark:border-zinc-800 text-center">{idx + 1}</td>
                              <td className="p-2 border border-zinc-200 dark:border-zinc-800 text-center">{subj.code}</td>
                              <td className="p-2 border border-zinc-200 dark:border-zinc-800 text-center">{subj.name}</td>
                              <td className="p-2 border border-zinc-200 dark:border-zinc-800 text-center">{subj.shortName || '-'}</td>
                              <td className="p-2 border border-zinc-200 dark:border-zinc-800 text-center">
                                {subj.teacher?.firstName
                                  ? `Prof. ${subj.teacher.firstName} ${subj.teacher.lastName}`
                                  : 'Not assigned'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 