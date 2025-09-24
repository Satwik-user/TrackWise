import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPage = true,
  showTotalItems = true,
  showPageNumbers = true,
  maxPageNumbers = 7,
  itemsPerPageOptions = [5, 10, 25, 50, 100],
  className = "",
  size = "medium"
}) => {
  const sizeClasses = {
    small: "text-xs",
    medium: "text-sm",
    large: "text-base"
  };

  const buttonSizeClasses = {
    small: "px-2 py-1 text-xs",
    medium: "px-3 py-2 text-sm",
    large: "px-4 py-3 text-base"
  };

  // Calculate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const half = Math.floor(maxPageNumbers / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxPageNumbers - 1);

    // Adjust start if we're near the end
    if (end - start + 1 < maxPageNumbers) {
      start = Math.max(1, end - maxPageNumbers + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  // Calculate range of items being displayed
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const handleItemsPerPageChange = (event) => {
    const newItemsPerPage = parseInt(event.target.value);
    if (onItemsPerPageChange) {
      onItemsPerPageChange(newItemsPerPage);
    }
  };

  // Don't render if there's only one page and no items
  if (totalPages <= 1 && totalItems === 0) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between ${sizeClasses[size]} ${className}`}>
      {/* Items info and per page selector */}
      <div className="flex items-center space-x-4">
        {showTotalItems && (
          <div className="text-gray-700">
            {totalItems > 0 ? (
              <>
                Showing {startItem.toLocaleString()} to {endItem.toLocaleString()} of{' '}
                {totalItems.toLocaleString()} results
              </>
            ) : (
              'No results found'
            )}
          </div>
        )}

        {showItemsPerPage && totalItems > 0 && (
          <div className="flex items-center space-x-2">
            <label htmlFor="items-per-page" className="text-gray-700">
              Show:
            </label>
            <select
              id="items-per-page"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {itemsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="text-gray-700">per page</span>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center space-x-1">
          {/* Previous button */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`
              inline-flex items-center rounded-md border border-gray-300 bg-white
              hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
              ${buttonSizeClasses[size]}
            `}
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Previous</span>
          </button>

          {showPageNumbers && (
            <>
              {/* First page if not in visible range */}
              {getPageNumbers()[0] > 1 && (
                <>
                  <button
                    onClick={() => handlePageChange(1)}
                    className={`
                      inline-flex items-center rounded-md border border-gray-300 bg-white
                      hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      ${buttonSizeClasses[size]}
                    `}
                  >
                    1
                  </button>
                  {getPageNumbers()[0] > 2 && (
                    <span className="inline-flex items-center px-2 text-gray-500">...</span>
                  )}
                </>
              )}

              {/* Page numbers */}
              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`
                    inline-flex items-center rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${buttonSizeClasses[size]}
                    ${
                      page === currentPage
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  {page}
                </button>
              ))}

              {/* Last page if not in visible range */}
              {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                <>
                  {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
                    <span className="inline-flex items-center px-2 text-gray-500">...</span>
                  )}
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className={`
                      inline-flex items-center rounded-md border border-gray-300 bg-white
                      hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      ${buttonSizeClasses[size]}
                    `}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </>
          )}

          {/* Next button */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`
              inline-flex items-center rounded-md border border-gray-300 bg-white
              hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
              ${buttonSizeClasses[size]}
            `}
            aria-label="Next page"
          >
            <span className="mr-1 hidden sm:inline">Next</span>
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

// Simple pagination component for minimal use cases
export const SimplePagination = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="flex items-center justify-center space-x-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </button>
      
      <span className="px-4 py-2 text-sm text-gray-700">
        Page {currentPage} of {totalPages}
      </span>
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;