"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Search, Filter } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface SurpriseTestListProps {
  refreshTrigger: number;
}

export default function SurpriseTestList({ refreshTrigger }: SurpriseTestListProps) {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const { toast } = useToast();

  useEffect(() => {
    fetchTests();
  }, [refreshTrigger]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getFilteredAssignments({ type: 'test' });
      if (response?.success) {
        setTests(response.data.assignments || []);
      } else {
        throw new Error(response?.message || "Failed to fetch tests");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch tests", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (test: any) => {
    if (!test.fileUrl) {
      toast({ title: "No File", description: "This test has no file", variant: "destructive" });
      return;
    }
    try {
      const fileExtension = test.fileName ? test.fileName.split('.').pop() : 'pdf';
      const urls = [
        test.fileUrl,
        test.fileUrl + `.${fileExtension}`,
        ...(test.fileUrl.includes('/raw/upload/') ? [
          test.fileUrl.replace('/raw/upload/', '/image/upload/'),
          test.fileUrl.replace('/raw/upload/', '/image/upload/') + `.${fileExtension}`
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
            link.download = test.fileName || `test.${fileExtension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            toast({ title: "Download Complete", description: "File downloaded successfully" });
            return;
          }
        } catch {}
      }
      toast({ title: "Download Failed", description: "Could not access the file", variant: "destructive" });
    } catch (error) {
      toast({ title: "Download Failed", description: "Failed to download file", variant: "destructive" });
    }
  };

  const getSubjectName = (assignment: any) => {
    if (assignment.subject && typeof assignment.subject === 'object' && assignment.subject.name) {
      return assignment.subject.name;
    }
    return assignment.subjectCode || assignment.subject || 'Unknown Subject';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const filtered = tests.filter((t) => {
    const subjectName = getSubjectName(t);
    return (
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subjectName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "title":
        return a.title.localeCompare(b.title);
      case "dueDate":
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      case "createdAt":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
            <span className="ml-2">Loading tests...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Surprise Test List</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search tests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
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

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tests found</h3>
            <p className="text-gray-600">{searchTerm ? "Try adjusting your search" : "Upload your first test to get started"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sorted.map((test) => {
            const subjectName = getSubjectName(test);
            return (
              <Card key={test._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{test.title}</h3>
                        <Badge variant="secondary">test</Badge>
                        <Badge variant="outline">Test {test.assignmentNumber}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {subjectName} • Section {test.sections.join(", ")} • Year {test.year} • Semester {test.semester}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Assigned Date</p>
                          <p className="font-medium">{formatDate(test.assignedDate)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Due Date</p>
                          <p className="font-medium">{formatDate(test.dueDate)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Upload Date</p>
                          <p className="font-medium">{formatDate(test.createdAt)}</p>
                        </div>
                      </div>
                      {test.instructions && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <strong>Instructions:</strong> {test.instructions}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleDownload(test)} disabled={!test.fileUrl} title="Download Test">
                        <Download className="w-4 h-4" />
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


