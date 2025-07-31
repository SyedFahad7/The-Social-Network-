import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import apiClient from '@/lib/api';
import { format, subDays } from 'date-fns';
import { useInView } from 'react-intersection-observer';

interface AttendanceSnapshotProps {
  userId: string;
}

interface DayAttendance {
  date: string;
  present: number;
  absent: number;
  late: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl shadow-lg bg-white/90 dark:bg-zinc-900/90 px-4 py-3 border border-blue-100 dark:border-zinc-700 text-sm">
        <div className="font-semibold mb-1 text-blue-700 dark:text-blue-200">{label}</div>
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-blue-200"></span>Present: <span className="font-bold text-blue-700">{payload[0].payload.present}</span></span>
          <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-yellow-200"></span>Late: <span className="font-bold text-yellow-700">{payload[0].payload.late}</span></span>
          <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-red-200"></span>Absent: <span className="font-bold text-red-700">{payload[0].payload.absent}</span></span>
        </div>
      </div>
    );
  }
  return null;
}

export default function AttendanceSnapshot({ userId }: AttendanceSnapshotProps) {
  const [data, setData] = useState<DayAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });

  useEffect(() => {
    if (!userId) return;
    const fetchWeekAttendance = async () => {
      setLoading(true);
      const days: DayAttendance[] = [];
      const today = new Date();
      const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      
      // Calculate the date of Monday in the current week
      const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset);
      
      const fetches = [];
      // Fetch data for Monday to Saturday (6 days)
      for (let i = 0; i < 6; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateString = format(date, 'yyyy-MM-dd');
        fetches.push(apiClient.getStudentDailyAttendance(dateString));
      }
      
      const results = await Promise.all(fetches);
      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const label = format(date, 'EEE');
        if (res.success && res.data && res.data.summary) {
          days.push({
            date: label,
            present: res.data.summary.present,
            absent: res.data.summary.absent,
            late: res.data.summary.late,
          });
        } else {
          days.push({ date: label, present: 0, absent: 0, late: 0 });
        }
      }
      setData(days);
      setLoading(false);
    };
    fetchWeekAttendance();
  }, [userId]);

  return (
    <Card className="bg-gradient-to-br from-blue-100/70 via-indigo-100/70 to-purple-100/70 dark:from-blue-900/40 dark:via-indigo-900/40 dark:to-purple-900/40 border-0 shadow-xl rounded-2xl my-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-blue-900 dark:text-blue-100">
          Attendance Snapshot
        </CardTitle>
        <CardDescription className="text-blue-700/70 dark:text-blue-200/70 text-sm mt-1">
          Your weekly attendance overview (Mon–Sat, 6 class hours per day)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-blue-600 dark:text-blue-300">Loading weekly attendance...</div>
        ) : (
          <div style={{ width: '100%', height: 260 }} ref={ref}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.25} />
                <XAxis dataKey="date" stroke="#64748b" className="text-xs font-medium" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke="#64748b" className="text-xs font-medium" tickLine={false} axisLine={false} domain={[0, 6]} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#a5d8ff', fillOpacity: 0.08 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 13, fontWeight: 500, color: '#64748b', paddingTop: 8 }} />
                <Bar dataKey="present" stackId="a" fill="#a5d8ff" name="Present" radius={[10, 10, 0, 0]} isAnimationActive={inView} />
                <Bar dataKey="late" stackId="a" fill="#ffe066" name="Late" radius={[10, 10, 0, 0]} isAnimationActive={inView} />
                <Bar dataKey="absent" stackId="a" fill="#ff6b6b" name="Absent" radius={[10, 10, 0, 0]} isAnimationActive={inView} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}