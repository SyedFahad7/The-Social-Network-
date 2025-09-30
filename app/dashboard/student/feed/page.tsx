'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeedCard from '@/components/certificates/FeedCard';
import { apiClient } from '@/lib/api';
import { Sparkles, TrendingUp, Users, GraduationCap, Loader2, Filter } from 'lucide-react';

type FeedItem = {
	_id: string;
	title: string;
	description?: string;
	issuer: string;
	certificateType: string;
	category: string;
	issueDate: string;
	fileUrl: string;
	skills?: string[];
	duration?: string;
	grade?: string;
	externalUrl?: string;
	isVerified?: boolean;
	createdAt: string;
	likes?: Array<{
		user: string;
		likedAt: string;
	}>;
	likesCount?: number;
	comments?: Array<{
		user: string;
		text: string;
		createdAt: string;
	}>;
	commentsCount?: number;
	student: {
		_id: string;
		firstName: string;
		lastName: string;
		rollNumber: string;
		year: number;
		section: string;
		profilePicture?: string;
		profile?: {
			picture?: string;
			bio?: string;
			status?: {
				emoji?: string;
				text?: string;
			};
		};
	};
};

export default function FeedPage() {
	const [activeTab, setActiveTab] = useState<'main' | 'year' | 'class'>('main');
	const [items, setItems] = useState<FeedItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [types, setTypes] = useState<string[]>([]);
	const [selectedType, setSelectedType] = useState<string>('');
	const [currentUserId, setCurrentUserId] = useState<string>('');
	const limit = 10;

	useEffect(() => {
		// Get current user ID and load types
		(async () => {
			try {
				const response = await apiClient.getCertificateTypes();
				if (response?.success) {
					setTypes(response.data || []);
				}
				
				// Get current user info (you may need to add this endpoint)
				// For now, we'll set it from auth context if available
			} catch (e) {
				console.error('Failed to load types', e);
			}
		})();
	}, []);

	const load = async (reset = false) => {
		if (loading) return;
		setLoading(true);
		try {
			const nextPage = reset ? 1 : page;
			const params = {
				page: nextPage,
				limit,
				...(selectedType && { certificateType: selectedType })
			};

			let response;
			if (activeTab === 'year') {
				response = await apiClient.getYearFeed(params);
			} else if (activeTab === 'class') {
				response = await apiClient.getClassFeed(params);
			} else {
				response = await apiClient.getDepartmentFeed(params);
			}

			if (!response?.success) {
				throw new Error(response?.message || 'Failed to load feed');
			}

			const data: FeedItem[] = response.data || [];
			setItems(reset ? data : [...items, ...data]);
			setHasMore(data.length === limit);
			setPage(nextPage + 1);
		} catch (e) {
			console.error('Feed load error:', e);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		// reset when tab or filter changes
		setItems([]);
		setPage(1);
		setHasMore(true);
		load(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTab, selectedType]);

	return (
		<DashboardLayout role='student'>
			<div className="max-w-5xl mx-auto px-4 py-6">
				<h1 className="text-2xl font-semibold mb-4">Certificates Feed</h1>

				{/* Tabs */}
				<div className="flex gap-2 mb-4 border-b">
					<button className={`px-4 py-2 -mb-px border-b-2 ${activeTab === 'main' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`} onClick={() => setActiveTab('main')}>Main</button>
					<button className={`px-4 py-2 -mb-px border-b-2 ${activeTab === 'year' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`} onClick={() => setActiveTab('year')}>My Year</button>
					<button className={`px-4 py-2 -mb-px border-b-2 ${activeTab === 'class' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`} onClick={() => setActiveTab('class')}>My Class</button>
				</div>

				{/* Filters */}
				<div className="flex items-center gap-3 mb-6">
					<select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="border rounded-md px-3 py-2 bg-white">
						<option value="">All Types</option>
						{types.map((t) => (
							<option key={t} value={t}>{t}</option>
						))}
					</select>
					<button onClick={() => load()} disabled={loading || !hasMore} className="px-3 py-2 border rounded-md disabled:opacity-50">{loading ? 'Loading...' : hasMore ? 'Load more' : 'No more'}</button>
				</div>

				{/* Feed */}
				<div className="space-y-6">
					{items.map((item) => (
						<FeedCard 
							key={item._id} 
							certificate={item} 
							currentUserId={currentUserId}
							onLikeUpdate={(certificateId, isLiked, newCount) => {
								setItems(prev => prev.map(i => 
									i._id === certificateId 
										? { ...i, likesCount: newCount }
										: i
								));
							}}
						/>
					))}
				</div>

				{!loading && items.length === 0 && (
					<div className="text-center py-8">
						<p className="text-gray-600">No certificates found.</p>
						<p className="text-sm text-gray-400 mt-2">
							{activeTab === 'main' 
								? 'No certificates uploaded by students in your department yet.' 
								: activeTab === 'year' 
								? 'No certificates uploaded by students in your year yet.'
								: 'No certificates uploaded by students in your class yet.'
							}
						</p>
					</div>
				)}
			</div>
		</DashboardLayout>
	);
}


