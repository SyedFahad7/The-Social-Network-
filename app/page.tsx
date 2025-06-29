'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Award, 
  Calendar, 
  Shield,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      const userData = JSON.parse(user);
      // Redirect to appropriate dashboard
      switch (userData.role) {
        case 'student':
          router.push('/dashboard/student');
          break;
        case 'teacher':
          router.push('/dashboard/teacher');
          break;
        case 'admin':
          router.push('/dashboard/admin');
          break;
        case 'super-admin':
          router.push('/dashboard/super-admin');
          break;
        default:
          break;
      }
    }
  }, [router]);

  const features = [
    {
      icon: Users,
      title: 'Multi-Role System',
      description: 'Separate portals for Students, Teachers, Admins, and Super Admins with role-based access control.'
    },
    {
      icon: Award,
      title: 'Certificate Management',
      description: 'Upload, review, and manage digital certificates with approval workflows.'
    },
    {
      icon: Calendar,
      title: 'Dynamic Timetables',
      description: 'Interactive class schedules that update in real-time across all departments.'
    },
    {
      icon: BookOpen,
      title: 'Assignment Portal',
      description: 'Streamlined assignment submission and grading system for all subjects.'
    },
    {
      icon: CheckCircle,
      title: 'Attendance Tracking',
      description: 'Digital attendance management with automated reporting and analytics.'
    },
    {
      icon: Shield,
      title: 'Secure & Scalable',
      description: 'Enterprise-grade security with audit logs and comprehensive user management.'
    }
  ];

  const userRoles = [
    {
      role: 'Students',
      description: 'Access assignments, upload certificates, view timetables, and track attendance.',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      features: ['Certificate Upload', 'Assignment Access', 'Timetable View', 'Attendance Tracking']
    },
    {
      role: 'Teachers',
      description: 'Manage classes, create assignments, mark attendance, and upload resources.',
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      features: ['Class Management', 'Assignment Creation', 'Attendance Marking', 'Resource Upload']
    },
    {
      role: 'Admins',
      description: 'Moderate content, manage users, approve submissions, and generate reports.',
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      features: ['User Management', 'Content Moderation', 'Approval Workflows', 'System Reports']
    },
    {
      role: 'HoD (Super Admin)',
      description: 'Complete system control, analytics, audit logs, and strategic oversight.',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      features: ['System Analytics', 'Audit Logs', 'Global Configuration', 'Strategic Reports']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="mx-auto w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-8">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Social Network
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            A comprehensive Academic Department Management System designed for modern educational institutions. 
            Streamline your academic processes with role-based access, digital workflows, and intelligent analytics.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
                Sign In
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            New users are created by system administrators only
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-xl text-gray-900 dark:text-white">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* User Roles Section */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Built for Every User</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Tailored experiences for each role in your academic ecosystem
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {userRoles.map((user, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <CardTitle className="text-2xl text-gray-900 dark:text-white">{user.role}</CardTitle>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${user.color}`}>
                      {user.role}
                    </span>
                  </div>
                  <CardDescription className="text-gray-600 dark:text-gray-300 text-base">
                    {user.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {user.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Academic Management?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of educational institutions already using Social Network to streamline 
            their academic processes and enhance student-teacher collaboration.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
                Access Portal
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            © 2025 Social Network - Academic Department Management System. 
            Built for modern educational excellence.
          </p>
        </div>
      </div>
    </div>
  );
}