'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, UploadCloud, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const schema = z.object({
	title: z.string().min(3, 'Title is required').max(200),
	issuer: z.string().min(2, 'Issuer is required').max(200),
	certificateType: z.string().min(1, 'Type is required'),
	category: z.string().min(1, 'Category is required'),
	issueDate: z.string().min(1, 'Issue date is required'),
	expiryDate: z.string().optional(),
	description: z.string().max(1000).optional(),
	duration: z.string().max(100).optional(),
	grade: z.string().max(100).optional(),
	externalUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
	skills: z.array(z.string()).optional(),
	tags: z.array(z.string()).optional(),
	certificateImage: z
		.instanceof(File, { message: 'Certificate image is required' })
		.refine((file) => file && ACCEPTED_IMAGE_TYPES.includes(file.type), 'Only JPG, PNG, or WEBP images are allowed')
		.refine((file) => file && file.size <= MAX_FILE_SIZE_BYTES, 'Max file size is 5MB'),
});

type FormValues = z.infer<typeof schema>;

interface CertificateFormProps {
	onSuccess?: () => void;
}

const CertificateForm: React.FC<CertificateFormProps> = ({ onSuccess }) => {
	const {
		register,
		handleSubmit,
		setValue,
		watch,
		reset,
		formState: { errors, isSubmitting, isValid }
	} = useForm<FormValues>({
		resolver: zodResolver(schema),
		mode: 'onChange',
	});

	const [types, setTypes] = useState<string[]>([
		'Participation', 'Achievement', 'Recognition', 'Workshop',
		'Award', 'Appreciation', 'Internship', 'Extra-curricular',
		'Course Completion', 'Certification', 'Project', 'Competition',
		'Leadership', 'Volunteer', 'Research', 'Publication',
		'Training', 'Conference', 'Seminar', 'Bootcamp',
		'Hackathon', 'Scholarship', 'Honor', 'Distinction',
		'Technology', 'Programming', 'Data Science', 'AI/ML',
		'Web Development', 'Mobile Development', 'Other'
	]);
	const [categories, setCategories] = useState<string[]>([
		'technical',
		'non-technical', 
		'academic',
		'extracurricular',
		'professional',
		'research'
	]);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [showSuccess, setShowSuccess] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);

	const certificateImage = watch('certificateImage');

	useEffect(() => {
		(async () => {
			try {
				const [typesRes, catsRes] = await Promise.all([
					fetch('/api/certificates/types', { credentials: 'include' }),
					fetch('/api/certificates/categories', { credentials: 'include' })
				]);
				const typesJson = await typesRes.json();
				const catsJson = await catsRes.json();
				if (typesJson.success) setTypes(typesJson.data);
				if (catsJson.success) setCategories(catsJson.data);
			} catch (e) {
				console.error('Failed loading types/categories from API, using fallback options', e);
				// Fallback options are already set in useState initial values
			}
		})();
	}, []);

	useEffect(() => {
		if (certificateImage && certificateImage instanceof File) {
			const url = URL.createObjectURL(certificateImage);
			setPreviewUrl(url);
			return () => URL.revokeObjectURL(url);
		}
		setPreviewUrl(null);
	}, [certificateImage]);

	const onSubmit = async (data: FormValues) => {
		try {
			console.log('Submitting certificate form:', data);
			
			const formData = new FormData();
			formData.append('title', data.title.trim());
			formData.append('issuer', data.issuer.trim());
			formData.append('certificateType', data.certificateType);
			formData.append('category', data.category);
			formData.append('issueDate', data.issueDate as unknown as string);
			if (data.expiryDate) formData.append('expiryDate', data.expiryDate);
			if (data.description) formData.append('description', data.description);
			if (data.duration) formData.append('duration', data.duration);
			if (data.grade) formData.append('grade', data.grade);
			if (data.externalUrl) formData.append('externalUrl', data.externalUrl);
			if (data.skills && data.skills.length > 0) formData.append('skills', data.skills.join(','));
			if (data.tags && data.tags.length > 0) formData.append('tags', data.tags.join(','));
			formData.append('certificateImage', data.certificateImage);

			console.log('Making request to /api/certificates');
			const response = await apiClient.uploadCertificateWithFile(formData);
			
			console.log('Upload successful:', response);

			setShowSuccess(true);
			reset();
			setPreviewUrl(null);
			setSelectedFile(null);
			if (onSuccess) onSuccess();
		} catch (e: any) {
			console.error('Certificate upload error:', e);
			alert(e.message || 'Something went wrong');
		}
	};

	const [skillInput, setSkillInput] = useState('');
	const skills = watch('skills') || [];
	const addSkill = () => {
		const value = skillInput.trim().toLowerCase();
		if (!value) return;
		if (!skills.includes(value)) setValue('skills', [...skills, value], { shouldValidate: true });
		setSkillInput('');
	};
	const removeSkill = (s: string) => setValue('skills', skills.filter(v => v !== s), { shouldValidate: true });

	const [tagInput, setTagInput] = useState('');
	const tags = watch('tags') || [];
	const addTag = () => {
		const value = tagInput.trim().toLowerCase();
		if (!value) return;
		if (!tags.includes(value)) setValue('tags', [...tags, value], { shouldValidate: true });
		setTagInput('');
	};
	const removeTag = (t: string) => setValue('tags', tags.filter(v => v !== t), { shouldValidate: true });

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
			{/* Image uploader */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">Certificate Image</label>
				<div className="border-2 border-dashed rounded-lg p-4 flex items-center gap-4 bg-gray-50">
					<input
						type="file"
						accept={ACCEPTED_IMAGE_TYPES.join(',')}
						className="hidden"
						id="certificateImage"
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file) {
								// Validate file type
								if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
									alert('Only JPG, PNG, or WEBP images are allowed');
									return;
								}
								// Validate file size
								if (file.size > MAX_FILE_SIZE_BYTES) {
									alert('Max file size is 5MB');
									return;
								}
								setSelectedFile(file);
								setValue('certificateImage', file, { shouldValidate: true });
								// Create preview
								const reader = new FileReader();
								reader.onload = (e) => setPreviewUrl(e.target?.result as string);
								reader.readAsDataURL(file);
							}
						}}
					/>
					<label htmlFor="certificateImage" className="cursor-pointer inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
						<UploadCloud className="w-4 h-4 mr-2" />
						{selectedFile ? 'Change Image' : 'Upload Image'}
					</label>
					{selectedFile && (
						<span className="text-sm text-gray-600">{selectedFile.name}</span>
					)}
					{previewUrl && (
						<img src={previewUrl} alt="Preview" className="h-24 rounded border" />
					)}
				</div>
				{errors.certificateImage && (
					<p className="text-sm text-red-600 mt-1">{errors.certificateImage.message as string}</p>
				)}
			</div>

			{/* Title / Issuer */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Certificate Title</label>
					<input type="text" {...register('title')} className="w-full border rounded-md px-3 py-2" placeholder="e.g., Google Cloud Digital Leader" />
					{errors.title && <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>}
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Issuing Organization</label>
					<input type="text" {...register('issuer')} className="w-full border rounded-md px-3 py-2" placeholder="e.g., Google" />
					{errors.issuer && <p className="text-sm text-red-600 mt-1">{errors.issuer.message}</p>}
				</div>
			</div>

			{/* Type / Category */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
					<select {...register('certificateType')} className="w-full border rounded-md px-3 py-2 bg-white">
						<option value="">Select type</option>
						{types.map((t) => (
							<option key={t} value={t}>{t}</option>
						))}
					</select>
					{errors.certificateType && <p className="text-sm text-red-600 mt-1">{errors.certificateType.message}</p>}
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
					<select {...register('category')} className="w-full border rounded-md px-3 py-2 bg-white">
						<option value="">Select category</option>
						{categories.map((c) => (
							<option key={c} value={c}>{c}</option>
						))}
					</select>
					{errors.category && <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>}
				</div>
			</div>

			{/* Dates */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
					<input type="date" {...register('issueDate')} className="w-full border rounded-md px-3 py-2" />
					{errors.issueDate && <p className="text-sm text-red-600 mt-1">{errors.issueDate.message}</p>}
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (optional)</label>
					<input type="date" {...register('expiryDate')} className="w-full border rounded-md px-3 py-2" />
					{errors.expiryDate && <p className="text-sm text-red-600 mt-1">{errors.expiryDate.message as string}</p>}
				</div>
			</div>

			{/* Optional details */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Duration (optional)</label>
					<input type="text" {...register('duration')} className="w-full border rounded-md px-3 py-2" placeholder="e.g., 8 weeks" />
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Grade (optional)</label>
					<input type="text" {...register('grade')} className="w-full border rounded-md px-3 py-2" placeholder="e.g., A+, 95%" />
				</div>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">External URL (optional)</label>
				<input type="url" {...register('externalUrl')} className="w-full border rounded-md px-3 py-2" placeholder="https://..." />
				{errors.externalUrl && <p className="text-sm text-red-600 mt-1">{errors.externalUrl.message as string}</p>}
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
				<textarea {...register('description')} className="w-full border rounded-md px-3 py-2" rows={3} placeholder="Add any relevant details..." />
				{errors.description && <p className="text-sm text-red-600 mt-1">{errors.description.message as string}</p>}
			</div>

			{/* Skills */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">Skills (optional)</label>
				<div className="flex gap-2 mb-2">
					<input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} className="flex-1 border rounded-md px-3 py-2" placeholder="Add a skill and press Add" />
					<button type="button" onClick={addSkill} className="px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200">Add</button>
				</div>
				{skills.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{skills.map((s) => (
							<span key={s} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
								{s}
								<button type="button" onClick={() => removeSkill(s)} className="text-blue-700 hover:text-blue-900">
									<X className="w-3 h-3" />
								</button>
							</span>
						))}
					</div>
				)}
			</div>

			{/* Tags */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">Tags (optional)</label>
				<div className="flex gap-2 mb-2">
					<input value={tagInput} onChange={(e) => setTagInput(e.target.value)} className="flex-1 border rounded-md px-3 py-2" placeholder="Add a tag and press Add" />
					<button type="button" onClick={addTag} className="px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200">Add</button>
				</div>
				{tags.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{tags.map((t) => (
							<span key={t} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
								{t}
								<button type="button" onClick={() => removeTag(t)} className="text-gray-700 hover:text-gray-900">
									<X className="w-3 h-3" />
								</button>
							</span>
						))}
					</div>
				)}
			</div>

			<div className="flex justify-end">
				<button
					type="submit"
					disabled={isSubmitting || !isValid}
					className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
				>
					{isSubmitting ? 'Uploading...' : 'Upload Certificate'}
				</button>
			</div>

			{/* Success Modal */}
			{showSuccess && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
					<div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
						<div className="flex items-center gap-3 mb-4">
							<CheckCircle2 className="w-6 h-6 text-green-600" />
							<h3 className="text-lg font-semibold">Thank you!</h3>
						</div>
						<p className="text-gray-700 mb-6">Your certificate has been uploaded successfully.</p>
						<div className="flex justify-end gap-2">
							<button
								onClick={() => setShowSuccess(false)}
								className="px-4 py-2 rounded-md border"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</form>
	);
};

export default CertificateForm;


