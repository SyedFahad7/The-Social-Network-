"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  Calendar,
  Users,
  Clock,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AssignmentListProps {
  refreshTrigger: number;
}

export default function AssignmentList({
  refreshTrigger,
}: AssignmentListProps) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const { toast } = useToast();

  useEffect(() => {
    fetchAssignments();
  }, [refreshTrigger]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getFilteredAssignments();

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

  const handleDelete = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) {
      return;
    }

    try {
      const response = await apiClient.deleteAssignment(assignmentId);

      if (response?.success) {
        toast({
          title: "Assignment Deleted",
          description: "Assignment has been deleted successfully",
          variant: "default",
        });
        fetchAssignments(); // Refresh the list
      } else {
        throw new Error(response?.message || "Failed to delete assignment");
      }
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive",
      });
    }
  };

  const handleDownload = (assignment: any) => {
    if (assignment.fileUrl) {
      window.open(assignment.fileUrl, "_blank");
    } else {
      toast({
        title: "No File Available",
        description: "This assignment doesn't have an uploaded file",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getSubmissionStatus = (assignment: any) => {
    const totalStudents = assignment.submissions?.length || 0;
    const submittedCount =
      assignment.submissions?.filter((sub: any) => sub.hasSubmitted).length ||
      0;
    return { totalStudents, submittedCount };
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch =
      assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.subject.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterType === "all" || assignment.type === filterType;

    return matchesSearch && matchesFilter;
  });

  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    switch (sortBy) {
      case "title":
        return a.title.localeCompare(b.title);
      case "dueDate":
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      case "createdAt":
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-2">Loading assignments...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Assignment List</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search assignments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="assignment">Assignments</SelectItem>
                  <SelectItem value="test">Tests</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Latest First</SelectItem>
                  <SelectItem value="title">Title A-Z</SelectItem>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignments List */}
      {sortedAssignments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No assignments found
            </h3>
            <p className="text-gray-600">
              {searchTerm || filterType !== "all"
                ? "Try adjusting your search or filters"
                : "Upload your first assignment to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedAssignments.map((assignment) => {
            const { totalStudents, submittedCount } =
              getSubmissionStatus(assignment);

            return (
              <Card
                key={assignment._id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {assignment.title}
                        </h3>
                        <Badge
                          variant={
                            assignment.type === "assignment"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {assignment.type}
                        </Badge>
                        <Badge variant="outline">
                          Assignment {assignment.assignmentNumber}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        {assignment.subject} • Section{" "}
                        {assignment.sections.join(", ")} • Year{" "}
                        {assignment.year} • Semester {assignment.semester}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Assigned Date</p>
                          <p className="font-medium">
                            {formatDate(assignment.assignedDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Due Date</p>
                          <p className="font-medium">
                            {formatDate(assignment.dueDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Submissions</p>
                          <p className="font-medium text-green-600">
                            {submittedCount}/{totalStudents}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Upload Date</p>
                          <p className="font-medium">
                            {formatDate(assignment.createdAt)}
                          </p>
                        </div>
                      </div>

                      {assignment.instructions && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <strong>Instructions:</strong>{" "}
                            {assignment.instructions}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(assignment)}
                        disabled={!assignment.fileUrl}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(assignment._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
