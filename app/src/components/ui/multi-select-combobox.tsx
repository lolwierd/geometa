"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface Option {
  value: string;
  label: string;
}

interface MultiSelectComboBoxProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  placeholder?: string;
}

function MultiSelectComboBox({
  options,
  selected,
  onChange,
  className,
  placeholder = "Select options...",
}: MultiSelectComboBoxProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const selectedLabels = selected
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter(Boolean) as string[];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-auto bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600", className)}
          onClick={() => setOpen(!open)}
        >
          <div className="flex gap-1 flex-wrap">
            {selectedLabels.length > 0 ? (
              selectedLabels.map((label) => (
                <Badge
                  variant="custom"
                  key={label}
                  className="mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    const valueToDeselect = options.find(opt => opt.label === label)?.value;
                    if (valueToDeselect) {
                      handleSelect(valueToDeselect);
                    }
                  }}
                >
                  {label}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[var(--radix-popover-trigger-width)] w-[var(--radix-popover-trigger-width)] max-h-64 overflow-y-auto rounded-md border border-slate-700 bg-slate-800 text-slate-200 shadow-lg p-0">
        <Command className="text-slate-200 [&_[cmdk-input-wrapper]]:bg-slate-700 [&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-slate-600">
          <CommandInput placeholder="Search..." className="bg-slate-700 placeholder:text-slate-400 data-[cmdk-input-wrapper]:border-b data-[cmdk-input-wrapper]:border-slate-600" />
          <CommandList className="max-h-none overflow-y-visible overflow-x-hidden">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    handleSelect(option.value);
                    setOpen(true); // Keep popover open after selection
                  }}
                  className="text-slate-200 hover:bg-slate-700 aria-selected:bg-blue-600 aria-selected:text-white"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { MultiSelectComboBox };
