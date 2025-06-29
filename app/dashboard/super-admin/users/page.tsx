'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Plus, 
  Search,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  GraduationCap,
  Shield,
  Crown
} from 'lucide-react';

export default function SuperAdminUsers() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    department: '',
    section: '',
    rollNumber: '',
    employeeId: '',
    password: ''
  });

  // Mock users data
  const [users, setUsers] = useState([
    { id: 1, name: 'John Doe', email: 'john@university.edu', role: 'student', department: 'Computer Science', section: 'A', rollNumber: 'CS2021001', status: 'active' },
    { id: 2, name: 'Jane Smith', email: 'jane@university.edu', role: 'student', department: 'Computer Science', section: 'B', rollNumber: 'CS2021002', status: 'active' },
    { id: 3, name: 'Prof. Wilson', email: 'wilson@university.edu', role: 'teacher', department: 'Computer Science', employeeId: 'EMP001', status: 'active' },
    { id: 4, name: 'Dr. Brown', email: 'brown@university.edu', role: 'teacher', department: 'Information Technology', employeeId: 'EMP002', status: 'active' },
    { id: 5, name: 'Admin User', email: 'admin@university.edu', role: 'admin', department: 'Computer Science', status: 'active' },
  ]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newUser = {
      id: users.length + 1,
      name: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      role: formData.role,
      department: formData.department,
      section: formData.section,
      rollNumber: formData.rollNumber,
      employeeId: formData.employeeId,
      status: 'active'
    };

    setUsers(prev => [...prev, newUser]);
    setShowCreateForm(false);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      role: '',
      department: '',
      section: '',
      rollNumber: '',
      employeeId: '',
      password: ''
    });

    alert(`User created successfully! Temporary password: ${formData.password}`);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.rollNumber && user.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (user.employeeId && user.employeeId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'student': return <GraduationCap className="w-4 h-4" />;
      case 'teacher': return <Users className="w-4 h-4" />;
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'super-admin': return <Crown className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'student': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'teacher': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'admin': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'super-admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const userStats = {
    total: users.length,
    students: users.filter(u => u.role === 'student').length,
    teachers: users.filter(u => u.role === 'teacher').length,
    admins: users.filter(u => u.role === 'admin').length,
    superAdmins: users.filter(u => u.role === 'super-admin').length,
  };

  return (
    <DashboardLayout role="super-admin">
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
            <p className="text-gray-600 dark:text-gray-300">Create and manage all system users</p>
          </div>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create User
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 text-gray-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.total}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <GraduationCap className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.students}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.teachers}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Teachers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Shield className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.admins}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Admins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Crown className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.superAdmins}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Super Admins</p>
            </CardContent>
          </Card>
        </div>

        {/* Create User Form */}
        {showCreateForm && (
          <Card className="border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5" />
                <span>Create New User</span>
              </CardTitle>
              <CardDescription>Add a new student, teacher, or admin to the system</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      required
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      required
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@university.edu"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)} required>
                      <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super-admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)} required>
                      <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Computer Science">Computer Science</SelectItem>
                        <SelectItem value="Information Technology">Information Technology</SelectItem>
                        <SelectItem value="Electronics & Communication">Electronics & Communication</SelectItem>
                        <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Student-specific fields */}
                {formData.role === 'student' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rollNumber">Roll Number</Label>
                      <Input
                        id="rollNumber"
                        placeholder="CS2021001"
                        value={formData.rollNumber}
                        onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                        required
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="section">Section</Label>
                      <Select value={formData.section} onValueChange={(value) => handleInputChange('section', value)} required>
                        <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">Section A</SelectItem>
                          <SelectItem value="B">Section B</SelectItem>
                          <SelectItem value="C">Section C</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Teacher-specific fields */}
                {formData.role === 'teacher' && (
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee ID</Label>
                    <Input
                      id="employeeId"
                      placeholder="EMP001"
                      value={formData.employeeId}
                      onChange={(e) => handleInputChange('employeeId', e.target.value)}
                      required
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      required
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <Button type="button" onClick={generatePassword} variant="outline">
                      Generate
                    </Button>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create User
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Users List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
              <CardTitle>All Users</CardTitle>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-full sm:w-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                    <SelectItem value="teacher">Teachers</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                    <SelectItem value="super-admin">Super Admins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-300">User</th>
                    <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-300">Role</th>
                    <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-300">Department</th>
                    <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-300">ID/Section</th>
                    <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-300">Status</th>
                    <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={`${getRoleBadgeColor(user.role)} flex items-center space-x-1 w-fit`}>
                          {getRoleIcon(user.role)}
                          <span className="capitalize">{user.role.replace('-', ' ')}</span>
                        </Badge>
                      </td>
                      <td className="p-3 text-gray-700 dark:text-gray-300">{user.department}</td>
                      <td className="p-3 text-gray-700 dark:text-gray-300">
                        {user.rollNumber && `${user.rollNumber} (${user.section})`}
                        {user.employeeId && user.employeeId}
                        {!user.rollNumber && !user.employeeId && '-'}
                      </td>
                      <td className="p-3">
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}