"use client"

import { useState, useRef, useEffect } from "react"

interface Option {
  name: string
  value: string
}

interface MultiSelectDropdownProps {
  options: Option[]
  selectedValues: string[]
  onSelectionChange: (values: string[]) => void
  placeholder?: string
  className?: string
}

const MultiSelectDropdown = ({
  options = [],
  selectedValues = [],
  onSelectionChange,
  placeholder = "Select options...",
  className = "",
}: MultiSelectDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleToggle = (value: string) => {
    if (value === "") {
      // If "All" option is selected, clear all selections
      onSelectionChange([])
    } else {
      if (selectedValues.includes(value)) {
        // Remove if already selected
        onSelectionChange(selectedValues.filter((item) => item !== value))
      } else {
        // Add if not selected
        onSelectionChange([...selectedValues, value])
      }
    }
  }

  const getDisplayText = () => {
    if (!selectedValues || selectedValues.length === 0) {
      return options[0]?.name || placeholder
    } else if (selectedValues.length === 1) {
      const option = options.find((opt) => opt.value === selectedValues[0])
      return option?.name || placeholder
    } else {
      return `${selectedValues.length} items selected`
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2.5 cursor-pointer flex justify-between items-center ${className}`}
      >
        <span>{getDisplayText()}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border border-[#EFF0F6] rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
          {options.map((item, index) => (
            <div
              key={index}
              onClick={() => handleToggle(item.value)}
              className="flex items-center gap-2 p-2.5 hover:bg-gray-50 cursor-pointer text-[14px] text-[#676767]"
            >
              <input
                type="checkbox"
                checked={
                  item.value === ""
                    ? !selectedValues || selectedValues.length === 0
                    : selectedValues.includes(item.value)
                }
                onChange={() => {}} // Handled by onClick
                className="w-4 h-4"
              />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MultiSelectDropdown
