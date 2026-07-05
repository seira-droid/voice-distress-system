import React, { useState, memo, useMemo } from 'react';
import ConversationCard from './ConversationCard';
import HistoryToolbar from './HistoryToolbar';

function ConversationHistory({ history, onExport, onClear }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('All');

  // Memoize filtered history to prevent unnecessary re-renders
  const filteredHistory = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    return history.filter((entry) => {
      const matchesSearch = searchQuery === '' || 
        entry.transcript?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.summary?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesClassification = classificationFilter === 'All' || 
        entry.classification === classificationFilter;
      
      return matchesSearch && matchesClassification;
    });
  }, [history, searchQuery, classificationFilter]);

  if (!history || history.length === 0) {
    return (
      <div className="conversation-history empty-state">
        <p>No conversation history yet. Start recording to see your history here.</p>
      </div>
    );
  }

  return (
    <div className="conversation-history">
      <h2>Conversation History</h2>
      
      <HistoryToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        classificationFilter={classificationFilter}
        onClassificationChange={setClassificationFilter}
        onExport={onExport}
        onClear={onClear}
        hasHistory={history.length > 0}
      />
      
      <div className="history-list">
        {filteredHistory.map((entry) => (
          <ConversationCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}

export default memo(ConversationHistory);
