import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, Filter, Download, RefreshCw } from 'lucide-react';
import Pagination from './Pagination';
import Tooltip from './Tooltip';

const DataTable = ({
  data = [],
  columns = [],
  title = 'Data Table',
  searchable = true,
  filterable = true,
  sortable = true,
  pagination = true,
  exportable = false,
  refreshable = false,
  onRefresh = null,
  onExport = null,
  itemsPerPage = 10,
  itemsPerPageOptions = [10, 25, 50, 100],
  emptyMessage = 'No data found',
  loading = false,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentItemsPerPage, setCurrentItemsPerPage] = useState(itemsPerPage);
  const [filters, setFilters] = useState({});

  // Filter data based on search term and filters
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchTerm) {
      result = result.filter(item =>
        columns.some(column => {
          const value = column.accessor ? column.accessor(item) : item[column.key];
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        result = result.filter(item => {
          const itemValue = item[key];
          return itemValue && itemValue.toString().toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    return result;
  }, [data, searchTerm, filters, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortable) return filteredData;

    return [...filteredData].sort((a, b) => {
      const column = columns.find(col => col.key === sortColumn);
      if (!column) return 0;

      const aValue = column.accessor ? column.accessor(a) : a[sortColumn];
      const bValue = column.accessor ? column.accessor(b) : b[sortColumn];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection, sortable, columns]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const startIndex = (currentPage - 1) * currentItemsPerPage;
    const endIndex = startIndex + currentItemsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, currentItemsPerPage, pagination]);

  // Handle sorting
  const handleSort = (columnKey) => {
    if (!sortable) return;

    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Handle search
  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage) => {
    setCurrentItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Get sort icon
  const getSortIcon = (columnKey) => {
    if (!sortable || sortColumn !== columnKey) {
      return <ChevronUp className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-500" />
      : <ChevronDown className="w-4 h-4 text-blue-500" />;
  };

  // Calculate total pages
  const totalPages = Math.ceil(filteredData.length / currentItemsPerPage);

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 transition-colors duration-300 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          
          <div className="flex items-center gap-2">
            {refreshable && onRefresh && (
              <Tooltip content="Refresh data" position="top">
                <button
                  onClick={onRefresh}
                  disabled={loading}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Refresh data"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </Tooltip>
            )}
            
            {exportable && onExport && (
              <Tooltip content="Export data" position="top">
                <button
                  onClick={onExport}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Export data"
                >
                  <Download className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        {(searchable || filterable) && (
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            {searchable && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="form-input pl-10 w-full"
                  aria-label="Search table"
                />
              </div>
            )}
            
            {filterable && columns.filter(col => col.filterable !== false).map(column => (
              <input
                key={column.key}
                type="text"
                placeholder={`Filter ${column.label}...`}
                value={filters[column.key] || ''}
                onChange={(e) => handleFilterChange(column.key, e.target.value)}
                className="form-input w-full sm:w-auto"
                aria-label={`Filter by ${column.label}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="table-header">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                    sortable && column.sortable !== false ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''
                  }`}
                  onClick={() => sortable && column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {sortable && column.sortable !== false && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800 transition-colors duration-300">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-gray-500 dark:text-gray-400">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <Filter className="w-16 h-16" />
                    </div>
                    <div className="empty-state-title">{emptyMessage}</div>
                    <div className="empty-state-description">
                      {searchTerm || Object.values(filters).some(Boolean) 
                        ? 'Try adjusting your search or filters.' 
                        : 'No data available at the moment.'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr key={rowIndex} className="table-row hover:bg-gray-50 dark:hover:bg-gray-800">
                  {columns.map((column) => (
                    <td key={column.key} className="table-cell">
                      {column.render ? column.render(row, rowIndex) : (column.accessor ? column.accessor(row) : row[column.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={filteredData.length}
            itemsPerPage={currentItemsPerPage}
            showItemsPerPage={true}
            onItemsPerPageChange={handleItemsPerPageChange}
            itemsPerPageOptions={itemsPerPageOptions}
          />
        </div>
      )}
    </div>
  );
};

export default DataTable; 