import { Users, GraduationCap, UserCheck } from 'lucide-react';

interface SuperAdminStatsCardProps {
  teacherCount: number;
  studentCount: number;
}

const SuperAdminStatsCard: React.FC<SuperAdminStatsCardProps> = ({ teacherCount, studentCount }) => {
  const totalUsers = teacherCount + studentCount;
  const studentPercentage = totalUsers > 0 ? Math.round((studentCount / totalUsers) * 100) : 0;
  const teacherPercentage = totalUsers > 0 ? Math.round((teacherCount / totalUsers) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-blue-100 p-6 rounded-lg shadow-md flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Total Users</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalUsers}</p>
        </div>
        <div className="w-12 h-12 rounded-lg bg-blue-200 flex items-center justify-center">
          <Users className="w-6 h-6 text-blue-600" />
        </div>
      </div>

      <div className="bg-green-100 p-6 rounded-lg shadow-md flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Students</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{studentCount}</p>
          <p className="text-sm text-gray-500 mt-1">{studentPercentage}% of total</p>
        </div>
        <div className="w-12 h-12 rounded-lg bg-green-200 flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-green-600" />
        </div>
      </div>

      <div className="bg-purple-100 p-6 rounded-lg shadow-md flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Teachers</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{teacherCount}</p>
          <p className="text-sm text-gray-500 mt-1">{teacherPercentage}% of total</p>
        </div>
        <div className="w-12 h-12 rounded-lg bg-purple-200 flex items-center justify-center">
          <UserCheck className="w-6 h-6 text-purple-600" />
        </div>
      </div>
    </div>
  );
};

export default SuperAdminStatsCard;