"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  Download, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  XCircle,
  BookOpen,
  Users,
  CalendarDays,
  SortAsc,
  SortDesc,
  RefreshCw,
  FileDown,
  Info,
  Star,
  TrendingUp,
  Clock3,
  Award,
  Minus
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  isRead?: boolean;
  marks?: Array<{
    studentId: string;
    marks: number | null;
    updatedAt: string;
    updatedBy: string;
  }>;
}

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("dueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selectedTab, setSelectedTab] = useState("all");
  const [expandedInstructions, setExpandedInstructions] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchStudentAssignments();
  }, []);

  const fetchStudentAssignments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getStudentAssignments();

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

  const handleDownload = async (assignment: Assignment) => {
    if (!assignment.fileUrl) {
      toast({
        title: "No File Available",
        description: "This assignment doesn't have an uploaded file",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Downloading...",
        description: "Preparing file for download",
      });

      const fileExtension = assignment.fileName ? assignment.fileName.split('.').pop() : 'pdf';
      const urls = [
        assignment.fileUrl,
        assignment.fileUrl + `.${fileExtension}`,
        ...(assignment.fileUrl.includes('/raw/upload/') ? [
          assignment.fileUrl.replace('/raw/upload/', '/image/upload/'),
          assignment.fileUrl.replace('/raw/upload/', '/image/upload/') + `.${fileExtension}`
        ] : [])
      ];
      
      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const blob = await response.blob();
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
            });
            return;
          }
        } catch (error) {
          console.log('URL failed:', url, error);
        }
      }
      
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

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return formatDate(dateString);
  };

  const getSubjectName = (assignment: Assignment) => {
    if (assignment.subject && typeof assignment.subject === 'object' && assignment.subject.name) {
      return assignment.subject.name;
    }
    return assignment.subjectCode || assignment.subject || 'Unknown Subject';
  };

  const getStudentMarks = (assignment: Assignment) => {
    if (!assignment.marks || assignment.marks.length === 0) {
      return null;
    }
    
    // Get current user from localStorage
    let currentUser: any = null;
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          currentUser = JSON.parse(userData);
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    }
    
    if (!currentUser || !currentUser._id) {
      return null;
    }
    
    const studentMark = assignment.marks.find(mark => mark.studentId === currentUser._id);
    return studentMark ? studentMark.marks : null;
  };

  const getStatusInfo = (assignment: Assignment) => {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    const isOverdue = dueDate < now;
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check if student has been marked for this assignment
    const studentMarks = getStudentMarks(assignment);
    const hasBeenMarked = studentMarks !== null;
    
    // If student has been marked, show "Submitted" status regardless of due date
    if (hasBeenMarked) {
      return {
        status: "submitted",
        label: "Submitted",
        icon: CheckCircle,
        color: "default",
        days: 0
      };
    }
    
    // If not marked, show due date status
    if (isOverdue) {
      return {
        status: "overdue",
        label: "Overdue",
        icon: XCircle,
        color: "destructive",
        days: Math.abs(daysUntilDue)
      };
    } else if (daysUntilDue <= 3) {
      return {
        status: "urgent",
        label: "Due Soon (≤3 days)",
        icon: AlertCircle,
        color: "destructive",
        days: daysUntilDue
      };
    } else if (daysUntilDue <= 7) {
      return {
        status: "warning",
        label: "Due This Week",
        icon: Clock3,
        color: "secondary",
        days: daysUntilDue
      };
    } else {
      return {
        status: "normal",
        label: "On Time",
        icon: CheckCircle,
        color: "default",
        days: daysUntilDue
      };
    }
  };

  // Get unique values for filters
  const subjects = useMemo(() => {
    const subjectMap: { [key: string]: boolean } = {};
    assignments.forEach(a => {
      const subjectName = getSubjectName(a);
      subjectMap[subjectName] = true;
    });
    return Object.keys(subjectMap).sort();
  }, [assignments]);



  // Filter and sort assignments
  const filteredAndSortedAssignments = useMemo(() => {
    let filtered = assignments.filter((assignment) => {
      const subjectName = getSubjectName(assignment);
      const statusInfo = getStatusInfo(assignment);
      
      // Search filter
      const matchesSearch = searchTerm === "" || 
        assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subjectName.toLowerCase().includes(searchTerm.toLowerCase());

      // Type filter
      const matchesType = filterType === "all" || assignment.type === filterType;

      // Subject filter
      const matchesSubject = selectedSubject === "all" || subjectName === selectedSubject;

      // Overdue filter
      const matchesOverdue = !showOverdueOnly || statusInfo.status === "overdue";

      // Unread filter
      const matchesUnread = !showUnreadOnly || !assignment.isRead;

      return matchesSearch && matchesType && matchesSubject && matchesOverdue && matchesUnread;
    });

    // Sort assignments
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "dueDate":
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case "createdAt":
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case "subject":
          comparison = getSubjectName(a).localeCompare(getSubjectName(b));
          break;
        case "priority":
          const aStatus = getStatusInfo(a);
          const bStatus = getStatusInfo(b);
          const priorityOrder = { overdue: 0, urgent: 1, warning: 2, normal: 3 };
          comparison = priorityOrder[aStatus.status as keyof typeof priorityOrder] - priorityOrder[bStatus.status as keyof typeof priorityOrder];
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [assignments, searchTerm, filterType, selectedSubject, showOverdueOnly, showUnreadOnly, sortBy, sortOrder]);

  // Group assignments by status for tabs
  const groupedAssignments = useMemo(() => {
    const groups = {
      all: filteredAndSortedAssignments,
      overdue: filteredAndSortedAssignments.filter(a => getStatusInfo(a).status === "overdue"),
      urgent: filteredAndSortedAssignments.filter(a => getStatusInfo(a).status === "urgent"),
      upcoming: filteredAndSortedAssignments.filter(a => {
        const status = getStatusInfo(a).status;
        return status === "warning" || status === "normal";
      })
    };
    return groups;
  }, [filteredAndSortedAssignments]);

  const stats = useMemo(() => {
    const total = assignments.length;
    const overdue = assignments.filter(a => getStatusInfo(a).status === "overdue").length;
    const urgent = assignments.filter(a => getStatusInfo(a).status === "urgent").length;
    const upcoming = assignments.filter(a => {
      const status = getStatusInfo(a).status;
      return status === "warning" || status === "normal";
    }).length;

    return { total, overdue, urgent, upcoming };
  }, [assignments]);

  const resetFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setSelectedSubject("all");
    setShowOverdueOnly(false);
    setShowUnreadOnly(false);
    setSortBy("dueDate");
    setSortOrder("asc");
  };

  const toggleInstructions = (assignmentId: string) => {
    setExpandedInstructions(prev => ({
      ...prev,
      [assignmentId]: !prev[assignmentId]
    }));
  };

  const truncateInstructions = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  if (loading) {
    return (
      <DashboardLayout role="student">
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
              <p className="text-muted-foreground">Loading assignments...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                My Assignments
              </h1>
              <p className="text-muted-foreground">
                View and download assignments for your section
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStudentAssignments}
              className="hidden md:flex"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Total</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Total assignments</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Overdue</span>
              </div>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">{stats.overdue}</p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">Past due date</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Urgent</span>
              </div>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.urgent}</p>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">Due in ≤3 days</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Upcoming</span>
              </div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.upcoming}</p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">Due in &gt;3 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Filters & Search</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Quick Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search assignments by title or subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="whitespace-nowrap"
                >
                  Clear Filters
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="whitespace-nowrap"
                >
                  {sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Toggle Filters */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="overdue-only"
                  checked={showOverdueOnly}
                  onCheckedChange={setShowOverdueOnly}
                />
                <Label htmlFor="overdue-only" className="text-sm">Show overdue only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="unread-only"
                  checked={showUnreadOnly}
                  onCheckedChange={setShowUnreadOnly}
                />
                <Label htmlFor="unread-only" className="text-sm">Show unread only</Label>
              </div>
            </div>

            {/* Sort Options */}
            <div className="flex items-center space-x-4">
              <Label className="text-sm font-medium">Sort by:</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="subject">Subject</SelectItem>
                  <SelectItem value="createdAt">Created Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Assignments Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">All ({groupedAssignments.all.length})</span>
            </TabsTrigger>
            <TabsTrigger value="overdue" className="flex items-center space-x-2">
              <XCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Overdue ({groupedAssignments.overdue.length})</span>
            </TabsTrigger>
            <TabsTrigger value="urgent" className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Urgent ({groupedAssignments.urgent.length})</span>
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Upcoming ({groupedAssignments.upcoming.length})</span>
            </TabsTrigger>
          </TabsList>

          {Object.entries(groupedAssignments).map(([key, assignments]) => (
            <TabsContent key={key} value={key} className="space-y-4">
              {assignments.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No assignments found</h3>
                    <p className="text-muted-foreground">
                      {searchTerm || filterType !== "all"
                        ? "Try adjusting your search or filters"
                        : "No assignments match your current filters"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {assignments.map((assignment) => {
                    const subjectName = getSubjectName(assignment);
                    const statusInfo = getStatusInfo(assignment);
                    const StatusIcon = statusInfo.icon;

                    return (
                      <Card
                        key={assignment._id}
                        className={cn(
                          "hover:shadow-lg transition-all duration-200 cursor-pointer group",
                          statusInfo.status === "submitted" && "border-green-200 bg-green-50/50 dark:bg-green-950/20",
                          statusInfo.status === "overdue" && "border-red-200 bg-red-50/50 dark:bg-red-950/20",
                          statusInfo.status === "urgent" && "border-orange-200 bg-orange-50/50 dark:bg-orange-950/20",
                          statusInfo.status === "warning" && "border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20"
                        )}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-4">
                              {/* Header */}
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                                                     <div className="flex flex-wrap items-center gap-2 mb-2">
                                     <h3 className="text-base sm:text-lg font-semibold group-hover:text-primary transition-colors">
                                       {assignment.title}
                                     </h3>
                                     <Badge variant={statusInfo.color as any} className="text-xs">
                                       <StatusIcon className="w-3 h-3 mr-1" />
                                       {statusInfo.label}
                                     </Badge>
                                     <Badge variant="outline" className="text-xs">
                                       {assignment.type}
                                     </Badge>
                                     <Badge variant="secondary" className="text-xs">
                                       #{assignment.assignmentNumber}
                                     </Badge>
                                     {/* Marks Badge */}
                                     {(() => {
                                       const studentMarks = getStudentMarks(assignment);
                                       if (studentMarks !== null) {
                                         return (
                                           <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                             <Award className="w-3 h-3 mr-1" />
                                             Marks: {studentMarks}/10
                                           </Badge>
                                         );
                                       } else {
                                         return (
                                           <Badge variant="outline" className="text-xs text-muted-foreground">
                                             <Minus className="w-3 h-3 mr-1" />
                                             Not Marked
                                           </Badge>
                                         );
                                       }
                                     })()}
                                   </div>

                                  <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                                    <div className="flex items-center space-x-1">
                                      <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                                      <span className="truncate">{subjectName}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                                      <span>Section {assignment.sections.join(", ")}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                                      <span>Year {assignment.year} • Sem {assignment.semester}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
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
                                </div>
                              </div>

                              {/* Dates Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                                <div className="flex items-center space-x-2 p-2 sm:p-3 bg-muted/50 rounded-lg">
                                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">Assigned</p>
                                    <p className="font-medium text-xs sm:text-sm">{formatDate(assignment.assignedDate)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 p-2 sm:p-3 bg-muted/50 rounded-lg">
                                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">Due Date</p>
                                    <p className={cn(
                                      "font-medium text-xs sm:text-sm",
                                      statusInfo.status === "submitted" && "text-green-600 dark:text-green-400",
                                      statusInfo.status === "overdue" && "text-red-600 dark:text-red-400",
                                      statusInfo.status === "urgent" && "text-orange-600 dark:text-orange-400"
                                    )}>
                                      {formatDate(assignment.dueDate)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 p-2 sm:p-3 bg-muted/50 rounded-lg sm:col-span-2 lg:col-span-1">
                                  <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">Uploaded</p>
                                    <p className="font-medium text-xs sm:text-sm">{formatTimeAgo(assignment.createdAt)}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Instructions */}
                              {assignment.instructions && (
                                <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                  <div className="flex items-start space-x-2">
                                    <Info className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                                        Instructions
                                      </p>
                                      <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                                        {expandedInstructions[assignment._id] 
                                          ? assignment.instructions 
                                          : truncateInstructions(assignment.instructions)
                                        }
                                      </p>
                                      {assignment.instructions.length > 150 && (
                                        <Button
                                          variant="link"
                                          size="sm"
                                          onClick={() => toggleInstructions(assignment._id)}
                                          className="p-0 h-auto text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 mt-1 text-xs"
                                        >
                                          {expandedInstructions[assignment._id] ? "View Less" : "Read More"}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Status Message */}
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm">
                                <div className="flex items-center space-x-2">
                                  {assignment.fileUrl ? (
                                    <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                                      <FileDown className="w-3 h-3 sm:w-4 sm:h-4" />
                                      <span>File available</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-1 text-muted-foreground">
                                      <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                                      <span>No file attached</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-muted-foreground">
                                  {statusInfo.status === "submitted" && (
                                    <span className="text-green-600 dark:text-green-400">
                                      ✓ Assignment submitted
                                    </span>
                                  )}
                                  {statusInfo.status === "overdue" && (
                                    <span className="text-red-600 dark:text-red-400">
                                      {statusInfo.days} day{statusInfo.days !== 1 ? 's' : ''} overdue
                                    </span>
                                  )}
                                  {statusInfo.status === "urgent" && (
                                    <span className="text-orange-600 dark:text-orange-400">
                                      Due in {statusInfo.days} day{statusInfo.days !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {statusInfo.status === "warning" && (
                                    <span className="text-yellow-600 dark:text-yellow-400">
                                      Due in {statusInfo.days} day{statusInfo.days !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {statusInfo.status === "normal" && (
                                    <span>
                                      Due in {statusInfo.days} day{statusInfo.days !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 