'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { Bell, Search, Menu, X, Inbox, User, Camera } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import apiClient from '@/lib/api';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: string;
}

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [notifUnread, setNotifUnread] = useState(false);
  const notifRef = useRef<HTMLButtonElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [modalJustClosed, setModalJustClosed] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [changePwdLoading, setChangePwdLoading] = useState(false);
  const [changePwdError, setChangePwdError] = useState('');
  const [changePwdSuccess, setChangePwdSuccess] = useState('');
  const [forgotPwdModal, setForgotPwdModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: send OTP, 2: enter OTP, 3: new password
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');

  const isChangePwdEnabled = currentPassword && newPassword && confirmPassword;

  const statusOptions = [
    { emoji: '💬', text: 'Available' },
    { emoji: '🏝️', text: 'On vacation' },
    { emoji: '🤒', text: 'Out sick' },
    { emoji: '🏠', text: 'Working from home' },
    { emoji: '🎯', text: 'Focusing' },
  ];
  const emojiOptions = ['💬', '🏝️', '🤒', '🏠', '🎯', '😃', '😎', '🚀', '🎉', '🧑‍💻', '📚', '📝', '🕹️', '', '🍕', '☕', '❤️', '👨‍🏫', '👩‍🏫', '👨‍🎓', '👩‍🎓', '👨‍💼', '👩‍💼', '👥', '👤', '🧑‍🎓', '👨‍🔬', '👩‍🔬', '🎓', '🏆', '🥇', '🥈', '🥉', '🏅', '📊', '📈', '📉', '💡', '🔬', '🧪', '🔭', '🗓️', '⏰', '⏱️', '⏲️', '🕐', '🍎', '🥨', '🧃', '🥤', '🍵', '🥛', '🍪', '🍰', '🧁', '🍯', '🥯', '🍞'];
  // Remove separate status state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // On page load, always initialize user and status from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.replace('/auth/login'); // Use replace to avoid stacking history
    } else {
      setUser(JSON.parse(userData));
      // Always fetch latest user profile from backend on load
      apiClient.getCurrentUser().then(res => {
        const u = res.data?.user || res.user;
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
        setProfilePicture(u?.profile?.picture || null);
        setBio(u?.profile?.bio || '');
        // setStatus(u?.profile?.status || { emoji: '💬', text: 'Available' }); // This line is removed
      });
    }
    setCheckingAuth(false);
  }, [router]);

  // On modal open/close, always set user from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, [settingsOpen]);

  // In the modal, update status via setUser
  const handleStatusChange = (newStatus: { emoji: string, text: string }) => {
    setUser((prev: any) => ({
      ...prev,
      profile: {
        ...prev.profile,
        status: newStatus
      }
    }));
  };

  useEffect(() => {
    if (!user) return;
    // Fetch recent notifications
    apiClient.getNotifications({ limit: 5 }).then(res => {
      const notifs = res.data?.notifications || res.notifications || [];
      setRecentNotifications(notifs);
      setNotifUnread(notifs.some((n: any) => !n.isRead));
    });
  }, [user, notifOpen]);

  useEffect(() => {
    if (user) {
      setProfilePicture(user.profile?.picture || null);
      setBio(user.profile?.bio || '');
      // setStatus(user.profile?.status || { emoji: '💬', text: 'Available' }); // This line is removed
    }
  }, [user]);

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    if (!selectedImage || !croppedAreaPixels) return;
    setProfileLoading(true);
    setProfileError('');
    try {
      const croppedBlob = await getCroppedImg(selectedImage, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], 'profile.jpg', { type: 'image/jpeg' });
      const res = await apiClient.uploadProfilePicture(croppedFile);
      if (res.success && res.url) {
        setProfilePicture(res.url);
        setProfileSuccess('Profile picture updated!');
        const updatedUser = { ...user, profile: { ...user.profile, picture: res.url } };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        setProfileError(res.message || 'Failed to upload image');
      }
    } catch (err: any) {
      setProfileError('Failed to upload image');
    } finally {
      setProfileLoading(false);
      setCropModalOpen(false);
      setSelectedImage(null);
    }
  };

  // In the modal, use user.profile.status for value and onChange
  // In handleProfileUpdate, update user and localStorage, and force a re-render
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const res = await apiClient.updateProfile(bio, user.profile.status);
      if (res.success) {
        setProfileSuccess('Profile updated!');
        const updatedUser = { ...user, profile: { ...user.profile, bio, status: user.profile.status } };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setTimeout(() => setProfileSuccess(''), 2000);
      } else {
        setProfileError(res.message || 'Failed to update profile.');
      }
    } catch (err: any) {
      setProfileError('Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePwdLoading(true);
    setChangePwdError('');
    setChangePwdSuccess('');
    if (newPassword !== confirmPassword) {
      setChangePwdError('New passwords do not match!');
      setChangePwdLoading(false);
      return;
    }
    try {
      const res = await apiClient.changePassword(currentPassword, newPassword, confirmPassword);
      if (res.success) {
        setChangePwdSuccess('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        // Show all validation errors if present
        if (res.errors && Array.isArray(res.errors) && res.errors.length > 0) {
          setChangePwdError(res.errors.map((e: any) => e.msg).join(', '));
        } else {
          setChangePwdError(res.message || 'Failed to change password.');
        }
      }
    } catch (err: any) {
      // Defensive: handle errors if thrown
      if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
        setChangePwdError(err.errors.map((e: any) => e.msg).join(', '));
      } else {
        setChangePwdError(err.message || 'Failed to change password.');
      }
    } finally {
      setChangePwdLoading(false);
    }
  };

  // Forgot password (OTP) flow
  const handleForgotSendOtp = async () => {
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      const res = await apiClient.requestPasswordReset(user.email);
      if (res.success) {
        setForgotStep(2);
        setForgotSuccess('OTP sent to your email.');
      } else {
        setForgotError(res.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setForgotError(err.message || 'Failed to send OTP.');
    } finally {
      setForgotLoading(false);
    }
  };
  const handleForgotVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      const res = await apiClient.verifyOtp(user.email, forgotOtp);
      if (res.success) {
        setForgotStep(3);
        setForgotSuccess('OTP verified. Please enter your new password.');
      } else {
        setForgotError(res.message || 'Invalid or expired OTP.');
      }
    } catch (err: any) {
      setForgotError(err.message || 'Invalid or expired OTP.');
    } finally {
      setForgotLoading(false);
    }
  };
  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      const res = await apiClient.resetPassword(user.email, forgotOtp, forgotNewPassword);
      if (res.success) {
        setForgotSuccess('Password reset successful! You can now log in with your new password.');
        setTimeout(() => {
          setForgotPwdModal(false);
          setForgotStep(1);
          setForgotOtp('');
          setForgotNewPassword('');
        }, 2000);
      } else {
        setForgotError(res.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      setForgotError(err.message || 'Failed to reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener('mousedown', handleClick);
    } else {
      document.removeEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [notifOpen]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // When closing the modal, update user and status from localStorage
  const handleCloseSettings = () => {
    setSettingsOpen(false);
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      // setStatus(parsedUser.profile?.status || { emoji: '💬', text: 'Available' }); // This line is removed
    }
    setModalJustClosed(true);
    setTimeout(() => setModalJustClosed(false), 100);
  };

  // Always use user state as the source of truth for status
  const getLatestStatus = () => {
    if (user && user.profile && user.profile.status) return user.profile.status;
    return { emoji: '💬', text: 'Available' };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:transform-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar
          role={role}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              {/* Search Bar */}
              <div className="hidden sm:block flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                  <Input
                    placeholder="Search..."
                    className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-600 transition-colors text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Notifications */}
              <div className="relative">
                <Button ref={notifRef} variant="ghost" size="sm" className="relative" onClick={() => setNotifOpen(v => !v)} aria-label="Notifications">
                  <Bell className="w-5 h-5" />
                  {notifUnread && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>}
                </Button>
                {notifOpen && (
                  <div
                    className={
                      `absolute z-50 mt-2 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 animate-fade-in flex flex-col ` +
                      `max-w-xs w-80 right-0 sm:left-auto sm:right-0 sm:w-80 sm:max-w-xs ` +
                      `w-screen left-0 right-0 mx-auto sm:w-80 sm:left-auto sm:right-0 sm:mx-0`
                    }
                    style={{ minWidth: '18rem', width: '100%', maxWidth: '20rem' }}
                  >
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                      <span className="font-semibold text-gray-900 dark:text-white">Notifications</span>
                      <Button variant="ghost" size="sm" onClick={() => setNotifOpen(false)} aria-label="Close"><X className="w-4 h-4" /></Button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                      {recentNotifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 flex flex-col items-center">
                          <Inbox className="w-8 h-8 mb-2" />
                          No notifications
                        </div>
                      ) : recentNotifications.map((notif, idx) => (
                        <button
                          key={notif._id || idx}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none ${!notif.isRead ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                          onClick={() => {
                            setNotifOpen(false);
                            if (role === 'student') {
                              window.location.href = '/dashboard/student/notifications';
                            } else if (role === 'teacher') {
                              window.location.href = '/dashboard/teacher/notifications?tab=received';
                            } else if (role === 'super-admin') {
                              window.location.href = '/dashboard/super-admin/notifications?tab=received';
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900 dark:text-white truncate">{notif.title}</span>
                            <span className="text-xs text-gray-500 ml-2">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="text-xs text-gray-500 truncate">From: {notif.senderName || 'System'}</div>
                        </button>
                      ))}
                    </div>
                    <div className="p-2 border-t border-gray-100 dark:border-gray-700 text-center">
                      <Button variant="link" size="sm" className="w-full" onClick={() => {
                        setNotifOpen(false);
                        if (role === 'student') {
                          window.location.href = '/dashboard/student/notifications';
                        } else if (role === 'teacher') {
                          window.location.href = '/dashboard/teacher/notifications?tab=received';
                        } else if (role === 'super-admin') {
                          window.location.href = '/dashboard/super-admin/notifications?tab=received';
                        }
                      }}>
                        View all notifications
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              {/* Theme Toggle */}
              <ThemeToggle />
              {/* Status in header (right side, desktop only) */}
              <span className="lg:flex flex justify-center items-center gap-1 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-sm font-medium border border-gray-200 dark:border-gray-700">
                <span className="text-xs md:text-sm">{user?.profile?.status?.emoji || '💬'}</span>
                <span className='text-xs md:text-sm'>{user?.profile?.status?.text || 'Available'}</span>
              </span>
              {/* Profile Avatar */}
              <div className="relative">
                <Button variant="ghost" size="sm" className="rounded-full p-1" onClick={() => setSettingsOpen(true)} aria-label="Profile Settings">
                  {user?.profile?.picture ? (
                    <img src={user.profile.picture} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <span className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 text-xl">
                      {user?.profile?.status?.emoji || (user?.firstName ? user.firstName[0] : 'U')}
                    </span>
                  )}
                </Button>
                {settingsOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-sm mx-2 p-0 relative flex flex-col items-center" style={{ maxHeight: '90vh', margin: '3vh 0' }}>
                      <button
                        className="absolute top-2 right-4 w-10 h-10 text-3xl bg-black/10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        onClick={handleCloseSettings}
                        aria-label="Close"
                      >
                        &times;
                      </button>

                      <div className="w-full overflow-y-auto p-6" style={{ maxHeight: '80vh' }}>
                        <h2 className="text-lg font-bold mb-2 text-center">Profile Settings</h2>
                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-20 h-20 rounded-full bg-gray-300 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                              {profilePicture ? (
                                <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-10 h-10 text-gray-500" />
                              )}
                            </div>
                            <label className="block">
                              <span className="sr-only">Choose profile photo</span>
                              <input type="file" accept="image/*" onChange={handleProfilePictureChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                            </label>
                          </div>
                          <div>
                            <label htmlFor="bio" className="block text-sm font-medium mb-1">Bio</label>
                            <Input id="bio" value={bio} onChange={e => setBio(e.target.value)} placeholder="Write something about yourself..." />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Status</label>
                            <div className="flex items-center gap-2 mb-2">
                              <button type="button" className="text-2xl bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center border" onClick={() => setShowEmojiPicker(v => !v)}>
                                {user?.profile?.status?.emoji || '💬'}
                              </button>
                              <input
                                type="text"
                                value={user?.profile?.status?.text || ''}
                                onChange={e => handleStatusChange({ emoji: user?.profile?.status?.emoji || '💬', text: e.target.value })}
                                placeholder="What's happening?"
                                className="flex-1 border rounded px-2 py-1"
                                maxLength={32}
                              />
                            </div>
                            {showEmojiPicker && (
                              <div className="flex flex-wrap gap-2 bg-white dark:bg-gray-800 p-2 rounded shadow max-w-xs">
                                {emojiOptions.map(e => (
                                  <button key={e} type="button" className="text-2xl p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" onClick={() => { handleStatusChange({ emoji: e, text: user?.profile?.status?.text || '' }); setShowEmojiPicker(false); }}>
                                    {e}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {statusOptions.map(opt => (
                                <button key={opt.text} type="button" className={`flex items-center gap-1 px-2 py-1 rounded-full border ${user?.profile?.status?.text === opt.text && user?.profile?.status?.emoji === opt.emoji ? 'bg-blue-100 border-blue-400' : 'bg-gray-100 border-gray-300'}`} onClick={() => handleStatusChange(opt)}>
                                  <span>{opt.emoji}</span>
                                  <span className="text-xs">{opt.text}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          <Button type="submit" className="w-full" disabled={profileLoading}>{profileLoading ? 'Saving...' : 'Save Profile'}</Button>
                          {profileError && <div className="text-red-600 text-sm text-center">{profileError}</div>}
                          {profileSuccess && <div className="text-green-600 text-sm text-center">{profileSuccess}</div>}
                        </form>
                        <form onSubmit={handlePasswordChange} className="space-y-4 mt-6">
                          <h3 className="text-md font-semibold mb-2 text-center">Change Password</h3>
                          <div>
                            <label htmlFor="current-password" className="block text-sm font-medium mb-1">Current Password</label>
                            <Input id="current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                          </div>
                          <div>
                            <label htmlFor="new-password" className="block text-sm font-medium mb-1">New Password</label>
                            <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                          </div>
                          <div>
                            <label htmlFor="confirm-password" className="block text-sm font-medium mb-1">Confirm New Password</label>
                            <Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                          </div>
                          <Button type="submit" className="w-full" disabled={!isChangePwdEnabled || changePwdLoading}>{changePwdLoading ? 'Changing...' : 'Change Password'}</Button>
                          {changePwdError && <div className="text-red-600 text-sm text-center">{changePwdError}</div>}
                          {changePwdSuccess && <div className="text-green-600 text-sm text-center">{changePwdSuccess}</div>}
                          <div className="mt-2 text-center">
                            <button type="button" className="text-blue-600 hover:underline text-sm font-medium focus:outline-none" onClick={() => { setForgotPwdModal(true); setForgotStep(1); setForgotOtp(''); setForgotNewPassword(''); setForgotError(''); setForgotSuccess(''); }}>
                              Forgot current password?
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="sm:hidden mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <Input
                placeholder="Search..."
                className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-600 transition-colors text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      {/* Profile Picture Cropper Modal */}
      {cropModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-sm mx-2 p-6 relative flex flex-col items-center">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              onClick={() => { setCropModalOpen(false); setSelectedImage(null); }}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-lg font-bold mb-2 text-center">Crop Profile Picture</h2>
            <div className="relative w-60 h-60 bg-gray-200 rounded-lg overflow-hidden">
              <Cropper
                image={selectedImage!}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="flex flex-col w-full mt-4 gap-2">
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="w-full"
              />
              <button
                className="bg-blue-600 text-white rounded px-4 py-2 mt-2"
                onClick={handleCropSave}
                disabled={profileLoading}
              >
                {profileLoading ? 'Uploading...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Forgot Password Modal */}
      {forgotPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-sm mx-2 p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              onClick={() => setForgotPwdModal(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-lg font-bold mb-2 text-center">Reset Password</h2>
            {forgotStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center">Send an OTP to your email to reset your password.</p>
                <Button onClick={handleForgotSendOtp} className="w-full" disabled={forgotLoading}>{forgotLoading ? 'Sending OTP...' : 'Send OTP'}</Button>
              </div>
            )}
            {forgotStep === 2 && (
              <form onSubmit={handleForgotVerifyOtp} className="space-y-4">
                <div>
                  <label htmlFor="otp">Enter OTP</label>
                  <Input id="otp" type="text" maxLength={6} value={forgotOtp} onChange={e => setForgotOtp(e.target.value)} required className="mt-1" />
                </div>
                <Button type="submit" className="w-full" disabled={forgotLoading}>{forgotLoading ? 'Verifying...' : 'Verify OTP'}</Button>
              </form>
            )}
            {forgotStep === 3 && (
              <form onSubmit={handleForgotResetPassword} className="space-y-4">
                <div>
                  <label htmlFor="new-forgot-password">New Password</label>
                  <Input id="new-forgot-password" type="password" value={forgotNewPassword} onChange={e => setForgotNewPassword(e.target.value)} required className="mt-1" />
                </div>
                <Button type="submit" className="w-full" disabled={forgotLoading}>{forgotLoading ? 'Resetting...' : 'Reset Password'}</Button>
              </form>
            )}
            {forgotError && <div className="mt-2 text-red-600 text-sm text-center">{forgotError}</div>}
            {forgotSuccess && <div className="mt-2 text-green-600 text-sm text-center">{forgotSuccess}</div>}
          </div>
        </div>
      )}
    </div>
  );
}