import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { customDataAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FaTrash, FaEdit, FaTable } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useSocket } from '../App';

const EditFieldsModal = ({ isOpen, onClose, fields: initialFields, onSave, isLoading }) => {
  const { t } = useTranslation();
  const [fields, setFields] = useState(initialFields || []);
  useEffect(() => { setFields(initialFields || []); }, [initialFields, isOpen]);
  const handleFieldChange = (idx, key, value) => {
    setFields(fields => fields.map((f, i) => i === idx ? { ...f, [key]: value } : f));
  };
  const addField = () => setFields(fields => [...fields, { name: '', type: 'text' }]);
  const removeField = idx => setFields(fields => fields.filter((_, i) => i !== idx));
  const handleSave = () => {
    if (fields.some(f => !f.name.trim())) return;
    onSave(fields);
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col">
          {/* Gradient Header with Icon and Subtitle */}
          <div className="flex items-center gap-3 p-5 border-b border-gray-200 bg-gradient-to-r dark:bg-gray-800 from-blue-500 to-indigo-600 rounded-t-2xl">
            <div className="w-10 h-10 bg-white dark:bg-gray-800 bg-opacity-20 rounded-lg flex items-center justify-center shadow">
              <FaEdit className="text-white text-xl" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{t('Edit Table Fields')}</h3>
              <p className="text-sm text-blue-100">{t('Change the fields for this table')}</p>
            </div>
          </div>
          {/* Fields Table */}
          <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="flex-1 flex flex-col gap-6 p-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('Fields')}</label>
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-800">
                <table className="w-full border-collapse">
                  <thead className="bg-gradient-to-r dark:bg-gray-800 from-blue-50 to-blue-100">
                    <tr>
                      <th className="px-4 py-2 text-xs font-bold text-blue-700 uppercase tracking-wider text-left">{t('Field Name')}</th>
                      <th className="px-4 py-2 text-xs font-bold text-blue-700 uppercase tracking-wider text-left">{t('Type')}</th>
                      <th className="px-4 py-2 text-xs font-bold text-blue-700 uppercase tracking-wider text-center">{t('Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
          {fields.map((field, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-blue-50 dark:bg-gray-700'}>
                        <td className="px-4 py-2">
                          <input
                            className="w-full px-3 py-1 rounded border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-sm bg-white dark:bg-gray-800"
                            placeholder={t('Field name')}
                            value={field.name}
                            onChange={e => handleFieldChange(idx, 'name', e.target.value)}
                            required
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            className="w-full px-2 py-1 rounded border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-sm bg-white dark:bg-gray-800"
                            value={field.type}
                            onChange={e => handleFieldChange(idx, 'type', e.target.value)}
                          >
                <option value="text">{t('Text')}</option>
                <option value="number">{t('Number')}</option>
                <option value="date">{t('Date')}</option>
              </select>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center px-2 py-1 bg-red-100 dark:bg-gray-800 hover:bg-red-200 text-red-600 rounded transition-all disabled:opacity-50"
                            onClick={() => removeField(idx)}
                            disabled={fields.length === 1}
                            title={t('Remove Field')}
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r dark:bg-gray-800 from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg shadow transition-all duration-200"
                  onClick={addField}
                >
                  + {t('Add Field')}
                </button>
              </div>
            </div>
            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
              <button
                type="button"
                className="px-5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 font-semibold transition-all"
                onClick={onClose}
                disabled={isLoading}
              >
                {t('Cancel')}
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-gradient-to-r dark:bg-gray-800 from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow transition-all disabled:opacity-60"
                disabled={isLoading || fields.some(f => !f.name.trim())}
              >
                {isLoading ? t('Saving...') : t('Save Fields')}
              </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const TableDataModal = ({ isOpen, onClose, table, onSave, isSaving, onEditFields, onDeleteTable, isEditingFields, isDeletingTable }) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [fields, setFields] = useState([]);
  const [editIdx, setEditIdx] = useState(null);
  const [editRow, setEditRow] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [unsaved, setUnsaved] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);

  useEffect(() => {
    if (isOpen && table) {
      try {
        const data = JSON.parse(table.tableData);
        setFields(data.fields || []);
        setRows(data.rows || []);
        setEditIdx(null);
        setEditRow({});
        setSelectedCell(null);
        setSortConfig({ key: null, direction: 'asc' });
        setSearchTerm('');
        setUnsaved(false);
      } catch {
        setFields([]);
        setRows([]);
      }
    }
  }, [isOpen, table]);

  // Mark as unsaved on any change
  useEffect(() => {
    if (isOpen) setUnsaved(true);
    // eslint-disable-next-line
  }, [rows, fields]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        onSave({ fields, rows });
      }
      
      if (e.key === 'Escape') {
        if (editIdx !== null) {
          setEditIdx(null);
          setEditRow({});
        } else {
          onClose();
        }
      }
      
      if (e.key === 'Enter' && editIdx !== null) {
        handleEditSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, editIdx, editRow, onSave, fields, rows]);

  const handleChange = (idx, key, value) => {
    setRows(rows => rows.map((row, i) => i === idx ? { ...row, [key]: value } : row));
  };
  
  const handleEdit = (idx) => {
    setEditIdx(idx);
    setEditRow({ ...rows[idx] });
  };
  
  const handleEditChange = (key, value) => {
    setEditRow(row => ({ ...row, [key]: value }));
  };
  
  const handleEditSave = () => {
    setRows(rows => rows.map((row, i) => i === editIdx ? editRow : row));
    setEditIdx(null);
    setEditRow({});
  };
  
  const handleDelete = (idx) => {
    setRows(rows => rows.filter((_, i) => i !== idx));
  };
  
  const handleAdd = () => {
    setRows(rows => [...rows, Object.fromEntries(fields.map(f => [f.name, '']))]);
    setEditIdx(rows.length);
    setEditRow(Object.fromEntries(fields.map(f => [f.name, ''])));
  };

  const handleSave = () => {
    onSave({ fields, rows });
  };

  // Sorting functionality
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedRows = () => {
    if (!sortConfig.key) return rows;
    
    return [...rows].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      
      if (sortConfig.direction === 'asc') {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });
  };

  // Filter rows based on search term
  const getFilteredRows = () => {
    if (!searchTerm) return getSortedRows();
    
    return getSortedRows().filter(row => 
      Object.values(row).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  const filteredRows = getFilteredRows();

  if (!isOpen || !table) return null;
  const handleRequestClose = () => {
    if (unsaved) {
      setShowCloseWarning(true);
    } else {
      onClose();
    }
  };
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleRequestClose}></div>
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col">
          {/* Excel-like Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white dark:bg-gray-800 from-gray-50 to-blue-50 rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br dark:bg-gray-800 from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-sm">
                <FaTable className="text-white text-lg" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-200">{table.tableName}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-200 ">
                  {filteredRows.length} of {rows.length} rows • {fields.length} columns
                  {searchTerm && ` • Filtered by "${searchTerm}"`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onEditFields}
                className="px-3 py-2 bg-gradient-to-r dark:bg-gray-800 from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs font-semibold rounded-lg border border-purple-600 hover:border-purple-700 transition-all duration-200 shadow-sm"
                disabled={isEditingFields}
                title="Edit Fields"
              >
                <FaEdit className="inline mr-1" /> Edit Fields
              </button>
              <button
                onClick={onDeleteTable}
                className="px-3 py-2 bg-gradient-to-r dark:bg-gray-800 from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-semibold rounded-lg border border-red-600 hover:border-red-700 transition-all duration-200 shadow-sm"
                disabled={isDeletingTable}
                title="Delete Table"
              >
                <FaTrash className="inline mr-1" /> Delete Table
              </button>
            </div>
            <button 
              onClick={handleRequestClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-2"
            >
              <span className="text-xl">×</span>
            </button>
          </div>

          {/* Excel-like Table Container */}
          <div className="flex-1 overflow-auto p-4 dark:bg-gray-800">
            <div className="border-2 border-gray-300 dark:bg-gray-700 rounded-lg overflow-hidden shadow-lg">
              <div className="overflow-x-auto dark:bg-gray-700">
                <table className="w-full border-collapse dark:bg-gray-700">
                  {/* Column Headers - Excel Style */}
                  <thead className="bg-white dark:bg-gray-700 from-gray-100 to-gray-200 border-b-2 border-gray-300">
                    <tr>
                      <th className="w-16 bg-white dark:bg-gray-600 from-gray-100 to-gray-150 border-r-2 border-gray-300 p-3 text-center text-xs font-bold text-gray-700 dark:text-gray-200 shadow-sm">
                        #
                      </th>
                      {fields.map((field, idx) => (
                        <th 
                          key={field.name} 
                          className="min-w-[180px] bg-white  dark:bg-gray-600 from-gray-100 to-gray-150 border-r border-gray-300 p-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer hover:bg-gray-200  transition-colors relative group"
                          onClick={() => handleSort(field.name)}
                        >
                          <div className="flex items-center justify-between">
                            <span>{field.name}</span>
                            <div className="flex flex-col">
                              <span className={`text-xs ${sortConfig.key === field.name && sortConfig.direction === 'asc' ? 'text-blue-600 ' : 'text-gray-400'}`}>▲</span>
                              <span className={`text-xs ${sortConfig.key === field.name && sortConfig.direction === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}>▼</span>
                            </div>
                          </div>
                          {/* Column resize indicator */}
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-transparent dark:bg-gray-500 hover:bg-blue-400 cursor-col-resize group-hover:bg-gray-300 transition-colors"></div>
                        </th>
                      ))}
                      <th className="w-28 bg-white dark:bg-gray-700 from-gray-100 to-gray-150 p-3 text-center text-xs font-bold text-gray-700 dark:text-gray-200 shadow-sm">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  
                  {/* Table Body - Excel Style */}
                  <tbody className="bg-white dark:bg-gray-800">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={fields.length + 2} className="text-center py-12 text-gray-400 border-b border-gray-200">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                              <FaTable className="text-3xl text-gray-300" />
                            </div>
                            <div>
                              <p className="text-lg font-medium text-gray-500">
                                {searchTerm ? 'No matching data found' : 'No data rows'}
                              </p>
                              <p className="text-sm text-gray-400">
                                {searchTerm ? 'Try adjusting your search terms' : 'Click "Add Row" to get started!'}
                              </p>
                              {!searchTerm && (
                                <button
                                  className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-all text-sm font-semibold"
                                  onClick={handleAdd}
                                >
                                  + {t('Add Row')}
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row, rowIdx) => (
                        <tr 
                          key={rowIdx} 
                          className={`border-b border-gray-200 hover:bg-blue-50 transition-all duration-200 ${
                            editIdx === rowIdx ? 'bg-blue-100 dark:bg-gray-800 shadow-inner' : rowIdx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'
                          }`}
                        >
                          {/* Row Number */}
                          <td className="w-16 border-r-2 border-gray-300 p-3 text-center text-xs text-gray-500 dark:text-gray-100 font-mono bg-white dark:bg-gray-600 from-gray-50 to-gray-100 font-bold">
                            {rowIdx + 1}
                          </td>
                          
                          {/* Data Cells */}
                          {fields.map((field, colIdx) => (
                            <td 
                              key={field.name} 
                              className={`min-w-[180px] border-r border-gray-200 p-2 ${
                                editIdx === rowIdx ? 'bg-white dark:bg-gray-800 shadow-sm' : ''
                              }`}
                            >
                              {editIdx === rowIdx ? (
                                <input
                                  className="w-full px-3 py-2 text-sm border-2 border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                  value={editRow[field.name] || ''}
                                  onChange={e => handleEditChange(field.name, e.target.value)}
                                  placeholder={`Enter ${field.name}...`}
                                  autoFocus={colIdx === 0}
                                />
                              ) : (
                                <div className="px-3 py-2 text-sm text-gray-700 min-h-[32px] flex items-center hover:bg-gray-100 rounded cursor-pointer transition-colors">
                                  {row[field.name] || (
                                    <span className="text-gray-400 italic">Empty</span>
                                  )}
                                </div>
                              )}
                            </td>
                          ))}
                          
                          {/* Actions */}
                          <td className="w-28 p-2 text-center">
                            {editIdx === rowIdx ? (
                              <div className="flex gap-1 justify-center">
                                <button 
                                  onClick={handleEditSave}
                                  className="px-3 py-1.5 bg-gradient-to-r dark:bg-gray-800 from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs font-semibold rounded-md border border-green-600 hover:border-green-700 transition-all duration-200 shadow-sm"
                                  title="Save (Enter)"
                                >
                                  ✓ Save
                                </button>
                                <button 
                                  onClick={() => setEditIdx(null)}
                                  className="px-3 py-1.5 bg-gradient-to-r dark:bg-gray-800 from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white text-xs font-semibold rounded-md border border-gray-500 hover:border-gray-600 transition-all duration-200 shadow-sm"
                                  title="Cancel (Esc)"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-1 justify-center">
                                <button 
                                  onClick={() => handleEdit(rowIdx)}
                                  className="px-3 py-1.5 bg-gradient-to-r dark:bg-gray-800 from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-semibold rounded-md border border-blue-600 hover:border-blue-700 transition-all duration-200 shadow-sm"
                                  title="Edit Row"
                                >
                                  ✎ Edit
                                </button>
                                <button 
                                  onClick={() => handleDelete(rowIdx)}
                                  className="px-3 py-1.5 bg-gradient-to-r dark:bg-gray-800 from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-semibold rounded-md border border-red-600 hover:border-red-700 transition-all duration-200 shadow-sm"
                                  title="Delete Row"
                                >
                                  🗑
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {filteredRows.length > 0 && !searchTerm && (
              <div className="flex justify-center mt-4">
                <button
                  className="px-6 py-2 bg-blue-600  hover:bg-blue-700 text-white  rounded-lg shadow transition-all text-sm font-semibold"
                  onClick={handleAdd}
                >
                  + {t('Add Row')}
                </button>
              </div>
            )}
          </div>

          {/* Excel-like Footer */}
          <div className="border-t-2 border-gray-200 p-4 bg-white dark:bg-gray-800 from-gray-50 to-blue-50 rounded-b-lg flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-500   rounded-full"></span>
                {t('Total Rows')}: <span className="font-bold text-gray-800">{rows.length}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-blue-500  rounded-full"></span>
                {t('Filtered')}: <span className="font-bold text-gray-800">{filteredRows.length}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                {t('Columns')}: <span className="font-bold text-gray-800">{fields.length}</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow transition-all text-sm font-semibold"
                onClick={() => { onSave({ fields, rows }); setUnsaved(false); }}
                disabled={!unsaved || isSaving}
              >
                {isSaving ? t('Saving...') : t('Save')}
              </button>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>💡 {t('Press Ctrl+S to save')}</span>
                <span>💡 {t('Press Esc to cancel')}</span>
                <span>💡 {t('Click column headers to sort')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showCloseWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md relative">
            <h2 className="text-xl font-bold mb-2">{t('Unsaved Changes')}</h2>
            <p className="mb-4">{t('You have unsaved changes. Are you sure you want to close?')}</p>
            <div className="flex justify-end gap-3">
              <button
                className="px-5 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 font-semibold transition-all"
                onClick={() => setShowCloseWarning(false)}
              >
                {t('Cancel')}
              </button>
              <button
                className="px-6 py-2 rounded-lg bg-gradient-to-r  dark:bg-gray-800 from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold shadow transition-all"
                onClick={() => { setShowCloseWarning(false); setUnsaved(false); onClose(); }}
              >
                {t('Discard Changes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DeleteTableModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 dark:bg-gray-800 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Table?</h3>
          <p className="mb-6">Are you sure you want to delete this table? This action cannot be undone.</p>
          <div className="flex justify-end space-x-3">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-danger" onClick={onConfirm}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Animation helpers
const fadeIn = 'transition-opacity duration-300 ease-in opacity-100';
const fadeOut = 'transition-opacity duration-300 ease-in opacity-0';
const slideIn = 'transform transition-transform duration-300 ease-in translate-y-0';
const slideOut = 'transform transition-transform duration-300 ease-in translate-y-8';

// CreateTableModal component
const CreateTableModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const { t } = useTranslation();
  const [tableName, setTableName] = useState('');
  const [fields, setFields] = useState([{ name: '', type: 'text' }]);

  useEffect(() => {
    if (!isOpen) {
      setTableName('');
      setFields([{ name: '', type: 'text' }]);
    }
  }, [isOpen]);

  const handleFieldChange = (idx, key, value) => {
    setFields(fields => fields.map((f, i) => i === idx ? { ...f, [key]: value } : f));
  };
  const addField = () => setFields(fields => [...fields, { name: '', type: 'text' }]);
  const removeField = idx => setFields(fields => fields.filter((_, i) => i !== idx));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!tableName.trim() || fields.some(f => !f.name.trim())) return;
    onSubmit({ tableName, fields });
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 p-5 border-b border-gray-200 bg-gradient-to-r dark:bg-gray-800 from-blue-500 to-indigo-600 rounded-t-2xl">
            <div className="w-10 h-10 bg-white dark:bg-gray-800 bg-opacity-20 rounded-lg flex items-center justify-center shadow">
              <FaTable className="text-white text-xl" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{t('Create New Table')}</h3>
              <p className="text-sm text-blue-100">{t('Define your table name and fields')}</p>
            </div>
          </div>
          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-6 p-6">
            {/* Table Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">{t('Table Name')}</label>
              <input
                className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg font-semibold bg-blue-50 dark:bg-gray-800 placeholder-gray-400 transition-all duration-200"
                placeholder={t('Enter table name...')}
                value={tableName}
                onChange={e => setTableName(e.target.value)}
                required
                autoFocus
              />
            </div>
            {/* Fields Table */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">{t('Fields')}</label>
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-800">
                <table className="w-full border-collapse">
                  <thead className="bg-gradient-to-r from-blue-50 to-blue-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 dark:bg-gray-700 py-2 text-xs font-bold text-blue-700 dark:text-gray-200 uppercase tracking-wider text-left">{t('Field Name')}</th>
                      <th className="px-4 dark:bg-gray-700 py-2 text-xs font-bold text-blue-700 dark:text-gray-200 uppercase tracking-wider text-left">{t('Type')}</th>
                      <th className="px-4 dark:bg-gray-700 py-2 text-xs font-bold text-blue-700 dark:text-gray-200 uppercase tracking-wider text-center">{t('Actions')}</th>
                </tr>
              </thead>
                  <tbody>
                    {fields.map((field, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-blue-50 dark:bg-gray-700'}>
                        <td className="px-4 py-2">
                          <input
                            className="w-full px-3 py-1 rounded border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-sm bg-white dark:bg-gray-700"
                            placeholder={t('Field name')}
                            value={field.name}
                            onChange={e => handleFieldChange(idx, 'name', e.target.value)}
                            required
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            className="w-full px-2 py-1 rounded border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-sm bg-white dark:bg-gray-800"
                            value={field.type}
                            onChange={e => handleFieldChange(idx, 'type', e.target.value)}
                          >
                            <option value="text">{t('Text')}</option>
                            <option value="number">{t('Number')}</option>
                            <option value="date">{t('Date')}</option>
                          </select>
                      </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center px-2 py-1 bg-red-100 dark:bg-gray-800 hover:bg-red-200 text-red-600 rounded transition-all disabled:opacity-50"
                            onClick={() => removeField(idx)}
                            disabled={fields.length === 1}
                            title={t('Remove Field')}
                          >
                            <FaTrash className="text-xs" />
                          </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              </div>
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r dark:bg-gray-800 from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg shadow transition-all duration-200"
                  onClick={addField}
                >
                  + {t('Add Field')}
                </button>
              </div>
            </div>
            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
              <button
                type="button"
                className="px-5 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 font-semibold transition-all"
                onClick={onClose}
                disabled={isLoading}
              >
                {t('Cancel')}
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-gradient-to-r dark:bg-gray-800 from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow transition-all disabled:opacity-60"
                disabled={isLoading || !tableName.trim() || fields.some(f => !f.name.trim())}
              >
                {isLoading ? t('Creating...') : t('Create Table')}
              </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const CustomData = () => {
  const { t } = useTranslation();
  const [selectedTable, setSelectedTable] = useState(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;
    const refetch = () => queryClient.invalidateQueries(['customData']);
    socket.on('customDataCreated', refetch);
    socket.on('customDataUpdated', refetch);
    socket.on('customDataDeleted', refetch);
    return () => {
      socket.off('customDataCreated', refetch);
      socket.off('customDataUpdated', refetch);
      socket.off('customDataDeleted', refetch);
    };
  }, [socket, queryClient]);
  const [editFieldsTable, setEditFieldsTable] = useState(null);
  const [deleteTableId, setDeleteTableId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'rows', 'created'
  const [sortOrder, setSortOrder] = useState('asc');
  const fabRef = useRef(null);
  const { user } = useAuth();

  // Check if user is admin, if not redirect to dashboard
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Fetch all custom tables
  const { data: tables, isLoading, error } = useQuery('customTables', () => customDataAPI.getCustomTables().then(res => res.data));

  // Update table mutation
  const updateTableMutation = useMutation(
    ({ id, fields, rows }) => customDataAPI.updateCustomTable(id, {
      tableData: JSON.stringify({ fields, rows })
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('customTables');
        setIsTableModalOpen(false);
        setSelectedTable(null);
        toast.success(t('Table updated successfully!'));
      },
      onError: () => toast.error(t('Failed to update table')),
    }
  );

  // Edit fields mutation
  const editFieldsMutation = useMutation(
    ({ id, fields, rows }) => customDataAPI.updateCustomTable(id, {
      tableData: JSON.stringify({ fields, rows })
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('customTables');
        setEditFieldsTable(null);
        toast.success(t('Fields updated successfully!'));
      },
      onError: () => toast.error(t('Failed to update fields')),
    }
  );

  // Delete table mutation
  const deleteTableMutation = useMutation(
    (id) => customDataAPI.deleteCustomTable(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('customTables');
        setDeleteTableId(null);
        setIsDeleteModalOpen(false);
        toast.success(t('Table deleted successfully!'));
      },
      onError: () => toast.error(t('Failed to delete table')),
    }
  );

  // Create table mutation
  const createTableMutation = useMutation(
    ({ tableName, fields }) => customDataAPI.createCustomTable({
      tableName,
      tableData: JSON.stringify({ fields, rows: [] })
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('customTables');
        setIsCreateModalOpen(false);
        toast.success(t('Table created successfully!'));
      },
      onError: () => toast.error(t('Failed to create table')),
    }
  );

  const handleTableSave = ({ fields, rows }) => {
    if (!selectedTable) return;
    updateTableMutation.mutate({ id: selectedTable.id, fields, rows });
  };

  const handleEditFieldsSave = (fields) => {
    if (!editFieldsTable) return;
    // Migrate rows: keep values for matching field names, blank for new fields
    let rows = [];
    try {
      const data = JSON.parse(editFieldsTable.tableData);
      rows = (data.rows || []).map(row => Object.fromEntries(fields.map(f => [f.name, row[f.name] || ''])));
    } catch {}
    editFieldsMutation.mutate({ id: editFieldsTable.id, fields, rows });
  };

  const handleDeleteTable = (id) => {
    setDeleteTableId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteTable = () => {
    if (deleteTableId) deleteTableMutation.mutate(deleteTableId);
  };

  const handleCreateTable = ({ tableName, fields }) => {
    createTableMutation.mutate({ tableName, fields });
  };

  // Process and sort tables
  const processedTables = useMemo(() => {
    if (!tables) return [];
    
    let processed = tables.map(table => {
      let rowCount = 0;
      let fieldCount = 0;
      try {
        const data = JSON.parse(table.tableData);
        rowCount = data.rows?.length || 0;
        fieldCount = data.fields?.length || 0;
      } catch {}
      return { ...table, rowCount, fieldCount };
    });

    // Filter by search
    if (search) {
      processed = processed.filter(t => 
        t.tableName.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort
    processed.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'rows':
          aVal = a.rowCount;
          bVal = b.rowCount;
          break;
        case 'fields':
          aVal = a.fieldCount;
          bVal = b.fieldCount;
          break;
        default:
          aVal = a.tableName.toLowerCase();
          bVal = b.tableName.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return processed;
  }, [tables, search, sortBy, sortOrder]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!tables) return { total: 0, totalRows: 0, totalFields: 0, avgRows: 0 };
    
    const total = tables.length;
    const totalRows = tables.reduce((sum, table) => {
      try {
        const data = JSON.parse(table.tableData);
        return sum + (data.rows?.length || 0);
      } catch {
        return sum;
      }
    }, 0);
    const totalFields = tables.reduce((sum, table) => {
      try {
        const data = JSON.parse(table.tableData);
        return sum + (data.fields?.length || 0);
      } catch {
        return sum;
      }
    }, 0);
    
    return {
      total,
      totalRows,
      totalFields,
      avgRows: total > 0 ? Math.round(totalRows / total) : 0
    };
  }, [tables]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="card dark:bg-gray-800 dark:border-gray-700 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('Custom Data Tables')}</h1>
        
        {/* Search and Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('Search tables...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input w-full"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-input"
            >
              <option value="name">{t('Sort by Name')}</option>
              <option value="rows">{t('Sort by Rows')}</option>
              <option value="fields">{t('Sort by Fields')}</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="btn-secondary"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary"
            >
              + {t('Create Table')}
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
            <div className="text-sm text-blue-600 dark:text-blue-400">{t('Total Tables')}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalRows}</div>
            <div className="text-sm text-green-600 dark:text-green-400">{t('Total Rows')}</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalFields}</div>
            <div className="text-sm text-purple-600 dark:text-purple-400">{t('Total Fields')}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.avgRows}</div>
            <div className="text-sm text-orange-600 dark:text-orange-400">{t('Avg Rows')}</div>
          </div>
        </div>

        {/* Tables List */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{t('Loading tables...')}</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400">{t('Error loading tables')}</p>
          </div>
        ) : processedTables.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedTables.map((table) => (
              <div key={table.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{table.tableName}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSelectedTable(table); setIsTableModalOpen(true); }}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      title={t('View Data')}
                    >
                      <FaTable className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditFieldsTable(table)}
                      className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                      title={t('Edit Fields')}
                    >
                      <FaEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTable(table.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      title={t('Delete Table')}
                    >
                      <FaTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div>{t('Rows')}: {table.rowCount}</div>
                  <div>{t('Fields')}: {table.fieldCount}</div>
                  <div>{t('Created')}: {new Date(table.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card dark:bg-gray-800 dark:border-gray-700 flex flex-col items-center justify-center py-16 mt-8">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                <FaTable className="w-8 h-8 text-blue-600 dark:text-gray-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('No custom tables yet')}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4 text-center">{t('Get started by creating your first custom data table. You can store any type of data in a structured format.')}</p>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary"
              >
                {t('Create Your First Table')}
              </button>
            </div>
          </div>
        )}
      </div>
      <TableDataModal
        isOpen={!!selectedTable && isTableModalOpen}
        onClose={() => { setIsTableModalOpen(false); setSelectedTable(null); }}
        table={selectedTable}
        onSave={handleTableSave}
        isSaving={updateTableMutation.isLoading}
        onEditFields={() => { setEditFieldsTable(selectedTable); setIsTableModalOpen(true); }}
        onDeleteTable={() => { handleDeleteTable(selectedTable.id); setIsTableModalOpen(true); }}
        isEditingFields={!!editFieldsTable}
        isDeletingTable={updateTableMutation.isLoading}
      />
      <EditFieldsModal
        isOpen={!!editFieldsTable}
        onClose={() => setEditFieldsTable(null)}
        fields={editFieldsTable ? (() => { try { return JSON.parse(editFieldsTable.tableData).fields || []; } catch { return []; } })() : []}
        onSave={handleEditFieldsSave}
        isLoading={editFieldsMutation.isLoading}
      />
      <DeleteTableModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setDeleteTableId(null); }}
        onConfirm={confirmDeleteTable}
      />
      <CreateTableModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTable}
        isLoading={createTableMutation.isLoading}
      />
    </div>
  );
};

export default CustomData;
