import { useState, useEffect } from 'react';

export interface Section {
  id: string;
  name: string;
  subject: string;
  code: string;
  teacherId: string;
  teacherName: string;
  maxStudents: number;
  currentStudents: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export function useSections() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data - replace with API calls
  useEffect(() => {
    const fetchSections = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockSections: Section[] = [
          {
            id: 'section-a',
            name: 'Section A',
            subject: 'Data Structures',
            code: 'CS301',
            teacherId: 'teacher-1',
            teacherName: 'Dr. John Smith',
            maxStudents: 50,
            currentStudents: 52,
            status: 'active',
            createdAt: '2025-01-01'
          },
          {
            id: 'section-b',
            name: 'Section B',
            subject: 'Database Management',
            code: 'CS302',
            teacherId: 'teacher-2',
            teacherName: 'Prof. Sarah Wilson',
            maxStudents: 50,
            currentStudents: 48,
            status: 'active',
            createdAt: '2025-01-02'
          },
          {
            id: 'section-c',
            name: 'Section C',
            subject: 'Web Development',
            code: 'CS303',
            teacherId: 'teacher-3',
            teacherName: 'Dr. Mike Johnson',
            maxStudents: 50,
            currentStudents: 56,
            status: 'active',
            createdAt: '2025-01-03'
          }
        ];
        
        setSections(mockSections);
        setError(null);
      } catch (err) {
        setError('Failed to fetch sections');
        console.error('Error fetching sections:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, []);

  const createSection = async (sectionData: Omit<Section, 'id' | 'createdAt' | 'currentStudents'>) => {
    try {
      const newSection: Section = {
        ...sectionData,
        id: `section-${Date.now()}`,
        currentStudents: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };
      
      setSections(prev => [...prev, newSection]);
      return newSection;
    } catch (err) {
      setError('Failed to create section');
      throw err;
    }
  };

  const updateSection = async (id: string, updates: Partial<Section>) => {
    try {
      setSections(prev => prev.map(section => 
        section.id === id ? { ...section, ...updates } : section
      ));
    } catch (err) {
      setError('Failed to update section');
      throw err;
    }
  };

  const deleteSection = async (id: string) => {
    try {
      setSections(prev => prev.filter(section => section.id !== id));
    } catch (err) {
      setError('Failed to delete section');
      throw err;
    }
  };

  const getSectionById = (id: string) => {
    return sections.find(section => section.id === id);
  };

  const getSectionsByTeacher = (teacherId: string) => {
    return sections.filter(section => section.teacherId === teacherId);
  };

  const getActiveSections = () => {
    return sections.filter(section => section.status === 'active');
  };

  return {
    sections,
    loading,
    error,
    createSection,
    updateSection,
    deleteSection,
    getSectionById,
    getSectionsByTeacher,
    getActiveSections
  };
} 