// API configuration for the Social Network frontend
// Always use the environment variable for API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

// API client with authentication
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    console.log('DEBUG apiClient:', {
      token: this.token,
      baseURL: this.baseURL
    });
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
    
    // Debug logging
    console.log('DEBUG API Request:', {
      url,
      baseURL: this.baseURL,
      endpoint,
      options
    });
    
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

    console.log('DEBUG Request config:', config);

    try {
      const response = await fetch(url, config);
      console.log('DEBUG Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      const responseText = await response.text();
      console.log('DEBUG Response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('DEBUG JSON Parse Error:', parseError);
        console.error('DEBUG Response was not JSON:', responseText);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        // Handle token expiration specifically
        if (response.status === 401) {
          // Check if it's a token expiration error
          if (data.message?.includes('Token expired') || 
              data.message?.includes('Invalid token') ||
              data.message?.includes('Access denied')) {
            
            // Clear local storage
            if (typeof window !== 'undefined') {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
            
            // Dispatch custom event for auth context to handle
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('api-error', {
                detail: {
                  status: 401,
                  message: data.message,
                  endpoint
                }
              }));
            }
          }
        }
        
        // Return consistent error object
        return { success: false, ...data };
      }

      return data;
    } catch (error) {
      // Handle network errors
      console.error('API request error:', error);
      
      // If it's a network error and we have a token, it might be expired
      if (this.token && typeof window !== 'undefined') {
        // Check if token is actually expired
        try {
          const payload = JSON.parse(atob(this.token.split('.')[1]));
          const currentTime = Date.now() / 1000;
          
          if (payload.exp && payload.exp < currentTime) {
            // Token is expired, clear storage and dispatch event
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            window.dispatchEvent(new CustomEvent('api-error', {
              detail: {
                status: 401,
                message: 'Token expired',
                endpoint
              }
            }));
          }
        } catch (e) {
          // Token is malformed, clear it
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      
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

  async getFilteredAssignments(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/assignments/filtered?${queryString}`);
  }

  async getStudentAssignments() {
    return this.request('/assignments/student');
  }

  async checkAssignmentNumber(params: any) {
    // Convert sections array to JSON string for URL encoding
    const queryParams = { ...params };
    if (Array.isArray(queryParams.sections)) {
      queryParams.sections = JSON.stringify(queryParams.sections);
    }
    
    const queryString = new URLSearchParams(queryParams).toString();
    return this.request(`/assignments/check-number?${queryString}`);
  }

  async uploadAssignmentFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Get fresh token from localStorage
    let token = this.token;
    if (typeof window !== 'undefined') {
      try {
        token = localStorage.getItem('token');
      } catch (error) {
        console.warn('Could not access localStorage:', error);
      }
    }
    
    return this.request('/assignments/upload-file', {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData, let browser set it with boundary
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData
    });
  }

  async getTeachingAssignments() {
    return this.request('/assignments/teaching-assignments');
  }

  async createAssignment(assignmentData: any) {
    return this.request('/assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  }

  async createAssignmentWithFile(formData: FormData) {
    // Get fresh token from localStorage
    let token = this.token;
    if (typeof window !== 'undefined') {
      try {
        token = localStorage.getItem('token');
      } catch (error) {
        console.warn('Could not access localStorage:', error);
      }
    }
    
    return this.request('/assignments/with-file', {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData, let browser set it with boundary
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData
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

  async downloadAssignment(id: string) {
    console.log('Starting download for assignment:', id);
    
    const response = await fetch(`${this.baseURL}/assignments/${id}/download`, {
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      redirect: 'manual', // Don't follow redirects automatically
    });

    console.log('Response status:', response.status);

    // Check if we got a redirect response (302, 301, etc.)
    if (response.status >= 300 && response.status < 400) {
      const redirectUrl = response.headers.get('location');
      console.log('Redirect URL:', redirectUrl);
      if (redirectUrl) {
        console.log('Opening download URL in new tab');
        // Open the download URL in a new tab/window
        window.open(redirectUrl, '_blank');
        return { success: true };
      }
    }

    // If not a redirect, check for errors
    if (!response.ok) {
      console.log('Response not ok, status:', response.status);
      const errorData = await response.json().catch(() => ({}));
      console.log('Error data:', errorData);
      throw new Error(errorData.message || 'Failed to download assignment');
    }

    console.log('Returning blob response');
    return response.blob();
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

  // Get student attendance statistics
  async getStudentAttendanceStats(studentId: string) {
    return this.request(`/attendance/student/${studentId}/stats`);
  }

  // Get attendance statistics for current user
  async getAttendanceStats() {
    return this.request('/attendance/stats');
  }

  async getStudentStudyStreak() {
    return this.request('/attendance/student/streak');
  }

  async getStudentDailyAttendanceSummary(date?: string) {
    const params = date ? `?date=${date}` : '';
    return this.request(`/attendance/student/daily-summary${params}`);
  }

  async getStudentAttendanceStatsByDays(days: number = 30) {
    return this.request(`/attendance/student/stats?days=${days}`);
  }

  async recalculateStudentAttendance(startDate: string, endDate: string) {
    return this.request('/attendance/student/recalculate', {
      method: 'POST',
      body: JSON.stringify({ startDate, endDate }),
    });
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
    // If a specific certificate ID is provided, use the single certificate endpoint
    if (params.certificateId) {
      const certificateId = params.certificateId;
      delete params.certificateId; // Remove from params to avoid adding to query string
      return this.request(`/certificates/${certificateId}`);
    }
    
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/certificates?${queryString}`);
  }

  async getMyCertificates(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/certificates/my?${queryString}`);
  }

  async deleteCertificate(id: string) {
    return this.request(`/certificates/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadCertificate(certificateData: any) {
    return this.request('/certificates', {
      method: 'POST',
      body: JSON.stringify(certificateData),
    });
  }

  async uploadCertificateWithFile(formData: FormData) {
    // For file uploads, we don't set Content-Type header (let browser set it with boundary)
    const url = `${this.baseURL}/certificates`;
    
    const config: RequestInit = {
      method: 'POST',
      body: formData,
      credentials: 'include',
    };

    // Add Authorization header if token exists
    if (this.token) {
      config.headers = {
        'Authorization': `Bearer ${this.token}`,
      };
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    return data;
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

  // Certificate Feed Methods
  async getDepartmentFeed(params: { page?: number; limit?: number; certificateType?: string } = {}) {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request(`/certificates/feed/department${queryString ? `?${queryString}` : ''}`);
  }

  async getYearFeed(params: { page?: number; limit?: number; certificateType?: string } = {}) {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request(`/certificates/feed/year${queryString ? `?${queryString}` : ''}`);
  }

  async getClassFeed(params: { page?: number; limit?: number; certificateType?: string } = {}) {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request(`/certificates/feed/class${queryString ? `?${queryString}` : ''}`);
  }

  async getCertificateTypes() {
    return this.request('/certificates/types');
  }

  // Certificate Social Features
  async likeCertificate(certificateId: string) {
    return this.request(`/certificates/${certificateId}/like`, {
      method: 'POST',
    });
  }

  async unlikeCertificate(certificateId: string) {
    return this.request(`/certificates/${certificateId}/like`, {
      method: 'DELETE',
    });
  }

  async addComment(certificateId: string, text: string) {
    return this.request(`/certificates/${certificateId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
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

  async getSubjectById(id: string) {
    return this.request(`/subjects/${id}`);
  }

  // Student daily attendance
  async getStudentDailyAttendance(date: string) {
    return this.request(`/attendance/student/daily?date=${date}`);
  }

  // Student weekly attendance (optimized - single call for entire week)
  async getStudentWeeklyAttendance() {
    return this.request('/attendance/student/weekly');
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
   // Super Admin Attendance Overview
   async getSuperAdminAttendanceOverview() {
    return this.request('/attendance/super-admin/overview');
  }

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

  // Get classmates for student
  async getClassmates(params = {}) {
    const query = new URLSearchParams(params as any).toString();
    const response = await fetch(`${this.baseURL}/classmates${query ? `?${query}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.json();
  }

  // Get classmates statistics
  async getClassmatesStats() {
    const response = await fetch(`${this.baseURL}/classmates/stats`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.json();
  }

  // Get user's favourite classmates
  async getFavourites() {
    const response = await fetch(`${this.baseURL}/classmates/favourites`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.json();
  }

  // Toggle favourite classmate
  async toggleFavourite(classmateId: string) {
    const response = await fetch(`${this.baseURL}/classmates/favourites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ classmateId }),
    });
    return response.json();
  }

  // Marks Allocation APIs
  async getStudentsBySection(params: { section: string; year: number; semester: number }) {
    return this.request(`/users?role=student&section=${params.section}&year=${params.year}&limit=1000`);
  }

  async getAssignmentMarks(assignmentId: string) {
    return this.request(`/assignments/${assignmentId}/marks`);
  }

  async saveAssignmentMarks(marksData: { assignmentId: string; studentMarks: { studentId: string; marks: number | null }[] }) {
    return this.request(`/assignments/${marksData.assignmentId}/marks`, {
      method: 'POST',
      body: JSON.stringify({ studentMarks: marksData.studentMarks }),
    });
  }

  async getTeacherAssignmentDocuments() {
    return this.request('/assignments/teacher/documents');
  }

  // Class Reminder methods
  async getClassReminderStatus() {
    return this.request('/class-reminders/status');
  }

  async generateClassReminders() {
    return this.request('/class-reminders/generate', {
      method: 'POST'
    });
  }

  async sendClassReminders() {
    return this.request('/class-reminders/send', {
      method: 'POST'
    });
  }

  async cleanupClassReminders() {
    return this.request('/class-reminders/cleanup', {
      method: 'POST'
    });
  }

  async getStudentClassReminders(studentId: string) {
    return this.request(`/class-reminders/student/${studentId}`);
  }

  async clearStudentClassReminders(studentId: string) {
    return this.request(`/class-reminders/student/${studentId}`, {
      method: 'DELETE'
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
  downloadAssignment,
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
  getDepartmentFeed,
  getYearFeed,
  getClassFeed,
  getCertificateTypes,
  likeCertificate,
  unlikeCertificate,
  addComment,
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
  getSubjectById,
  getStudentDailyAttendance,
  getStudentWeeklyAttendance,
  getTeacherAssignments,
  getTeacherAssignmentDocuments,
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
  updateProfile,
  getClassmates,
  getClassmatesStats,
  getFavourites,
  toggleFavourite,
  getAttendanceStats,
  getClassReminderStatus,
  generateClassReminders,
  sendClassReminders,
  cleanupClassReminders,
  getStudentClassReminders,
  clearStudentClassReminders
} = apiClient;

export default apiClient;