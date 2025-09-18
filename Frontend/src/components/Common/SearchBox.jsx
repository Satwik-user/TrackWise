import React, { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useDebounce } from '../../hooks/useDebounce';

const SearchBox = ({
  placeholder = "Search...",
  value = "",
  onChange,
  onClear,
  debounceMs = 300,
  autoFocus = false,
  disabled = false,
  size = "medium",
  className = "",
  suggestions = [],
  onSuggestionClick,
  showSuggestions = false,
  isLoading = false
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Debounce the search value
  const debouncedValue = useDebounce(localValue, debounceMs);

  // Size classes
  const sizeClasses = {
    small: "px-3 py-1.5 text-sm",
    medium: "px-4 py-2 text-sm",
    large: "px-4 py-3 text-base"
  };

  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Handle value changes from parent
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Handle debounced value changes
  useEffect(() => {
    if (onChange && debouncedValue !== value) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, onChange, value]);

  // Handle suggestions dropdown
  useEffect(() => {
    if (showSuggestions && suggestions.length > 0 && localValue.trim()) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
    setHighlightedIndex(-1);
  }, [suggestions, localValue, showSuggestions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (event) => {
    const newValue = event.target.value;
    setLocalValue(newValue);
  };

  const handleClear = () => {
    setLocalValue("");
    setShowDropdown(false);
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange("");
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;

      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[highlightedIndex]);
        }
        break;

      case 'Escape':
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;

      default:
        break;
    }
  };

  const handleSuggestionClick = (suggestion) => {
    const suggestionValue = typeof suggestion === 'string' ? suggestion : suggestion.value || suggestion.label;
    setLocalValue(suggestionValue);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    } else if (onChange) {
      onChange(suggestionValue);
    }
  };

  const renderSuggestion = (suggestion, index) => {
    const isHighlighted = index === highlightedIndex;
    
    if (typeof suggestion === 'string') {
      return (
        <div
          key={index}
          className={`px-4 py-2 cursor-pointer text-sm ${
            isHighlighted ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => handleSuggestionClick(suggestion)}
          onMouseEnter={() => setHighlightedIndex(index)}
        >
          {suggestion}
        </div>
      );
    }

    return (
      <div
        key={suggestion.id || index}
        className={`px-4 py-2 cursor-pointer ${
          isHighlighted ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
        }`}
        onClick={() => handleSuggestionClick(suggestion)}
        onMouseEnter={() => setHighlightedIndex(index)}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">
              {suggestion.label || suggestion.title}
            </div>
            {suggestion.description && (
              <div className="text-xs text-gray-500">
                {suggestion.description}
              </div>
            )}
          </div>
          {suggestion.badge && (
            <span className="badge badge-gray">
              {suggestion.badge}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            block w-full pl-10 border border-gray-300 rounded-md
            focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${sizeClasses[size]}
            ${localValue ? 'pr-10' : 'pr-4'}
          `}
        />
        
        {localValue && !disabled && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600"
            aria-label="Clear search"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
          {suggestions.map((suggestion, index) => renderSuggestion(suggestion, index))}
        </div>
      )}

      {/* No results message */}
      {showDropdown && suggestions.length === 0 && localValue.trim() && !isLoading && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5">
          <div className="px-4 py-2 text-sm text-gray-500">
            No results found
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBox;