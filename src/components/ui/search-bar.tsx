import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";

type FilterOption = {
  value: string;
  label: string;
};

/**
 * Shared search + filter bar for consistent appearance across all CRUD pages.
 */
export function SearchBar({
  search,
  onSearchChange,
  placeholder = "Cari...",
  filters,
  onReset,
  children
}: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  filters?: React.ReactNode;
  onReset: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm md:flex-row md:items-center">
      <div className="relative flex-1 min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="w-full pl-9 pr-9 h-9"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            aria-label="Bersihkan pencarian"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {filters}
        {children}
        <Button type="button" variant="outline" className="h-9 gap-1.5" onClick={onReset}>
          <X className="h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}

/**
 * A filter dropdown to be used inside SearchBar.
 */
export function SearchFilter({
  value,
  onChange,
  options,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly FilterOption[];
  className?: string;
}) {
  return (
    <Select
      className={className || "w-[180px] h-9"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
