'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Users, 
  Plus, 
  GraduationCap, 
  UserCheck, 
  Shield, 
  Crown,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  X
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { 
  StatsCard, 
  SearchAndFilter 
} from '@/components/dashboard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Department {
  _id: string;
  name: string;
  code: string;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'teacher' | 'admin' | 'super-admin';
  department: string;
  isActive: boolean;
  phone?: string;
  rollNumber?: string;
  employeeId?: string;
  createdAt: string;
  year?: number;
}

// Helper to get current user from localStorage
function getCurrentUser() {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('user');
    if (user) return JSON.parse(user);
  }
  return null;
}

export default function SuperAdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedYear, setSelectedYear] = useState('all');

  const currentUser = getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'super-admin';
  const superAdminDept = currentUser?.department;

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

  const getDepartmentName = (departmentId: string) => {
    const dept = departments.find(d => d._id === departmentId);
    return dept ? dept.name : 'Unknown Department';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.rollNumber && user.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.employeeId && user.employeeId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesDepartment = isSuperAdmin
      ? user.department && superAdminDept && String(user.department) === String(superAdminDept)
      : selectedDepartment === 'all' || (user.department && String(user.department) === String(selectedDepartment));
    const matchesYear = selectedYear === 'all' || (user.year && user.year.toString() === selectedYear);
    return matchesSearch && matchesRole && matchesDepartment && matchesYear;
  });

  const students = filteredUsers.filter(user => user.role === 'student');
  const teachers = filteredUsers.filter(user => user.role === 'teacher');
  const admins = filteredUsers.filter(user => user.role === 'admin');
  const superAdmins = filteredUsers.filter(user => user.role === 'super-admin');

  const handleCreateUser = async (userData: any) => {
    try {
      setIsSubmitting(true);
      const response = await apiClient.createUser(userData);
      if (response.success) {
        setShowUserForm(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error creating user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (userData: any) => {
    try {
      setIsSubmitting(true);
      console.log('Updating user with data:', userData);
      
      const response = await apiClient.updateUser(userData._id, userData);
      console.log('Update response:', response);
      
      if (response.success) {
        console.log('User updated successfully');
        setShowUserForm(false);
        setEditingUser(null);
        await fetchData(); // Refresh the data
        // You could add a toast notification here
        alert('User updated successfully!');
      } else {
        console.error('Update failed:', response.message);
        alert(`Update failed: ${response.message}`);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert(`Error updating user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        const response = await apiClient.deleteUser(userId);
        if (response.success) {
          fetchData();
        }
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const handleViewStudent = (user: User) => {
    setSelectedStudent(user);
    setShowStudentDialog(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRole('all');
    setSelectedDepartment(isSuperAdmin ? superAdminDept : 'all');
    setSelectedYear('all');
  };

  const getRoleStats = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;
    const students = users.filter(u => u.role === 'student').length;
    const teachers = users.filter(u => u.role === 'teacher').length;
    const admins = users.filter(u => u.role === 'admin').length;

    return [
      {
        title: 'Total Users',
        value: totalUsers.toString(),
        change: `${activeUsers} active`,
        icon: Users,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
      },
      {
        title: 'Students',
        value: students.toString(),
        change: `${Math.round((students / totalUsers) * 100)}% of total`,
        icon: GraduationCap,
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      },
      {
        title: 'Teachers',
        value: teachers.toString(),
        change: `${Math.round((teachers / totalUsers) * 100)}% of total`,
        icon: UserCheck,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100'
      },
      {
        title: 'Admins',
        value: admins.toString(),
        change: `${Math.round((admins / totalUsers) * 100)}% of total`,
        icon: Shield,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100'
      }
    ];
  };

  // Detailed debug logs for department filtering
  console.log('All users:', users.map(u => ({
    _id: u._id,
    email: u.email,
    role: u.role,
    department: u.department,
    departmentType: typeof u.department,
    year: u.year
  })));
  console.log('superAdminDept:', superAdminDept, 'type:', typeof superAdminDept);

  if (loading) {
    return (
      <DashboardLayout role="super-admin">
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage all users across departments</p>
          </div>
          <Button 
            onClick={() => setShowUserForm(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Year Filter */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 mr-2">Filter by Year:</label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="2">2nd Year</SelectItem>
              <SelectItem value="3">3rd Year</SelectItem>
              <SelectItem value="4">4th Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {getRoleStats().map((stat, index) => (
            <StatsCard
              key={index}
              title={stat.title}
              value={stat.value}
              change={stat.change}
              icon={stat.icon}
              color={stat.color}
              bgColor={stat.bgColor}
            />
          ))}
        </div>

        {/* Search and Filters */}
        <SearchAndFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={[
            {
              key: 'role',
              label: 'Role',
              value: selectedRole,
              options: [
                { value: 'student', label: 'Student' },
                { value: 'teacher', label: 'Teacher' },
                { value: 'admin', label: 'Admin' },
                { value: 'super-admin', label: 'Super Admin' }
              ],
              onChange: setSelectedRole
            },
            // Only show department filter if not super-admin
            ...(!isSuperAdmin ? [{
              key: 'department',
              label: 'Department',
              value: selectedDepartment,
              options: [
                { value: 'all', label: 'All Departments' },
                ...departments.map(dept => ({
                  value: dept._id,
                  label: dept.name
                }))
              ],
              onChange: setSelectedDepartment
            }] : [])
          ]}
          onClearFilters={clearFilters}
          placeholder="Search users..."
        />

        {/* User Tabs */}
        {/* <Tabs defaultValue="students" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="students" className="flex items-center space-x-2">
              <GraduationCap className="w-4 h-4" />
              <span>Students ({students.length})</span>
            </TabsTrigger>
            <TabsTrigger value="teachers" className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4" />
              <span>Teachers ({teachers.length})</span>
            </TabsTrigger>
            <TabsTrigger value="admins" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Admins ({admins.length})</span>
            </TabsTrigger>
            <TabsTrigger value="super-admins" className="flex items-center space-x-2">
              <Crown className="w-4 h-4" />
              <span>Super Admins ({superAdmins.length})</span>
            </TabsTrigger>
          </TabsList> */}

          {/* <TabsContent value="students">
            <div className="grid gap-4">
              {filteredUsers.filter(u => u.role === 'student').length === 0 ? (
                <div className="text-center text-gray-500">No students found.</div>
              ) : (
                filteredUsers.filter(u => u.role === 'student').map((user) => (
                  <UserCard
                    key={user._id}
                    user={{
                      ...user,
                      department: getDepartmentName(user.department)
                    }}
                    onView={() => handleViewStudent(user)}
                    onEdit={() => handleEditUser(user)}
                    onDelete={() => handleDeleteUser(user._id)}
                    showDepartment={true}
                    showContact={true}
                  />
                ))
              )}
            </div>
          </TabsContent> */}

          {/* <TabsContent value="teachers">
            <div className="grid gap-4">
              {filteredUsers.filter(u => u.role === 'teacher').length === 0 ? (
                <div className="text-center text-gray-500">No teachers found.</div>
              ) : (
                filteredUsers.filter(u => u.role === 'teacher').map((user) => (
                  <UserCard
                    key={user._id}
                    user={{
                      ...user,
                      department: getDepartmentName(user.department)
                    }}
                    onEdit={() => handleEditUser(user)}
                    onDelete={() => handleDeleteUser(user._id)}
                    showDepartment={true}
                    showContact={true}
                  />
                ))
              )}
            </div>
          </TabsContent> */}

          {/* <TabsContent value="admins">
            <div className="grid gap-4">
              {filteredUsers.filter(u => u.role === 'admin').length === 0 ? (
                <div className="text-center text-gray-500">No admins found.</div>
              ) : (
                filteredUsers.filter(u => u.role === 'admin').map((user) => (
                  <UserCard
                    key={user._id}
                    user={{
                      ...user,
                      department: getDepartmentName(user.department)
                    }}
                    onEdit={() => handleEditUser(user)}
                    onDelete={() => handleDeleteUser(user._id)}
                    showDepartment={true}
                    showContact={true}
                  />
                ))
              )}
            </div>
          </TabsContent> */}

          {/* <TabsContent value="super-admins">
            <div className="grid gap-4">
              {filteredUsers.filter(u => u.role === 'super-admin').length === 0 ? (
                <div className="text-center text-gray-500">No super admins found.</div>
              ) : (
                filteredUsers.filter(u => u.role === 'super-admin').map((user) => (
                  <UserCard
                    key={user._id}
                    user={{
                      ...user,
                      department: getDepartmentName(user.department)
                    }}
                    onEdit={() => handleEditUser(user)}
                    onDelete={() => handleDeleteUser(user._id)}
                    showDepartment={true}
                    showContact={true}
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs> */}

        {/* User Form Dialog */}
        {/* {showUserForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <UserForm
                user={editingUser || undefined}
                departments={isSuperAdmin ? departments.filter(d => d._id === superAdminDept) : departments}
                onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
                onCancel={() => {
                  setShowUserForm(false);
                  setEditingUser(null);
                }}
                isLoading={isSubmitting}
                mode={editingUser ? 'edit' : 'create'}
                isSuperAdmin={isSuperAdmin}
              />
            </div>
          </div>
        )} */}

        {/* Student Analytics Dialog */}
        {/* <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto font-bold">
            <DialogHeader>
              <DialogTitle>Student Analytics</DialogTitle>
              <DialogDescription>
                Detailed performance analytics for {selectedStudent?.firstName} {selectedStudent?.lastName}
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <StudentAnalytics
                student={{
                  _id: selectedStudent._id,
                  firstName: selectedStudent.firstName,
                  lastName: selectedStudent.lastName,
                  rollNumber: selectedStudent.rollNumber || '',
                  email: selectedStudent.email,
                  department: getDepartmentName(selectedStudent.department)
                }}
                analytics={{
                  attendance: {
                    present: 45,
                    total: 50,
                    percentage: 90
                  },
                  assignments: {
                    submitted: 8,
                    total: 10,
                    averageGrade: 85
                  },
                  tests: {
                    attended: 5,
                    total: 6,
                    averageGrade: 88
                  },
                  overallPerformance: 87,
                  trend: 'up'
                }}
              />
            )}
          </DialogContent>
        </Dialog> */}
      </div>
    </DashboardLayout>
  );
}