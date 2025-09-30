"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Role = "student" | "teacher";

interface CurrentUser {
  _id: string;
  role: string;
  department: string; // ObjectId string
  email: string;
}

export default function AddUsersPage() {
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Role | "">("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password] = useState("student@123");
  const [rollNumber, setRollNumber] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [empLoading, setEmpLoading] = useState(false);
  const [section, setSection] = useState<"A" | "B" | "C" | "">("");
  const [deptName, setDeptName] = useState<string>("");
  const [submitHint, setSubmitHint] = useState<string>("");
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [semester, setSemester] = useState<string>("");
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [successDialog, setSuccessDialog] = useState<{ open: boolean; name: string; role: string }>({ open: false, name: "", role: "" });

  // Load current user from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const u = localStorage.getItem("user");
      if (u) {
        try { setCurrentUser(JSON.parse(u)); } catch {}
      }
    }
  }, []);

  // Fetch department name and academic years
  useEffect(() => {
    const fetchDept = async () => {
      if (!currentUser) return;
      try {
        const res = await apiClient.getDepartmentById(currentUser.department);
        if (res?.success) setDeptName(res.data?.name || "");
      } catch {}
    };
    fetchDept();
  }, [currentUser]);

  // Fetch academic years on mount
  useEffect(() => {
    apiClient.getAcademicYears?.().then(res => {
      if (res?.success) {
        setAcademicYears(res.data);
        // Set default to latest active academic year
        const activeYear = res.data.find((y: any) => y.active);
        if (activeYear) {
          setSelectedAcademicYear(activeYear._id);
        }
      }
    });
  }, []);

  // Auto-generate next EMP id for teacher
  useEffect(() => {
    const generateNextEmp = async () => {
      if (!currentUser || activeTab !== "teacher") return;
      try {
        setEmpLoading(true);
        const res = await apiClient.getUsers({ role: "teacher" });
        if (res?.success) {
          const teachers = (res.data.users || []).filter((t: any) => String(t.department) === String(currentUser.department));
          // Extract numeric suffix from existing EMP IDs
          let maxNum = 0;
          teachers.forEach((t: any) => {
            const m = (t.employeeId || "").match(/EMP(\d{3})/i);
            if (m) {
              const n = parseInt(m[1], 10);
              if (!isNaN(n)) maxNum = Math.max(maxNum, n);
            }
          });
          const next = (maxNum + 1).toString().padStart(3, "0");
          setEmployeeId(`EMP${next}`);
        } else {
          setEmployeeId("EMP001");
        }
      } catch {
        setEmployeeId("EMP001");
      } finally {
        setEmpLoading(false);
      }
    };
    generateNextEmp();
  }, [currentUser, activeTab]);

  // Fetch semesters when year or academic year changes
  useEffect(() => {
    if (selectedAcademicYear && year) {
      const yearLabel = year + (year === "2" ? "nd" : year === "3" ? "rd" : "th");
      const ay = academicYears.find((y: any) => y._id === selectedAcademicYear);
      if (ay && ay.currentSemesterMap) {
        const sem = ay.currentSemesterMap[yearLabel];
        if (sem) {
          setSemester(sem.toString());
        }
      }
    }
  }, [selectedAcademicYear, year, academicYears]);

  // Fetch students for sections dropdown when year changes
  useEffect(() => {
    if (!currentUser || !year) {
      setAllStudents([]);
      setAvailableSections([]);
      setSection("");
      return;
    }
    
    apiClient.getUsers({
      role: "student",
      department: currentUser.department,
      year: parseInt(year),
      limit: 1000
    }).then(res => {
      if (res?.success && res.data?.users) {
        setAllStudents(res.data.users);
        // Extract unique sections from existing students
        const uniqueSections = Array.from(new Set(res.data.users.map((s: any) => s.section)))
          .filter((section): section is string => Boolean(section))
          .sort();
        setAvailableSections(uniqueSections);
        // Only reset section if current selection is not available AND it's not a "create new" selection
        if (section && !uniqueSections.includes(section) && !section.match(/^[A-Z]$/)) {
          setSection("");
        }
      } else {
        setAllStudents([]);
        setAvailableSections([]);
        setSection("");
      }
    }).catch(() => {
      setAllStudents([]);
      setAvailableSections([]);
      setSection("");
    });
  }, [currentUser, year]); // Removed section from dependencies to prevent reset loop

  const emailValid = useMemo(() => /@lords\.ac\.in$/i.test(email), [email]);

  // Helper to get next section letter
  const getNextSectionLetter = () => {
    if (availableSections.length === 0) return "A";
    const lastSection = availableSections[availableSections.length - 1];
    const nextCharCode = lastSection.charCodeAt(0) + 1;
    return String.fromCharCode(nextCharCode);
  };

  const canSubmit = useMemo(() => {
    if (!currentUser) return false;
    if (!activeTab) return false;
    if (!firstName.trim() || !lastName.trim() || !emailValid) return false;
    if (activeTab === "student" && (!rollNumber.trim() || !section || !selectedAcademicYear || !year || !semester)) return false;
    if (activeTab === "teacher" && !employeeId.trim()) return false;
    return true;
  }, [currentUser, activeTab, firstName, lastName, emailValid, rollNumber, employeeId, section, selectedAcademicYear, year, semester]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!emailValid) {
      toast({ title: "Invalid email", description: "Email must end with @lords.ac.in", variant: "destructive" });
      return;
    }
    if (!activeTab) {
      setSubmitHint("Select a role tab to proceed");
      setTimeout(() => setSubmitHint(""), 3000);
      return;
    }
    if (!canSubmit) {
      setSubmitHint("Please complete all required fields");
      setTimeout(() => setSubmitHint(""), 3000);
      return;
    }
    try {
      setLoading(true);
      const userPayload: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: activeTab,
        department: currentUser.department,
        isActive: true
      };
      if (activeTab === "student") {
        userPayload.rollNumber = rollNumber.trim();
        userPayload.section = section;
        userPayload.academicYear = selectedAcademicYear;
        userPayload.year = parseInt(year);
        userPayload.currentSemester = parseInt(semester);
      } else if (activeTab === "teacher") {
        userPayload.employeeId = employeeId.trim();
      }
      const res = await apiClient.createUser(userPayload);
      if (res?.success) {
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        const roleName = activeTab === "teacher" ? "Teacher" : "Student";
        setSuccessDialog({ open: true, name: fullName, role: roleName });
        
        // Reset form
        setFirstName("");
        setLastName("");
        setEmail("");
        setRollNumber("");
        setSection("");
        setYear("");
        setSemester("");
        // Regenerate EMP for next teacher
        if (activeTab === "teacher") {
          const num = parseInt(employeeId.replace(/\D/g, ""), 10) + 1;
          setEmployeeId(`EMP${num.toString().padStart(3, "0")}`);
        }
      } else {
        throw new Error(res?.message || "Failed to create user");
      }
    } catch (err) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Could not create user", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="super-admin">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Add Users</h1>
            <p className="text-gray-600">Create students and teachers in your department</p>
          </div>
          {(deptName || currentUser) && (
            <Badge variant="outline" className="text-xs">
              Dept: {deptName || String(currentUser?.department)}
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="w-5 h-5" />
              <span>Add Users</span>
            </CardTitle>
            <CardDescription>All users are restricted to your department automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="student">Add Student</TabsTrigger>
                <TabsTrigger value="teacher">Add Teacher</TabsTrigger>
              </TabsList>

              <TabsContent value="student" className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Email (@lords.ac.in)</Label>
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rollnumber@lords.ac.in" />
                    </div>
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Roll Number</Label>
                      <Input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="e.g., 160922750153" />
                    </div>
                    <div className="space-y-2">
                      <Label>Academic Year</Label>
                      <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select academic year" />
                        </SelectTrigger>
                        <SelectContent>
                          {academicYears.map((ay: any) => (
                            <SelectItem key={ay._id} value={ay._id}>{ay.yearLabel}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Select value={year} onValueChange={setYear}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2nd Year</SelectItem>
                          <SelectItem value="3">3rd Year</SelectItem>
                          <SelectItem value="4">4th Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Semester</Label>
                      <Input value={semester} readOnly placeholder="Auto-filled based on year" />
                    </div>
                    <div className="space-y-2">
                      <Label>Section</Label>
                      <Select value={section} onValueChange={(v: any) => setSection(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSections.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                          {availableSections.length > 0 && (
                            <SelectItem value={getNextSectionLetter()}>
                              Create new section {getNextSectionLetter()}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Default Password</Label>
                      <Input value={password} readOnly />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      Users will be limited to your department and can change password after first login.
                    </div>
                    <div className="flex items-center gap-3">
                      {submitHint && <span className="text-xs text-red-600">{submitHint}</span>}
                      <Button type="submit" disabled={!canSubmit || loading} className="bg-green-600 hover:bg-green-700">
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                        Create Student
                      </Button>
                    </div>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="teacher" className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Email (@lords.ac.in)</Label>
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@lords.ac.in" />
                    </div>
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Employee ID (auto)</Label>
                      <div className="flex items-center gap-2">
                        <Input value={employeeId} readOnly placeholder="EMP001" />
                        {empLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Default Password</Label>
                      <Input value={password} readOnly />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      Users will be limited to your department and can change password after first login.
                    </div>
                    <div className="flex items-center gap-3">
                      {submitHint && <span className="text-xs text-red-600">{submitHint}</span>}
                      <Button type="submit" disabled={!canSubmit || loading} className="bg-green-600 hover:bg-green-700">
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                        Create Teacher
                      </Button>
                    </div>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Success Dialog */}
        <Dialog open={successDialog.open} onOpenChange={(open) => setSuccessDialog({ open, name: "", role: "" })}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-green-600" />
                </div>
                Success!
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-lg font-medium text-gray-900">
                {successDialog.role} <span className="text-blue-600">{successDialog.name}</span> has been added successfully!
              </p>
              <p className="text-sm text-gray-600 mt-2">
                The user can now log in with their email and the default password.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setSuccessDialog({ open: false, name: "", role: "" })} className="w-full">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}


