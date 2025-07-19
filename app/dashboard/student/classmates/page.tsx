'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { TextScramble } from '@/components/ui/TextScramble';
import { 
  Users, 
  Star,
  Clock,
  Search,
  Heart,
  Activity,
  UserCheck,
  UserX
} from 'lucide-react';
import apiClient from '@/lib/api';

interface Classmate {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  rollNumber: string;
  profile: {
    bio?: string;
    picture?: string;
    status?: {
      emoji: string;
      text: string;
    };
    section?: string;
  };
  lastLogin: string;
  isActive: boolean;
  isOnline: boolean;
  attendancePercentage: number;
  attendanceStats: {
    total: number;
    present: number;
    absent: number;
    late: number;
  };
}

interface ClassmatesStats {
  totalClassmates: number;
  onlineClassmates: number;
  sectionStats: {
    averageAttendance: number;
    highAttendanceStudents: number;
    lowAttendanceStudents: number;
    totalStudentsWithAttendance: number;
  };
}

export default function ClassmatesPage() {
  const [classmates, setClassmates] = useState<Classmate[]>([]);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [stats, setStats] = useState<ClassmatesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Load favourites from API
  useEffect(() => {
    const loadFavourites = async () => {
      try {
        const response = await apiClient.getFavourites();
        if (response.success) {
          setFavourites(response.data.favourites);
        }
      } catch (error) {
        console.error('Error loading favourites:', error);
      }
    };
    loadFavourites();
  }, []);

  // Save favourites to localStorage (keep as backup)
  useEffect(() => {
    localStorage.setItem('classmate_favourites', JSON.stringify(favourites));
  }, [favourites]);

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (term: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setSearchTerm(term);
        }, 300);
      };
    })(),
    []
  );

  // Fetch classmates data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [classmatesRes, statsRes] = await Promise.all([
          apiClient.getClassmates({ search: searchTerm, limit: 1000 }),
          apiClient.getClassmatesStats()
        ]);

        if (classmatesRes.success) {
          setClassmates(classmatesRes.data.classmates);
        }

        if (statsRes.success) {
          setStats(statsRes.data);
        }
      } catch (error) {
        console.error('Error fetching classmates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchTerm]);

  // Calculate high performers from classmates data
  const highPerformers = classmates.filter(c => c.attendancePercentage >= 90).length;
  const lowPerformers = classmates.filter(c => c.attendancePercentage < 75).length;
  const avgAttendance = classmates.length > 0 
    ? Math.round(classmates.reduce((sum, c) => sum + c.attendancePercentage, 0) / classmates.length)
    : 0;

  // Toggle favourite
  const toggleFavourite = async (classmateId: string) => {
    try {
      const response = await apiClient.toggleFavourite(classmateId);
      if (response.success) {
        setFavourites(response.data.favourites);
      }
    } catch (error) {
      console.error('Error toggling favourite:', error);
    }
  };

  // Filter classmates based on active tab
  const filteredClassmates = activeTab === 'favourites' 
    ? classmates.filter(c => favourites.includes(c._id))
    : classmates;

  // Format last active time
  const formatLastActive = (lastLogin: string) => {
    const now = new Date();
    const lastLoginDate = new Date(lastLogin);
    const diffMs = now.getTime() - lastLoginDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return lastLoginDate.toLocaleDateString();
  };

  // Get attendance color
  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-400';
    return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-400';
  };

  if (loading) {
    return (
      <DashboardLayout role="student">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-100 mx-auto mb-4"></div>
            <TextScramble>Loading classmates...</TextScramble>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student">
      <div className="p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            <TextScramble>My Classmates</TextScramble>
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            <span>Connect with your classmates from Section {classmates[0]?.profile?.section || 'C'}</span>
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Classmates</p>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.totalClassmates}</p>
                  </div>
                  <Users className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Online Now</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.onlineClassmates}</p>
                  </div>
                  <UserCheck className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Avg Attendance</p>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{avgAttendance}%</p>
                  </div>
                  <Activity className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">High Performers</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{highPerformers}</p>
                  </div>
                  <Heart className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Tabs */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <Input
                placeholder="Search classmates..."
                onChange={(e) => debouncedSearch(e.target.value)}
                className="pl-10 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-100 dark:bg-zinc-800">
              <TabsTrigger value="all" className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900">
                <Users className="w-4 h-4 mr-2" />
                All ({classmates.length})
              </TabsTrigger>
              <TabsTrigger value="favourites" className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900">
                <Heart className="w-4 h-4 mr-2" />
                Favourites ({favourites.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Classmates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredClassmates.map((classmate) => (
            <Card key={classmate._id} className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                {/* Header with Avatar and Online Status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={classmate.profile?.picture} alt={`${classmate.firstName} ${classmate.lastName}`} />
                        <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                          {classmate.firstName?.[0]}{classmate.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      {classmate.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {classmate.firstName} {classmate.lastName}
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{classmate.rollNumber}</p>
                    </div>
                  </div>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleFavourite(classmate._id)}
                          className="h-8 w-8 relative group"
                        >
                          <Star 
                            className={`w-4 h-4 transition-all duration-200 ${
                              favourites.includes(classmate._id) 
                                ? 'fill-yellow-400 text-yellow-400 scale-110' 
                                : 'text-zinc-400 group-hover:text-yellow-400'
                            }`} 
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {favourites.includes(classmate._id) ? 'Remove from favourites' : 'Add to favourites'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Status */}
                {classmate.profile?.status && (
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-lg">{classmate.profile.status.emoji}</span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{classmate.profile.status.text}</span>
                  </div>
                )}

                {/* Bio */}
                {classmate.profile?.bio && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
                    {classmate.profile.bio}
                  </p>
                )}

                {/* Attendance */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">Attendance</span>
                    <Badge className={`text-xs ${getAttendanceColor(classmate.attendancePercentage)}`}>
                      {classmate.attendancePercentage}%
                    </Badge>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        classmate.attendancePercentage >= 90 ? 'bg-green-500' :
                        classmate.attendancePercentage >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${classmate.attendancePercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Last Active */}
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatLastActive(classmate.lastLogin)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {classmate.isOnline ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Online</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-zinc-400 rounded-full"></div>
                        <span>Offline</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredClassmates.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-zinc-400 dark:text-zinc-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              {activeTab === 'favourites' ? 'No Favourites Yet' : 'No Classmates Found'}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              {activeTab === 'favourites' 
                ? 'Add some classmates to your favourites to see them here.'
                : searchTerm 
                  ? 'Try adjusting your search terms.'
                  : 'No classmates found in your section.'
              }
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 