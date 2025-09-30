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
  Info,
  Minus,
  Award,
  TrendingUp,
  Clock3
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

export default function StudentTestsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("dueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedTab, setSelectedTab] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchStudentTests();
  }, []);

  const fetchStudentTests = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getStudentAssignments();
      if (response?.success) {
        const onlyTests = (response.data.assignments || []).filter((a: Assignment) => a.type === 'test');
        setAssignments(onlyTests);
      } else {
        throw new Error(response?.message || "Failed to fetch tests");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch tests", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (assignment: Assignment) => {
    if (!assignment.fileUrl) {
      toast({ title: "No File Available", description: "This test doesn't have an uploaded file", variant: "destructive" });
      return;
    }

    try {
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
            link.download = assignment.fileName || `test.${fileExtension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            return;
          }
        } catch (e) {}
      }
      toast({ title: "Download Failed", description: "Could not access the file", variant: "destructive" });
    } catch (error) {
      toast({ title: "Download Failed", description: "Failed to download file", variant: "destructive" });
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

  const getStudentMarks = (assignment: Assignment) => {
    if (!assignment.marks || assignment.marks.length === 0) {
      return null;
    }
    let currentUser: any = null;
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        try { currentUser = JSON.parse(userData); } catch {}
      }
    }
    if (!currentUser || !currentUser._id) return null;
    const studentMark = assignment.marks.find(mark => mark.studentId === currentUser._id);
    return studentMark ? studentMark.marks : null;
  };

  const getStatusInfo = (assignment: Assignment) => {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    const isOverdue = dueDate < now;
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const studentMarks = getStudentMarks(assignment);
    const hasBeenMarked = studentMarks !== null;
    if (hasBeenMarked) {
      return { status: "submitted", label: "Submitted", icon: CheckCircle, color: "default", days: 0 } as const;
    }
    if (isOverdue) {
      return { status: "overdue", label: "Overdue", icon: XCircle, color: "destructive", days: Math.abs(daysUntilDue) } as const;
    } else if (daysUntilDue <= 3) {
      return { status: "urgent", label: "Due Soon (≤3 days)", icon: AlertCircle, color: "destructive", days: daysUntilDue } as const;
    } else if (daysUntilDue <= 7) {
      return { status: "warning", label: "Due This Week", icon: Clock3, color: "secondary", days: daysUntilDue } as const;
    } else {
      return { status: "normal", label: "On Time", icon: CheckCircle, color: "default", days: daysUntilDue } as const;
    }
  };

  const subjects = useMemo(() => {
    const subjectMap: { [key: string]: boolean } = {};
    assignments.forEach(a => { subjectMap[getSubjectName(a)] = true; });
    return Object.keys(subjectMap).sort();
  }, [assignments]);

  const filteredAndSortedAssignments = useMemo(() => {
    let filtered = assignments.filter((assignment) => {
      const subjectName = getSubjectName(assignment);
      const statusInfo = getStatusInfo(assignment);
      const matchesSearch = searchTerm === "" || assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) || subjectName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSubject = selectedSubject === "all" || subjectName === selectedSubject;
      const matchesOverdue = !showOverdueOnly || statusInfo.status === "overdue";
      const matchesUnread = !showUnreadOnly || !assignment.isRead;
      return matchesSearch && matchesSubject && matchesOverdue && matchesUnread;
    });
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
        default:
          comparison = 0;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return filtered;
  }, [assignments, searchTerm, selectedSubject, showOverdueOnly, showUnreadOnly, sortBy, sortOrder]);

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
    setSelectedSubject("all");
    setShowOverdueOnly(false);
    setShowUnreadOnly(false);
    setSortBy("dueDate");
    setSortOrder("asc");
  };

  if (loading) {
    return (
      <DashboardLayout role="student">
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
              <p className="text-muted-foreground">Loading surprise tests...</p>
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
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Surprise Tests</h1>
              <p className="text-muted-foreground">View and download surprise tests for your section</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchStudentTests} className="hidden md:flex">
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
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Total tests</p>
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
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search tests by title or subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetFilters} className="whitespace-nowrap">Clear Filters</Button>
                <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} className="whitespace-nowrap">{sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Switch id="overdue-only" checked={showOverdueOnly} onCheckedChange={setShowOverdueOnly} />
                <Label htmlFor="overdue-only" className="text-sm">Show overdue only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="unread-only" checked={showUnreadOnly} onCheckedChange={setShowUnreadOnly} />
                <Label htmlFor="unread-only" className="text-sm">Show unread only</Label>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Label className="text-sm font-medium">Sort by:</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="subject">Subject</SelectItem>
                  <SelectItem value="createdAt">Created Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tests Tabs */}
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
                    <h3 className="text-lg font-medium mb-2">No surprise tests found</h3>
                    <p className="text-muted-foreground">
                      {searchTerm ? "Try adjusting your search or filters" : "No tests match your current filters"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {assignments.map((assignment) => {
                    const subjectName = getSubjectName(assignment);
                    const statusInfo = getStatusInfo(assignment);
                    const StatusIcon = statusInfo.icon;
                    const studentMarks = getStudentMarks(assignment);
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
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <h3 className="text-base sm:text-lg font-semibold group-hover:text-primary transition-colors">{assignment.title}</h3>
                                    <Badge variant={statusInfo.color as any} className="text-xs">
                                      <StatusIcon className="w-3 h-3 mr-1" />
                                      {statusInfo.label}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">test</Badge>
                                    <Badge variant="secondary" className="text-xs">#{assignment.assignmentNumber}</Badge>
                                    {studentMarks !== null ? (
                                      <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                        <Award className="w-3 h-3 mr-1" />
                                        Marks: {studentMarks}/10
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs text-muted-foreground">
                                        <Minus className="w-3 h-3 mr-1" />
                                        Not Marked
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                                    <div className="flex items-center space-x-1"><BookOpen className="w-3 h-3 sm:w-4 sm:h-4" /><span className="truncate">{subjectName}</span></div>
                                    <div className="flex items-center space-x-1"><Users className="w-3 h-3 sm:w-4 sm:h-4" /><span>Section {assignment.sections.join(", ")}</span></div>
                                    <div className="flex items-center space-x-1"><TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /><span>Year {assignment.year} • Sem {assignment.semester}</span></div>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <Button size="sm" variant="outline" onClick={() => handleDownload(assignment)} disabled={!assignment.fileUrl} title="Download Test">
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
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
                                    <p className={cn("font-medium text-xs sm:text-sm",
                                      getStatusInfo(assignment).status === "submitted" && "text-green-600 dark:text-green-400",
                                      getStatusInfo(assignment).status === "overdue" && "text-red-600 dark:text-red-400",
                                      getStatusInfo(assignment).status === "urgent" && "text-orange-600 dark:text-orange-400"
                                    )}>{formatDate(assignment.dueDate)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 p-2 sm:p-3 bg-muted/50 rounded-lg sm:col-span-2 lg:col-span-1">
                                  <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">Uploaded</p>
                                    <p className="font-medium text-xs sm:text-sm">{formatDate(assignment.createdAt)}</p>
                                  </div>
                                </div>
                              </div>
                              {assignment.instructions && (
                                <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                  <div className="flex items-start space-x-2">
                                    <Info className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">{assignment.instructions}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
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


