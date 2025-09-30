'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Heart, MessageCircle, Share2, Award, Calendar, Building, User, ThumbsUp, Users, Verified } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface FeedCardProps {
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
  currentUserId?: string;
  onLikeUpdate?: (certificateId: string, isLiked: boolean, newCount: number) => void;
}

const FeedCard: React.FC<FeedCardProps> = ({ 
  certificate, 
  currentUserId,
  onLikeUpdate 
}) => {
  const { toast } = useToast();
  
  // Provide fallback values for potentially missing data
  const likes = certificate.likes || [];
  const comments = certificate.comments || [];
  const likesCount = certificate.likesCount ?? 0;
  const commentsCount = certificate.commentsCount ?? 0;
  
  const [isLiked, setIsLiked] = useState(
    currentUserId ? likes.some(like => like.user === currentUserId) : false
  );
  const [localLikesCount, setLocalLikesCount] = useState(likesCount);
  const [isLiking, setIsLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  const timeAgo = (date: string) => {
    const now = new Date();
    const posted = new Date(date);
    const diffMs = now.getTime() - posted.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0) return `${diffHours}h`;
    if (diffMinutes > 0) return `${diffMinutes}m`;
    return 'now';
  };

  const getCertificateTypeColor = (type: string) => {
    const colors = {
      'Achievement': 'bg-gradient-to-r from-yellow-400 to-orange-500',
      'Award': 'bg-gradient-to-r from-purple-500 to-pink-500',
      'Participation': 'bg-gradient-to-r from-blue-400 to-blue-600',
      'Workshop': 'bg-gradient-to-r from-green-400 to-green-600',
      'Recognition': 'bg-gradient-to-r from-red-400 to-red-600',
      'Internship': 'bg-gradient-to-r from-indigo-400 to-purple-600',
      'Course Completion': 'bg-gradient-to-r from-teal-400 to-cyan-600',
      'Competition': 'bg-gradient-to-r from-orange-400 to-red-500',
      'Leadership': 'bg-gradient-to-r from-violet-500 to-purple-600',
      'Research': 'bg-gradient-to-r from-emerald-400 to-green-600',
    };
    return colors[type as keyof typeof colors] || 'bg-gradient-to-r from-gray-400 to-gray-600';
  };

  const handleLike = async () => {
    if (isLiking) return;
    
    setIsLiking(true);
    try {
      if (isLiked) {
        await apiClient.unlikeCertificate(certificate._id);
        setIsLiked(false);
        setLocalLikesCount(prev => prev - 1);
        onLikeUpdate?.(certificate._id, false, localLikesCount - 1);
      } else {
        await apiClient.likeCertificate(certificate._id);
        setIsLiked(true);
        setLocalLikesCount(prev => prev + 1);
        onLikeUpdate?.(certificate._id, true, localLikesCount + 1);
      }
    } catch (error) {
      console.error('Error liking certificate:', error);
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || isCommenting) return;
    
    setIsCommenting(true);
    try {
      await apiClient.addComment(certificate._id, commentText.trim());
      setCommentText('');
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
      // Refresh the feed to show new comment
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setIsCommenting(false);
    }
  };

  const handleShare = async () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const shareUrl = `${baseUrl}/feed/certificate/${certificate._id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${certificate.student.firstName}'s ${certificate.title}`,
          text: `Check out this amazing certificate earned by ${certificate.student.firstName} ${certificate.student.lastName}!`,
          url: shareUrl,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link Copied!",
          description: "Certificate link copied to clipboard",
        });
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1">
      {/* Header */}
      <div className="p-4 pb-3 bg-gradient-to-r from-white to-blue-50">
        <div className="flex items-start space-x-3">
          {/* Profile Picture */}
          <div className="relative">
            {certificate.student.profilePicture ? (
              <Image
                src={certificate.student.profilePicture}
                alt={`${certificate.student.firstName} ${certificate.student.lastName}`}
                width={48}
                height={48}
                className="rounded-full object-cover ring-2 ring-blue-200"
              />
            ) : certificate.student.profile?.picture ? (
              <Image
                src={certificate.student.profile.picture}
                alt={`${certificate.student.firstName} ${certificate.student.lastName}`}
                width={48}
                height={48}
                className="rounded-full object-cover ring-2 ring-blue-200"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center ring-2 ring-blue-200">
                <User className="w-6 h-6 text-white" />
              </div>
            )}
            {certificate.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-blue-500 to-green-500 rounded-full p-1">
                <Verified className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900 truncate">
                {certificate.student.firstName} {certificate.student.lastName}
              </h3>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm text-gray-500">{timeAgo(certificate.createdAt)}</span>
            </div>
            <p className="text-sm text-gray-600">
              Year {certificate.student.year} • Section {certificate.student.section}
            </p>
            {certificate.student.profile?.bio && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                {certificate.student.profile.bio}
              </p>
            )}
            {certificate.student.profile?.status && (
              <p className="text-xs text-blue-600 mt-1 flex items-center space-x-1">
                <span>{certificate.student.profile.status.emoji}</span>
                <span>{certificate.student.profile.status.text}</span>
              </p>
            )}
            <p className="text-xs text-green-600 mt-1 font-medium">
              Earned a new certificate! 🎉
            </p>
          </div>

          {/* Certificate Type Badge */}
          <div className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${getCertificateTypeColor(certificate.certificateType)}`}>
            {certificate.certificateType}
          </div>
        </div>
      </div>

      {/* Certificate Content */}
      <div className="px-4 pb-3">
        <h4 className="text-lg font-semibold text-gray-900 mb-2">{certificate.title}</h4>
        {certificate.description && (
          <p className="text-gray-700 mb-3 line-clamp-3">{certificate.description}</p>
        )}
        
        {/* Certificate Details */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
          <div className="flex items-center space-x-1">
            <Building className="w-4 h-4" />
            <span>{certificate.issuer}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="w-4 h-4" />
            <span>{new Date(certificate.issueDate).toLocaleDateString()}</span>
          </div>
          {certificate.duration && (
            <div className="flex items-center space-x-1">
              <Award className="w-4 h-4" />
              <span>{certificate.duration}</span>
            </div>
          )}
        </div>

        {/* Skills */}
        {certificate.skills && certificate.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {certificate.skills.slice(0, 5).map((skill, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {skill}
              </span>
            ))}
            {certificate.skills.length > 5 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{certificate.skills.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Certificate Image */}
      <div className="relative aspect-video bg-gray-100">
        <Image
          src={certificate.fileUrl}
          alt={certificate.title}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Engagement Stats */}
      {(localLikesCount > 0 || commentsCount > 0) && (
        <div className="px-4 py-2 border-b border-gray-100">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              {localLikesCount > 0 && (
                <div className="flex items-center space-x-1">
                  <div className="flex -space-x-1">
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <Heart className="w-3 h-3 text-white fill-current" />
                    </div>
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <ThumbsUp className="w-3 h-3 text-white fill-current" />
                    </div>
                  </div>
                  <span>{localLikesCount} {localLikesCount === 1 ? 'like' : 'likes'}</span>
                </div>
              )}
              {commentsCount > 0 && (
                <span>{commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
        <div className="flex justify-around">
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${
              isLiked
                ? 'text-red-600 bg-gradient-to-r from-red-50 to-pink-50 shadow-sm'
                : 'text-gray-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:text-red-600'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current animate-pulse' : ''}`} />
            <span className="font-medium">Like</span>
          </button>
          
          <button
            onClick={() => {
              // Focus on comment input
              const commentInput = document.querySelector(`#comment-input-${certificate._id}`) as HTMLInputElement;
              if (commentInput) {
                commentInput.focus();
              }
            }}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-600 transition-all duration-200 transform hover:scale-105"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">Comment</span>
          </button>
          
          <button 
            onClick={handleShare}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 hover:text-green-600 transition-all duration-200 transform hover:scale-105"
          >
            <Share2 className="w-5 h-5" />
            <span className="font-medium">Share</span>
          </button>
        </div>
      </div>

      {/* Comments Section - Always Visible */}
      <div className="px-4 py-3 bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Add Comment */}
        <div className="flex space-x-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex space-x-2">
              <input
                id={`comment-input-${certificate._id}`}
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleComment()}
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim() || isCommenting}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCommenting ? '...' : 'Post'}
              </button>
            </div>
          </div>
        </div>

        {/* Comments List - Auto Show Top 3 */}
        {comments.length > 0 ? (
          <div className="space-y-3">
            {comments.slice(0, 3).map((comment, index) => (
              <div key={index} className="flex space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
                    <p className="text-sm text-gray-900">{comment.text}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {timeAgo(comment.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            {comments.length > 3 && (
              <button 
                onClick={() => setShowComments(!showComments)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium ml-11"
              >
                {showComments ? 'Show less' : `View all ${comments.length} comments`}
              </button>
            )}
            {showComments && comments.length > 3 && (
              <div className="space-y-3 ml-11">
                {comments.slice(3).map((comment, index) => (
                  <div key={index + 3} className="flex space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
                        <p className="text-sm text-gray-900">{comment.text}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {timeAgo(comment.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-2">No comments yet</p>
            <p className="text-xs text-gray-400">Be the first to comment! 💭</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedCard;