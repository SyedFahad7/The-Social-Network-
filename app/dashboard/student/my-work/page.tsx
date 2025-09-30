'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CertificateForm from '@/components/certificates/CertificateForm';
import CertificateCard from '@/components/certificates/CertificateCard';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Trash2, CheckCircle, Star, Trophy, Award } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Motivational quotes for achievements
const motivationalQuotes = [
	"🎉 Another milestone achieved! Keep building your success story!",
	"🌟 Excellence is not a destination but a continuous journey!",
	"🚀 Your achievements today are the foundation of tomorrow's success!",
	"💎 Every certificate is a step closer to your dreams!",
	"🏆 Success is collecting moments of growth like this!",
	"⭐ You're not just earning certificates, you're earning confidence!",
	"🎯 Each achievement unlocks new possibilities!",
	"🔥 Your dedication is turning into remarkable achievements!",
	"🌈 Building a portfolio of excellence, one certificate at a time!",
	"💪 Champions are made through consistent effort like yours!"
];

const getRandomQuote = () => motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];

export default function MyWorkPage() {
	const [activeTab, setActiveTab] = useState<'add' | 'view'>('add');
	const [certificates, setCertificates] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
	const [successQuote, setSuccessQuote] = useState('');
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const { toast } = useToast();
	const limit = 10;

	const fetchCertificates = async (pageNum = 1) => {
		setLoading(true);
		try {
			const response = await apiClient.getMyCertificates({ page: pageNum, limit });
			if (response?.success) {
				setCertificates(response.data.certificates || []);
				setTotalPages(response.data.pagination.totalPages || 1);
				setPage(response.data.pagination.currentPage || 1);
			}
		} catch (e) {
			console.error('Failed to load certificates', e);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (activeTab === 'view') {
			fetchCertificates(1);
		}
	}, [activeTab]);

	const handleDelete = async (id: string) => {
		setDeletingId(id);
		try {
			const response = await apiClient.deleteCertificate(id);
			if (response?.success) {
				toast({
					title: "Certificate Deleted! 🗑️",
					description: "Your certificate has been successfully removed.",
					variant: "default",
				});
				await fetchCertificates(page);
			}
		} catch (e: any) {
			toast({
				title: "Delete Failed",
				description: e.message || 'Could not delete certificate',
				variant: "destructive",
			});
		} finally {
			setDeletingId(null);
		}
	};

	const onUploaded = () => {
		// Show success animation and quote
		const quote = getRandomQuote();
		setSuccessQuote(quote);
		setShowSuccessAnimation(true);
		
		toast({
			title: "Certificate Uploaded! 🎉",
			description: quote,
			variant: "default",
		});

		// Switch to view tab after a delay
		setTimeout(() => {
			setActiveTab('view');
			fetchCertificates(1);
			setShowSuccessAnimation(false);
		}, 3000);
	};

	return (
		<DashboardLayout role='student'>
			<div className="max-w-5xl mx-auto px-4 py-6">
				<h1 className="text-2xl font-semibold mb-4">My Achievements</h1>

				<div className="flex gap-2 mb-6 border-b">
					<button
						className={`px-4 py-2 -mb-px border-b-2 ${activeTab === 'add' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`}
						onClick={() => setActiveTab('add')}
					>
						Add
					</button>
					<button
						className={`px-4 py-2 -mb-px border-b-2 ${activeTab === 'view' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`}
						onClick={() => setActiveTab('view')}
					>
						View
					</button>
				</div>

				{activeTab === 'add' && (
					<div className="bg-white rounded-lg border p-4">
						<CertificateForm onSuccess={onUploaded} />
					</div>
				)}

				{activeTab === 'view' && (
					<div className="space-y-4">
						{loading && <p className="text-gray-600">Loading...</p>}
						{!loading && certificates.length === 0 && (
							<p className="text-gray-600">No certificates yet. Add your first one!</p>
						)}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{certificates.map((c) => (
								<CertificateCard
									key={c._id}
									certificate={{
										...c,
										student: {
											_id: '',
											firstName: '',
											lastName: '',
											rollNumber: '',
											year: 0,
											section: '',
											profilePicture: ''
										}
									}}
									showDeleteButton
									onDelete={handleDelete}
									isOwnCertificate
								/>
							))}
						</div>

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="flex items-center justify-center gap-2">
								<button
									disabled={page <= 1}
									onClick={() => fetchCertificates(page - 1)}
									className="px-3 py-1 border rounded disabled:opacity-50"
								>
									Prev
								</button>
								<span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
								<button
									disabled={page >= totalPages}
									onClick={() => fetchCertificates(page + 1)}
									className="px-3 py-1 border rounded disabled:opacity-50"
								>
									Next
								</button>
							</div>
						)}
					</div>
				)}
			</div>
		</DashboardLayout>
	);
}


