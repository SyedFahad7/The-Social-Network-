# Social Network Academic Management System - Codebase Index

## 📋 Project Overview

**Project Name**: Social Network Academic Management System  
**Repository**: https://github.com/SyedFahad7/Social-Network  
**Type**: Full-stack web application  
**Architecture**: Next.js frontend + Node.js/Express backend  

### Tech Stack Summary
- **Frontend**: Next.js 15.4.1, React 18.2.0, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, MongoDB with Mongoose
- **Authentication**: JWT-based with role-based access control
- **UI Components**: Radix UI, Shadcn/ui components
- **File Storage**: Cloudinary integration
- **Notifications**: Firebase Cloud Messaging (FCM)
- **Email**: Nodemailer with OTP verification
- **State Management**: React Context API

---

## 🏗️ Project Structure

```
project/
├── app/                          # Next.js App Router pages
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Home page
│   ├── auth/
│   │   └── login/
│   │       └── page.tsx         # Login page
│   ├── dashboard/               # Role-based dashboards
│   │   ├── student/
│   │   │   ├── page.tsx         # Student dashboard
│   │   │   ├── assignments/     # Student assignments
│   │   │   ├── attendance/      # Student attendance
│   │   │   ├── certificates/    # Student certificates
│   │   │   ├── classmates/      # Student classmates
│   │   │   ├── notifications/   # Student notifications
│   │   │   ├── settings/        # Student settings
│   │   │   └── timetable/       # Student timetable
│   │   ├── teacher/             # Teacher dashboard
│   │   └── super-admin/         # Super admin dashboard
│   │       ├── page.tsx         # Super admin main page
│   │       ├── my-faculty/      # Faculty management
│   │       ├── my-sections/     # Section management
│   │       └── notifications/   # Admin notifications
│   ├── debug-notifications/     # Debug tools
│   ├── test-permission/         # Permission testing
│   └── test-token/              # Token testing
├── backend/                     # Express.js API server
│   ├── server.js               # Main server entry point
│   ├── package.json            # Backend dependencies
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # API route handlers
│   ├── middleware/             # Custom middleware
│   ├── services/               # Business logic services
│   ├── lib/                    # Utility libraries
│   └── cron/                   # Scheduled tasks
├── components/                 # Reusable React components
│   ├── assignments/            # Assignment-related components
│   ├── dashboard/              # Dashboard components
│   ├── layout/                 # Layout components
│   ├── notifications/          # Notification components
│   ├── teacher/                # Teacher-specific components
│   └── ui/                     # UI component library
├── contexts/                   # React Context providers
├── hooks/                      # Custom React hooks
├── lib/                        # Frontend utilities
└── public/                     # Static assets
```

---

## 🔐 Authentication & Authorization

### User Roles
1. **Student**: Access to personal data, assignments, attendance, classmates
2. **Teacher**: Manage classes, assignments, attendance, timetables
3. **Super Admin**: Full system access, user management, analytics

### Authentication Flow
- JWT-based authentication with token expiration handling
- Role-based route protection
- Automatic token refresh and logout on expiration
- OTP-based password reset system

### Key Files
- `contexts/AuthContext.tsx` - Authentication state management
- `lib/api.ts` - API client with token handling
- `backend/middleware/auth.js` - JWT verification middleware
- `backend/routes/auth.js` - Authentication endpoints

---

## 🗄️ Database Models

### Core Models (MongoDB/Mongoose)

#### User Model (`backend/models/User.js`)
```javascript
{
  email: String (unique),
  password: String,
  firstName: String,
  lastName: String,
  role: ['student', 'teacher', 'super-admin'],
  department: ObjectId (ref: Department),
  
  // Student-specific
  rollNumber: String,
  section: ['A', 'B', 'C'],
  year: [2, 3, 4],
  academicYear: ObjectId (ref: AcademicYear),
  currentSemester: Number,
  
  // Teacher-specific
  employeeId: String,
  teachingAssignments: [Object],
  classTeacherAssignments: [Object],
  
  // Profile & Settings
  profile: {
    bio: String,
    picture: String,
    status: { emoji: String, text: String }
  },
  fcmToken: String,
  pushNotificationsEnabled: Boolean
}
```

#### Other Key Models
- **Assignment** - Assignment/test management with submissions
- **Attendance** - Daily attendance tracking with statistics
- **Timetable** - Class scheduling with special slots
- **Certificate** - Certificate upload and approval workflow
- **Notification** - Push notification system
- **Department** - Academic department management
- **AcademicYear** - Academic year configuration
- **Section** - Class section management
- **Subject** - Subject/course management

---

## 🎨 Frontend Architecture

### App Router Structure (Next.js 13+)
- **Layout System**: Nested layouts with role-based routing
- **Server Components**: Optimized rendering where possible
- **Client Components**: Interactive components with "use client"

### State Management
- **AuthContext**: Global authentication state
- **ThemeContext**: Dark/light theme management
- **Local State**: Component-level state with React hooks

### UI Components
- **Design System**: Shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS with custom theme
- **Responsive**: Mobile-first responsive design
- **Accessibility**: ARIA compliant components

### Key Frontend Files
- `app/layout.tsx` - Root layout with providers
- `components/layout/DashboardLayout.tsx` - Dashboard wrapper
- `components/layout/Sidebar.tsx` - Navigation sidebar
- `lib/api.ts` - Centralized API client (1000+ lines)
- `lib/utils.ts` - Utility functions

---

## 🚀 Backend Architecture

### Express.js Server (`backend/server.js`)
- **Middleware Stack**: CORS, JSON parsing, authentication, logging
- **Route Organization**: Modular route handlers by feature
- **Error Handling**: Centralized error handling middleware
- **Database**: MongoDB connection with Mongoose ODM

### API Endpoints Structure
```
/api/auth/*           - Authentication & authorization
/api/users/*          - User management (CRUD)
/api/assignments/*    - Assignment & test management
/api/attendance/*     - Attendance tracking
/api/timetable/*      - Class scheduling
/api/certificates/*   - Certificate management
/api/feedback/*       - Feedback system
/api/notifications/*  - Push notifications
/api/departments/*    - Department management
/api/sections/*       - Section management
/api/subjects/*       - Subject management
/api/academic-years/* - Academic year management
/api/classmates/*     - Student classmate features
/api/class-reminders/* - Automated class reminders
```

### Services & Utilities
- **File Upload**: Cloudinary integration for images/documents
- **Email Service**: Nodemailer with OTP generation
- **Push Notifications**: Firebase Admin SDK
- **Cron Jobs**: Automated class reminders
- **Redis**: Caching layer (configured but optional)

---

## 📱 Key Features

### 1. Assignment Management
- **Upload System**: File upload with Cloudinary storage
- **Grading**: Teacher grading with marks allocation
- **Submissions**: Student submission tracking
- **File Types**: Support for various document formats

### 2. Attendance System
- **Digital Marking**: Teacher-based attendance marking
- **Statistics**: Comprehensive attendance analytics
- **Reporting**: Attendance summaries and reports
- **Student View**: Personal attendance tracking

### 3. Timetable Management
- **Dynamic Scheduling**: Flexible class scheduling
- **Special Slots**: Support for lunch, prayer, R&D slots
- **Teacher Assignment**: Faculty-subject-section mapping
- **Student View**: Personalized timetable display

### 4. Notification System
- **Push Notifications**: Firebase Cloud Messaging
- **Email Notifications**: OTP and system notifications
- **In-App Notifications**: Real-time notification center
- **Class Reminders**: Automated class notifications

### 5. User Management
- **Role-Based Access**: Three-tier permission system
- **Profile Management**: Bio, status, profile pictures
- **Faculty Assignment**: Teacher-subject-section mapping
- **Student Features**: Classmate connections, favorites

### 6. Certificate Management
- **Upload Workflow**: Student certificate submission
- **Approval Process**: Admin approval/rejection system
- **Status Tracking**: Certificate status monitoring

---

## 🔧 Development Tools & Configuration

### Configuration Files
- `package.json` - Frontend dependencies (Next.js, React, TypeScript)
- `backend/package.json` - Backend dependencies (Express, MongoDB)
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `next.config.js` - Next.js configuration
- `components.json` - Shadcn/ui configuration
- `.eslintrc.json` - ESLint configuration

### Environment Variables
```env
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Backend (.env)
MONGODB_URI=mongodb://localhost:27017/social-network
JWT_SECRET=your-jwt-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Scripts
```json
// Frontend
"dev": "next dev",
"build": "next build",
"start": "next start"

// Backend
"dev": "nodemon server.js",
"start": "node server.js"
```

---

## 📊 Data Flow & API Integration

### Frontend-Backend Communication
1. **API Client**: Centralized API client with token management
2. **Error Handling**: Global error handling with token expiration
3. **Loading States**: Consistent loading state management
4. **Data Fetching**: Server-side and client-side data fetching

### Authentication Flow
1. User login → JWT token generation
2. Token storage in localStorage
3. Automatic token inclusion in API requests
4. Token expiration handling with auto-logout
5. Role-based route protection

### File Upload Flow
1. Frontend file selection
2. FormData creation
3. Cloudinary upload via backend
4. URL storage in database
5. File access via secure URLs

---

## 🧪 Testing & Debugging

### Debug Tools
- `app/debug-notifications/` - Notification testing
- `app/test-permission/` - Permission testing
- `app/test-token/` - Token validation testing
- `backend/test-vapid.js` - VAPID key testing

### Utility Scripts
- `backend/check-student-data.js` - Data validation
- `backend/fix-password.js` - Password reset utility
- `backend/generate-vapid-keys.js` - VAPID key generation

---

## 🚀 Deployment & Production

### Frontend Deployment
- **Platform**: Vercel (configured)
- **Build**: Next.js static export or server-side rendering
- **Environment**: Production environment variables

### Backend Deployment
- **Platform**: Railway/Render/Heroku
- **Database**: MongoDB Atlas
- **File Storage**: Cloudinary CDN
- **Email**: Gmail SMTP or SendGrid

### Production Considerations
- Environment variable security
- Database connection pooling
- File upload size limits
- Rate limiting implementation
- CORS configuration for production domains

---

## 📚 Documentation & Resources

### Key Documentation Files
- `backend/README.md` - Comprehensive backend documentation
- `TESTING_GUIDE.md` - Testing procedures
- API documentation embedded in route files

### External Dependencies
- **UI Framework**: Radix UI + Shadcn/ui
- **Styling**: Tailwind CSS
- **Database**: MongoDB + Mongoose
- **File Storage**: Cloudinary
- **Notifications**: Firebase
- **Email**: Nodemailer

---

## 🔍 Code Quality & Standards

### Frontend Standards
- TypeScript for type safety
- ESLint for code quality
- Tailwind for consistent styling
- Component composition patterns
- Custom hooks for reusable logic

### Backend Standards
- Express.js best practices
- Mongoose schema validation
- JWT security implementation
- Error handling middleware
- Request logging and monitoring

### Security Measures
- JWT token expiration
- Password hashing (bcryptjs)
- Input validation and sanitization
- CORS configuration
- Rate limiting (configured)
- File upload restrictions

---

## 📈 Performance Optimizations

### Frontend Optimizations
- Next.js App Router for optimal loading
- Image optimization with Next.js Image
- Component lazy loading
- API response caching
- Optimistic UI updates

### Backend Optimizations
- Database indexing on frequently queried fields
- Mongoose population optimization
- File upload size limits
- Response compression
- Connection pooling

---

## 🔮 Future Enhancements

### Planned Features
- Real-time chat system
- Video conferencing integration
- Mobile app development
- Advanced analytics dashboard
- Automated report generation
- Integration with external LMS systems

### Technical Improvements
- Microservices architecture
- GraphQL API implementation
- Redis caching layer
- WebSocket real-time updates
- Advanced testing coverage
- CI/CD pipeline implementation

---

*Last Updated: January 2025*  
*Codebase Version: Latest*  
*Total Files: 100+ files across frontend and backend*
