'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Users, 
  Plus, 
  Search,
  GraduationCap,
  UserCheck,
  Shield
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { 
  UserCard, 
  StatsCard, 
  StudentAnalytics, 
  UserForm, 
  SearchAndFilter 
} from '@/components/dashboard';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher' | 'admin' | 'super-admin';
  department: string;
  rollNumber?: string;
  section?: string;
  employeeId?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface Department {
  _id: string;
  name: string;
  code: string;
  description: string;
}

interface StudentAnalytics {
  attendance: {
    total: number;
    present: number;
    percentage: number;
  };
  assignments: {
    total: number;
    submitted: number;
    averageGrade: number;
  };
  tests: {
    total: number;
    attended: number;
    averageGrade: number;
  };
}

export default function SuperAdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [studentAnalytics, setStudentAnalytics] = useState<StudentAnalytics | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: '',
    department: '',
    rollNumber: '',
    section: '',
    employeeId: '',
    password: ''
  });

  // Fetch users and departments on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersResponse, departmentsResponse] = await Promise.all([
        apiClient.getUsers(),
        apiClient.getDepartments()
      ]);

      if (usersResponse.success) {
        setUsers(usersResponse.data.users || []);
      }
      if (departmentsResponse.success) {
        setDepartments(departmentsResponse.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        const updateData: any = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        
        const response = await apiClient.updateUser(editingUser._id, updateData);
        if (response.success) {
          await fetchData();
          setEditingUser(null);
        }
      } else {
        const response = await apiClient.createUser(formData);
        if (response.success) {
          await fetchData();
        }
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
        employeeId: '',
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
      employeeId: user.employeeId || '',
      password: ''
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        const response = await apiClient.deleteUser(userId);
        if (response.success) {
          await fetchData();
        }
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await apiClient.updateUser(userId, { role: newRole });
      if (response.success) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const handleViewStudent = async (student: User) => {
    setSelectedStudent(student);
    setShowStudentDialog(true);
    
    try {
      // Fetch student analytics (mock data for now)
      const analytics: StudentAnalytics = {
        attendance: {
          total: 45,
          present: 42,
          percentage: 93.3
        },
        assignments: {
          total: 8,
          submitted: 7,
          averageGrade: 85.7
        },
        tests: {
          total: 3,
          attended: 3,
          averageGrade: 88.3
        }
      };
      setStudentAnalytics(analytics);
    } catch (error) {
      console.error('Error fetching student analytics:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesDepartment = departmentFilter === 'all' || user.department === departmentFilter;
    
    return matchesSearch && matchesRole && matchesDepartment;
  });

  const getDepartmentName = (departmentId: string) => {
    const dept = departments.find(d => d._id === departmentId);
    return dept ? dept.name : departmentId;
  };

  if (loading) {
    return (
      <DashboardLayout role="super-admin">
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading users...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="super-admin">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage students, teachers, and administrators in your department</p>
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
          <UserForm
            formData={formData}
            departments={departments}
            editingUser={editingUser}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
            onCancel={() => {
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
                employeeId: '',
                password: ''
              });
            }}
          />
        )}

        {/* Filters */}
        <SearchAndFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search users..."
          filters={[
            {
              key: 'role',
              value: roleFilter,
              options: [
                { value: 'all', label: 'All Roles' },
                { value: 'student', label: 'Students' },
                { value: 'teacher', label: 'Teachers' },
                { value: 'admin', label: 'Admins' }
              ],
              placeholder: 'Filter by role',
              onValueChange: setRoleFilter
            },
            {
              key: 'department',
              value: departmentFilter,
              options: [
                { value: 'all', label: 'All Departments' },
                ...departments.map(dept => ({ value: dept._id, label: dept.name }))
              ],
              placeholder: 'Filter by department',
              onValueChange: setDepartmentFilter
            }
          ]}
        />

        {/* Users List */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Users ({filteredUsers.length})</TabsTrigger>
            <TabsTrigger value="students">Students ({filteredUsers.filter(u => u.role === 'student').length})</TabsTrigger>
            <TabsTrigger value="teachers">Teachers ({filteredUsers.filter(u => u.role === 'teacher').length})</TabsTrigger>
            <TabsTrigger value="admins">Admins ({filteredUsers.filter(u => u.role === 'admin').length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid gap-4">
              {filteredUsers.map((user) => (
                <UserCard
                  key={user._id}
                  user={user}
                  getDepartmentName={getDepartmentName}
                  onView={handleViewStudent}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onRoleChange={handleRoleChange}
                  showRoleChange={true}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="students">
            <div className="grid gap-4">
              {filteredUsers.filter(user => user.role === 'student').map((user) => (
                <UserCard
                  key={user._id}
                  user={user}
                  getDepartmentName={getDepartmentName}
                  onView={handleViewStudent}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  showRoleChange={false}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="teachers">
            <div className="grid gap-4">
              {filteredUsers.filter(user => user.role === 'teacher').map((user) => (
                <UserCard
                  key={user._id}
                  user={user}
                  getDepartmentName={getDepartmentName}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onRoleChange={handleRoleChange}
                  showRoleChange={true}
                  showViewButton={false}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="admins">
            <div className="grid gap-4">
              {filteredUsers.filter(user => user.role === 'admin').map((user) => (
                <UserCard
                  key={user._id}
                  user={user}
                  getDepartmentName={getDepartmentName}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onRoleChange={handleRoleChange}
                  showRoleChange={true}
                  showViewButton={false}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            title="Total Users"
            value={users.length}
            icon={Users}
            color="text-blue-600"
            bgColor="bg-blue-100"
          />
          <StatsCard
            title="Students"
            value={users.filter(u => u.role === 'student').length}
            icon={GraduationCap}
            color="text-green-600"
            bgColor="bg-green-100"
          />
          <StatsCard
            title="Teachers"
            value={users.filter(u => u.role === 'teacher').length}
            icon={UserCheck}
            color="text-purple-600"
            bgColor="bg-purple-100"
          />
          <StatsCard
            title="Admins"
            value={users.filter(u => u.role === 'admin').length}
            icon={Shield}
            color="text-orange-600"
            bgColor="bg-orange-100"
          />
        </div>

        {/* Student Detail Dialog */}
        <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <GraduationCap className="w-5 h-5" />
                <span>Student Details</span>
              </DialogTitle>
              <DialogDescription>
                Comprehensive view of student information and performance analytics
              </DialogDescription>
            </DialogHeader>
            
            {selectedStudent && studentAnalytics && (
              <StudentAnalytics
                student={selectedStudent}
                analytics={studentAnalytics}
                getDepartmentName={getDepartmentName}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}