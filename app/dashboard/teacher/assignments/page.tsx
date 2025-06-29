'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  Calendar,
  Users,
  Download
} from 'lucide-react';

export default function TeacherAssignments() {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    sections: [],
    dueDate: '',
    file: null,
    type: 'assignment' // assignment or test
  });

  const assignments = [
    {
      id: 1,
      title: 'Data Structures Assignment 1',
      subject: 'CS301',
      sections: ['A', 'B'],
      dueDate: '2025-01-20',
      uploadDate: '2025-01-10',
      submissions: 45,
      totalStudents: 52,
      type: 'assignment'
    },
    {
      id: 2,
      title: 'Database Design Project',
      subject: 'CS302',
      sections: ['A'],
      dueDate: '2025-01-25',
      uploadDate: '2025-01-12',
      submissions: 23,
      totalStudents: 26,
      type: 'assignment'
    },
    {
      id: 3,
      title: 'Surprise Test - Arrays',
      subject: 'CS301',
      sections: ['B'],
      dueDate: '2025-01-15',
      uploadDate: '2025-01-14',
      submissions: 24,
      totalStudents: 26,
      type: 'test'
    }
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSectionToggle = (section: string) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.includes(section)
        ? prev.sections.filter(s => s !== section)
        : [...prev.sections, section]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Assignment data:', formData);
    // Here you'll call the API to upload assignment
    setShowUploadForm(false);
    setFormData({
      title: '',
      description: '',
      subject: '',
      sections: [],
      dueDate: '',
      file: null,
      type: 'assignment'
    });
  };

  return (
    <DashboardLayout role="teacher">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assignments & Tests</h1>
            <p className="text-gray-600">Manage assignments and surprise tests for your sections</p>
          </div>
          <Button 
            onClick={() => setShowUploadForm(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload New
          </Button>
        </div>

        {/* Upload Form Modal */}
        {showUploadForm && (
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="w-5 h-5" />
                <span>Upload Assignment/Test</span>
              </CardTitle>
              <CardDescription>Create a new assignment or test for your students</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="assignment">Assignment</SelectItem>
                        <SelectItem value="test">Surprise Test</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Select value={formData.subject} onValueChange={(value) => handleInputChange('subject', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CS301">Data Structures (CS301)</SelectItem>
                        <SelectItem value="CS302">Database Management (CS302)</SelectItem>
                        <SelectItem value="CS303">Web Development (CS303)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter assignment/test title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Instructions</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide detailed instructions for students..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Select Sections</Label>
                  <div className="flex space-x-4">
                    {['A', 'B', 'C'].map((section) => (
                      <label key={section} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.sections.includes(section)}
                          onChange={() => handleSectionToggle(section)}
                          className="rounded border-gray-300"
                        />
                        <span>Section {section}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">Upload File (PDF/DOC)</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleInputChange('file', e.target.files?.[0])}
                    className="cursor-pointer"
                  />
                </div>

                <div className="flex space-x-4">
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload {formData.type === 'assignment' ? 'Assignment' : 'Test'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowUploadForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Assignments List */}
        <div className="grid gap-6">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{assignment.title}</h3>
                      <Badge variant={assignment.type === 'assignment' ? 'default' : 'secondary'}>
                        {assignment.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{assignment.subject}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Sections</p>
                        <p className="font-medium">{assignment.sections.join(', ')}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Due Date</p>
                        <p className="font-medium">{assignment.dueDate}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Submissions</p>
                        <p className="font-medium text-green-600">
                          {assignment.submissions}/{assignment.totalStudents}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Upload Date</p>
                        <p className="font-medium">{assignment.uploadDate}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}