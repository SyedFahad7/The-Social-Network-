'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Pick icon based on theme
  let Icon = Sun;
  if (theme === 'system') {
    Icon = Monitor;
  } else if (theme === 'dark') {
    Icon = Moon;
  } else if (theme === 'light') {
    Icon = Sun;
  }

  // For system, show resolvedTheme as tooltip
  const iconLabel =
    theme === 'system'
      ? `System (${resolvedTheme.charAt(0).toUpperCase() + resolvedTheme.slice(1)})`
      : theme.charAt(0).toUpperCase() + theme.slice(1);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-9 h-9 p-0" title={iconLabel}>
          <Icon className="h-4 w-4" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')} className={theme === 'light' ? 'font-bold bg-gray-100 dark:bg-gray-800' : ''}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} className={theme === 'dark' ? 'font-bold bg-gray-100 dark:bg-gray-800' : ''}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} className={theme === 'system' ? 'font-bold bg-gray-100 dark:bg-gray-800' : ''}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 