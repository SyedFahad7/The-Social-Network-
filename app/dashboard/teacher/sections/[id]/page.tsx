'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  ArrowLeft, 
  Search,
  Edit,
  Check,
  X,
  Plus,
  FileText,
  Award
} from 'lucide-react';

export default function SectionDetails() {
  const params = useParams();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingGrades, setEditingGrades] = useState<{[key: string]: boolean}>({});

  // Mock data - replace with API calls
  const sectionData = {
    'section-a': {
      name: 'Section A',
      subject: 'Data Structures',
      code: 'CS301',
      students: [
        { id: 1, name: 'John Doe', rollNumber: 'CS2021001', email: 'john@student.edu', attendance: '92%' },
        { id: 2, name: 'Jane Smith', rollNumber: 'CS2021002', email: 'jane@student.edu', attendance: '88%' },
        { id: 3, name: 'Mike Johnson', rollNumber: 'CS2021003', email: 'mike@student.edu', attendance: '95%' },
        { id: 4, name: 'Sarah Wilson', rollNumber: 'CS2021004', email: 'sarah@student.edu', attendance: '90%' },
        { id: 5, name: 'David Brown', rollNumber: 'CS2021005', email: 'david@student.edu', attendance: '85%' },
      ]
    }
  };

  const [assignmentGrades, setAssignmentGrades] = useState<{[key: number]: any}>({
    1: { assignment1: 85, assignment2: 90, assignment3: 88, submitted1: true, submitted2: true, submitted3: false },
    2: { assignment1: 92, assignment2: 87, assignment3: 95, submitted1: true, submitted2: true, submitted3: true },
    3: { assignment1: 78, assignment2: 85, assignment3: 82, submitted1: true, submitted2: false, submitted3: true },
    4: { assignment1: 88, assignment2: 92, assignment3: 90, submitted1: true, submitted2: true, submitted3: true },
    5: { assignment1: 75, assignment2: 80, assignment3: 85, submitted1: false, submitted2: true, submitted3: true },
  });

  const [testGrades, setTestGrades] = useState<{[key: number]: any}>({
    1: { test1: 88, test2: 92, test3: 85, attended1: true, attended2: true, attended3: false },
    2: { test1: 95, test2: 90, test3: 88, attended1: true, attended2: true, attended3: true },
    3: { test1: 82, test2: 85, test3: 80, attended1: true, attended2: false, attended3: true },
    4: { test1: 90, test2: 88, test3: 92, attended1: true, attended2: true, attended3: true },
    5: { test1: 78, test2: 82, test3: 88, attended1: false, attended2: true, attended3: true },
  });

  const section = sectionData[params.id as keyof typeof sectionData];
  
  if (!section) {
    return <div>Section not found</div>;
  }

  const filteredStudents = section.students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGradeChange = (studentId: number, field: string, value: number, type: 'assignment' | 'test') => {
    if (type === 'assignment') {
      setAssignmentGrades(prev => ({
        ...prev,
        [studentId]: { ...prev[studentId], [field]: value }
      }));
    } else {
      setTestGrades(prev => ({
        ...prev,
        [studentId]: { ...prev[studentId], [field]: value }
      }));
    }
  };

  const handleSubmissionToggle = (studentId: number, field: string, type: 'assignment' | 'test') => {
    if (type === 'assignment') {
      setAssignmentGrades(prev => ({
        ...prev,
        [studentId]: { ...prev[studentId], [field]: !prev[studentId][field] }
      }));
    } else {
      setTestGrades(prev => ({
        ...prev,
        [studentId]: { ...prev[studentId], [field]: !prev[studentId][field] }
      }));
    }
  };

  return (
    <DashboardLayout role="teacher">
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{section.name}</h1>
            <p className="text-gray-600">{section.subject} ({section.code})</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Badge variant="outline" className="text-green-600 border-green-200">
            {section.students.length} Students
          </Badge>
        </div>

        <Tabs defaultValue="assignments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assignments" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Assignments</span>
            </TabsTrigger>
            <TabsTrigger value="tests" className="flex items-center space-x-2">
              <Award className="w-4 h-4" />
              <span>Surprise Tests</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Assignment Grades & Submissions</span>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Assignment
                  </Button>
                </CardTitle>
                <CardDescription>
                  Track assignment submissions and manage grades for each student
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-gray-600">Student</th>
                        <th className="text-left p-3 font-medium text-gray-600">Roll Number</th>
                        <th className="text-center p-3 font-medium text-gray-600">Assignment 1</th>
                        <th className="text-center p-3 font-medium text-gray-600">Assignment 2</th>
                        <th className="text-center p-3 font-medium text-gray-600">Assignment 3</th>
                        <th className="text-center p-3 font-medium text-gray-600">Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => {
                        const grades = assignmentGrades[student.id];
                        const average = Math.round((grades.assignment1 + grades.assignment2 + grades.assignment3) / 3);
                        
                        return (
                          <tr key={student.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-gray-900">{student.name}</p>
                                <p className="text-xs text-gray-500">{student.email}</p>
                              </div>
                            </td>
                            <td className="p-3 font-mono text-sm">{student.rollNumber}</td>
                            
                            {[1, 2, 3].map((assignmentNum) => (
                              <td key={assignmentNum} className="p-3 text-center">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-center space-x-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={grades[`assignment${assignmentNum}`]}
                                      onChange={(e) => handleGradeChange(
                                        student.id, 
                                        `assignment${assignmentNum}`, 
                                        parseInt(e.target.value) || 0,
                                        'assignment'
                                      )}
                                      className="w-16 text-center"
                                    />
                                    <span className="text-xs text-gray-500">pts</span>
                                  </div>
                                  <div className="flex items-center justify-center">
                                    <button
                                      onClick={() => handleSubmissionToggle(
                                        student.id, 
                                        `submitted${assignmentNum}`,
                                        'assignment'
                                      )}
                                      className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                                        grades[`submitted${assignmentNum}`]
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-red-100 text-red-700'
                                      }`}
                                    >
                                      {grades[`submitted${assignmentNum}`] ? (
                                        <>
                                          <Check className="w-3 h-3" />
                                          <span>Submitted</span>
                                        </>
                                      ) : (
                                        <>
                                          <X className="w-3 h-3" />
                                          <span>Not Submitted</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </td>
                            ))}
                            
                            <td className="p-3 text-center">
                              <span className={`font-bold ${
                                average >= 90 ? 'text-green-600' :
                                average >= 80 ? 'text-blue-600' :
                                average >= 70 ? 'text-orange-600' : 'text-red-600'
                              }`}>
                                {average}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tests">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Surprise Test Grades & Attendance</span>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Test
                  </Button>
                </CardTitle>
                <CardDescription>
                  Track test attendance and manage grades for surprise tests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-gray-600">Student</th>
                        <th className="text-left p-3 font-medium text-gray-600">Roll Number</th>
                        <th className="text-center p-3 font-medium text-gray-600">Test 1</th>
                        <th className="text-center p-3 font-medium text-gray-600">Test 2</th>
                        <th className="text-center p-3 font-medium text-gray-600">Test 3</th>
                        <th className="text-center p-3 font-medium text-gray-600">Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => {
                        const grades = testGrades[student.id];
                        const average = Math.round((grades.test1 + grades.test2 + grades.test3) / 3);
                        
                        return (
                          <tr key={student.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-gray-900">{student.name}</p>
                                <p className="text-xs text-gray-500">{student.email}</p>
                              </div>
                            </td>
                            <td className="p-3 font-mono text-sm">{student.rollNumber}</td>
                            
                            {[1, 2, 3].map((testNum) => (
                              <td key={testNum} className="p-3 text-center">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-center space-x-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={grades[`test${testNum}`]}
                                      onChange={(e) => handleGradeChange(
                                        student.id, 
                                        `test${testNum}`, 
                                        parseInt(e.target.value) || 0,
                                        'test'
                                      )}
                                      className="w-16 text-center"
                                    />
                                    <span className="text-xs text-gray-500">pts</span>
                                  </div>
                                  <div className="flex items-center justify-center">
                                    <button
                                      onClick={() => handleSubmissionToggle(
                                        student.id, 
                                        `attended${testNum}`,
                                        'test'
                                      )}
                                      className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                                        grades[`attended${testNum}`]
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-red-100 text-red-700'
                                      }`}
                                    >
                                      {grades[`attended${testNum}`] ? (
                                        <>
                                          <Check className="w-3 h-3" />
                                          <span>Attended</span>
                                        </>
                                      ) : (
                                        <>
                                          <X className="w-3 h-3" />
                                          <span>Absent</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </td>
                            ))}
                            
                            <td className="p-3 text-center">
                              <span className={`font-bold ${
                                average >= 90 ? 'text-green-600' :
                                average >= 80 ? 'text-blue-600' :
                                average >= 70 ? 'text-orange-600' : 'text-red-600'
                              }`}>
                                {average}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}