import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Save, UserPlus } from 'lucide-react';

interface Department {
  _id: string;
  name: string;
  code: string;
}

type UserRole = 'student' | 'teacher' | 'super-admin';

interface UserFormProps {
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    department: string;
    phone?: string;
    rollNumber?: string;
    employeeId?: string;
    isActive: boolean;
  };
  departments: Department[];
  onSubmit: (userData: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
  isSuperAdmin?: boolean;
}

// export function UserForm({
//   user,
//   departments,
//   onSubmit,
//   onCancel,
//   isLoading = false,
//   mode,
//   isSuperAdmin = false
// }: UserFormProps & { mode: 'create' | 'edit' }) {
//   ...
// } 