// API configuration for the Social Network frontend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// API client with authentication
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    // Get token from localStorage if available
    this.token = null;
    if (typeof window !== 'undefined') {
      try {
        this.token = localStorage.getItem('token');
      } catch (error) {
        console.warn('Could not access localStorage:', error);
      }
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Refresh token from localStorage if we're in browser
    if (typeof window !== 'undefined' && !this.token) {
      try {
        this.token = localStorage.getItem('token');
      } catch (error) {
        console.warn('Could not access localStorage:', error);
      }
    }
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Authentication methods
  async login(email: string, password: string, role: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });

    if (response.success && response.data.token) {
      this.token = response.data.token;
      localStorage.setItem('token', this.token!);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
  }

  // User management methods
  async getUsers(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/users?${queryString}`);
  }

  async createUser(userData: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getUserById(id: string) {
    return this.request(`/users/${id}`);
  }

  async updateUser(id: string, userData: any) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getUserStats() {
    return this.request('/users/stats');
  }

  // Assignment methods
  async getAssignments(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/assignments?${queryString}`);
  }

  async createAssignment(assignmentData: any) {
    return this.request('/assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  }

  async getAssignmentById(id: string) {
    return this.request(`/assignments/${id}`);
  }

  async updateAssignmentSubmission(id: string, submissionData: any) {
    return this.request(`/assignments/${id}/submission`, {
      method: 'PUT',
      body: JSON.stringify(submissionData),
    });
  }

  async updateAssignment(id: string, assignmentData: any) {
    return this.request(`/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(assignmentData),
    });
  }

  async deleteAssignment(id: string) {
    return this.request(`/assignments/${id}`, {
      method: 'DELETE',
    });
  }

  // Attendance methods
  async getAttendance(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/attendance?${queryString}`);
  }

  async markAttendance(attendanceData: any) {
    return this.request('/attendance', {
      method: 'POST',
      body: JSON.stringify(attendanceData),
    });
  }

  async getStudentAttendanceStats(studentId: string) {
    return this.request(`/attendance/student/${studentId}/stats`);
  }

  async updateAttendance(id: string, attendanceData: any) {
    return this.request(`/attendance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(attendanceData),
    });
  }

  async finalizeAttendance(id: string) {
    return this.request(`/attendance/${id}/finalize`, {
      method: 'PUT',
    });
  }

  // Timetable methods
  async getTimetable(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/timetable?${queryString}`);
  }

  async createTimetableSlot(slotData: any) {
    return this.request('/timetable', {
      method: 'POST',
      body: JSON.stringify(slotData),
    });
  }

  async updateTimetableSlot(id: string, slotData: any) {
    return this.request(`/timetable/${id}`, {
      method: 'PUT',
      body: JSON.stringify(slotData),
    });
  }

  async deleteTimetableSlot(id: string) {
    return this.request(`/timetable/${id}`, {
      method: 'DELETE',
    });
  }

  // Certificate methods
  async getCertificates(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/certificates?${queryString}`);
  }

  async uploadCertificate(certificateData: any) {
    return this.request('/certificates', {
      method: 'POST',
      body: JSON.stringify(certificateData),
    });
  }

  async approveCertificate(id: string, approvalData: any) {
    return this.request(`/certificates/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify(approvalData),
    });
  }

  async rejectCertificate(id: string, rejectionData: any) {
    return this.request(`/certificates/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify(rejectionData),
    });
  }

  async getCertificateStats() {
    return this.request('/certificates/stats');
  }

  // Feedback methods
  async getFeedback(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/feedback?${queryString}`);
  }

  async createFeedback(feedbackData: any) {
    return this.request('/feedback', {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    });
  }

  async submitFeedbackResponse(id: string, responseData: any) {
    return this.request(`/feedback/${id}/response`, {
      method: 'POST',
      body: JSON.stringify(responseData),
    });
  }

  async getFeedbackResponses(id: string, params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/feedback/${id}/responses?${queryString}`);
  }

  async activateFeedback(id: string) {
    return this.request(`/feedback/${id}/activate`, {
      method: 'PUT',
    });
  }

  // Department methods
  async getDepartments() {
    return this.request('/departments');
  }

  async getDepartmentById(id: string) {
    return this.request(`/departments/${id}`);
  }

  async createDepartment(departmentData: any) {
    return this.request('/departments', {
      method: 'POST',
      body: JSON.stringify(departmentData),
    });
  }

  async updateDepartment(id: string, departmentData: any) {
    return this.request(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(departmentData),
    });
  }

  async getDepartmentStats(id: string) {
    return this.request(`/departments/${id}/stats`);
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }

  // Section methods
  async getSections(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/sections?${queryString}`);
  }

  async getSectionById(id: string) {
    return this.request(`/sections/${id}`);
  }

  async createSection(sectionData: any) {
    return this.request('/sections', {
      method: 'POST',
      body: JSON.stringify(sectionData),
    });
  }

  async updateSection(id: string, sectionData: any) {
    return this.request(`/sections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sectionData),
    });
  }

  async deleteSection(id: string) {
    return this.request(`/sections/${id}`, {
      method: 'DELETE',
    });
  }

  async getTeacherSections(teacherId: string) {
    return this.request(`/sections/teacher/${teacherId}`);
  }

  // Test methods
  async getTests(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/tests?${queryString}`);
  }

  async getTestById(id: string) {
    return this.request(`/tests/${id}`);
  }

  async createTest(testData: any) {
    return this.request('/tests', {
      method: 'POST',
      body: JSON.stringify(testData),
    });
  }

  async updateTest(id: string, testData: any) {
    return this.request(`/tests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(testData),
    });
  }

  async deleteTest(id: string) {
    return this.request(`/tests/${id}`, {
      method: 'DELETE',
    });
  }

  // Question Bank methods
  async getQuestionBanks(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/questionbanks?${queryString}`);
  }

  async getQuestionBankById(id: string) {
    return this.request(`/questionbanks/${id}`);
  }

  async createQuestionBank(questionBankData: any) {
    return this.request('/questionbanks', {
      method: 'POST',
      body: JSON.stringify(questionBankData),
    });
  }

  async updateQuestionBank(id: string, questionBankData: any) {
    return this.request(`/questionbanks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(questionBankData),
    });
  }

  async deleteQuestionBank(id: string) {
    return this.request(`/questionbanks/${id}`, {
      method: 'DELETE',
    });
  }

  async incrementDownloads(id: string) {
    return this.request(`/questionbanks/${id}/download`, {
      method: 'PUT',
    });
  }

  async getAcademicYears() {
    return this.request('/academic-years');
  }

  async getSubjects(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/subjects?${queryString}`);
  }

  // Student daily attendance
  async getStudentDailyAttendance(date: string) {
    return this.request(`/attendance/student/daily?date=${date}`);
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export individual methods for convenience
export const {
  login,
  logout,
  getCurrentUser,
  changePassword,
  getUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats,
  getAssignments,
  createAssignment,
  getAssignmentById,
  updateAssignmentSubmission,
  updateAssignment,
  deleteAssignment,
  getAttendance,
  markAttendance,
  getStudentAttendanceStats,
  updateAttendance,
  finalizeAttendance,
  getTimetable,
  createTimetableSlot,
  updateTimetableSlot,
  deleteTimetableSlot,
  getCertificates,
  uploadCertificate,
  approveCertificate,
  rejectCertificate,
  getCertificateStats,
  getFeedback,
  createFeedback,
  submitFeedbackResponse,
  getFeedbackResponses,
  activateFeedback,
  healthCheck,
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  getDepartmentStats,
  getSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection,
  getTeacherSections,
  getTests,
  getTestById,
  createTest,
  updateTest,
  deleteTest,
  getQuestionBanks,
  getQuestionBankById,
  createQuestionBank,
  updateQuestionBank,
  deleteQuestionBank,
  incrementDownloads,
  getAcademicYears,
  getSubjects,
  getStudentDailyAttendance
} = apiClient;

export default apiClient;