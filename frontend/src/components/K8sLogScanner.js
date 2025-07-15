import React, { useState, useEffect, useContext } from 'react';
import { api } from '../services/api';
import './K8sLogScanner.css';
import { NotificationContext } from '../App';

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

      {scanResults && (
        <div className="scan-results">
          <h3>Scan Results</h3>
          <div className="results-summary">
            <p><strong>Cluster:</strong> {scanResults.cluster_name}</p>
            <p><strong>Total Logs:</strong> {scanResults.total_logs}</p>
            <p><strong>Pods Scanned:</strong> {scanResults.pods_scanned.length}</p>
            <p><strong>Scan Time:</strong> {new Date(scanResults.scan_time).toLocaleString()}</p>
          </div>

          {scanResults.errors.length > 0 && (
            <div className="scan-errors">
              <h4>Errors:</h4>
              <ul>
                {scanResults.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {scanResults.pods_scanned.length > 0 && (
            <div className="pods-scanned">
              <h4>Pods Scanned:</h4>
              <ul>
                {scanResults.pods_scanned.map((pod, index) => (
                  <li key={index}>{pod}</li>
                ))}
              </ul>
            </div>
          )}

          {scanResults.logs.length > 0 && (
            <div className="logs-display">
              <h4>Logs ({scanResults.logs.length} lines):</h4>
              <div className="logs-container">
                {scanResults.logs.map((log, index) => (
                  <div key={index} className="log-line">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Incident Analysis Results from backend */}
          {scanResults.incident_analysis && (
            <div style={{ marginTop: 32 }}>
              <h3>Incident Analysis</h3>
              <div>
                <strong>Log Analysis:</strong>
                <pre>{JSON.stringify(scanResults.incident_analysis.analysis, null, 2)}</pre>
              </div>
              <div>
                <strong>Root Cause Prediction:</strong>
                <pre>{JSON.stringify(scanResults.incident_analysis.prediction, null, 2)}</pre>
              </div>
              <div>
                <strong>Knowledge Search:</strong>
                <pre>{JSON.stringify(scanResults.incident_analysis.search, null, 2)}</pre>
              </div>
              <div>
                <strong>Action Recommendations:</strong>
                <pre>{JSON.stringify(scanResults.incident_analysis.recommendations, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default K8sLogScanner; 