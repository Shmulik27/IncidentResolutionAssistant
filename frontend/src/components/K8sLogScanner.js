import React, { useState, useEffect, useContext, useRef } from 'react';
import { api } from '../services/api';
import './K8sLogScanner.css';
import { NotificationContext } from '../App';
// Add Material-UI imports for Accordion if available
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const LOG_LEVEL_COLORS = {
  ERROR: '#ffcccc',
  WARN: '#fff3cd',
  INFO: '#e3f2fd',
  DEBUG: '#f0f0f0',
  CRITICAL: '#ffb3b3',
};

function getLogLevel(line) {
  if (/CRITICAL/.test(line)) return 'CRITICAL';
  if (/ERROR/.test(line)) return 'ERROR';
  if (/WARN/.test(line)) return 'WARN';
  if (/INFO/.test(line)) return 'INFO';
  if (/DEBUG/.test(line)) return 'DEBUG';
  return null;
}

function LogsPanel({ logs, logFilter, setLogFilter, showAllLogs, setShowAllLogs, logsContainerRef, getLogLevel, LOG_LEVEL_COLORS }) {
  if (!logs || logs.length === 0 || (Array.isArray(logs) && logs[0] === "")) {
    return <div className="no-data">No logs available for this scan.</div>;
  }
  const filteredLogs = logFilter ? logs.filter(line => line.toLowerCase().includes(logFilter.toLowerCase())) : logs;
  return (
    <div className="logs-display">
      <div className="logs-header-sticky">
        <h4 style={{ display: 'inline-block', margin: 0 }}>
          Logs ({filteredLogs.length} lines):
        </h4>
        <input
          type="text"
          className="log-filter-input"
          placeholder="Filter logs..."
          value={logFilter}
          onChange={e => setShowAllLogs(false) || setLogFilter(e.target.value)}
          style={{ marginLeft: 16, padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', fontSize: 12 }}
        />
        <button
          className="copy-logs-btn"
          onClick={() => navigator.clipboard.writeText(filteredLogs.join('\n'))}
          style={{ marginLeft: 12, padding: '4px 10px', borderRadius: 4, border: 'none', background: '#007bff', color: 'white', cursor: 'pointer', fontSize: 12 }}
          title="Copy all logs"
        >
          Copy All
        </button>
        {filteredLogs.length > 100 && (
          <button
            className="show-more-btn"
            onClick={() => setShowAllLogs(v => !v)}
            style={{ marginLeft: 12, padding: '4px 10px', borderRadius: 4, border: 'none', background: '#28a745', color: 'white', cursor: 'pointer', fontSize: 12 }}
          >
            {showAllLogs ? 'Show Less' : `Show All (${filteredLogs.length})`}
          </button>
        )}
      </div>
      <div className="logs-container" ref={logsContainerRef}>
        {(showAllLogs ? filteredLogs : filteredLogs.slice(0, 100)).map((log, index) => {
          const logLevel = getLogLevel(log);
          return (
            <div
              key={index}
              className={`log-line log-level-${logLevel ? logLevel.toLowerCase() : 'default'}`}
              style={{
                background: logLevel ? LOG_LEVEL_COLORS[logLevel] : undefined,
                display: 'flex',
                alignItems: 'flex-start',
                borderLeft: logLevel ? `4px solid ${logLevel === 'ERROR' ? '#dc3545' : logLevel === 'WARN' ? '#ffc107' : logLevel === 'CRITICAL' ? '#b71c1c' : '#007bff'}` : '4px solid transparent',
              }}
            >
              <span className="log-line-number" style={{ color: '#888', minWidth: 36, textAlign: 'right', marginRight: 10, userSelect: 'none', fontSize: 11 }}>
                {index + 1}
              </span>
              <span style={{ whiteSpace: 'pre-wrap', flex: 1 }}>{log}</span>
            </div>
          );
        })}
        {filteredLogs.length === 0 && (
          <div className="log-line" style={{ color: '#888', fontStyle: 'italic' }}>No logs match your filter.</div>
        )}
      </div>
    </div>
  );
}

function AnalysisPanel({ data, label }) {
  if (!data || data.detail === "Not Found") {
    return <div className="no-data">No {label} available for these logs.</div>;
  }
  return (
    <pre className="analysis-json">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

const K8sLogScanner = () => {
  const [clusters, setClusters] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState('');
  const [namespaces, setNamespaces] = useState([]);
  const [selectedNamespaces, setSelectedNamespaces] = useState(['default']);
  const [scanConfig, setScanConfig] = useState({
    timeRangeMinutes: 60,
    logLevels: ['ERROR', 'WARN', 'CRITICAL'],
    maxLinesPerPod: 1000,
    searchPatterns: [],
    podLabels: {}
  });
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [error, setError] = useState('');
  const { notify } = useContext(NotificationContext);
  const [logFilter, setLogFilter] = useState('');
  const [showAllLogs, setShowAllLogs] = useState(false);
  const logsContainerRef = useRef(null);

  useEffect(() => {
    loadClusters();
  }, []);

  const loadClusters = async () => {
    try {
      const response = await fetch('http://localhost:8006/clusters');
      const data = await response.json();
      setClusters(data.clusters || []);
    } catch (error) {
      setError('Failed to load clusters: ' + error.message);
    }
  };

  const handleClusterChange = async (clusterArn) => {
    setSelectedCluster(clusterArn);
    setSelectedNamespaces(['default']);
    setNamespaces([]);
    if (clusterArn) {
      try {
        const nsResp = await api.getK8sNamespaces(clusterArn);
        setNamespaces(nsResp.namespaces || []);
      } catch (err) {
        setError('Failed to load namespaces: ' + err.message);
        setNamespaces(['default']);
      }
    }
  };

  const handleNamespaceToggle = (namespace) => {
    setSelectedNamespaces(prev => 
      prev.includes(namespace)
        ? prev.filter(ns => ns !== namespace)
        : [...prev, namespace]
    );
  };

  const handleLogLevelToggle = (level) => {
    setScanConfig(prev => ({
      ...prev,
      logLevels: prev.logLevels.includes(level)
        ? prev.logLevels.filter(l => l !== level)
        : [...prev.logLevels, level]
    }));
  };

  const addSearchPattern = () => {
    const pattern = prompt('Enter search pattern:');
    if (pattern) {
      setScanConfig(prev => ({
        ...prev,
        searchPatterns: [...prev.searchPatterns, pattern]
      }));
    }
  };

  const removeSearchPattern = (index) => {
    setScanConfig(prev => ({
      ...prev,
      searchPatterns: prev.searchPatterns.filter((_, i) => i !== index)
    }));
  };

  const addPodLabel = () => {
    const key = prompt('Enter label key:');
    const value = prompt('Enter label value:');
    if (key && value) {
      setScanConfig(prev => ({
        ...prev,
        podLabels: { ...prev.podLabels, [key]: value }
      }));
    }
  };

  const removePodLabel = (key) => {
    setScanConfig(prev => {
      const newLabels = { ...prev.podLabels };
      delete newLabels[key];
      return { ...prev, podLabels: newLabels };
    });
  };

  const scanLogs = async () => {
    if (!selectedCluster) {
      setError('Please select a cluster');
      return;
    }

    setScanning(true);
    setError('');
    setScanResults(null);

    try {
      const scanRequest = {
        cluster_config: {
          name: selectedCluster,
          type: selectedCluster.includes('eks') ? 'eks' : 'gke',
          context: selectedCluster
        },
        namespaces: selectedNamespaces,
        pod_labels: Object.keys(scanConfig.podLabels).length > 0 ? scanConfig.podLabels : null,
        time_range_minutes: scanConfig.timeRangeMinutes,
        log_levels: scanConfig.logLevels,
        search_patterns: scanConfig.searchPatterns.length > 0 ? scanConfig.searchPatterns : null,
        max_lines_per_pod: scanConfig.maxLinesPerPod
      };

      const results = await api.scanK8sLogs(scanRequest);
      setScanResults(results);
      if (results.incident_analysis) {
        notify('Incident analysis completed successfully!', 'success');
      }
    } catch (error) {
      setError('Failed to scan logs: ' + error.message);
    } finally {
      setScanning(false);
    }
  };

  // Filtering logs
  const getFilteredLogs = (logs) => {
    if (!logFilter) return logs;
    return logs.filter(line => line.toLowerCase().includes(logFilter.toLowerCase()));
  };

  // Copy logs to clipboard
  const handleCopyLogs = (logs) => {
    const text = logs.join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="k8s-log-scanner">
      <h2>Kubernetes Log Scanner</h2>
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="scanner-config">
        <div className="config-section">
          <h3>Cluster Configuration</h3>
          <div className="form-group">
            <label>Select Cluster:</label>
            <select 
              value={selectedCluster} 
              onChange={(e) => handleClusterChange(e.target.value)}
            >
              <option value="">Select a cluster...</option>
              {clusters.filter(cluster => cluster.name !== '*').map(cluster => (
                <option key={cluster.cluster} value={cluster.cluster}>
                  {cluster.name} ({cluster.cluster})
                </option>
              ))}
            </select>
            <button onClick={loadClusters} className="refresh-btn">
              🔄 Refresh
            </button>
          </div>
        </div>

        <div className="config-section">
          <h3>Namespace Selection</h3>
          <div className="namespace-list">
            {selectedCluster === '' ? (
              <div className="namespace-placeholder" style={{ color: '#888', fontStyle: 'italic', padding: '8px 0' }}>
                Select a cluster to view namespaces.
              </div>
            ) : namespaces.length === 0 ? (
              <div className="namespace-placeholder" style={{ color: '#888', fontStyle: 'italic', padding: '8px 0' }}>
                {error && error.toLowerCase().includes('namespace') || error.toLowerCase().includes('connect') || error.toLowerCase().includes('load') ? (
                  <>Could not connect to the cluster or fetch namespaces. Please check your cluster connectivity and try again.</>
                ) : (
                  <>No namespaces found for this cluster,verify your logging to k8s cluster is enabled.</>
                )}
              </div>
            ) : (
              namespaces.map(namespace => (
                <label key={namespace} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedNamespaces.includes(namespace)}
                    onChange={() => handleNamespaceToggle(namespace)}
                  />
                  {namespace}
                </label>
              ))
            )}
          </div>
        </div>

        <div className="config-section">
          <h3>Scan Configuration</h3>
          
          <div className="form-group">
            <label>Time Range (minutes):</label>
            <input
              type="number"
              value={scanConfig.timeRangeMinutes}
              onChange={(e) => setScanConfig(prev => ({
                ...prev,
                timeRangeMinutes: parseInt(e.target.value) || 60
              }))}
              min="1"
              max="1440"
            />
          </div>

          <div className="form-group">
            <label>Max Lines per Pod:</label>
            <input
              type="number"
              value={scanConfig.maxLinesPerPod}
              onChange={(e) => setScanConfig(prev => ({
                ...prev,
                maxLinesPerPod: parseInt(e.target.value) || 1000
              }))}
              min="1"
              max="10000"
            />
          </div>

          <div className="form-group">
            <label>Log Levels:</label>
            <div className="log-levels">
              {['ERROR', 'WARN', 'CRITICAL', 'INFO', 'DEBUG'].map(level => (
                <label key={level} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={scanConfig.logLevels.includes(level)}
                    onChange={() => handleLogLevelToggle(level)}
                  />
                  {level}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Search Patterns:</label>
            <div className="search-patterns">
              {scanConfig.searchPatterns.map((pattern, index) => (
                <div key={index} className="pattern-item">
                  <span>{pattern}</span>
                  <button onClick={() => removeSearchPattern(index)}>×</button>
                </div>
              ))}
              <button onClick={addSearchPattern} className="add-btn">
                + Add Pattern
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Pod Labels:</label>
            <div className="pod-labels">
              {Object.entries(scanConfig.podLabels).map(([key, value]) => (
                <div key={key} className="label-item">
                  <span>{key}={value}</span>
                  <button onClick={() => removePodLabel(key)}>×</button>
                </div>
              ))}
              <button onClick={addPodLabel} className="add-btn">
                + Add Label
              </button>
            </div>
          </div>
        </div>

        <button 
          onClick={scanLogs} 
          disabled={scanning || !selectedCluster}
          className="scan-btn"
        >
          {scanning ? 'Scanning...' : 'Scan Logs'}
        </button>
      </div>

      {scanResults && Array.isArray(scanResults.results) ? (
        <div className="scan-results">
          <h3>Scan Results</h3>
          {scanResults.results.length === 0 ? (
            <div className="no-data">No log events found for this scan.</div>
          ) : (
            scanResults.results.map((item, idx) => (
              <Accordion key={idx} style={{ marginBottom: 12 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 500, color: getLogLevel(item.log) ? '#007bff' : '#333', background: getLogLevel(item.log) ? LOG_LEVEL_COLORS[getLogLevel(item.log)] : undefined, padding: '2px 8px', borderRadius: 4 }}>
                    {item.log}
                  </span>
                </AccordionSummary>
                <AccordionDetails>
                  <div style={{ marginBottom: 12 }}>
                    <strong>Log Analysis:</strong>
                    <AnalysisPanel data={item.analysis} label="log analysis" />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <strong>Root Cause Prediction:</strong>
                    <AnalysisPanel data={item.root_cause} label="root cause prediction" />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <strong>Knowledge Base Search:</strong>
                    <AnalysisPanel data={item.knowledge} label="knowledge base search" />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <strong>Action Recommendations:</strong>
                    <AnalysisPanel data={item.recommendations} label="action recommendations" />
                  </div>
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </div>
      ) : scanResults && (
        // fallback: old structure (if present)
        <div className="scan-results">
          <h3>Scan Results</h3>
          <div className="results-summary">
            <p><strong>Cluster:</strong> {scanResults.cluster_name}</p>
            <p><strong>Total Logs:</strong> {scanResults.total_logs}</p>
            <p><strong>Pods Scanned:</strong> {Array.isArray(scanResults.pods_scanned) ? scanResults.pods_scanned.length : 0}</p>
            <p><strong>Scan Time:</strong> {scanResults.scan_time ? new Date(scanResults.scan_time).toLocaleString() : ''}</p>
          </div>

          {Array.isArray(scanResults.errors) && scanResults.errors.length > 0 && (
            <div className="scan-errors">
              <h4>Errors:</h4>
              <ul>
                {scanResults.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(scanResults.pods_scanned) && scanResults.pods_scanned.length > 0 && (
            <div className="pods-scanned">
              <h4>Pods Scanned:</h4>
              <ul>
                {scanResults.pods_scanned.map((pod, index) => (
                  <li key={index}>{pod}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(scanResults.logs) && (
            <LogsPanel
              logs={scanResults.logs}
              logFilter={logFilter}
              setLogFilter={setLogFilter}
              showAllLogs={showAllLogs}
              setShowAllLogs={setShowAllLogs}
              logsContainerRef={logsContainerRef}
              getLogLevel={getLogLevel}
              LOG_LEVEL_COLORS={LOG_LEVEL_COLORS}
            />
          )}

          {scanResults.analysis || scanResults.root_cause || scanResults.knowledge || scanResults.recommendations ? (
            <div style={{ marginTop: 32 }}>
              <h3>Incident Analysis</h3>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>Log Analysis</AccordionSummary>
                <AccordionDetails>
                  <AnalysisPanel data={scanResults.analysis} label="log analysis" />
                </AccordionDetails>
              </Accordion>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>Root Cause Prediction</AccordionSummary>
                <AccordionDetails>
                  <AnalysisPanel data={scanResults.root_cause} label="root cause prediction" />
                </AccordionDetails>
              </Accordion>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>Knowledge Base Search</AccordionSummary>
                <AccordionDetails>
                  <AnalysisPanel data={scanResults.knowledge} label="knowledge base search" />
                </AccordionDetails>
              </Accordion>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>Action Recommendations</AccordionSummary>
                <AccordionDetails>
                  <AnalysisPanel data={scanResults.recommendations} label="action recommendations" />
                </AccordionDetails>
              </Accordion>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default K8sLogScanner; 