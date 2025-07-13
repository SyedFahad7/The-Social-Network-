import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, X } from 'lucide-react';

interface SearchAndFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters?: {
    key: string;
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  }[];
  onClearFilters?: () => void;
  placeholder?: string;
  showClearButton?: boolean;
}

export function SearchAndFilter({
  searchTerm,
  onSearchChange,
  filters = [],
  onClearFilters,
  placeholder = "Search...",
  showClearButton = true
}: SearchAndFilterProps) {
  const hasActiveFilters = filters.some(filter => filter.value && filter.value !== 'all') || searchTerm;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
        
        {filters.map((filter) => (
          <div key={filter.key} className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{filter.label}:</span>
            <Select value={filter.value || 'all'} onValueChange={filter.onChange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={`All ${filter.label}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {filter.label}</SelectItem>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      
      {showClearButton && hasActiveFilters && onClearFilters && (
        <Button variant="outline" onClick={onClearFilters} size="sm">
          <X className="w-4 h-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </div>
  );
} 