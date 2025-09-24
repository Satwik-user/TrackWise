import React, { useState, useMemo } from 'react';
import { 
  ChevronUpIcon, 
  ChevronDownIcon, 
  FunnelIcon,
  ArrowDownTrayIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import Pagination from './Pagination';
import LoadingSpinner, { TableSkeleton } from './LoadingSpinner';
import SearchBox from './SearchBox';

const DataTable = ({
  data = [],
  columns = [],
  loading = false,
  error = null,
  searchable = true,
  sortable = true,
  filterable = false,
  exportable = false,
  selectable = false,
  pagination = true,
  itemsPerPage = 10,
  currentPage = 1,
  totalItems = null,
  onPageChange,
  onItemsPerPageChange,
  onSort,
  onSearch,
  onFilter,
  onExport,
  onSelect,
  selectedItems = [],
  searchPlaceholder = "Search table...",
  emptyMessage = "No data available",
  className = "",
  headerClassName = "",
  bodyClassName = "",
  rowClassName = "",
  cellClassName = "",
  stickyHeader = false,
  compact = false,
  striped = false,
  bordered = false,
  hoverable = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({});

  // Calculate total items if not provided
  const calculatedTotalItems = totalItems || data.length;

  // Filter and search data
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply search
    if (searchTerm && searchable) {
      filtered = filtered.filter(item =>
        columns.some(column => {
          const value = item[column.key];
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply filters
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        filtered = filtered.filter(item => {
          const value = item[key];
          return value && value.toString().toLowerCase().includes(filters[key].toLowerCase());
        });
      }
    });

    return filtered;
  }, [data, searchTerm, filters, columns, searchable]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage, pagination]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // Handlers
  const handleSort = (key) => {
    if (!sortable) return;

    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });

    if (onSort) {
      onSort({ key, direction });
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleSelectAll = () => {
    if (!selectable || !onSelect) return;

    const allSelected = selectedItems.length === paginatedData.length;
    if (allSelected) {
      onSelect([]);
    } else {
      onSelect(paginatedData.map(item => item.id || item));
    }
  };

  const handleSelectItem = (item) => {
    if (!selectable || !onSelect) return;

    const itemId = item.id || item;
    const isSelected = selectedItems.includes(itemId);
    
    if (isSelected) {
      onSelect(selectedItems.filter(id => id !== itemId));
    } else {
      onSelect([...selectedItems, itemId]);
    }
  };

  const renderCell = (item, column) => {
    if (column.render) {
      return column.render(item[column.key], item);
    }

    const value = item[column.key];
    if (value === null || value === undefined) {
      return <span className="text-gray-400">—</span>;
    }

    if (column.type === 'date') {
      return new Date(value).toLocaleDateString();
    }

    if (column.type === 'datetime') {
      return new Date(value).toLocaleString();
    }

    if (column.type === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    }

    if (column.type === 'number') {
      return typeof value === 'number' ? value.toLocaleString() : value;
    }

    // Safe rendering for any value type, including objects
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return value.toString();
  };

  // Table classes
  const tableClasses = [
    'min-w-full divide-y divide-gray-200',
    bordered && 'border border-gray-200',
    className
  ].filter(Boolean).join(' ');

  const headerClasses = [
    'bg-gray-50',
    stickyHeader && 'sticky top-0 z-10',
    headerClassName
  ].filter(Boolean).join(' ');

  const bodyClasses = [
    'bg-white divide-y divide-gray-200',
    bodyClassName
  ].filter(Boolean).join(' ');

  const getRowClasses = (index) => [
    striped && index % 2 === 1 && 'bg-gray-50',
    hoverable && 'hover:bg-gray-50',
    'transition-colors duration-150',
    rowClassName
  ].filter(Boolean).join(' ');

  const cellClasses = [
    compact ? 'px-4 py-2' : 'px-6 py-4',
    'whitespace-nowrap text-sm',
    cellClassName
  ].filter(Boolean).join(' ');

  if (loading) {
    return <TableSkeleton rows={itemsPerPage} columns={columns.length + (selectable ? 1 : 0)} />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-sm">{typeof error === 'string' ? error : JSON.stringify(error)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table controls */}
      {(searchable || filterable || exportable) && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 w-full sm:w-auto">
            {searchable && (
              <SearchBox
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={handleSearch}
                className="max-w-sm"
              />
            )}
          </div>

          <div className="flex items-center space-x-2">
            {filterable && (
              <button
                onClick={() => {/* Implement filter modal */}}
                className="btn btn-outline btn-sm"
              >
                <FunnelIcon className="h-4 w-4 mr-1" />
                Filters
              </button>
            )}

            {exportable && (
              <button
                onClick={onExport}
                className="btn btn-outline btn-sm"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                Export
              </button>
            )}

            <button
              onClick={() => {/* Implement column settings */}}
              className="btn btn-outline btn-sm"
            >
              <Cog6ToothIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Selection info */}
      {selectable && selectedItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => onSelect([])}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <div className="overflow-x-auto">
          <table className={tableClasses}>
            {/* Header */}
            <thead className={headerClasses}>
              <tr>
                {selectable && (
                  <th scope="col" className={`${cellClasses} w-4`}>
                    <input
                      type="checkbox"
                      checked={selectedItems.length === paginatedData.length && paginatedData.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                )}

                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={`${cellClasses} text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      sortable && column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                    onClick={() => column.sortable !== false && handleSort(column.key)}
                    style={{ width: column.width }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.title || column.label || column.key}</span>
                      {sortable && column.sortable !== false && (
                        <span className="flex-shrink-0">
                          {sortConfig.key === column.key ? (
                            sortConfig.direction === 'asc' ? (
                              <ChevronUpIcon className="h-4 w-4" />
                            ) : (
                              <ChevronDownIcon className="h-4 w-4" />
                            )
                          ) : (
                            <div className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody className={bodyClasses}>
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => {
                  const itemId = item.id || item;
                  const isSelected = selectedItems.includes(itemId);

                  return (
                    <tr
                      key={itemId || index}
                      className={`${getRowClasses(index)} ${isSelected ? 'bg-blue-50' : ''}`}
                    >
                      {selectable && (
                        <td className={cellClasses}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectItem(item)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                      )}

                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={`${cellClasses} ${column.className || ''}`}
                        >
                          {renderCell(item, column)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedData.length}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
        />
      )}
    </div>
  );
};

export default DataTable;