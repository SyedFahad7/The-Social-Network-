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
import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isChanging, setIsChanging] = useState(false);

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
      
  // Add animation effect when theme changes
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setIsChanging(true);
    setTheme(newTheme);
    setTimeout(() => setIsChanging(false), 600); // Match the duration of the transition
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`w-9 h-9 p-0 relative overflow-hidden transition-all duration-300 ${isChanging ? 'ring-2 ring-primary/50' : ''}`} 
          title={iconLabel}
        >
          <div className={`absolute inset-0 bg-primary/5 transform transition-transform duration-500 ${isChanging ? 'scale-100 opacity-100' : 'scale-0 opacity-0'} rounded-sm`}></div>
          <Icon className={`h-4 w-4 relative z-10 transition-all duration-300 ${isChanging ? 'scale-110' : ''}`} />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="animate-in fade-in-50 zoom-in-95 duration-200">
        <DropdownMenuItem 
          onClick={() => handleThemeChange('light')} 
          className={`transition-colors duration-200 ${theme === 'light' ? 'font-medium bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
          {theme === 'light' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary/70"></span>}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleThemeChange('dark')} 
          className={`transition-colors duration-200 ${theme === 'dark' ? 'font-medium bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
          {theme === 'dark' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary/70"></span>}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleThemeChange('system')} 
          className={`transition-colors duration-200 ${theme === 'system' ? 'font-medium bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
        >
          <Monitor className="mr-2 h-4 w-4" />
          {theme === 'system' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary/70"></span>}
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}