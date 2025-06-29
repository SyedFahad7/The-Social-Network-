'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  User, 
  Moon, 
  Sun, 
  Monitor,
  Mail,
  Shield,
  Bell,
  Save,
  Eye,
  EyeOff,
  Camera,
  Upload
} from 'lucide-react';

export default function TeacherSettings() {
  const [user, setUser] = useState<any>(null);
  const [theme, setTheme] = useState('system');
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [otp, setOtp] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    employeeId: '',
    department: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    assignmentReminders: true,
    attendanceAlerts: false,
    systemUpdates: true
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setProfilePicture(parsedUser.profilePicture || null);
      setFormData({
        firstName: parsedUser.name?.split(' ')[0] || '',
        lastName: parsedUser.name?.split(' ')[1] || '',
        email: parsedUser.email || '',
        employeeId: 'EMP001',
        department: 'Computer Science',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }

    // Get theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme') || 'system';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (newTheme: string) => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System theme
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (field: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [field]: value }));
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setProfilePicture(result);
        // Update user data in localStorage
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userData.profilePicture = result;
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEmailChange = () => {
    if (newEmail && newEmail !== formData.email) {
      // Generate OTP (in real app, this would be sent via email)
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('Generated OTP:', generatedOtp); // In real app, this would be sent to email
      setShowOtpForm(true);
      alert(`OTP sent to ${newEmail}: ${generatedOtp}`); // Mock email sending
    }
  };

  const handleOtpVerification = () => {
    // In real app, verify OTP with backend
    if (otp.length === 6) {
      setFormData(prev => ({ ...prev, email: newEmail }));
      setShowOtpForm(false);
      setOtp('');
      setNewEmail('');
      alert('Email updated successfully!');
    } else {
      alert('Please enter a valid 6-digit OTP');
    }
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you'll call the API to update profile
    console.log('Updating profile:', formData);
    alert('Profile updated successfully!');
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    // Here you'll call the API to change password
    console.log('Changing password');
    alert('Password changed successfully!');
    setFormData(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));
  };

  return (
    <DashboardLayout role="teacher">
      <div className="p-4 lg:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Settings */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Profile Information</span>
                </CardTitle>
                <CardDescription>Update your personal information and profile picture</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  {/* Profile Picture */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                    <div className="relative">
                      <div className="w-20 h-20 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                        {profilePicture ? (
                          <img 
                            src={profilePicture} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl font-medium text-gray-700 dark:text-gray-300">
                            {user?.name ? user.name.charAt(0).toUpperCase() : user?.email.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
                        <Camera className="w-3 h-3 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePictureChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Profile Picture</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">JPG, GIF or PNG. Max size 2MB.</p>
                      <label className="mt-2 inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload new picture
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePictureChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee ID</Label>
                    <Input
                      id="employeeId"
                      value={formData.employeeId}
                      onChange={(e) => handleInputChange('employeeId', e.target.value)}
                      disabled
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
                      <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Computer Science">Computer Science</SelectItem>
                        <SelectItem value="Information Technology">Information Technology</SelectItem>
                        <SelectItem value="Electronics & Communication">Electronics & Communication</SelectItem>
                        <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-2" />
                    Update Profile
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Email Change */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5" />
                  <span>Email Address</span>
                </CardTitle>
                <CardDescription>Change your email address with OTP verification</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentEmail">Current Email</Label>
                    <Input
                      id="currentEmail"
                      value={formData.email}
                      disabled
                      className="bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  {!showOtpForm ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="newEmail">New Email Address</Label>
                        <Input
                          id="newEmail"
                          type="email"
                          placeholder="Enter new email address"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      <Button onClick={handleEmailChange} variant="outline">
                        Send OTP
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="otp">Enter OTP</Label>
                        <Input
                          id="otp"
                          placeholder="Enter 6-digit OTP"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          maxLength={6}
                          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={handleOtpVerification} className="bg-green-600 hover:bg-green-700">
                          Verify OTP
                        </Button>
                        <Button variant="outline" onClick={() => setShowOtpForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Password Change */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Change Password</span>
                </CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.currentPassword}
                        onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white pr-10"
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
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => handleInputChange('newPassword', e.target.value)}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Preferences */}
          <div className="space-y-6">
            {/* Theme Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Monitor className="w-5 h-5" />
                  <span>Theme</span>
                </CardTitle>
                <CardDescription>Choose your preferred theme</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { value: 'light', label: 'Light', icon: Sun },
                    { value: 'dark', label: 'Dark', icon: Moon },
                    { value: 'system', label: 'System', icon: Monitor }
                  ].map((option) => (
                    <div key={option.value} className="flex items-center space-x-3">
                      <button
                        onClick={() => handleThemeChange(option.value)}
                        className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors w-full ${
                          theme === option.value
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <option.icon className="w-5 h-5" />
                        <span className="font-medium text-gray-900 dark:text-white">{option.label}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>Notifications</span>
                </CardTitle>
                <CardDescription>Manage your notification preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
                    { key: 'assignmentReminders', label: 'Assignment Reminders', description: 'Get reminded about assignment deadlines' },
                    { key: 'attendanceAlerts', label: 'Attendance Alerts', description: 'Alerts for attendance marking' },
                    { key: 'systemUpdates', label: 'System Updates', description: 'Notifications about system updates' }
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{setting.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{setting.description}</p>
                      </div>
                      <Switch
                        checked={notifications[setting.key as keyof typeof notifications]}
                        onCheckedChange={(checked) => handleNotificationChange(setting.key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}