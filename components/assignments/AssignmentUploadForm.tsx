"use client";

import { useState } from "react";
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
    fileUrl: "",
    fileName: "",
    fileSize: 0,
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
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
        fileUrl: "",
      }));
    }
  };

  const handleFileUpload = async () => {
    if (!formData.file) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const response = await apiClient.uploadAssignmentFile(formData.file);

      if (response?.success) {
        setFormData((prev) => ({
          ...prev,
          fileUrl: response.data.fileUrl,
          fileName: response.data.fileName,
          fileSize: response.data.fileSize,
        }));
        setUploadSuccess(true);
        toast({
          title: "File Uploaded Successfully",
          description: "File has been uploaded to Cloudinary",
          variant: "default",
        });
      } else {
        throw new Error(response?.message || "Upload failed");
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
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

    if (!formData.fileUrl) {
      toast({
        title: "File Required",
        description: "Please upload assignment file",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const assignmentData = {
        title: formData.title,
        description: formData.instructions,
        subject: filters.subject,
        subjectCode: filters.subject,
        type: "assignment",
        sections: [filters.section],
        academicYear: filters.academicYear,
        year: parseInt(filters.year),
        semester: parseInt(filters.semester),
        assignmentNumber: parseInt(filters.assignmentNumber),
        assignedDate: formData.assignedDate,
        dueDate: formData.dueDate,
        instructions: formData.instructions,
        fileUrl: formData.fileUrl,
        fileName: formData.fileName,
        fileSize: formData.fileSize,
      };

      const response = await apiClient.createAssignment(assignmentData);

      if (response?.success) {
        toast({
          title: "Assignment Uploaded Successfully",
          description: "Assignment has been saved to database",
          variant: "default",
        });

        // Reset form
        setFormData({
          title: "",
          assignedDate: "",
          dueDate: "",
          instructions: "",
          file: null,
          fileUrl: "",
          fileName: "",
          fileSize: 0,
        });
        setUploadSuccess(false);
        onUploadSuccess();
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
      fileUrl: "",
      fileName: "",
      fileSize: 0,
    }));
    setUploadSuccess(false);
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
            {filters.subject} Section {filters.section}
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
          Upload assignment for {filters.subject} Section {filters.section} -
          Assignment {filters.assignmentNumber}
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                  disabled={uploading || uploadSuccess}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Accepted formats: PDF, DOC, DOCX (Max 10MB)
              </p>
            </div>

            {formData.file && !uploadSuccess && (
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  onClick={handleFileUpload}
                  disabled={uploading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload to Cloudinary
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={removeFile}
                  disabled={uploading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              </div>
            )}

            {uploadSuccess && (
              <div className="flex items-center space-x-2 p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    File uploaded successfully
                  </p>
                  <p className="text-xs text-green-600">{formData.fileName}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removeFile}
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
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                placeholder="Provide instructions for students (optional)"
                value={formData.instructions}
                onChange={(e) =>
                  handleInputChange("instructions", e.target.value)
                }
                rows={3}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex space-x-4">
            <Button
              type="submit"
              disabled={submitting || !uploadSuccess}
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
