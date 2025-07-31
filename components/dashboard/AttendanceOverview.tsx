import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

interface AttendanceOverviewProps {
    attendanceOverview: any;
}

export function AttendanceOverview({ attendanceOverview }: AttendanceOverviewProps) {
    const [present, setPresent] = useState(0);
    const [absent, setAbsent] = useState(0);
    const [late, setLate] = useState(0);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (attendanceOverview) {
            setLoading(false)
            setPresent(attendanceOverview.totalPresent);
            setAbsent(attendanceOverview.totalAbsent);
            setLate(attendanceOverview.totalLate);
            setTotal(attendanceOverview.totalAttendanceRecords);
        }
    }, [attendanceOverview]);

    if (loading) {
        return <Skeleton className="h-24 w-full" />;
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
                <p className="text-gray-500">Total Marked</p>
                <p className="font-bold text-lg">{total}</p>
            </div>
            <div>
                <p className="text-green-600">Present</p>
                <p className="font-bold text-lg">{present}</p>
            </div>
            <div>
                <p className="text-red-600">Absent</p>
                <p className="font-bold text-lg">{absent}</p>
            </div>
            <div>
                <p className="text-yellow-600">Late</p>
                <p className="font-bold text-lg">{late}</p>
            </div>
        </div>
    );
}
