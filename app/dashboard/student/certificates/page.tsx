import { ComingSoon } from '@/components/ui/ComingSoon';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function CertificatesPage() {
  return (
    <DashboardLayout role='student'>
      <ComingSoon 
        title="Certificates"
        description="Upload and manage your academic certificates, achievements, and awards. Showcase your accomplishments with our digital certificate system!"
        feature="certificate"
      />
    </DashboardLayout>
  );
} 