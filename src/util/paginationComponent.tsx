// components/Pagination.tsx
import React from "react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const indexOfFirst = (currentPage - 1) * rowsPerPage;
  const indexOfLast = Math.min(indexOfFirst + rowsPerPage, totalItems);

  return (
    <div className="bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between">
      {/* Showing entries text */}
      <div className="text-sm text-gray-700">
        Showing {totalItems === 0 ? 0 : indexOfFirst + 1} to {indexOfLast} of{" "}
        {totalItems} entries
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">Rows per page:</span>
        <select
          value={rowsPerPage}
          onChange={(e) => {
            onRowsPerPageChange(Number(e.target.value));
            onPageChange(1); // reset to first page
          }}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>

        {/* Page numbers */}
        <div className="flex gap-1 ml-4">
          <button
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => onPageChange(i + 1)}
              className={`px-3 py-1 rounded text-sm ${
                currentPage === i + 1
                  ? "bg-brand-blue text-white"
                  : "border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
