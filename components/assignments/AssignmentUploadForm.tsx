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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, X, Loader2, CheckCircle } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AssignmentUploadFormProps {
  filters: any;
  assignmentExists: boolean;
  onUploadSuccess: () => void;
}

export default function AssignmentUploadForm({
  filters,
  assignmentExists,
  onUploadSuccess,
}: AssignmentUploadFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    assignedDate: "",
    dueDate: "",
    instructions: "",
    file: null as File | null,
    fileName: "",
    fileSize: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Only PDF and DOC files are allowed",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }

      setFormData((prev) => ({
        ...prev,
        file,
        fileName: file.name,
        fileSize: file.size,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter assignment title",
        variant: "destructive",
      });
      return;
    }

    if (!formData.assignedDate) {
      toast({
        title: "Assigned Date Required",
        description: "Please select assigned date",
        variant: "destructive",
      });
      return;
    }

    if (!formData.dueDate) {
      toast({
        title: "Due Date Required",
        description: "Please select due date",
        variant: "destructive",
      });
      return;
    }

    if (!formData.instructions.trim()) {
      toast({
        title: "Instructions Required",
        description: "Please enter assignment instructions",
        variant: "destructive",
      });
      return;
    }

    if (!formData.file) {
      toast({
        title: "File Required",
        description: "Please select assignment file",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Debug: Log filters object
      console.log('Filters object:', filters);

      // Get subject code from the selected subject
      // We need to fetch the subject details to get the code
      let subjectCode = '';
      if (filters.subject) {
        try {
          const subjectResponse = await apiClient.getSubjectById(filters.subject);
          if (subjectResponse?.success && subjectResponse?.data?.code) {
            subjectCode = subjectResponse.data.code;
          } else {
            throw new Error('Could not fetch subject code');
          }
        } catch (error) {
          console.error('Error fetching subject code:', error);
          toast({
            title: "Error",
            description: "Could not fetch subject code. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('file', formData.file);
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.instructions);
      formDataToSend.append('subject', filters.subject); // This is the ObjectId
      formDataToSend.append('subjectCode', subjectCode); // Use the fetched subject code
      formDataToSend.append('type', 'assignment');
      formDataToSend.append('sections', JSON.stringify([filters.section]));
      formDataToSend.append('academicYear', filters.academicYear);
      formDataToSend.append('year', filters.year);
      formDataToSend.append('semester', filters.semester);
      formDataToSend.append('assignmentNumber', filters.assignmentNumber);
      formDataToSend.append('assignedDate', formData.assignedDate);
      formDataToSend.append('dueDate', formData.dueDate);
      formDataToSend.append('instructions', formData.instructions);

      const response = await apiClient.createAssignmentWithFile(formDataToSend);

      if (response?.success) {
        // Show success state
        setShowSuccess(true);
        
        // Reset form
        setFormData({
          title: "",
          assignedDate: "",
          dueDate: "",
          instructions: "",
          file: null,
          fileName: "",
          fileSize: 0,
        });
        
        // Immediately trigger refresh with a small delay to show success message
        setTimeout(() => {
          onUploadSuccess();
        }, 500);
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
      } else {
        throw new Error(response?.message || "Failed to save assignment");
      }
    } catch (error) {
      console.error("Assignment submission error:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to save assignment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const removeFile = () => {
    setFormData((prev) => ({
      ...prev,
      file: null,
      fileName: "",
      fileSize: 0,
    }));
  };

  if (assignmentExists) {
    return (
      <Card className="border-2 border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-700">
            <X className="w-5 h-5" />
            <span>Assignment Already Exists</span>
          </CardTitle>
          <CardDescription className="text-red-600">
            Assignment {filters.assignmentNumber} already uploaded for{" "}
            {filters.subjectName || filters.subject} For Section {filters.section}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span>Upload Assignment</span>
        </CardTitle>
        <CardDescription>
          Upload assignment for Section {filters.section} -
          Assignment {filters.assignmentNumber}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showSuccess && (
          <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-lg">
            <div className="flex items-center space-x-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium text-lg">Uploaded!</span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="file" className="text-base font-medium">
                Upload Assignment File
              </Label>
              <div className="mt-2">
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                  disabled={submitting}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Accepted formats: PDF, DOC, DOCX (Max 10MB)
              </p>
            </div>

            {formData.file && (
              <div className="flex items-center space-x-2 p-3 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    {formData.fileName}
                  </p>
                  <p className="text-xs text-blue-600">
                    {(formData.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removeFile}
                  disabled={submitting}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Assignment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Assignment Title *</Label>
              <Input
                id="title"
                placeholder="Enter assignment title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedDate">Assigned Date *</Label>
              <Input
                id="assignedDate"
                type="date"
                value={formData.assignedDate}
                onChange={(e) =>
                  handleInputChange("assignedDate", e.target.value)
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange("dueDate", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions *</Label>
              <Textarea
                id="instructions"
                placeholder="Provide instructions for students (required)"
                value={formData.instructions}
                onChange={(e) =>
                  handleInputChange("instructions", e.target.value)
                }
                rows={3}
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex space-x-4">
            <Button
              type="submit"
              disabled={
                submitting || 
                !formData.file || 
                !formData.title.trim() || 
                !formData.assignedDate || 
                !formData.dueDate || 
                !formData.instructions.trim()
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading Assignment...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Assignment
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
