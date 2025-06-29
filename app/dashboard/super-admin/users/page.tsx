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
  Edit, 
  Trash2,
  Search,
  Filter,
  GraduationCap,
  UserCheck,
  Shield,
  Crown
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher' | 'admin' | 'super-admin';
  department: string;
  rollNumber?: string;
  section?: string;
  subjects?: string[];
  year?: number;
  isActive: boolean;
  createdAt: string;
}

export default function SuperAdminUsers() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: '',
    department: '',
    rollNumber: '',
    section: '',
    subjects: [] as string[],
    year: new Date().getFullYear(),
    password: ''
  });

  // Mock data - replace with API calls
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      email: 'hod@college.edu',
      firstName: 'Dr. John',
      lastName: 'Smith',
      role: 'super-admin',
      department: 'Computer Science',
      isActive: true,
      createdAt: '2025-01-01'
    },
    {
      id: '2',
      email: 'teacher1@college.edu',
      firstName: 'Prof. Sarah',
      lastName: 'Wilson',
      role: 'teacher',
      department: 'Computer Science',
      subjects: ['Data Structures', 'Algorithms'],
      isActive: true,
      createdAt: '2025-01-02'
    },
    {
      id: '3',
      email: 'student1@college.edu',
      firstName: 'John',
      lastName: 'Doe',
      role: 'student',
      department: 'Computer Science',
      rollNumber: 'CS2021001',
      section: 'section-a',
      year: 2024,
      isActive: true,
      createdAt: '2025-01-03'
    }
  ]);

  const departments = [
    'Computer Science',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Business Administration'
  ];

  const sections = [
    { id: 'section-a', name: 'Section A' },
    { id: 'section-b', name: 'Section B' },
    { id: 'section-c', name: 'Section C' }
  ];

  const subjects = [
    'Data Structures',
    'Algorithms',
    'Database Management',
    'Web Development',
    'Software Engineering',
    'Computer Networks',
    'Operating Systems'
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubjectToggle = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        // Update existing user
        // await apiClient.updateUser(editingUser.id, formData);
        setUsers(prev => prev.map(user => 
          user.id === editingUser.id 
            ? { 
                ...user, 
                ...formData,
                role: formData.role as 'student' | 'teacher' | 'admin' | 'super-admin'
              }
            : user
        ));
        setEditingUser(null);
      } else {
        // Create new user
        // const response = await apiClient.createUser(formData);
        const newUser: User = {
          id: Date.now().toString(),
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role as 'student' | 'teacher' | 'admin' | 'super-admin',
          department: formData.department,
          rollNumber: formData.rollNumber,
          section: formData.section,
          subjects: formData.subjects,
          year: formData.year,
          isActive: true,
          createdAt: new Date().toISOString().split('T')[0]
        };
        setUsers(prev => [...prev, newUser]);
      }

      setShowCreateForm(false);
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        role: '',
        department: '',
        rollNumber: '',
        section: '',
        subjects: [],
        year: new Date().getFullYear(),
        password: ''
      });
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department,
      rollNumber: user.rollNumber || '',
      section: user.section || '',
      subjects: user.subjects || [],
      year: user.year || new Date().getFullYear(),
      password: ''
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        // await apiClient.deleteUser(userId);
        setUsers(prev => prev.filter(user => user.id !== userId));
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super-admin': return <Crown className="w-4 h-4" />;
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'teacher': return <UserCheck className="w-4 h-4" />;
      case 'student': return <GraduationCap className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super-admin': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-orange-100 text-orange-800';
      case 'teacher': return 'bg-green-100 text-green-800';
      case 'student': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout role="super-admin">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage students, teachers, and administrators</p>
          </div>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>{editingUser ? 'Edit User' : 'Add New User'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      required={!editingUser}
                      placeholder={editingUser ? "Leave blank to keep current" : ""}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                      <SelectTrigger>
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
                    <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.role === 'student' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rollNumber">Roll Number</Label>
                      <Input
                        id="rollNumber"
                        value={formData.rollNumber}
                        onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="section">Section</Label>
                      <Select value={formData.section} onValueChange={(value) => handleInputChange('section', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
                          {sections.map((section) => (
                            <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {formData.role === 'teacher' && (
                  <div className="space-y-2">
                    <Label>Subjects</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {subjects.map((subject) => (
                        <label key={subject} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.subjects.includes(subject)}
                            onChange={() => handleSubjectToggle(subject)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">{subject}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex space-x-4">
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    {editingUser ? 'Update User' : 'Create User'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingUser(null);
                      setFormData({
                        email: '',
                        firstName: '',
                        lastName: '',
                        role: '',
                        department: '',
                        rollNumber: '',
                        section: '',
                        subjects: [],
                        year: new Date().getFullYear(),
                        password: ''
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
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

        {/* Users List */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Users ({filteredUsers.length})</TabsTrigger>
            <TabsTrigger value="students">Students ({filteredUsers.filter(u => u.role === 'student').length})</TabsTrigger>
            <TabsTrigger value="teachers">Teachers ({filteredUsers.filter(u => u.role === 'teacher').length})</TabsTrigger>
            <TabsTrigger value="admins">Admins ({filteredUsers.filter(u => u.role === 'admin' || u.role === 'super-admin').length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid gap-4">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          {getRoleIcon(user.role)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {user.firstName} {user.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={getRoleColor(user.role)}>
                              {user.role.replace('-', ' ')}
                            </Badge>
                            {user.rollNumber && (
                              <Badge variant="outline">{user.rollNumber}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(user.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              <p className="text-sm text-gray-600">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <GraduationCap className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'student').length}
              </p>
              <p className="text-sm text-gray-600">Students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <UserCheck className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'teacher').length}
              </p>
              <p className="text-sm text-gray-600">Teachers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Shield className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'admin' || u.role === 'super-admin').length}
              </p>
              <p className="text-sm text-gray-600">Admins</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}