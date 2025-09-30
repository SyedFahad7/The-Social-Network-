'use client';

import React from 'react';
import Image from 'next/image';
import { Calendar, MapPin, Award, ExternalLink, CheckCircle, Clock, Trash2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';

interface CertificateCardProps {
  certificate: {
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
    student: {
      _id: string;
      firstName: string;
      lastName: string;
      rollNumber: string;
      year: number;
      section: string;
      profilePicture?: string;
    };
  };
  onDelete?: (id: string) => void;
  showDeleteButton?: boolean;
  isOwnCertificate?: boolean;
}

const CertificateCard: React.FC<CertificateCardProps> = ({
  certificate,
  onDelete,
  showDeleteButton = false,
  isOwnCertificate = false
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCertificateTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'Achievement': 'bg-green-100 text-green-800',
      'Award': 'bg-yellow-100 text-yellow-800',
      'Certification': 'bg-blue-100 text-blue-800',
      'Course Completion': 'bg-purple-100 text-purple-800',
      'Participation': 'bg-gray-100 text-gray-800',
      'Recognition': 'bg-pink-100 text-pink-800',
      'Workshop': 'bg-indigo-100 text-indigo-800',
      'Internship': 'bg-orange-100 text-orange-800',
      'Project': 'bg-teal-100 text-teal-800',
      'Competition': 'bg-red-100 text-red-800',
      'Leadership': 'bg-emerald-100 text-emerald-800',
      'Volunteer': 'bg-cyan-100 text-cyan-800',
      'Research': 'bg-violet-100 text-violet-800',
      'Publication': 'bg-rose-100 text-rose-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200">
      {/* Certificate Image */}
      <div className="relative">
        <Image
          src={certificate.fileUrl}
          alt={certificate.title}
          width={400}
          height={300}
          className="w-full h-48 object-cover rounded-t-lg"
        />
        {certificate.isVerified && (
          <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
            <CheckCircle className="w-4 h-4" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCertificateTypeColor(certificate.certificateType)}`}>
            {certificate.certificateType}
          </span>
        </div>
      </div>

      {/* Certificate Content */}
      <div className="p-4">
        {/* Title and Issuer */}
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
            {certificate.title}
          </h3>
          <div className="flex items-center text-sm text-gray-600">
            <Award className="w-4 h-4 mr-1" />
            <span className="line-clamp-1">{certificate.issuer}</span>
          </div>
        </div>

        {/* Description */}
        {certificate.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {certificate.description}
          </p>
        )}

        {/* Student Info (for feed) */}
        {!isOwnCertificate && (
          <div className="flex items-center mb-3 p-2 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-3">
              {certificate.student.profilePicture ? (
                <Image
                  src={certificate.student.profilePicture}
                  alt={`${certificate.student.firstName} ${certificate.student.lastName}`}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-gray-600">
                  {certificate.student.firstName?.[0]}{certificate.student.lastName?.[0]}
                </span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {certificate.student.firstName} {certificate.student.lastName}
              </p>
              <p className="text-xs text-gray-500">
                {certificate.student.rollNumber} • Year {certificate.student.year} • Section {certificate.student.section}
              </p>
            </div>
          </div>
        )}

        {/* Details */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2" />
            <span>Issued on {formatDate(certificate.issueDate)}</span>
          </div>
          
          {certificate.duration && (
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              <span>{certificate.duration}</span>
            </div>
          )}

          {certificate.grade && (
            <div className="flex items-center text-sm text-gray-600">
              <Award className="w-4 h-4 mr-2" />
              <span>Grade: {certificate.grade}</span>
            </div>
          )}
        </div>

        {/* Skills */}
        {certificate.skills && certificate.skills.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {certificate.skills.slice(0, 3).map((skill, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {skill}
                </span>
              ))}
              {certificate.skills.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  +{certificate.skills.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* External URL */}
        {certificate.externalUrl && (
          <a
            href={certificate.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-3"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            View Certificate
          </a>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            {formatDate(certificate.createdAt)}
          </div>
          
          {showDeleteButton && onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Certificate</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{certificate.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(certificate._id)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete Certificate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateCard;
