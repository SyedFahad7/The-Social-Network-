import { useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, FlaskConical } from 'lucide-react';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
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

const SPECIAL_SLOTS = [
  { value: '__LUNCH__', label: 'LUNCH BREAK' },
  { value: '__NAMAZ__', label: 'NAMAZ' },
  { value: '__RD__', label: 'R&D' }
];

export default function TimetableEditor({
  section,
  year,
  semester,
  academicYear,
  department,
  isClassTeacher,
}: {
  section: string;
  year: number;
  semester: number;
  academicYear: string;
  department: string;
  isClassTeacher: boolean;
}) {
  const [timetable, setTimetable] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.getTimetable({ section, year, semester, academicYear }),
      apiClient.getSubjects({ year, semester, department }),
    ]).then(([ttRes, subjRes]) => {
      setTimetable(ttRes.data || { days: {} });
      setSubjects(subjRes.data || []);
      setLoading(false);
    });
  }, [section, year, semester, academicYear, department]);

  const handleChange = (day: string, hour: number, subjectId: string) => {
    if (!isClassTeacher) return;
    setTimetable((prev: any) => {
      const days = { ...prev.days };
      const slots = days[day] ? [...days[day]] : [];
      const idx = slots.findIndex((s: any) => s.hour === hour);
      if (idx !== -1) {
        slots[idx] = { ...slots[idx], subject: subjectId };
      } else {
        slots.push({ hour, subject: subjectId, type: 'lecture' });
      }
      days[day] = slots;
      return { ...prev, days };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiClient.createTimetableSlot({ section, year, semester, academicYear, days: timetable.days });
      if (!res.success) throw new Error(res.message || 'Failed to save');
      setTimetable(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-8 text-center">Loading timetable...</div>;

  return (
    <Card className="w-full max-w-7xl mx-auto mt-6 shadow-lg">
      <CardHeader>
        <CardTitle>Timetable Editor</CardTitle>
        <div className="text-sm text-muted-foreground">{isClassTeacher ? 'Edit the timetable for your section.' : 'View only.'}</div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded-lg bg-white dark:bg-zinc-900">
            <thead>
              <tr>
                <th className="p-2 border-b bg-zinc-100 dark:bg-zinc-800">Hour</th>
                {DAYS.map(day => (
                  <th key={day} className="p-2 border-b bg-zinc-100 dark:bg-zinc-800 capitalize">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOUR_LABELS.map((label, i) => {
                // Insert lunch break row after 3rd hour (index 2)
                if (i === 3) {
                  return (
                    <tr key="lunch-break">
                      <td className="p-2 border-b font-semibold text-xs bg-zinc-50 dark:bg-zinc-900 text-center" colSpan={DAYS.length + 1}>
                        LUNCH BREAK
                      </td>
                    </tr>
                  );
                }
                const hour = HOURS[i < 3 ? i : i - 1]; // Adjust hour index after lunch
                return (
                  <tr key={label}>
                    <td className="p-2 border-b font-semibold text-xs bg-zinc-50 dark:bg-zinc-900">{label}</td>
                    {DAYS.map(day => {
                      const slots = timetable.days[day] || [];
                      const slot = slots.find((s: any) => s.hour === hour);
                      // Special slot rendering
                      if (slot && slot.type === 'special') {
                        return (
                          <td key={day} className="p-2 border-b text-center font-bold text-blue-700">{slot.label}</td>
                        );
                      }
                      return (
                        <td key={day} className="p-2 border-b">
                          {isClassTeacher ? (
                            <Select
                              value={slot?.type === 'special' ? `__${slot.label.toUpperCase()}__` : slot?.subject || ''}
                              onValueChange={val => {
                                if (val === '__NAMAZ__' || val === '__RD__') {
                                  setTimetable((prev: any) => {
                                    const days = { ...prev.days };
                                    const slots = days[day] ? [...days[day]] : [];
                                    const idx = slots.findIndex((s: any) => s.hour === hour);
                                    const label = val === '__NAMAZ__' ? 'NAMAZ' : 'R&D';
                                    if (idx !== -1) {
                                      slots[idx] = { hour, type: 'special', label };
                                    } else {
                                      slots.push({ hour, type: 'special', label });
                                    }
                                    days[day] = slots;
                                    return { ...prev, days };
                                  });
                                } else {
                                  handleChange(day, hour, val);
                                }
                              }}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Select subject" />
                              </SelectTrigger>
                              <SelectContent>
                                {subjects.map(subj => (
                                  <SelectItem key={subj._id} value={subj._id}>
                                    <span className="inline-flex items-center gap-2">
                                      {subj.type === 'lab' ? <FlaskConical className="w-4 h-4 text-yellow-500" /> : <BookOpen className="w-4 h-4 text-blue-500" />}
                                      {subj.name}
                                    </span>
                                  </SelectItem>
                                ))}
                                <SelectItem value="__NAMAZ__">NAMAZ</SelectItem>
                                <SelectItem value="__RD__">R&D</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              {slot?.subject ? (
                                <>
                                  {subjects.find(s => s._id === slot.subject)?.type === 'lab' ? <FlaskConical className="w-4 h-4 text-yellow-500" /> : <BookOpen className="w-4 h-4 text-blue-500" />}
                                  {subjects.find(s => s._id === slot.subject)?.name || '—'}
                                </>
                              ) : slot?.type === 'special' ? (
                                <span className="font-bold text-blue-700">{slot.label}</span>
                              ) : '—'}
                            </span>
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
        {isClassTeacher && (
          <div className="flex justify-end mt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Timetable'}
            </Button>
            {error && <span className="ml-4 text-red-500">{error}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 