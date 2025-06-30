import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  GraduationCap, 
  UserCheck, 
  Shield, 
  Crown, 
  Eye, 
  Edit, 
  Trash2 
} from 'lucide-react';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher' | 'admin' | 'super-admin';
  department: string;
  rollNumber?: string;
  section?: string;
  employeeId?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface UserCardProps {
  user: User;
  getDepartmentName: (departmentId: string) => string;
  onView?: (user: User) => void;
  onEdit?: (user: User) => void;
  onDelete?: (userId: string) => void;
  onRoleChange?: (userId: string, newRole: string) => void;
  showRoleChange?: boolean;
  showViewButton?: boolean;
  showEditButton?: boolean;
  showDeleteButton?: boolean;
}

export default function UserCard({
  user,
  getDepartmentName,
  onView,
  onEdit,
  onDelete,
  onRoleChange,
  showRoleChange = false,
  showViewButton = true,
  showEditButton = true,
  showDeleteButton = true
}: UserCardProps) {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super-admin': return <Crown className="w-4 h-4" />;
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'teacher': return <UserCheck className="w-4 h-4" />;
      case 'student': return <GraduationCap className="w-4 h-4" />;
      default: return <GraduationCap className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super-admin': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-orange-100 text-orange-800';
      case 'teacher': return 'bg-green-100 text-green-800';
      case 'student': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAvatarColor = (role: string) => {
    switch (role) {
      case 'super-admin': return 'bg-purple-200';
      case 'admin': return 'bg-orange-200';
      case 'teacher': return 'bg-green-200';
      case 'student': return 'bg-blue-200';
      default: return 'bg-gray-200';
    }
  };

  const getIconColor = (role: string) => {
    switch (role) {
      case 'super-admin': return 'text-purple-600';
      case 'admin': return 'text-orange-600';
      case 'teacher': return 'text-green-600';
      case 'student': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 ${getAvatarColor(user.role)} rounded-full flex items-center justify-center`}>
              {getRoleIcon(user.role)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-sm text-gray-600">{user.email}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className={getRoleColor(user.role)}>
                  {user.role.replace('-', ' ')}
                </Badge>
                <Badge variant="outline">{getDepartmentName(user.department)}</Badge>
                {user.rollNumber && (
                  <Badge variant="outline">{user.rollNumber}</Badge>
                )}
                {user.section && (
                  <Badge variant="outline">Section {user.section}</Badge>
                )}
                {user.employeeId && (
                  <Badge variant="outline">{user.employeeId}</Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {user.role === 'student' && showViewButton && onView && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onView(user)}
              >
                <Eye className="w-4 h-4" />
              </Button>
            )}
            {showRoleChange && onRoleChange && (user.role === 'teacher' || user.role === 'admin') && (
              <Select 
                value={user.role} 
                onValueChange={(value) => onRoleChange(user._id, value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            )}
            {showEditButton && onEdit && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onEdit(user)}
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {showDeleteButton && onDelete && (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-red-600 hover:text-red-700"
                onClick={() => onDelete(user._id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 