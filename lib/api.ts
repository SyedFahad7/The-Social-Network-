// API configuration for the Social Network frontend
// Always use the environment variable for API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

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
        // Instead of throwing, return a consistent error object
        return { success: false, ...data };
      }

      return data;
    } catch (error) {
      // Only throw for network errors
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

  // Password reset (forgot password) methods
  async requestPasswordReset(email: string) {
    return this.request('/auth/request-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyOtp(email: string, otp: string) {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
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

  // Attendance summary (public)
  async getAttendanceSummary(params: { section: string, year: string|number, academicYear: string, startDate: string, endDate: string }) {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request(`/attendance/summary?${queryString}`);
  }
  getBaseUrl() {
    return this.baseURL;
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

  // Faculty Assignment methods
  async getTeacherAssignments(teacherId: string) {
    return this.request(`/users/${teacherId}/assignments`);
  }
  async addTeachingAssignment(teacherId: string, assignment: any) {
    return this.request(`/users/${teacherId}/teaching-assignment`, {
      method: 'POST',
      body: JSON.stringify(assignment),
    });
  }
  async removeTeachingAssignment(teacherId: string, assignment: any) {
    return this.request(`/users/${teacherId}/teaching-assignment`, {
      method: 'DELETE',
      body: JSON.stringify(assignment),
    });
  }
  async addClassTeacherAssignment(teacherId: string, assignment: any) {
    return this.request(`/users/${teacherId}/class-teacher-assignment`, {
      method: 'POST',
      body: JSON.stringify(assignment),
    });
  }
  async removeClassTeacherAssignment(teacherId: string, assignment: any) {
    return this.request(`/users/${teacherId}/class-teacher-assignment`, {
      method: 'DELETE',
      body: JSON.stringify(assignment),
    });
  }
  async classTeacherExists(params: { section: string; year: string | number; semester: string | number; academicYear: string }) {
    const query = new URLSearchParams(params as any).toString();
    return fetch(`${this.baseURL}/users/class-teacher-exists?${query}`).then((res) => res.json());
  }

  // Live users (super-admin)
  async getLiveUsers() {
    return this.request('/auth/live-users');
  }

  // Notification methods
  async sendNotification(notificationData: any) {
    return this.request('/notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData),
    });
  }

  async getNotifications(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/notifications?${queryString}`);
  }

  async getUnreadNotificationCount() {
    return this.request('/notifications/unread-count');
  }

  async markNotificationAsRead(notificationId: string) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsAsRead() {
    return this.request('/notifications/read-all', {
      method: 'PUT',
    });
  }

  async getSentNotifications(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/notifications/sent?${queryString}`);
  }

  async getNotificationStats() {
    return this.request('/notifications/stats');
  }

  // FCM Token Management
  async updateFCMToken(fcmToken: string) {
    return this.request('/notifications/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ fcmToken }),
    });
  }

  async updatePushSettings(enabled: boolean) {
    return this.request('/notifications/push-settings', {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
  }

  // Profile picture upload
  async uploadProfilePicture(file: File) {
    const formData = new FormData();
    formData.append('picture', file);
    return fetch(`${this.baseURL}/users/upload-profile-picture`, {
      method: 'POST',
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` })
      },
      body: formData,
    }).then(res => res.json());
  }

  // Update bio and status
  async updateProfile(bio: string, status?: { emoji: string, text: string }) {
    return this.request('/users/update-profile', {
      method: 'POST',
      body: JSON.stringify(status ? { bio, status } : { bio }),
    });
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
  getAttendanceSummary,
  getBaseUrl,
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
  getStudentDailyAttendance,
  getTeacherAssignments,
  addTeachingAssignment,
  removeTeachingAssignment,
  addClassTeacherAssignment,
  removeClassTeacherAssignment,
  classTeacherExists,
  getLiveUsers,
  sendNotification,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getSentNotifications,
  getNotificationStats,
  updateFCMToken,
  updatePushSettings,
  requestPasswordReset,
  verifyOtp,
  resetPassword,
  uploadProfilePicture,
  updateProfile
} = apiClient;

export default apiClient;

export async function getUserAssignments(userId: string) {
  const url = `${API_BASE_URL}/users/${userId}/assignments`;
  console.log('DEBUG getUserAssignments: fetching', url);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
  });
  console.log('DEBUG getUserAssignments: response status', res.status);
  if (!res.ok) throw new Error('Failed to fetch user assignments');
  return res.json();
}