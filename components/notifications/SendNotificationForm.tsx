'use client';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Bell, Send, Users, GraduationCap, UserCheck, AlertCircle, CheckCircle } from 'lucide-react';
import apiClient from '@/lib/api';

interface SendNotificationFormProps {
  userRole: string;
  userDepartment?: string;
}

export default function SendNotificationForm({ userRole, userDepartment }: SendNotificationFormProps) {
  // All state declarations at the top
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [priority, setPriority] = useState('normal');
  const [enablePush, setEnablePush] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [availableTargets, setAvailableTargets] = useState<any[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [sections, setSections] = useState<string[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  
  // Available targets based on user role
  // const [availableTargets, setAvailableTargets] = useState<any[]>([]);
  // const [loadingTargets, setLoadingTargets] = useState(false);

  // New: Year and Section state for super-admin targeting
  // const [selectedYear, setSelectedYear] = useState<string>('');
  // const [selectedSection, setSelectedSection] = useState<string>('');
  // const [sections, setSections] = useState<string[]>(['A', 'B', 'C', 'D']); // You can fetch from backend if dynamic

  // New: Compute recipient preview
  const recipientPreview = useMemo(() => {
    if (targetType === 'all_students') return 'All Students';
    if (targetType === 'all_teachers') return 'All Teachers';
    if (targetType === 'specific_year' && selectedYear) return `Year ${selectedYear} Students`;
    if (targetType === 'specific_section' && selectedYear && selectedSection && selectedAcademicYear) {
      const ay = academicYears.find((ay: any) => String(ay._id) === String(selectedAcademicYear));
      return `Year ${selectedYear} Section ${selectedSection} (${ay?.yearLabel || ay?.name || selectedAcademicYear})`;
    }
    return 'Select recipients...';
  }, [targetType, selectedYear, selectedSection, selectedAcademicYear, academicYears]);

  // Update targetValue when year/section/academicYear changes
  useEffect(() => {
    if (targetType === 'specific_year' && selectedYear) {
      setTargetValue(selectedYear);
    } else if (targetType === 'specific_section' && selectedYear && selectedSection && selectedAcademicYear) {
      setTargetValue(`${selectedYear}-${selectedSection}-${selectedAcademicYear}`);
    }
  }, [targetType, selectedYear, selectedSection, selectedAcademicYear]);

  useEffect(() => {
    loadAvailableTargets();
  }, [userRole, userDepartment]);

  const loadAvailableTargets = async () => {
    setLoadingTargets(true);
    try {
      const targets = [];

      // Add basic targets
      targets.push({ value: 'all_students', label: 'All Students', icon: GraduationCap });
      targets.push({ value: 'all_teachers', label: 'All Teachers', icon: UserCheck });

      // Add HoD option for teachers
      if (userRole === 'teacher') {
        targets.push({ value: 'hod', label: 'Head of Department (HoD/Super Admin)', icon: Users });
      }

      // Add year-specific targets for students
      for (let year = 2; year <= 4; year++) {
        targets.push({ 
          value: `specific_year:${year}`, 
          label: `Year ${year} Students`, 
          icon: GraduationCap 
        });
      }

      // Add section-specific targets (if teacher has access to specific sections)
      if (userRole === 'teacher' && userDepartment) {
        // You can fetch teacher's assigned sections here
        const sections = ['A', 'B', 'C'];
        const years = [2, 3, 4];
        
        for (const year of years) {
          for (const section of sections) {
            targets.push({
              value: `specific_section:${year}-${section}`,
              label: `Year ${year} Section ${section}`,
              icon: GraduationCap
            });
          }
        }
      }

      setAvailableTargets(targets);
    } catch (error) {
      console.error('Error loading targets:', error);
    } finally {
      setLoadingTargets(false);
    }
  };

  // Handle target type change and set appropriate target value
  const handleTargetTypeChange = (newTargetType: string) => {
    setTargetType(newTargetType);
    
    // Set appropriate target value based on target type
    if (newTargetType === 'all_students' || newTargetType === 'all_teachers') {
      setTargetValue('all'); // Use 'all' as the value for these types
    } else if (newTargetType === 'hod') {
      setTargetValue('hod');
    } else if (newTargetType.startsWith('specific_year:')) {
      const year = newTargetType.split(':')[1];
      setTargetValue(year);
    } else if (newTargetType.startsWith('specific_section:')) {
      const sectionInfo = newTargetType.split(':')[1];
      setTargetValue(sectionInfo);
    } else {
      setTargetValue('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (!targetValue) {
      setError('Please select target recipients');
      return;
    }

    if (targetType === 'specific_section' && (!selectedYear || !selectedSection || !selectedAcademicYear)) {
      setError('Please select year, section, and academic year for specific section notifications');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Map targetType to backend expected format
      let backendTargetType = targetType;
      let backendTargetValue = targetValue;

      if (targetType === 'all_students') {
        backendTargetType = 'all_students';
        backendTargetValue = 'all';
      } else if (targetType === 'all_teachers') {
        backendTargetType = 'all_teachers';
        backendTargetValue = 'all';
      } else if (targetType === 'hod') {
        backendTargetType = 'hod';
        backendTargetValue = 'hod';
      } else if (targetType.startsWith('specific_year:')) {
        backendTargetType = 'specific_year';
        backendTargetValue = targetType.split(':')[1];
      } else if (targetType.startsWith('specific_section:')) {
        backendTargetType = 'specific_section';
        backendTargetValue = targetType.split(':')[1];
      }

      const notificationData = {
        title: title.trim(),
        message: message.trim(),
        targetType: backendTargetType,
        targetValue: backendTargetValue,
        priority,
        metadata: {
          enablePush,
          sentAt: new Date().toISOString()
        }
      };

      const response = await apiClient.sendNotification(notificationData);
      
      setSuccess(`Notification sent successfully to ${response.data?.recipientCount || 0} recipients!`);
      
      // Reset form
      setTitle('');
      setMessage('');
      setTargetType('');
      setTargetValue('');
      setPriority('normal');
      
    } catch (error: any) {
      setError(error.message || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getTargetIcon = (targetType: string) => {
    if (targetType.includes('students')) return GraduationCap;
    if (targetType.includes('teachers')) return UserCheck;
    return Users;
  };

  // Add department extraction helper
  function extractDepartmentId(dept: any): string | undefined {
    if (!dept) return undefined;
    if (typeof dept === 'string') return dept;
    if (typeof dept === 'object') {
      if (dept._id) return dept._id;
      if (dept.$oid) return dept.$oid;
    }
    return undefined;
  }

  // Replace static sections with dynamic loading
  // const [allStudents, setAllStudents] = useState<any[]>([]);

  // Fetch students for selected year/department
  useEffect(() => {
    async function fetchSections() {
      setSections([]);
      setSelectedSection('');
      if (!selectedYear) return;
      const departmentId = extractDepartmentId(userDepartment);
      if (!departmentId) return;
      try {
        const res = await apiClient.getUsers({
          role: 'student',
          department: departmentId,
          year: selectedYear,
          limit: 1000
        });
        let studentsArr = [];
        if (res.data?.data?.users) studentsArr = res.data.data.users;
        else if (res.data?.users) studentsArr = res.data.users;
        else if (Array.isArray(res.data)) studentsArr = res.data;
        else studentsArr = [];
        setAllStudents(studentsArr);
        // Extract unique sections
        const uniqueSections = Array.from(new Set(studentsArr.map((s: any) => s.section))).filter(Boolean) as string[];
        setSections(uniqueSections);
        // Reset section if not in new list
        if (!uniqueSections.includes(selectedSection)) setSelectedSection('');
      } catch (err) {
        setSections([]);
        setAllStudents([]);
        setSelectedSection('');
      }
    }
    if (targetType === 'specific_section' && selectedYear && userDepartment) {
      fetchSections();
    } else if (targetType === 'specific_year') {
      setSections([]);
      setSelectedSection('');
    }
  }, [selectedYear, userDepartment, targetType]);

  // const [academicYears, setAcademicYears] = useState<any[]>([]);
  // const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');

  // Fetch academic years on mount
  useEffect(() => {
    async function fetchAcademicYears() {
      try {
        const res = await apiClient.getAcademicYears();
        if (res.data?.academicYears) setAcademicYears(res.data.academicYears);
        else if (res.data) setAcademicYears(res.data);
        else setAcademicYears([]);
      } catch {
        setAcademicYears([]);
      }
    }
    fetchAcademicYears();
  }, []);

  // When targetType changes, clear error if it was about recipients
  useEffect(() => {
    if (error === 'Please select target recipients' && targetType) {
      setError(null);
    }
  }, [targetType]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Send Notification
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title"
              maxLength={100}
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium mb-2">Message *</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter notification message"
              rows={4}
              maxLength={500}
              required
            />
          </div>

          {/* Target Type & Filters */}
          <div>
            <label className="block text-sm font-medium mb-2">Target Recipients *</label>
            <Select value={targetType || ''} onValueChange={v => {
              setTargetType(v);
              setSelectedYear('');
              setSelectedSection('');
              setSelectedAcademicYear('');
              if (v === 'all_students' || v === 'all_teachers') {
                setTargetValue('all');
              } else if (v === 'hod') {
                setTargetValue('hod');
              } else {
                setTargetValue('');
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select target recipients" />
              </SelectTrigger>
              <SelectContent side="bottom">
                <SelectGroup>
                  <SelectLabel>General</SelectLabel>
                  <SelectItem value="all_students">All Students</SelectItem>
                  <SelectItem value="all_teachers">All Teachers</SelectItem>
                  {userRole === 'teacher' && <SelectItem value="hod">Head of Department (HoD/Super Admin)</SelectItem>}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>By Year</SelectLabel>
                  <SelectItem value="specific_year">Specific Year</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>By Section</SelectLabel>
                  <SelectItem value="specific_section">Specific Section</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {/* Year Dropdown (for year/section) */}
            {(targetType === 'specific_year' || targetType === 'specific_section') && (
              <div className="mt-2">
                <Select value={selectedYear} onValueChange={v => { setSelectedYear(v); setSelectedSection(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent side="bottom">
                    <SelectItem value="2">2nd Year</SelectItem>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Academic Year Dropdown (for section) */}
            {targetType === 'specific_section' && selectedYear && (
              <div className="mt-2">
                <Select value={selectedAcademicYear} onValueChange={v => { setSelectedAcademicYear(v); setSelectedSection(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select academic year" />
                  </SelectTrigger>
                  <SelectContent side="bottom">
                    {academicYears.map((ay: any) => (
                      <SelectItem key={ay._id} value={ay._id}>{ay.yearLabel || ay.name || ay._id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Section Dropdown (for section) */}
            {targetType === 'specific_section' && selectedYear && selectedAcademicYear && sections.length > 0 && (
              <div className="mt-2">
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent side="bottom">
                    {sections.map(section => (
                      <SelectItem key={section} value={section}>{section}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Recipient Preview */}
            <div className="mt-2 text-xs text-gray-500 italic">{recipientPreview}</div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium mb-2">Priority</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <div className="mt-1">
              <Badge className={getPriorityColor(priority)}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
              </Badge>
            </div>
          </div>

          {/* Push Notifications Toggle */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div>
              <p className="text-sm font-medium">Mobile Push Notifications</p>
              <p className="text-xs text-gray-600">
                Send instant notifications to mobile devices
              </p>
            </div>
            <Switch
              checked={enablePush}
              onCheckedChange={setEnablePush}
            />
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !title.trim() || !message.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Notification
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 