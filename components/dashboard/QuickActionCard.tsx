import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  onClick?: () => void;
  className?: string;
}

export default function QuickActionCard({
  title,
  description,
  icon: Icon,
  color,
  onClick,
  className = ""
}: QuickActionCardProps) {
  return (
    <Card 
      className={`hover:shadow-md transition-shadow duration-200 cursor-pointer group ${className}`}
      onClick={onClick}
    >
      <CardContent className="p-6 text-center">
        <Icon className={`w-12 h-12 ${color} mx-auto mb-4 group-hover:scale-110 transition-transform`} />
        <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </CardContent>
    </Card>
  );
} 