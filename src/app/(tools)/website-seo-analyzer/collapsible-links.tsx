"use client"

import { useState } from "react"

interface Link {
  url: string
  status: number
}

interface CollapsibleLinksProps {
  links: Link[]
}

export function CollapsibleLinks({ links }: CollapsibleLinksProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!links || links.length === 0) return null

  const firstLink = links[0]
  const remainingLinks = links.slice(1)
  const hasMoreLinks = remainingLinks.length > 0

  return (
    <div className="break-words overflow-hidden">
      {/* Always show first link */}
      <div className="text-sm text-homeblack break-all">
        <a href={firstLink.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {firstLink.url}
        </a>
        <br />
        <div>
          <span className="font-semibold">Status:</span> {firstLink.status}
        </div>
      </div>

      {/* Show remaining links if expanded */}
      {isExpanded &&
        remainingLinks.map((link, index) => (
          <div key={index + 1} className="text-sm text-homeblack break-all mt-2">
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {link.url}
            </a>
            <br />
            <div>
              <span className="font-semibold">Status:</span> {link.status}
            </div>
          </div>
        ))}

      {/* Show expand/collapse button if there are more links */}
      {hasMoreLinks && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline mt-2 font-medium"
        >
          {isExpanded ? "Show less" : `+${remainingLinks.length} more`}
        </button>
      )}
    </div>
  )
}
