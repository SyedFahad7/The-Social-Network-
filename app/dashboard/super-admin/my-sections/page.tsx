'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Users } from 'lucide-react';
import apiClient from '@/lib/api';

export default function SuperAdminMySections() {
  const router = useRouter();
  const [sections, setSections] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const backendUrl = process.env.NEXT_PUBLIC_API_URL;
    Promise.all([
      fetch(`${backendUrl}/sections/unique`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => { console.log('DEBUG sectionsRes:', data); return data; }),
      apiClient.getUsers({ role: 'teacher', limit: 1000 })
    ]).then(([sectionsRes, teachersRes]) => {
      setSections(sectionsRes.sections || []);
      setTeachers(teachersRes.data.users || []);
    }).finally(() => setLoading(false));
  }, []);

  // Sort sections by year and section
  const sortedSections = [...sections].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.section.localeCompare(b.section);
  });
  // Filtering logic
  const filteredSections = sortedSections.filter(s => {
    return (!yearFilter || String(s.year) === yearFilter) && (!sectionFilter || s.section === sectionFilter);
  });

  // Helper to find CT for a section
  const findCT = (section: any) => {
    for (const teacher of teachers) {
      if (teacher.classTeacherAssignments && teacher.classTeacherAssignments.some((a: any) =>
        a.section === section.section &&
        a.year === section.year &&
        a.semester === section.semester &&
        String(a.academicYear?._id || a.academicYear) === String(section.academicYear)
      )) {
        return teacher;
      }
    }
    return null;
  };

  return (
    <DashboardLayout role="super-admin">
      <div className="container mx-auto py-8 px-8">
        <h1 className="text-3xl font-bold mb-6">All Sections</h1>
        <Card>
          <CardContent>
            <div className="flex flex-col gap-2 w-full p-4">
              <div className="flex flex-wrap gap-2 mb-2">
                <select className="border rounded px-2 py-1" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
                  <option value="">All Years</option>
                  {[2,3,4].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="Filter by section..."
                  className="border rounded px-2 py-1"
                  value={sectionFilter}
                  onChange={e => setSectionFilter(e.target.value.toUpperCase())}
                  style={{ width: 150 }}
                />
              </div>
              <div className="overflow-x-auto rounded-lg border w-full max-w-full">
                <table className="min-w-full divide-y divide-gray-200 bg-white text-sm md:text-base">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">S.No</th>
                      <th className="text-left border px-2 py-1">Section</th>
                      <th className="text-left border px-2 py-1">Year</th>
                      <th className="text-left border px-2 py-1">Semester</th>
                      <th className="text-left border px-2 py-1">Class Teacher</th>
                      <th className="text-center border px-2 py-1">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSections.map((section, idx) => {
                      const ct = findCT(section);
                      return (
                        <tr key={idx} className="hover:bg-blue-50 transition">
                          <td className="px-4 py-2 text-sm text-gray-700">{idx + 1}</td>
                          <td className="border px-2 py-1">{section.section}</td>
                          <td className="border px-2 py-1">{section.year}</td>
                          <td className="border px-2 py-1">{section.semester}</td>
                          <td className="border px-2 py-1">{ct ? `${ct.firstName} ${ct.lastName}` : <span className="text-gray-400">Unassigned</span>}</td>
                          <td className="border px-2 py-1 text-center">
                            <Button size="sm" onClick={() => {
                              const key = `${section.year}-${section.section}-${section.academicYear}`;
                              window.location.href = `/dashboard/super-admin/my-sections/${encodeURIComponent(key)}`;
                            }}>Manage</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {loading && <div className="text-center py-4">Loading...</div>}
              {!loading && filteredSections.length === 0 && <div className="text-center py-4 text-gray-500">No sections found.</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 