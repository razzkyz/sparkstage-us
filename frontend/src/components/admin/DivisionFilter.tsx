import { useState } from 'react'
import { useAdminDivisions, type DivisionType, type AdminDivision } from '@/hooks/useAdminDivisions'
import { ChevronDown } from 'lucide-react'

interface DivisionFilterProps {
  onDivisionChange?: (division: DivisionType) => void
  selectedDivision?: DivisionType
  className?: string
}

/**
 * Division Filter Component
 * Allows admins to select which division to view/manage
 */
export function DivisionFilter({ onDivisionChange, selectedDivision, className = '' }: DivisionFilterProps) {
  const { divisions, isLoading } = useAdminDivisions()
  const [isOpen, setIsOpen] = useState(false)

  // Auto-select first division if none selected
  const activeDivision = selectedDivision || divisions[0]?.division_name

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-10 w-48 rounded-lg bg-gray-200 animate-pulse" />
      </div>
    )
  }

  // Hide if only one division
  if (divisions.length <= 1) {
    return null
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors w-full md:w-48"
      >
        <span className="text-sm font-medium">
          {divisions.find((d: AdminDivision) => d.division_name === activeDivision)?.display_name || 'Select Division'}
        </span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-lg border border-gray-300 bg-white shadow-lg">
          {divisions.map((division: AdminDivision) => (
            <button
              key={division.division_id}
              onClick={() => {
                onDivisionChange?.(division.division_name)
                setIsOpen(false)
              }}
              className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                activeDivision === division.division_name
                  ? 'bg-blue-100 text-blue-900 font-medium'
                  : 'hover:bg-gray-100 text-gray-900'
              } ${divisions.indexOf(division) > 0 ? 'border-t border-gray-200' : ''}`}
            >
              {division.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Division Tab Component
 * Shows divisions as tabs instead of dropdown
 */
export function DivisionTabs({
  onDivisionChange,
  selectedDivision,
  className = '',
}: DivisionFilterProps) {
  const { divisions, isLoading } = useAdminDivisions()

  if (isLoading) {
    return <div className={`h-10 w-full rounded-lg bg-gray-200 animate-pulse ${className}`} />
  }

  if (divisions.length <= 1) {
    return null
  }

  return (
    <div className={`flex gap-2 border-b border-gray-200 ${className}`}>
      {divisions.map((division: any) => (
        <button
          key={division.division_id}
          onClick={() => onDivisionChange?.(division.division_name)}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            selectedDivision === division.division_name
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          {division.display_name}
        </button>
      ))}
    </div>
  )
}

/**
 * Division Badge Component
 * Shows which division an item belongs to
 */
export interface DivisionBadgeProps {
  division: DivisionType
  className?: string
}

const divisionColors = {
  tiket: 'bg-blue-100 text-blue-800',
  dressing_room: 'bg-purple-100 text-purple-800',
  retail: 'bg-green-100 text-green-800',
}

export function DivisionBadge({ division, className = '' }: DivisionBadgeProps) {
  const labels = {
    tiket: 'Tiket',
    dressing_room: 'Dressing Room',
    retail: 'Retail',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${divisionColors[division]} ${className}`}>
      {labels[division]}
    </span>
  )
}
