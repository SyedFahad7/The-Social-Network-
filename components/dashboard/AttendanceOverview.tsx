import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

export function AttendanceOverview() {
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0
  });

  useEffect(() => {
    async function fetchAttendance() {
      setLoading(true);
      try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const startDate = `${yyyy}-${mm}-${dd}`;
        const endDate = startDate;
        const res = await apiClient.getAttendance({ startDate, endDate, limit: 1000 });
        if (res.success) {
          let total = 0, present = 0, absent = 0, late = 0;
          for (const record of res.data.attendanceRecords) {
            for (const att of record.attendanceRecords) {
              total++;
              if (att.status === 'present') present++;
              else if (att.status === 'absent') absent++;
              else if (att.status === 'late') late++;
            }
          }
          setAttendance({ total, present, absent, late });
        }
      } catch (e) {
        setAttendance({ total: 0, present: 0, absent: 0, late: 0 });
      } finally {
        setLoading(false);
      }
    }
    fetchAttendance();
  }, []);

  if (loading) {
    return <Skeleton className="h-24 w-full" />;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
      <div>
        <p className="text-gray-500">Total Marked</p>
        <p className="font-bold text-lg">{attendance.total}</p>
      </div>
      <div>
        <p className="text-green-600">Present</p>
        <p className="font-bold text-lg">{attendance.present}</p>
      </div>
      <div>
        <p className="text-red-600">Absent</p>
        <p className="font-bold text-lg">{attendance.absent}</p>
      </div>
      <div>
        <p className="text-yellow-600">Late</p>
        <p className="font-bold text-lg">{attendance.late}</p>
      </div>
    </div>
  );
} 