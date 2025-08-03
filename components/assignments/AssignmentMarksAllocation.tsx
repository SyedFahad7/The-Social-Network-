"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Edit, 
  Award, 
  Users, 
  Calendar,
  BookOpen,
  Loader2,
  FileText
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import MarksAllocationModal from "./MarksAllocationModal";

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

interface AssignmentMarks {
  assignmentId: string;
  studentMarks: {
    studentId: string;
    rollNumber: string;
    studentName: string;
    marks: number | null;
  }[];
  totalStudents: number;
  submittedCount: number;
}

interface AssignmentMarksAllocationProps {
  refreshTrigger: number;
}

export default function AssignmentMarksAllocation({ refreshTrigger }: AssignmentMarksAllocationProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeacherAssignments();
  }, [refreshTrigger]);

  const fetchTeacherAssignments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getTeacherAssignmentDocuments();

      if (response?.success) {
        setAssignments(response.data.assignments);
      } else {
        throw new Error(response?.message || "Failed to fetch assignments");
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getSubjectName = (assignment: Assignment) => {
    if (assignment.subject && typeof assignment.subject === 'object' && assignment.subject.name) {
      return assignment.subject.name;
    }
    return assignment.subjectCode || assignment.subject || 'Unknown Subject';
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const subjectName = getSubjectName(assignment);
    const matchesSearch =
      assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subjectName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const handleOpenMarksModal = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAssignment(null);
  };

  const handleMarksSaved = () => {
    toast({
      title: "Success",
      description: "Marks saved successfully",
    });
    handleCloseModal();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Marks Allocation</h2>
        <p className="text-muted-foreground">
          Allocate marks to students for submitted assignments
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search assignments by title or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Assignments List */}
      {filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No assignments found</h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? "Try adjusting your search"
                : "No assignments have been uploaded yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAssignments.map((assignment) => {
            const subjectName = getSubjectName(assignment);

            return (
              <Card
                key={assignment._id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          {assignment.title}
                        </h3>
                        <Badge variant="outline">
                          {assignment.type}
                        </Badge>
                        <Badge variant="secondary">
                          #{assignment.assignmentNumber}
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center space-x-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{subjectName}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>Section {assignment.sections.join(", ")}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Award className="w-4 h-4" />
                          <span>Year {assignment.year} • Sem {assignment.semester}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Assigned Date</p>
                          <p className="font-medium">
                            {formatDate(assignment.assignedDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Due Date</p>
                          <p className="font-medium">
                            {formatDate(assignment.dueDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Upload Date</p>
                          <p className="font-medium">
                            {formatDate(assignment.createdAt)}
                          </p>
                        </div>
                      </div>

                      {assignment.instructions && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            <strong>Instructions:</strong> {assignment.instructions}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenMarksModal(assignment)}
                        title="Allocate Marks"
                        className="flex items-center space-x-2"
                      >
                        <Edit className="w-4 h-4" />
                        <span className="hidden sm:inline">Allocate Marks</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Marks Allocation Modal */}
      {selectedAssignment && (
        <MarksAllocationModal
          assignment={selectedAssignment}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onMarksSaved={handleMarksSaved}
        />
      )}
    </div>
  );
} 