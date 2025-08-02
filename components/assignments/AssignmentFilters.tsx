"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AssignmentFiltersProps {
  onFiltersChange: (filters: any) => void;
  onAssignmentNumberCheck: (exists: boolean, assignment?: any) => void;
}

export default function AssignmentFilters({
  onFiltersChange,
  onAssignmentNumberCheck,
}: AssignmentFiltersProps) {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("");
  const [years] = useState([2, 3, 4]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [semesters, setSemesters] = useState<any[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [assignmentNumbers] = useState([1, 2, 3]);
  const [selectedAssignmentNumber, setSelectedAssignmentNumber] =
    useState<string>("");
  const [loading, setLoading] = useState(false);
  const [assignmentExists, setAssignmentExists] = useState<boolean | null>(
    null
  );
  const [existingAssignment, setExistingAssignment] = useState<any>(null);
  const [teachingAssignments, setTeachingAssignments] = useState<any[]>([]);
  const { toast } = useToast();

  // Fetch academic years on mount
  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        const response = await apiClient.getAcademicYears();
        if (response?.success) {
          setAcademicYears(response.data);
        }
      } catch (error) {
        console.error("Error fetching academic years:", error);
      }
    };
    fetchAcademicYears();
  }, []);

  // Update semesters when year changes
  useEffect(() => {
    if (selectedYear) {
      const year = parseInt(selectedYear);
      let availableSemesters: number[] = [];

      if (year === 2) {
        availableSemesters = [3, 4];
      } else if (year === 3) {
        availableSemesters = [5, 6];
      } else if (year === 4) {
        availableSemesters = [7, 8];
      }

      setSemesters(
        availableSemesters.map((sem) => ({
          value: sem.toString(),
          label: `Semester ${sem}`,
        }))
      );
      setSelectedSemester("");
      setSections([]);
      setSelectedSection("");
      setSubjects([]);
      setSelectedSubject("");
      setSelectedAssignmentNumber("");
      setAssignmentExists(null);
      setExistingAssignment(null);
    }
  }, [selectedYear]);

  // Fetch sections when semester changes
  useEffect(() => {
    if (selectedAcademicYear && selectedYear && selectedSemester) {
      fetchSections();
    }
  }, [selectedAcademicYear, selectedYear, selectedSemester]);

  // Fetch subjects when section changes
  useEffect(() => {
    if (
      selectedAcademicYear &&
      selectedYear &&
      selectedSemester &&
      selectedSection
    ) {
      fetchSubjects();
    }
  }, [selectedAcademicYear, selectedYear, selectedSemester, selectedSection]);

  // Check assignment number when all filters are selected
  useEffect(() => {
    if (
      selectedAcademicYear &&
      selectedYear &&
      selectedSemester &&
      selectedSection &&
      selectedSubject &&
      selectedAssignmentNumber
    ) {
      checkAssignmentNumber();
    }
  }, [
    selectedAcademicYear,
    selectedYear,
    selectedSemester,
    selectedSection,
    selectedSubject,
    selectedAssignmentNumber,
  ]);

  const fetchSections = async () => {
    try {
      setLoading(true);

      // Get user from localStorage
      const user =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("user") || "{}")
          : {};
      if (!user._id) {
        user._id = user.id; // Patch: map id to _id if needed
      }

      if (!user._id) {
        throw new Error("User not found");
      }

      const backendUrl = process.env.NEXT_PUBLIC_API_URL;
      const url = `${backendUrl}/users/${user._id}/assignments`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();

      console.log("[ASSIGNMENT FILTERS] Response data:", data);

      // The assignments endpoint returns data directly, not wrapped in success
      const assignments = data.teachingAssignments || [];
      setTeachingAssignments(assignments);

      // Filter sections for the selected year and semester
      const filteredSections = assignments.filter(
        (assignment: any) =>
          String(assignment.academicYear?._id || assignment.academicYear) ===
            String(selectedAcademicYear) &&
          String(assignment.year) === String(selectedYear) &&
          String(assignment.semester) === String(selectedSemester)
      );

      console.log("[ASSIGNMENT FILTERS] Filtered sections:", filteredSections);

      // Get unique sections
      const uniqueSections = Array.from(
        new Set(filteredSections.map((assignment: any) => assignment.section))
      ).filter(Boolean);

      console.log("[ASSIGNMENT FILTERS] Unique sections:", uniqueSections);

      setSections(
        uniqueSections.map((section) => ({
          value: section,
          label: `Section ${section}`,
        }))
      );
    } catch (error) {
      console.error("Error fetching sections:", error);
      toast({
        title: "Error",
        description: "Failed to fetch sections",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      console.log(
        "[ASSIGNMENT FILTERS] Fetching subjects for section:",
        selectedSection
      );

      // Filter assignments for the selected section
      const filteredAssignments = teachingAssignments.filter(
        (assignment: any) =>
          String(assignment.section) === String(selectedSection) &&
          String(assignment.year) === String(selectedYear) &&
          String(assignment.semester) === String(selectedSemester) &&
          String(assignment.academicYear?._id || assignment.academicYear) ===
            String(selectedAcademicYear)
      );

      console.log(
        "[ASSIGNMENT FILTERS] Filtered assignments for subjects:",
        filteredAssignments
      );

      // Get subjects from filtered assignments
      const sectionSubjects = filteredAssignments
        .map((assignment: any) => assignment.subject)
        .filter(Boolean);

      console.log("[ASSIGNMENT FILTERS] Section subjects:", sectionSubjects);
      console.log(
        "[ASSIGNMENT FILTERS] First subject structure:",
        sectionSubjects[0]
      );

      // Check if subjects are populated or just ObjectIds
      const uniqueSubjects = Array.from(
        new Map(
          sectionSubjects.map((subject: any) => {
            // If subject is just an ObjectId string, we need to handle it differently
            if (typeof subject === "string") {
              return [
                subject,
                { _id: subject, name: "Unknown Subject", code: subject },
              ];
            }
            // If subject is an object with _id
            return [subject._id, subject];
          })
        ).values()
      );

      console.log("[ASSIGNMENT FILTERS] Unique subjects:", uniqueSubjects);

      setSubjects(
        uniqueSubjects.map((subject: any) => ({
          value: subject.code || subject._id,
          label: `${subject.name || "Unknown Subject"} (${
            subject.code || subject._id
          })`,
        }))
      );
    } catch (error) {
      console.error("Error fetching subjects:", error);
      toast({
        title: "Error",
        description: "Failed to fetch subjects",
        variant: "destructive",
      });
    }
  };

  const checkAssignmentNumber = async () => {
    try {
      const params = {
        subject: selectedSubject,
        sections: selectedSection,
        year: selectedYear,
        semester: selectedSemester,
        academicYear: selectedAcademicYear,
        assignmentNumber: selectedAssignmentNumber,
      };

      const response = await apiClient.checkAssignmentNumber(params);

      if (response?.success) {
        const exists = response.data.exists;
        setAssignmentExists(exists);
        setExistingAssignment(response.data.assignment);
        onAssignmentNumberCheck(exists, response.data.assignment);

        if (exists) {
          toast({
            title: "Assignment Already Exists",
            description: `Assignment ${selectedAssignmentNumber} already uploaded for ${selectedSubject} Section ${selectedSection}`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error checking assignment number:", error);
      toast({
        title: "Error",
        description: "Failed to check assignment number",
        variant: "destructive",
      });
    }
  };

  const resetFilters = () => {
    setSelectedAcademicYear("");
    setSelectedYear("");
    setSelectedSemester("");
    setSelectedSection("");
    setSelectedSubject("");
    setSelectedAssignmentNumber("");
    setAssignmentExists(null);
    setExistingAssignment(null);
    setSections([]);
    setSubjects([]);
    setSemesters([]);
    setTeachingAssignments([]);
    onFiltersChange({});
    onAssignmentNumberCheck(false);
  };

  const handleFilterChange = (filterType: string, value: string) => {
    switch (filterType) {
      case "academicYear":
        setSelectedAcademicYear(value);
        setSelectedYear("");
        setSelectedSemester("");
        setSelectedSection("");
        setSelectedSubject("");
        setSelectedAssignmentNumber("");
        break;
      case "year":
        setSelectedYear(value);
        break;
      case "semester":
        setSelectedSemester(value);
        break;
      case "section":
        console.log("[ASSIGNMENT FILTERS] Setting selectedSection to:", value);
        setSelectedSection(value);
        setSelectedSubject("");
        setSelectedAssignmentNumber("");
        break;
      case "subject":
        setSelectedSubject(value);
        setSelectedAssignmentNumber("");
        break;
      case "assignmentNumber":
        setSelectedAssignmentNumber(value);
        break;
    }

    // Update parent component with current filters
    const currentFilters = {
      academicYear: selectedAcademicYear,
      year: selectedYear,
      semester: selectedSemester,
      section: selectedSection,
      subject: selectedSubject,
      assignmentNumber: selectedAssignmentNumber,
    };
    onFiltersChange(currentFilters);
  };

  const allFiltersSelected =
    selectedAcademicYear &&
    selectedYear &&
    selectedSemester &&
    selectedSection &&
    selectedSubject;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Filter className="w-5 h-5" />
          <span>Assignment Filters</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Academic Year */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Academic Year</label>
            <Select
              value={selectedAcademicYear}
              onValueChange={(value) =>
                handleFilterChange("academicYear", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Academic Year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year._id} value={year._id}>
                    {year.yearLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Year</label>
            <Select
              value={selectedYear}
              onValueChange={(value) => handleFilterChange("year", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year} Year
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Semester */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Semester</label>
            <Select
              value={selectedSemester}
              onValueChange={(value) => handleFilterChange("semester", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Semester" />
              </SelectTrigger>
              <SelectContent>
                {semesters.map((semester) => (
                  <SelectItem key={semester.value} value={semester.value}>
                    {semester.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Section</label>
            <Select
              value={selectedSection}
              onValueChange={(value) => handleFilterChange("section", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.value} value={section.value}>
                    {section.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject</label>
            <Select
              value={selectedSubject}
              onValueChange={(value) => handleFilterChange("subject", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.value} value={subject.value}>
                    {subject.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignment Number */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Assignment No.</label>
            <Select
              value={selectedAssignmentNumber}
              onValueChange={(value) =>
                handleFilterChange("assignmentNumber", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Assignment No." />
              </SelectTrigger>
              <SelectContent>
                {assignmentNumbers.map((number) => (
                  <SelectItem key={number} value={number.toString()}>
                    {number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Assignment Status */}
        {allFiltersSelected && selectedAssignmentNumber && (
          <div className="mt-4 p-3 rounded-lg border">
            {assignmentExists ? (
              <div className="flex items-center space-x-2">
                <Badge variant="destructive">Assignment Already Exists</Badge>
                <span className="text-sm text-gray-600">
                  Assignment {selectedAssignmentNumber} already uploaded for{" "}
                  {selectedSubject} Section {selectedSection}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Badge variant="default">Available</Badge>
                <span className="text-sm text-gray-600">
                  Assignment {selectedAssignmentNumber} is available for upload
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={resetFilters} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
