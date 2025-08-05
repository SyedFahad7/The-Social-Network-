'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  role: string;
  className?: string;
}

const rolePages = {
  student: [
    { label: 'Dashboard', href: '/dashboard/student', icon: '🏠' },
    { label: 'Classmates', href: '/dashboard/student/classmates', icon: '👥' },
    { label: 'Attendance', href: '/dashboard/student/attendance', icon: '📊' },
    { label: 'Notifications', href: '/dashboard/student/notifications', icon: '🔔' },
    { label: 'TimeTable', href: '/dashboard/student/timetable', icon: '📅' },
    { label: 'Assignments', href: '/dashboard/student/assignments', icon: '📝' },
    { label: 'Certificates', href: '/dashboard/student/certificates', icon: '🏆' },
  ],
  teacher: [
    { label: 'Dashboard', href: '/dashboard/teacher', icon: '🏠' },
    { label: 'My Sections', href: '/dashboard/teacher/sections', icon: '📚' },
    { label: 'Attendance', href: '/dashboard/teacher/attendance', icon: '📊' },
    { label: 'Send Notifications', href: '/dashboard/teacher/notifications', icon: '🔔' },
    { label: 'Assignments', href: '/dashboard/teacher/assignments', icon: '📝' },
    { label: 'Question Banks', href: '/dashboard/teacher/question-banks', icon: '❓' },
    { label: 'TimeTable', href: '/dashboard/teacher/timetable', icon: '📅' },
  ],
  'super-admin': [
    { label: 'Dashboard', href: '/dashboard/super-admin', icon: '🏠' },
    { label: 'My Sections', href: '/dashboard/super-admin/my-sections', icon: '📚' },
    { label: 'Send Notifications', href: '/dashboard/super-admin/notifications', icon: '🔔' },
    { label: 'My Faculty', href: '/dashboard/super-admin/my-faculty', icon: '👨‍🏫' },
    { label: 'Users', href: '/dashboard/super-admin/users', icon: '👥' },
  ],
};

export default function SearchBar({ role, className }: SearchBarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredPages, setFilteredPages] = useState<any[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pages = rolePages[role as keyof typeof rolePages] || [];

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = pages.filter(page =>
        page.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPages(filtered);
      setIsOpen(true);
    } else {
      setFilteredPages([]);
      setIsOpen(false);
    }
  }, [searchQuery, pages]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePageClick = (href: string) => {
    router.push(href);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={searchRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 transition-colors duration-200" />
        <Input
          ref={inputRef}
          placeholder="Search pages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10 bg-muted/40 focus:bg-background border-border transition-all duration-200 focus:ring-2 ring-ring/30 text-foreground placeholder-muted-foreground"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-accent"
            onClick={() => {
              setSearchQuery('');
              setIsOpen(false);
            }}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && filteredPages.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1">
              Pages ({filteredPages.length})
            </div>
            {filteredPages.map((page, index) => (
              <button
                key={page.href}
                onClick={() => handlePageClick(page.href)}
                className="w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors duration-200 text-left"
              >
                <span className="text-lg">{page.icon}</span>
                <span className="font-medium">{page.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {isOpen && searchQuery.trim() && filteredPages.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50">
          <div className="p-4 text-center text-muted-foreground">
            <div className="text-lg mb-2">🔍</div>
            <div className="text-sm">No pages found for "{searchQuery}"</div>
            <div className="text-xs mt-1">Try a different search term</div>
          </div>
        </div>
      )}
    </div>
  );
} 