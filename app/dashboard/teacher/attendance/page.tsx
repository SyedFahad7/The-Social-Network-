'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Calendar, 
  Check, 
  X, 
  Save,
  Search,
  Filter,
  Download
} from 'lucide-react';

export default function TeacherAttendance() {
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendance, setAttendance] = useState<{[key: number]: boolean}>({});

  const sections = [
    { id: 'section-a', name: 'Section A', subject: 'Data Structures (CS301)', students: 52 },
    { id: 'section-b', name: 'Section B', subject: 'Database Management (CS302)', students: 48 },
    { id: 'section-c', name: 'Section C', subject: 'Web Development (CS303)', students: 56 }
  ];

  const students = [
    { id: 1, name: 'John Doe', rollNumber: 'CS2021001', email: 'john@student.edu' },
    { id: 2, name: 'Jane Smith', rollNumber: 'CS2021002', email: 'jane@student.edu' },
    { id: 3, name: 'Mike Johnson', rollNumber: 'CS2021003', email: 'mike@student.edu' },
    { id: 4, name: 'Sarah Wilson', rollNumber: 'CS2021004', email: 'sarah@student.edu' },
    { id: 5, name: 'David Brown', rollNumber: 'CS2021005', email: 'david@student.edu' },
    { id: 6, name: 'Emily Davis', rollNumber: 'CS2021006', email: 'emily@student.edu' },
    { id: 7, name: 'Chris Miller', rollNumber: 'CS2021007', email: 'chris@student.edu' },
    { id: 8, name: 'Lisa Anderson', rollNumber: 'CS2021008', email: 'lisa@student.edu' },
  ];

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAttendanceToggle = (studentId: number) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const handleMarkAllPresent = () => {
    const allPresent = {};
    filteredStudents.forEach(student => {
      allPresent[student.id] = true;
    });
    setAttendance(allPresent);
  };

  const handleMarkAllAbsent = () => {
    const allAbsent = {};
    filteredStudents.forEach(student => {
      allAbsent[student.id] = false;
    });
    setAttendance(allAbsent);
  };

  const handleSaveAttendance = () => {
    console.log('Saving attendance:', {
      section: selectedSection,
      date: selectedDate,
      attendance: attendance
    });
    // Here you'll call the API to save attendance
    alert('Attendance saved successfully!');
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const totalCount = filteredStudents.length;

  return (
    <DashboardLayout role="teacher">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
          <p className="text-gray-600">Record student attendance for your classes</p>
        </div>

        {/* Section Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Select Section & Date</span>
            </CardTitle>
            <CardDescription>Choose the section and date for attendance marking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Section</label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.name} - {section.subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedSection && (
          <>
            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  {presentCount}/{totalCount} Present
                </Badge>
              </div>
              
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleMarkAllPresent}>
                  <Check className="w-4 h-4 mr-2" />
                  All Present
                </Button>
                <Button variant="outline" onClick={handleMarkAllAbsent}>
                  <X className="w-4 h-4 mr-2" />
                  All Absent
                </Button>
                <Button onClick={handleSaveAttendance} className="bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save Attendance
                </Button>
              </div>
            </div>

            {/* Attendance List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Student Attendance</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {sections.find(s => s.id === selectedSection)?.name} - {selectedDate}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                        attendance[student.id] 
                          ? 'bg-green-50 border-green-200' 
                          : attendance[student.id] === false 
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {student.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-500">{student.rollNumber}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant={attendance[student.id] ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setAttendance(prev => ({ ...prev, [student.id]: true }));
                          }}
                          className={attendance[student.id] ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Present
                        </Button>
                        <Button
                          variant={attendance[student.id] === false ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => {
                            setAttendance(prev => ({ ...prev, [student.id]: false }));
                          }}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Absent
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}