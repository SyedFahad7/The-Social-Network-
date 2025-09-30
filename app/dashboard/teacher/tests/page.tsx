"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AssignmentFilters from "@/components/assignments/AssignmentFilters";
import SurpriseTestUploadForm from "@/components/assignments/SurpriseTestUploadForm";
import SurpriseTestList from "@/components/assignments/SurpriseTestList";
import AssignmentMarksAllocation from "@/components/assignments/AssignmentMarksAllocation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, FileText, Award } from "lucide-react";

export default function TeacherSurpriseTests() {
  const [filters, setFilters] = useState<any>({});
  const [testExists, setTestExists] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [componentKey, setComponentKey] = useState(0);

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const handleAssignmentNumberCheck = (exists: boolean) => {
    setTestExists(exists);
  };

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    setFilters({});
    setTestExists(false);
    setComponentKey((prev) => prev + 1);
  };

  const allFiltersSelected =
    filters.academicYear &&
    filters.year &&
    filters.semester &&
    filters.section &&
    filters.subject &&
    filters.assignmentNumber;

  const shouldShowForm = allFiltersSelected && !testExists;

  return (
    <DashboardLayout role="teacher">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Surprise Tests</h1>
          <p className="text-gray-600">Upload and manage surprise tests for your students</p>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Upload Test</span>
            </TabsTrigger>
            <TabsTrigger value="view" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>View Tests</span>
            </TabsTrigger>
            <TabsTrigger value="marks" className="flex items-center space-x-2">
              <Award className="w-4 h-4" />
              <span>Marks Allocation</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <AssignmentFilters
              key={componentKey}
              onFiltersChange={handleFiltersChange}
              onAssignmentNumberCheck={handleAssignmentNumberCheck}
              defaultType="test"
            />

            {shouldShowForm && (
              <SurpriseTestUploadForm
                key={`upload-${componentKey}`}
                filters={filters}
                testExists={testExists}
                onUploadSuccess={handleUploadSuccess}
              />
            )}

            {!allFiltersSelected && (
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-blue-700">
                    <Upload className="w-5 h-5" />
                    <span>Select Filters to Upload Surprise Test</span>
                  </CardTitle>
                  <CardDescription className="text-blue-600">
                    Please select all the required filters above to upload a surprise test
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-blue-700">
                    <p>• Academic Year: Select the current academic year</p>
                    <p>• Year: Choose 2nd, 3rd, or 4th year</p>
                    <p>• Semester: Select the appropriate semester for the chosen year</p>
                    <p>• Section: Choose the section you teach</p>
                    <p>• Subject: Select the subject for this test</p>
                    <p>• Test No.: Choose test number (1, 2, or 3)</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="view" className="space-y-6">
            <SurpriseTestList refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="marks" className="space-y-6">
            <AssignmentMarksAllocation refreshTrigger={refreshTrigger} typeFilter="test" />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}


