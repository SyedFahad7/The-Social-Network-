'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

const SuperAdminStats = () => {
    const [teacherCount, setTeacherCount] = useState(0);
    const [studentCount, setStudentCount] = useState(0);

    useEffect(() => {
        async function fetchData() {
            try {
                const teachersResponse = await apiClient.getUsers({ role: 'teacher', limit: 1000 });
                const studentsResponse = await apiClient.getUsers({ role: 'student', limit: 1000 });

                if (teachersResponse.success) {
                    setTeacherCount(teachersResponse.data?.users?.length || 0);
                }

                if (studentsResponse.success) {
                    setStudentCount(studentsResponse.data?.users?.length || 0);
                }
            } catch (error: any) {
                console.error('Error fetching user data:', error);
            }
        }

        fetchData();
    }, []);

    return (
        <div>
            <h2>Super Admin Statistics</h2>
            <p>Total Teachers: {teacherCount}</p>
            <p>Total Students: {studentCount}</p>
        </div>
    );
};

export default SuperAdminStats;