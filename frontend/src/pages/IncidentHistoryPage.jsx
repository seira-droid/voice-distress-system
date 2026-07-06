import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import IncidentDetail from '../components/IncidentDetail';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://voice-distress-system.onrender.com');

function IncidentHistoryPage() {
  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const classifications = ['All', 'Emergency', 'Suspicious', 'Test', 'False Positive'];

  useEffect(() => {
    fetchIncidents();
  }, []);

  useEffect(() => {
    let filtered = incidents;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(incident =>
        incident.transcript?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.summary?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply classification filter
    if (classificationFilter !== 'All') {
      filtered = filtered.filter(incident => incident.classification === classificationFilter);
    }

    setFilteredIncidents(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [incidents, searchQuery, classificationFilter]);

  const fetchIncidents = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/events/`);
      const data = await response.json();
      setIncidents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
    }
  };

  const handleResolve = async (incidentId) => {
    try {
      await fetch(`${API_BASE}/api/v1/events/${incidentId}/resolve/`, {
        method: 'POST',
      });
      setSelectedIncident(null);
      fetchIncidents();
    } catch (err) {
      console.error('Failed to resolve incident:', err);
    }
  };

  const handleFalseAlarm = async (incidentId) => {
    try {
      await fetch(`${API_BASE}/api/v1/events/${incidentId}/false-alarm/`, {
        method: 'POST',
      });
      setSelectedIncident(null);
      fetchIncidents();
    } catch (err) {
      console.error('Failed to mark as false alarm:', err);
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredIncidents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedIncidents = filteredIncidents.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Incident Management</h1>
        <p>Review and manage all recorded distress events</p>
      </div>

      {/* Search and Filter Toolbar */}
      <div className="incidents-toolbar">
        <div className="search-container">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search incidents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-container">
          <Filter size={18} />
          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value)}
            className="filter-select"
          >
            {classifications.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="incidents-table-container">
        {paginatedIncidents.length === 0 ? (
          <p className="empty-state">No incidents found.</p>
        ) : (
          <table className="incidents-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Classification</th>
                <th>Risk Score</th>
                <th>Alert Sent</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedIncidents.map((incident) => (
                <tr key={incident.id}>
                  <td>{new Date(incident.created_at).toLocaleString()}</td>
                  <td>
                    <span className={`incident-badge ${incident.classification?.toLowerCase()}`}>
                      {incident.classification}
                    </span>
                  </td>
                  <td>{incident.risk_score}%</td>
                  <td>
                    {incident.alert_triggered || incident.send_alert ? (
                      <span className="status-icon sent">✅</span>
                    ) : (
                      <span className="status-icon not-sent">❌</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${incident.status || 'active'}`}>
                      {incident.status || 'Active'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="view-btn"
                      onClick={() => setSelectedIncident(incident)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <IncidentDetail
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onResolve={() => handleResolve(selectedIncident.id)}
          onFalseAlarm={() => handleFalseAlarm(selectedIncident.id)}
        />
      )}
    </div>
  );
}

export default IncidentHistoryPage;
