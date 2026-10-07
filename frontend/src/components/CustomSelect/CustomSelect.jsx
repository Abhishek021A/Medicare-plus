import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Check, Loader2 } from 'lucide-react';
import './CustomSelect.css';

export default function CustomSelect({
  label,
  value,
  options = [],
  placeholder = 'Select an option',
  onChange,
  disabled = false,
  loading = false,
  emptyMessage = 'No options available',
  name,
  error
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option => 
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.id.toString() === value?.toString());

  const handleSelect = (option) => {
    onChange({
      target: {
        name,
        value: option.id
      }
    });
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="custom-select-container" ref={dropdownRef}>
      {label && <label className="custom-select-label">{label}</label>}
      
      <div 
        className={`custom-select-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${error ? 'error' : ''}`}
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
      >
        <span className={`custom-select-value ${!selectedOption ? 'placeholder' : ''}`}>
          {loading ? (
            <span className="loading-text">
              <Loader2 className="spinner-icon" size={16} /> Loading...
            </span>
          ) : selectedOption ? (
            selectedOption.name
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className={`custom-select-chevron ${isOpen ? 'rotated' : ''}`} size={18} />
      </div>

      {error && <span className="custom-select-error">{error}</span>}

      {isOpen && !disabled && !loading && (
        <div className="custom-select-dropdown">
          {options.length > 5 && (
            <div className="custom-select-search-container">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                className="custom-select-search"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          )}

          <div className="custom-select-options">
            {options.length === 0 ? (
              <div className="custom-select-empty">{emptyMessage}</div>
            ) : filteredOptions.length === 0 ? (
              <div className="custom-select-empty">No matches found</div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  className={`custom-select-option ${value?.toString() === option.id.toString() ? 'selected' : ''}`}
                  onClick={() => handleSelect(option)}
                >
                  <span className="option-name">{option.name}</span>
                  {value?.toString() === option.id.toString() && <Check size={16} className="check-icon" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
