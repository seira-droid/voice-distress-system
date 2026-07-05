import React, { memo, useMemo } from 'react';

const CLASSIFICATIONS = ['All', 'Emergency', 'Suspicious', 'Test', 'False Positive'];

function HistoryToolbar({ searchQuery, onSearchChange, classificationFilter, onClassificationChange, onExport, onClear, hasHistory }) {
  return (
    <div className="history-toolbar">
      <div className="toolbar-search">
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
      </div>
      
      <div className="toolbar-filter">
        <select
          value={classificationFilter}
          onChange={(e) => onClassificationChange(e.target.value)}
          className="filter-select"
        >
          {CLASSIFICATIONS.map((cls) => (
            <option key={cls} value={cls}>
              {cls}
            </option>
          ))}
        </select>
      </div>
      
      <div className="toolbar-actions">
        <button
          onClick={onExport}
          disabled={!hasHistory}
          className="toolbar-button export-button"
          type="button"
        >
          Export History
        </button>
        <button
          onClick={onClear}
          disabled={!hasHistory}
          className="toolbar-button clear-button"
          type="button"
        >
          Clear History
        </button>
      </div>
    </div>
  );
}

export default memo(HistoryToolbar);
