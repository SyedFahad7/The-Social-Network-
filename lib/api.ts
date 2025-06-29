// API configuration for the Social Network frontend
const API_BASE_URL = 'https://social-network-bwsf.onrender.com/api';

// API client with authentication
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    // Get token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
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

  // Health check
  async healthCheck() {
    return this.request('/health');
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
  healthCheck
} = apiClient;

export default apiClient;