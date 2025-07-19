import { ComingSoon } from '@/components/ui/ComingSoon';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AssignmentsPage() {
  return (
    <DashboardLayout role='student'>
      <ComingSoon 
        title="Assignments"
        description="Submit your assignments, track deadlines, and receive feedback from teachers. A comprehensive assignment management system is coming your way!"
        feature="assignment"
      />
    </DashboardLayout>
  );
} 