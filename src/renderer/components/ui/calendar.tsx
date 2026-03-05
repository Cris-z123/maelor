import * as React from "react"
import { cn } from "@renderer/lib/utils"

// Simplified calendar component without react-day-picker dependency
// This provides basic calendar UI for date selection
export interface CalendarProps extends React.HTMLAttributes<HTMLDivElement> {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  fromDate?: Date
  toDate?: Date
}

const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
  ({ className, selected, onSelect, disabled, fromDate, toDate, ...props }, ref) => {
    const [currentMonth, setCurrentMonth] = React.useState(new Date())

    const daysInMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    ).getDate()

    const firstDayOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    ).getDay()

    const isDateDisabled = (date: Date) => {
      if (disabled?.(date)) return true
      if (fromDate && date < fromDate) return true
      if (toDate && date > toDate) return true
      return false
    }

    const isSameDay = (date1: Date, date2: Date) => {
      return (
        date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear()
      )
    }

    const handleDateClick = (day: number) => {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      if (!isDateDisabled(date)) {
        onSelect?.(date)
      }
    }

    const renderDays = () => {
      const days = []
      const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

      // Week day headers
      for (let i = 0; i < 7; i++) {
        days.push(
          <div key={`header-${i}`} className="text-center text-sm text-muted-foreground py-2">
            {weekDays[i]}
          </div>
        )
      }

      // Empty cells before first day
      for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(<div key={`empty-${i}`} />)
      }

      // Day cells
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
        const isSelected = selected && isSameDay(date, selected)
        const isDisabled = isDateDisabled(date)

        days.push(
          <button
            key={day}
            onClick={() => handleDateClick(day)}
            disabled={isDisabled}
            className={cn(
              "h-9 w-9 rounded-md text-sm transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
            )}
          >
            {day}
          </button>
        )
      }

      return days
    }

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]

    const previousMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    }

    const nextMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    }

    return (
      <div ref={ref} className={cn("p-3", className)} {...props}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={previousMonth}
            className={cn(
              "h-7 w-7 inline-flex items-center justify-center rounded-md",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            ‹
          </button>
          <div className="font-semibold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </div>
          <button
            onClick={nextMonth}
            className={cn(
              "h-7 w-7 inline-flex items-center justify-center rounded-md",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {renderDays()}
        </div>
      </div>
    )
  }
)
Calendar.displayName = "Calendar"

export { Calendar }
