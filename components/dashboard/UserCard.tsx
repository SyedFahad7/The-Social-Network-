import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Eye, Edit, Trash2, Mail, Phone } from 'lucide-react';

interface UserCardProps {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'student' | 'teacher' | 'admin' | 'super-admin';
    department?: string;
    isActive: boolean;
    phone?: string;
    rollNumber?: string;
  };
  onView?: (userId: string) => void;
  onEdit?: (userId: string) => void;
  onDelete?: (userId: string) => void;
  showActions?: boolean;
  showDepartment?: boolean;
  showContact?: boolean;
}

export function UserCard({
  user,
  onView,
  onEdit,
  onDelete,
  showActions = true,
  showDepartment = true,
  showContact = false
}: UserCardProps) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'student': return 'bg-blue-100 text-blue-800';
      case 'teacher': return 'bg-green-100 text-green-800';
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'super-admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'student': return 'Student';
      case 'teacher': return 'Teacher';
      case 'admin': return 'Admin';
      case 'super-admin': return 'Super Admin';
      default: return role;
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-gray-100 text-gray-700">
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-gray-900">
                  {user.firstName} {user.lastName}
                </h3>
                <Badge 
                  variant={user.isActive ? "default" : "secondary"}
                  className={user.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                >
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-1">{user.email}</p>
              <div className="flex items-center space-x-2">
                <Badge className={getRoleColor(user.role)}>
                  {getRoleLabel(user.role)}
                </Badge>
                {user.rollNumber && (
                  <span className="text-sm text-gray-500 font-mono">
                    {user.rollNumber}
                  </span>
                )}
              </div>
              {showDepartment && user.department && (
                <p className="text-sm text-gray-500 mt-1">
                  Department: {user.department}
                </p>
              )}
              {showContact && user.phone && (
                <div className="flex items-center space-x-1 mt-1">
                  <Phone className="w-3 h-3 text-gray-400" />
                  <span className="text-sm text-gray-500">{user.phone}</span>
                </div>
              )}
            </div>
          </div>
          
          {showActions && (
            <div className="flex space-x-2">
              {onView && (
                <Button size="sm" variant="outline" onClick={() => onView(user._id)}>
                  <Eye className="w-4 h-4" />
                </Button>
              )}
              {onEdit && (
                <Button size="sm" variant="outline" onClick={() => onEdit(user._id)}>
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onDelete(user._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 