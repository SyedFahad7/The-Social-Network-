'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: email, 2: otp, 3: new password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const resetForgotState = () => {
    setForgotStep(1);
    setForgotEmail('');
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotLoading(false);
    setForgotError('');
    setForgotSuccess('');
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      const res = await apiClient.requestPasswordReset(forgotEmail);
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      const res = await apiClient.verifyOtp(forgotEmail, forgotOtp);
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      const res = await apiClient.resetPassword(forgotEmail, forgotOtp, forgotNewPassword);
      if (res.success) {
        setForgotSuccess('Password reset successful! You can now log in.');
        setTimeout(() => {
          setShowForgotModal(false);
          resetForgotState();
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

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      if (token && user) {
        try {
          const parsedUser = JSON.parse(user);
          const userRole = parsedUser.role || role;
          switch (userRole) {
            case 'student':
              router.replace('/dashboard/student');
              break;
            case 'teacher':
              router.replace('/dashboard/teacher');
              break;
            case 'super-admin':
              router.replace('/dashboard/super-admin');
              break;
            default:
              router.replace('/dashboard');
          }
        } catch {
          router.replace('/dashboard');
        }
      }
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const response = await apiClient.login(email, password, role);
      
      if (response.success) {
        // Redirect based on role using replace
        switch (role) {
          case 'student':
            router.replace('/dashboard/student');
            break;
          case 'teacher':
            router.replace('/dashboard/teacher');
            break;
          case 'super-admin':
            router.replace('/dashboard/super-admin');
            break;
          default:
            router.replace('/dashboard');
        }
      } else {
        // Show backend error message or validation errors
        if (response.errors && Array.isArray(response.errors) && response.errors.length > 0) {
          setError(response.errors.map((e: any) => e.msg).join(', '));
        } else {
          setError(response.message || 'Login failed. Please try again.');
        }
      }
    } catch (error: any) {
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Social Network</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Academic Department Management Portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10 transition-all duration-200 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Login As</Label>
              <Select value={role} onValueChange={setRole} required>
                <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="super-admin">Super Admin (HoD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          {/* Forgot Password Link and Modal */}
          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-blue-600 hover:underline text-sm font-medium focus:outline-none"
              onClick={() => setShowForgotModal(true)}
            >
              Forgot Password?
            </button>
          </div>

          {showForgotModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-sm mx-2 p-6 relative">
                <button
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  onClick={() => { setShowForgotModal(false); resetForgotState(); }}
                  aria-label="Close"
                >
                  &times;
                </button>
                <h2 className="text-lg font-bold mb-2 text-center">Reset Password</h2>
                {forgotStep === 1 && (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div>
                      <Label htmlFor="forgot-email">College Email</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="your.roll@lords.ac.in"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={forgotLoading}>{forgotLoading ? 'Sending OTP...' : 'Send OTP'}</Button>
                  </form>
                )}
                {forgotStep === 2 && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <Label htmlFor="otp">Enter OTP</Label>
                      <Input
                        id="otp"
                        type="text"
                        maxLength={6}
                        value={forgotOtp}
                        onChange={e => setForgotOtp(e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={forgotLoading}>{forgotLoading ? 'Verifying...' : 'Verify OTP'}</Button>
                  </form>
                )}
                {forgotStep === 3 && (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={forgotNewPassword}
                        onChange={e => setForgotNewPassword(e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={forgotLoading}>{forgotLoading ? 'Resetting...' : 'Reset Password'}</Button>
                  </form>
                )}
                {forgotError && <div className="mt-2 text-red-600 text-sm text-center">{forgotError}</div>}
                {forgotSuccess && <div className="mt-2 text-green-600 text-sm text-center">{forgotSuccess}</div>}
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Don't have an account? Contact your system administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}