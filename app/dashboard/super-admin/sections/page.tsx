'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2,
  BookOpen,
  Calendar
} from 'lucide-react';

interface Section {
  id: string;
  name: string;
  subject: string;
  code: string;
  teacherId: string;
  teacherName: string;
  maxStudents: number;
  currentStudents: number;
  status: 'active' | 'inactive';
  createdAt: string;
  year: string;
}

export default function SuperAdminSections() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    code: '',
    teacherId: '',
    maxStudents: 50
  });
  const [selectedYear, setSelectedYear] = useState('all');

  // Mock data - replace with API calls
  const [sections, setSections] = useState<Section[]>([
    {
      id: 'section-a',
      name: 'Section A',
      subject: 'Data Structures',
      code: 'CS301',
      teacherId: 'teacher-1',
      teacherName: 'Dr. John Smith',
      maxStudents: 50,
      currentStudents: 52,
      status: 'active',
      createdAt: '2025-01-01',
      year: '2'
    },
    {
      id: 'section-b',
      name: 'Section B',
      subject: 'Database Management',
      code: 'CS302',
      teacherId: 'teacher-2',
      teacherName: 'Prof. Sarah Wilson',
      maxStudents: 50,
      currentStudents: 48,
      status: 'active',
      createdAt: '2025-01-02',
      year: '2'
    },
    {
      id: 'section-c',
      name: 'Section C',
      subject: 'Web Development',
      code: 'CS303',
      teacherId: 'teacher-3',
      teacherName: 'Dr. Mike Johnson',
      maxStudents: 50,
      currentStudents: 56,
      status: 'active',
      createdAt: '2025-01-03',
      year: '2'
    }
  ]);

  const teachers = [
    { id: 'teacher-1', name: 'Dr. John Smith', subject: 'Data Structures' },
    { id: 'teacher-2', name: 'Prof. Sarah Wilson', subject: 'Database Management' },
    { id: 'teacher-3', name: 'Dr. Mike Johnson', subject: 'Web Development' },
    { id: 'teacher-4', name: 'Prof. Emily Davis', subject: 'Software Engineering' },
  ];

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSection) {
      // Update existing section
      setSections(prev => prev.map(section => 
        section.id === editingSection.id 
          ? { ...section, ...formData, year: selectedYear, teacherName: teachers.find(t => t.id === formData.teacherId)?.name || '' }
          : section
      ));
      setEditingSection(null);
    } else {
      // Create new section
      const newSection: Section = {
        id: `section-${Date.now()}`,
        name: formData.name,
        subject: formData.subject,
        code: formData.code,
        teacherId: formData.teacherId,
        teacherName: teachers.find(t => t.id === formData.teacherId)?.name || '',
        maxStudents: formData.maxStudents,
        currentStudents: 0,
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0],
        year: selectedYear
      };
      setSections(prev => [...prev, newSection]);
    }

    setShowCreateForm(false);
    setFormData({ name: '', subject: '', code: '', teacherId: '', maxStudents: 50 });
    setSelectedYear('all');
  };

  const handleEdit = (section: Section) => {
    setEditingSection(section);
    setFormData({
      name: section.name,
      subject: section.subject,
      code: section.code,
      teacherId: section.teacherId,
      maxStudents: section.maxStudents
    });
    setShowCreateForm(true);
  };

  const handleDelete = (sectionId: string) => {
    if (confirm('Are you sure you want to delete this section?')) {
      setSections(prev => prev.filter(section => section.id !== sectionId));
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const filteredSections = selectedYear && selectedYear !== "all"
    ? sections.filter(s => s.year === selectedYear)
    : sections;

  return (
    <DashboardLayout role="super-admin">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sections Management</h1>
            <p className="text-gray-600">Create and manage academic sections</p>
          </div>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Section
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

        {/* Create/Edit Form */}
        {showCreateForm && (
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>{editingSection ? 'Edit Section' : 'Create New Section'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2nd Year</SelectItem>
                        <SelectItem value="3">3rd Year</SelectItem>
                        <SelectItem value="4">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Section Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Section A"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Subject Code</Label>
                    <Input
                      id="code"
                      placeholder="e.g., CS301"
                      value={formData.code}
                      onChange={(e) => handleInputChange('code', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="e.g., Data Structures"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teacherId">Assigned Teacher</Label>
                    <Select value={formData.teacherId} onValueChange={(value) => handleInputChange('teacherId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.name} - {teacher.subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxStudents">Maximum Students</Label>
                  <Input
                    id="maxStudents"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.maxStudents}
                    onChange={(e) => handleInputChange('maxStudents', parseInt(e.target.value))}
                    required
                  />
                </div>

                <div className="flex space-x-4">
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    {editingSection ? 'Update Section' : 'Create Section'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingSection(null);
                      setFormData({ name: '', subject: '', code: '', teacherId: '', maxStudents: 50 });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Sections List */}
        <div className="grid gap-6">
          {filteredSections.map((section) => (
            <Card key={section.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{section.name}</h3>
                        <p className="text-sm text-gray-600">{section.subject} ({section.code})</p>
                      </div>
                      <Badge className={getStatusColor(section.status)}>
                        {section.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Teacher</p>
                        <p className="font-medium">{section.teacherName}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Students</p>
                        <p className="font-medium">{section.currentStudents}/{section.maxStudents}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Created</p>
                        <p className="font-medium">{section.createdAt}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Capacity</p>
                        <p className="font-medium">{Math.round((section.currentStudents / section.maxStudents) * 100)}%</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEdit(section)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(section.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{sections.length}</p>
              <p className="text-sm text-gray-600">Total Sections</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <BookOpen className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {sections.reduce((sum, section) => sum + section.currentStudents, 0)}
              </p>
              <p className="text-sm text-gray-600">Total Students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {sections.filter(s => s.status === 'active').length}
              </p>
              <p className="text-sm text-gray-600">Active Sections</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {teachers.length}
              </p>
              <p className="text-sm text-gray-600">Available Teachers</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
} 