'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeedCard from '@/components/certificates/FeedCard';
import { apiClient } from '@/lib/api';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function SingleCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const certificateId = params.id as string;
  
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getCertificates({ certificateId });
        
        if (response?.success && response.data?.certificates?.length > 0) {
          setCertificate(response.data.certificates[0]);
        } else {
          setError('Certificate not found');
        }
      } catch (err) {
        console.error('Error fetching certificate:', err);
        setError('Failed to load certificate');
      } finally {
        setLoading(false);
      }
    };

    if (certificateId) {
      fetchCertificate();
    }
  }, [certificateId]);

  if (loading) {
    return (
      <DashboardLayout role='student'>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading certificate...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !certificate) {
    return (
      <DashboardLayout role='student'>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
          
          <div className="text-center py-12">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Certificate Not Found</h2>
            <p className="text-gray-600 mb-4">
              The certificate you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => router.push('/dashboard/student/feed')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Feed
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role='student'>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go Back</span>
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Shared Certificate</h1>
          <p className="text-gray-600">View this amazing achievement!</p>
        </div>

        <FeedCard 
          certificate={certificate}
          onLikeUpdate={() => {}}
        />
      </div>
    </DashboardLayout>
  );
}