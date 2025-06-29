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
  Calendar, 
  Clock, 
  Plus, 
  Edit, 
  Trash2,
  Save,
  BookOpen
} from 'lucide-react';

export default function TeacherTimetable() {
  const [selectedSection, setSelectedSection] = useState('section-a');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    day: '',
    time: '',
    subject: '',
    room: '',
    type: 'lecture' // lecture, lab, tutorial
  });

  const sections = [
    { id: 'section-a', name: 'Section A' },
    { id: 'section-b', name: 'Section B' },
    { id: 'section-c', name: 'Section C' }
  ];

  const timeSlots = [
    '09:00-10:00',
    '10:00-11:00',
    '11:00-12:00',
    '12:00-13:00',
    '13:00-14:00',
    '14:00-15:00',
    '15:00-16:00',
    '16:00-17:00'
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Mock timetable data
  const [timetable, setTimetable] = useState<{[key: string]: any}>({
    'section-a': {
      'Monday': {
        '09:00-10:00': { subject: 'Data Structures', room: 'CS-101', type: 'lecture' },
        '10:00-11:00': { subject: 'Data Structures Lab', room: 'CS-Lab1', type: 'lab' },
        '14:00-15:00': { subject: 'Database Management', room: 'CS-102', type: 'lecture' },
      },
      'Tuesday': {
        '09:00-10:00': { subject: 'Web Development', room: 'CS-103', type: 'lecture' },
        '11:00-12:00': { subject: 'Database Management', room: 'CS-102', type: 'lecture' },
      },
      'Wednesday': {
        '10:00-11:00': { subject: 'Data Structures', room: 'CS-101', type: 'lecture' },
        '15:00-16:00': { subject: 'Web Development Lab', room: 'CS-Lab2', type: 'lab' },
      },
      'Thursday': {
        '09:00-10:00': { subject: 'Database Management', room: 'CS-102', type: 'lecture' },
        '14:00-15:00': { subject: 'Data Structures', room: 'CS-101', type: 'tutorial' },
      },
      'Friday': {
        '10:00-11:00': { subject: 'Web Development', room: 'CS-103', type: 'lecture' },
        '11:00-12:00': { subject: 'Database Lab', room: 'CS-Lab1', type: 'lab' },
      }
    }
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const slotKey = `${formData.day}-${formData.time}`;
    
    setTimetable(prev => ({
      ...prev,
      [selectedSection]: {
        ...prev[selectedSection],
        [formData.day]: {
          ...prev[selectedSection]?.[formData.day],
          [formData.time]: {
            subject: formData.subject,
            room: formData.room,
            type: formData.type
          }
        }
      }
    }));

    setShowAddForm(false);
    setFormData({ day: '', time: '', subject: '', room: '', type: 'lecture' });
  };

  const handleDeleteSlot = (day: string, time: string) => {
    setTimetable(prev => {
      const newTimetable = { ...prev };
      if (newTimetable[selectedSection]?.[day]) {
        delete newTimetable[selectedSection][day][time];
      }
      return newTimetable;
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lecture': return 'bg-blue-100 text-blue-800';
      case 'lab': return 'bg-green-100 text-green-800';
      case 'tutorial': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const currentTimetable = timetable[selectedSection] || {};

  return (
    <DashboardLayout role="teacher">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Timetable Management</h1>
            <p className="text-gray-600">Update and manage class schedules for your sections</p>
          </div>
          <Button 
            onClick={() => setShowAddForm(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Class
          </Button>
        </div>

        {/* Section Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Section</CardTitle>
            <CardDescription>Choose the section to view and edit timetable</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Add Class Form */}
        {showAddForm && (
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>Add New Class</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddSlot} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="day">Day</Label>
                    <Select value={formData.day} onValueChange={(value) => handleInputChange('day', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {days.map((day) => (
                          <SelectItem key={day} value={day}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time Slot</Label>
                    <Select value={formData.time} onValueChange={(value) => handleInputChange('time', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Enter subject name"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room">Room</Label>
                    <Input
                      id="room"
                      placeholder="Enter room number"
                      value={formData.room}
                      onChange={(e) => handleInputChange('room', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Class Type</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lecture">Lecture</SelectItem>
                      <SelectItem value="lab">Lab</SelectItem>
                      <SelectItem value="tutorial">Tutorial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex space-x-4">
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-2" />
                    Add Class
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Timetable Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Weekly Timetable - {sections.find(s => s.id === selectedSection)?.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-3 bg-gray-50 text-left font-medium text-gray-700">
                      Time
                    </th>
                    {days.map((day) => (
                      <th key={day} className="border border-gray-300 p-3 bg-gray-50 text-center font-medium text-gray-700">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((timeSlot) => (
                    <tr key={timeSlot}>
                      <td className="border border-gray-300 p-3 bg-gray-50 font-medium text-sm">
                        {timeSlot}
                      </td>
                      {days.map((day) => {
                        const classData = currentTimetable[day]?.[timeSlot];
                        return (
                          <td key={`${day}-${timeSlot}`} className="border border-gray-300 p-2 h-20 align-top">
                            {classData ? (
                              <div className="bg-blue-50 border border-blue-200 rounded p-2 h-full relative group">
                                <div className="text-xs font-medium text-blue-900 mb-1">
                                  {classData.subject}
                                </div>
                                <div className="text-xs text-blue-700 mb-1">
                                  {classData.room}
                                </div>
                                <Badge className={`text-xs ${getTypeColor(classData.type)}`}>
                                  {classData.type}
                                </Badge>
                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteSlot(day, timeSlot)}
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-gray-400">
                                <span className="text-xs">Free</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-6">
              <span className="text-sm font-medium text-gray-700">Class Types:</span>
              <div className="flex items-center space-x-2">
                <Badge className="bg-blue-100 text-blue-800">Lecture</Badge>
                <Badge className="bg-green-100 text-green-800">Lab</Badge>
                <Badge className="bg-purple-100 text-purple-800">Tutorial</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}