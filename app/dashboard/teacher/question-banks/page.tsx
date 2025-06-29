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
  BookOpen, 
  Upload, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  Download,
  FileText
} from 'lucide-react';

export default function TeacherQuestionBanks() {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    sections: [],
    description: '',
    file: null,
    type: 'midterm' // midterm, final, practice
  });

  const questionBanks = [
    {
      id: 1,
      title: 'Data Structures Midterm Question Bank',
      subject: 'CS301',
      sections: ['A', 'B'],
      uploadDate: '2025-01-10',
      downloads: 45,
      type: 'midterm',
      fileSize: '2.4 MB'
    },
    {
      id: 2,
      title: 'Database Final Exam Questions',
      subject: 'CS302',
      sections: ['A'],
      uploadDate: '2025-01-08',
      downloads: 23,
      type: 'final',
      fileSize: '3.1 MB'
    },
    {
      id: 3,
      title: 'Web Development Practice Questions',
      subject: 'CS303',
      sections: ['C'],
      uploadDate: '2025-01-12',
      downloads: 34,
      type: 'practice',
      fileSize: '1.8 MB'
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
    console.log('Question bank data:', formData);
    // Here you'll call the API to upload question bank
    setShowUploadForm(false);
    setFormData({
      title: '',
      subject: '',
      sections: [],
      description: '',
      file: null,
      type: 'midterm'
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'midterm': return 'bg-blue-100 text-blue-800';
      case 'final': return 'bg-red-100 text-red-800';
      case 'practice': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout role="teacher">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Question Banks</h1>
            <p className="text-gray-600">Upload and manage question banks for your subjects</p>
          </div>
          <Button 
            onClick={() => setShowUploadForm(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload Question Bank
          </Button>
        </div>

        {/* Upload Form */}
        {showUploadForm && (
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="w-5 h-5" />
                <span>Upload Question Bank</span>
              </CardTitle>
              <CardDescription>Upload question banks for your students to practice</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="type">Question Bank Type</Label>
                    <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="midterm">Midterm Exam</SelectItem>
                        <SelectItem value="final">Final Exam</SelectItem>
                        <SelectItem value="practice">Practice Questions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter question bank title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide description and instructions..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
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
                  <Label htmlFor="file">Upload File (PDF/DOC)</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleInputChange('file', e.target.files?.[0])}
                    className="cursor-pointer"
                    required
                  />
                </div>

                <div className="flex space-x-4">
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Question Bank
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

        {/* Question Banks List */}
        <div className="grid gap-6">
          {questionBanks.map((bank) => (
            <Card key={bank.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{bank.title}</h3>
                      <Badge className={getTypeColor(bank.type)}>
                        {bank.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{bank.subject}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Sections</p>
                        <p className="font-medium">{bank.sections.join(', ')}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Upload Date</p>
                        <p className="font-medium">{bank.uploadDate}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Downloads</p>
                        <p className="font-medium text-blue-600">{bank.downloads}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">File Size</p>
                        <p className="font-medium">{bank.fileSize}</p>
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{questionBanks.length}</p>
              <p className="text-sm text-gray-600">Total Question Banks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Download className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {questionBanks.reduce((sum, bank) => sum + bank.downloads, 0)}
              </p>
              <p className="text-sm text-gray-600">Total Downloads</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <BookOpen className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">3</p>
              <p className="text-sm text-gray-600">Subjects Covered</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}