# Social Network Backend API

A comprehensive backend API for the Social Network Academic Management System built with Node.js, Express.js, and MongoDB.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **User Management**: Complete CRUD operations for students, teachers, admins
- **Assignment System**: Upload, manage, and grade assignments and tests
- **Attendance Tracking**: Digital attendance with statistics and reporting
- **Timetable Management**: Dynamic class scheduling system
- **Certificate Management**: Upload and approval workflow for certificates
- **Feedback System**: Create and manage feedback forms with responses
- **File Upload**: Cloudinary integration for file storage
- **Email Service**: OTP-based email verification and notifications

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express Validator
- **File Upload**: Multer + Cloudinary
- **Email**: Nodemailer
- **Security**: bcryptjs for password hashing

## 📁 Project Structure

```
backend/
├── models/           # Database schemas
│   ├── User.js
│   ├── Assignment.js
│   ├── Attendance.js
│   ├── Timetable.js
│   ├── Certificate.js
│   └── Feedback.js
├── routes/           # API endpoints
│   ├── auth.js
│   ├── users.js
│   ├── assignments.js
│   ├── attendance.js
│   ├── timetable.js
│   ├── certificates.js
│   └── feedback.js
├── middleware/       # Custom middleware
│   ├── auth.js
│   ├── errorHandler.js
│   └── logger.js
├── server.js         # Main server file
├── package.json      # Dependencies
└── .env.example      # Environment variables template
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/social-network
   JWT_SECRET=your-super-secret-jwt-key-here
   PORT=5000
   NODE_ENV=development
   
   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   
   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/auth/login` | User login | Public |
| GET | `/api/auth/me` | Get current user | Private |
| POST | `/api/auth/logout` | User logout | Private |
| POST | `/api/auth/change-password` | Change password | Private |

### User Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/users` | Get all users | Admin+ |
| POST | `/api/users` | Create new user | Super Admin |
| GET | `/api/users/stats` | Get user statistics | Admin+ |
| GET | `/api/users/:id` | Get user by ID | Owner/Admin+ |
| PUT | `/api/users/:id` | Update user | Owner/Admin+ |
| DELETE | `/api/users/:id` | Delete user | Super Admin |

### Assignment Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/assignments` | Get assignments | Private |
| POST | `/api/assignments` | Create assignment | Teacher+ |
| GET | `/api/assignments/:id` | Get assignment by ID | Private |
| PUT | `/api/assignments/:id/submission` | Update submission | Teacher |
| PUT | `/api/assignments/:id` | Update assignment | Teacher |
| DELETE | `/api/assignments/:id` | Delete assignment | Teacher |

### Attendance Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/attendance` | Get attendance records | Private |
| POST | `/api/attendance` | Mark attendance | Teacher+ |
| GET | `/api/attendance/student/:id/stats` | Get student stats | Private |
| PUT | `/api/attendance/:id` | Update attendance | Teacher |
| PUT | `/api/attendance/:id/finalize` | Finalize attendance | Teacher |

### Timetable Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/timetable` | Get timetable | Private |
| POST | `/api/timetable` | Create timetable slot | Teacher+ |
| PUT | `/api/timetable/:id` | Update timetable slot | Teacher |
| DELETE | `/api/timetable/:id` | Delete timetable slot | Teacher |

### Certificate Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/certificates` | Get certificates | Private |
| POST | `/api/certificates` | Upload certificate | Student |
| PUT | `/api/certificates/:id/approve` | Approve certificate | Admin+ |
| PUT | `/api/certificates/:id/reject` | Reject certificate | Admin+ |
| GET | `/api/certificates/stats` | Get certificate stats | Admin+ |

### Feedback Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/feedback` | Get feedback forms | Private |
| POST | `/api/feedback` | Create feedback form | Admin+ |
| POST | `/api/feedback/:id/response` | Submit response | Student |
| GET | `/api/feedback/:id/responses` | Get responses | Admin+ |
| PUT | `/api/feedback/:id/activate` | Activate feedback | Admin+ |

## 🔐 Authentication & Authorization

### JWT Token Structure
```json
{
  "id": "user_id",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Role Hierarchy
- **Student**: Basic access to own data
- **Teacher**: Manage classes, assignments, attendance
- **Admin**: User management, content moderation
- **Super Admin**: Full system access, audit logs

### Protected Routes
All routes except `/api/auth/login` and `/api/health` require authentication.

## 📊 Database Schema

### User Model
```javascript
{
  email: String (unique),
  password: String (hashed),
  firstName: String,
  lastName: String,
  role: Enum ['student', 'teacher', 'admin', 'super-admin'],
  department: String,
  rollNumber: String (students only),
  section: String (students only),
  employeeId: String (teachers only),
  profilePicture: String,
  isActive: Boolean,
  // ... other fields
}
```

### Assignment Model
```javascript
{
  title: String,
  description: String,
  subject: String,
  type: Enum ['assignment', 'test'],
  teacher: ObjectId (ref: User),
  sections: [String],
  dueDate: Date,
  submissions: [{
    student: ObjectId,
    hasSubmitted: Boolean,
    grade: Number,
    feedback: String
  }]
}
```

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/social-network
JWT_SECRET=your-production-jwt-secret
PORT=5000
```

### Deployment Platforms
- **Render**: Recommended for easy deployment
- **Railway**: Alternative with good MongoDB integration
- **Heroku**: Traditional option with add-ons

### Deployment Steps (Render)
1. Connect GitHub repository
2. Set environment variables
3. Deploy with build command: `npm install`
4. Start command: `npm start`

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

## 🔧 Development

### Code Style
- Use ESLint for code linting
- Follow JavaScript Standard Style
- Use meaningful variable and function names
- Add comments for complex logic

### Git Workflow
1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Create pull request for review
4. Merge after approval

## 📞 Support

For questions or issues:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 📄 License

This project is licensed under the MIT License.