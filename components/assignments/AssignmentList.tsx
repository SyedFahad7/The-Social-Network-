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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  FileText,
  Download,
  Edit,
  Trash2,
  Search,
  Filter,
  Calendar,
  Users,
  Clock,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AssignmentListProps {
  refreshTrigger: number;
}

interface EditAssignmentData {
  title: string;
  assignedDate: string;
  dueDate: string;
  instructions: string;
}

export default function AssignmentList({
  refreshTrigger,
}: AssignmentListProps) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [editData, setEditData] = useState<EditAssignmentData>({
    title: "",
    assignedDate: "",
    dueDate: "",
    instructions: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
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

  const handleEdit = (assignment: any) => {
    setSelectedAssignment(assignment);
    setEditData({
      title: assignment.title,
      assignedDate: assignment.assignedDate.split('T')[0], // Convert to YYYY-MM-DD format
      dueDate: assignment.dueDate.split('T')[0],
      instructions: assignment.instructions || "",
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedAssignment) return;

    try {
      setEditLoading(true);
      const response = await apiClient.updateAssignment(selectedAssignment._id, {
        title: editData.title,
        assignedDate: editData.assignedDate,
        dueDate: editData.dueDate,
        instructions: editData.instructions,
      });

      if (response?.success) {
        toast({
          title: "Assignment Updated",
          description: "Assignment has been updated successfully",
          variant: "default",
        });
        setEditDialogOpen(false);
        fetchAssignments(); // Refresh the list
      } else {
        throw new Error(response?.message || "Failed to update assignment");
      }
    } catch (error) {
      console.error("Error updating assignment:", error);
      toast({
        title: "Error",
        description: "Failed to update assignment",
        variant: "destructive",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = (assignment: any) => {
    setSelectedAssignment(assignment);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedAssignment) return;

    try {
      setDeleteLoading(true);
      const response = await apiClient.deleteAssignment(selectedAssignment._id);

      if (response?.success) {
        toast({
          title: "Assignment Deleted",
          description: "Assignment has been deleted successfully",
          variant: "default",
        });
        setDeleteDialogOpen(false);
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
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownload = async (assignment: any) => {
    if (!assignment.fileUrl) {
      toast({
        title: "No File Available",
        description: "This assignment doesn't have an uploaded file",
        variant: "destructive",
      });
      return;
    }

    try {
      // Show loading state
      toast({
        title: "Downloading...",
        description: "Preparing file for download",
        variant: "default",
      });

      // Extract file extension from fileName
      const fileExtension = assignment.fileName ? assignment.fileName.split('.').pop() : 'pdf';
      
      // Try multiple URL formats
      const urls = [];
      
      // 1. Original URL without extension
      urls.push(assignment.fileUrl);
      
      // 2. Original URL with extension
      urls.push(assignment.fileUrl + `.${fileExtension}`);
      
      // 3. Convert to image/upload if it's raw/upload
      if (assignment.fileUrl.includes('/raw/upload/')) {
        const imageUrl = assignment.fileUrl.replace('/raw/upload/', '/image/upload/');
        urls.push(imageUrl);
        urls.push(imageUrl + `.${fileExtension}`);
      }
      
      console.log('Trying URLs:', urls);
      
      // Try each URL until one works
      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            console.log('Working URL found:', url);
            
            // Get the file blob
            const blob = await response.blob();
            
            // Create download link with proper filename
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = assignment.fileName || `assignment.${fileExtension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            
            toast({
              title: "Download Complete",
              description: "File downloaded successfully",
              variant: "default",
            });
            return;
          }
        } catch (error) {
          console.log('URL failed:', url, error);
        }
      }
      
      // If all URLs fail, show error
      toast({
        title: "Download Failed",
        description: "Could not access the file",
        variant: "destructive",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download file",
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

  const getSubjectName = (assignment: any) => {
    // If subject is populated with name, use it
    if (assignment.subject && typeof assignment.subject === 'object' && assignment.subject.name) {
      return assignment.subject.name;
    }
    // If subject is just an ID, try to find it in the assignments array
    const subjectAssignment = assignments.find(a => 
      a.subject && typeof a.subject === 'object' && a.subject._id === assignment.subject
    );
    if (subjectAssignment && subjectAssignment.subject && typeof subjectAssignment.subject === 'object') {
      return subjectAssignment.subject.name;
    }
    // Fallback to subject code or ID
    return assignment.subjectCode || assignment.subject || 'Unknown Subject';
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const subjectName = getSubjectName(assignment);
    const matchesSearch =
      assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subjectName.toLowerCase().includes(searchTerm.toLowerCase());

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
                        {subjectName} • Section{" "}
                        {assignment.sections.join(", ")} • Year{" "}
                        {assignment.year} • Semester {assignment.semester}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
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
                        title="Download Assignment"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEdit(assignment)}
                        title="Edit Assignment"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(assignment)}
                        title="Delete Assignment"
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

      {/* Edit Assignment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              Make changes to your assignment here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assignedDate" className="text-right">
                Assigned Date
              </Label>
              <Input
                id="assignedDate"
                type="date"
                value={editData.assignedDate}
                onChange={(e) => setEditData({ ...editData, assignedDate: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={editData.dueDate}
                onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="instructions" className="text-right">
                Instructions
              </Label>
              <Textarea
                id="instructions"
                value={editData.instructions}
                onChange={(e) => setEditData({ ...editData, instructions: e.target.value })}
                className="col-span-3"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editLoading}>
              {editLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the assignment
              "{selectedAssignment?.title}" and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Yes, delete assignment'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
