import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type DateRangePreset = "week" | "month" | "year" | "all" | "custom";

interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangeSelectorProps {
  selectedPreset: DateRangePreset;
  onRangeChange: (range: DateRange, preset: DateRangePreset) => void;
}

export const DateRangeSelector = ({ selectedPreset, onRangeChange }: DateRangeSelectorProps) => {
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const getPresetRange = (preset: DateRangePreset): DateRange => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (preset) {
      case "week":
        return {
          from: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          to: today
        };
      case "month":
        return {
          from: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
          to: today
        };
      case "year":
        return {
          from: new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000),
          to: today
        };
      case "all":
        return {
          from: new Date(2020, 0, 1), // Arbitrary start date
          to: today
        };
      default:
        return {
          from: today,
          to: today
        };
    }
  };

  const handlePresetClick = (preset: DateRangePreset) => {
    const range = getPresetRange(preset);
    onRangeChange(range, preset);
  };

  const handleCustomRangeSelect = () => {
    if (customRange.from && customRange.to) {
      onRangeChange(
        { from: customRange.from, to: customRange.to },
        "custom"
      );
      setIsCustomOpen(false);
    }
  };

  const getDisplayText = () => {
    if (selectedPreset === "custom" && customRange.from && customRange.to) {
      return `${format(customRange.from, "MMM d, yyyy")} - ${format(customRange.to, "MMM d, yyyy")}`;
    }
    
    const labels: Record<DateRangePreset, string> = {
      week: "Past Week",
      month: "Past Month",
      year: "Past Year",
      all: "All Time",
      custom: "Custom Range"
    };
    
    return labels[selectedPreset];
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex gap-2">
        <Button
          variant={selectedPreset === "week" ? "default" : "outline"}
          size="sm"
          onClick={() => handlePresetClick("week")}
        >
          Past Week
        </Button>
        <Button
          variant={selectedPreset === "month" ? "default" : "outline"}
          size="sm"
          onClick={() => handlePresetClick("month")}
        >
          Past Month
        </Button>
        <Button
          variant={selectedPreset === "year" ? "default" : "outline"}
          size="sm"
          onClick={() => handlePresetClick("year")}
        >
          Past Year
        </Button>
        <Button
          variant={selectedPreset === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => handlePresetClick("all")}
        >
          All Time
        </Button>
      </div>

      <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={selectedPreset === "custom" ? "default" : "outline"}
            size="sm"
            className="gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            {selectedPreset === "custom" && customRange.from && customRange.to
              ? `${format(customRange.from, "MMM d")} - ${format(customRange.to, "MMM d")}`
              : "Custom"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Calendar
                mode="single"
                selected={customRange.from}
                onSelect={(date) => setCustomRange({ ...customRange, from: date })}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Calendar
                mode="single"
                selected={customRange.to}
                onSelect={(date) => setCustomRange({ ...customRange, to: date })}
                disabled={(date) => customRange.from ? date < customRange.from : false}
                className={cn("p-3 pointer-events-auto")}
              />
            </div>
            <Button
              onClick={handleCustomRangeSelect}
              disabled={!customRange.from || !customRange.to}
              className="w-full"
            >
              Apply Custom Range
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <span className="text-sm text-muted-foreground ml-2">
        Viewing: {getDisplayText()}
      </span>
    </div>
  );
};
