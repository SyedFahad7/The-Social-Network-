import { ComingSoon } from '@/components/ui/ComingSoon';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function TimetablePage() {
  return (
    <DashboardLayout role='student'>
      <ComingSoon 
        title="Timetable"
        description="Your personalized class schedule with real-time updates, room assignments, and teacher information will be available soon!"
        feature="timetable"
      />
    </DashboardLayout>
  );
} 