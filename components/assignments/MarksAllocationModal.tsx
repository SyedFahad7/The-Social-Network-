"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ScrollArea,
  ScrollBar,
} from "@/components/ui/scroll-area";
import { 
  Save, 
  X, 
  Users, 
  Award, 
  BookOpen,
  Calendar,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Assignment {
  _id: string;
  title: string;
  type: string;
  assignmentNumber: number;
  subject: any;
  subjectCode?: string;
  sections: string[];
  year: number;
  semester: number;
  assignedDate: string;
  dueDate: string;
  createdAt: string;
  fileUrl?: string;
  fileName?: string;
  instructions?: string;
  academicYear?: string;
  department?: string;
}

interface Student {
  _id: string;
  rollNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  section: string;
  year: number;
  semester: number;
}

interface StudentMark {
  studentId: string;
  rollNumber: string;
  studentName: string;
  marks: number | null;
}

interface MarksAllocationModalProps {
  assignment: Assignment;
  isOpen: boolean;
  onClose: () => void;
  onMarksSaved: () => void;
}

export default function MarksAllocationModal({
  assignment,
  isOpen,
  onClose,
  onMarksSaved,
}: MarksAllocationModalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentMarks, setStudentMarks] = useState<StudentMark[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && assignment) {
      fetchStudentsAndMarks();
    }
  }, [isOpen, assignment]);

  const fetchStudentsAndMarks = async () => {
    try {
      setLoading(true);
      setLoadingMarks(true);
      
      // First fetch students
      const studentsResponse = await apiClient.getStudentsBySection({
        section: assignment.sections[0],
        year: assignment.year,
        semester: assignment.semester,
      });

      if (studentsResponse?.success) {
        const studentsData = studentsResponse.data.users;
        setStudents(studentsData);
        
        const initialMarks: StudentMark[] = studentsData.map((student: Student) => ({
          studentId: student._id,
          rollNumber: student.rollNumber,
          studentName: `${student.firstName} ${student.lastName}`,
          marks: null,
        }));
        setStudentMarks(initialMarks);
        
        // Then fetch existing marks
        try {
          const marksResponse = await apiClient.getAssignmentMarks(assignment._id);
          if (marksResponse?.success && marksResponse.data.marks) {
            setStudentMarks(prev => 
              prev.map(student => {
                const existingMark = marksResponse.data.marks.find(
                  (mark: any) => mark.studentId === student.studentId
                );
                return {
                  ...student,
                  marks: existingMark ? existingMark.marks : null,
                };
              })
            );
          }
        } catch (marksError) {
          console.error("Error fetching existing marks:", marksError);
        }
      } else {
        throw new Error(studentsResponse?.message || "Failed to fetch students");
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      toast({
        title: "Error",
        description: "Failed to fetch students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingMarks(false);
    }
  };



  const handleMarkChange = (studentId: string, value: string) => {
    const numericValue = value === "" ? null : parseInt(value);
    
    if (numericValue !== null && (numericValue < 0 || numericValue > 10)) {
      toast({
        title: "Invalid Marks",
        description: "Marks must be between 0 and 10",
        variant: "destructive",
      });
      return;
    }

    setStudentMarks(prev =>
      prev.map(student =>
        student.studentId === studentId
          ? { ...student, marks: numericValue }
          : student
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const marksData = {
        assignmentId: assignment._id,
        studentMarks: studentMarks.map(student => ({
          studentId: student.studentId,
          marks: student.marks,
        })),
      };

      const response = await apiClient.saveAssignmentMarks(marksData);
      
      if (response?.success) {
        setHasChanges(false);
        onMarksSaved();
      } else {
        throw new Error(response?.message || "Failed to save marks");
      }
    } catch (error) {
      console.error("Error saving marks:", error);
      toast({
        title: "Error",
        description: "Failed to save marks",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardDialog(true);
    } else {
      onClose();
    }
  };

  const handleDiscardChanges = () => {
    setHasChanges(false);
    setShowDiscardDialog(false);
    onClose();
  };

  const getSubjectName = (assignment: Assignment) => {
    if (assignment.subject && typeof assignment.subject === 'object' && assignment.subject.name) {
      return assignment.subject.name;
    }
    return assignment.subjectCode || assignment.subject || 'Unknown Subject';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const submittedCount = studentMarks.filter(student => student.marks !== null).length;
  const totalStudents = students.length;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-7xl w-[98vw] h-[95vh] p-0 flex flex-col">
          {/* Header with Title and Action Buttons */}
          <div className="flex-shrink-0 flex items-center justify-between p-6 border-b">
            <DialogTitle className="flex items-center space-x-2">
              <Award className="w-5 h-5" />
              <span className="text-lg">Allocate Marks - {assignment.title}</span>
            </DialogTitle>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {hasChanges && (
                <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400 mr-4">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">Unsaved changes</span>
                </div>
              )}
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={saving}
                size="sm"
              >
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                size="sm"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Marks
              </Button>
            </div>
          </div>

          {/* Assignment Details */}
          <div className="flex-shrink-0 p-6 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm bg-muted/50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">Subject</p>
                  <p className="font-medium truncate">{getSubjectName(assignment)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">Section</p>
                  <p className="font-medium">{assignment.sections.join(", ")}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">Year & Semester</p>
                  <p className="font-medium">Year {assignment.year} • Sem {assignment.semester}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">Due Date</p>
                  <p className="font-medium">{formatDate(assignment.dueDate)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Summary */}
          <div className="flex-shrink-0 px-6 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Total Students: {totalStudents}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Marks Allocated: {submittedCount}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Pending: {totalStudents - submittedCount}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Marks Range: 0-10
              </div>
            </div>
          </div>

          {/* Students Table - Scrollable Area */}
          <div className="flex-1 min-h-0 px-6 pb-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  <p className="text-muted-foreground">Loading students...</p>
                </div>
              </div>
            ) : loadingMarks ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  <p className="text-muted-foreground text-sm">Loading existing marks...</p>
                </div>
              </div>
            ) : (
              <div className="h-full border rounded-lg overflow-hidden">
                <ScrollArea className="h-full w-full">
                  <div className="min-w-full">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="w-16 text-xs font-medium">S.No.</TableHead>
                          <TableHead className="text-xs font-medium">Roll Number</TableHead>
                          <TableHead className="text-xs font-medium">Student Name</TableHead>
                          <TableHead className="w-32 text-xs font-medium">Marks (0-10)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentMarks.map((student, index) => (
                          <TableRow key={student.studentId}>
                            <TableCell className="font-medium text-xs">
                              {index + 1}
                            </TableCell>
                            <TableCell className="text-xs">{student.rollNumber}</TableCell>
                            <TableCell className="text-xs">{student.studentName}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max="10"
                                value={student.marks ?? ""}
                                onChange={(e) => handleMarkChange(student.studentId, e.target.value)}
                                className="w-20 h-8 text-xs"
                                placeholder="0-10"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <ScrollBar />
                </ScrollArea>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Discard Changes Dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close without saving?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardChanges}>
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 