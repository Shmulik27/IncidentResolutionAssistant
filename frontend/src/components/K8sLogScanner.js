import React, { useState, useEffect, useContext, useRef } from 'react';
import { api } from '../services/api';
import './K8sLogScanner.css';
import { NotificationContext } from '../App';
import {
  Accordion, AccordionSummary, AccordionDetails, Button, Card, CardContent, Typography, Grid, Paper, Divider, TextField, Select, MenuItem, Checkbox, FormControlLabel, FormGroup, Box, Chip, IconButton, CircularProgress, Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';

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

  // Scheduled jobs state
  const [jobs, setJobs] = useState([]);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobError, setJobError] = useState('');
  // 1. Add microservice options
  // 2. Add edit state
  const [editingJobId, setEditingJobId] = useState(null);
  // 3. Update jobForm initial state to include microservices
  const [jobForm, setJobForm] = useState({
    name: '',
    namespace: 'default',
    logLevels: ['ERROR', 'WARN', 'CRITICAL'],
    interval: 300, // seconds
    pods: [],
  });

  // Add pod selection state
  const [availablePods, setAvailablePods] = useState([]);

  useEffect(() => {
    fetchJobs();
  }, []);

  // State to control job creation form visibility
  const [showJobForm, setShowJobForm] = useState(false);

  // When job form is shown, fetch clusters
  useEffect(() => {
    if (showJobForm) {
      loadClusters();
    }
  }, [showJobForm]);

  // Fetch pods when cluster/namespace changes in job form
  useEffect(() => {
    if (selectedCluster && selectedNamespaces.length === 1) {
      const ns = selectedNamespaces[0];
      api.getK8sPods(selectedCluster, ns).then(pods => {
        setAvailablePods(pods);
        // If creating a new job, default to all pods selected
        setJobForm(prev => ({ ...prev, pods: pods }));
      }).catch(() => setAvailablePods([]));
    }
  }, [selectedCluster, selectedNamespaces, showJobForm]);

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

  // Update handleNamespaceToggle to enforce single-select
  const handleNamespaceToggle = (namespace) => {
    setSelectedNamespaces([namespace]);
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

  const fetchJobs = async () => {
    setJobLoading(true);
    setJobError('');
    try {
      const jobs = await api.listLogScanJobs();
      // Map snake_case to camelCase for frontend
      setJobs(jobs.map(job => ({
        ...job,
        createdAt: job.created_at,
        lastRun: job.last_run,
        logLevels: job.log_levels,
      })));
    } catch (err) {
      setJobError('Failed to load jobs: ' + err.message);
    } finally {
      setJobLoading(false);
    }
  };

  const handleJobFormChange = (e) => {
    const { name, value } = e.target;
    setJobForm(prev => ({ ...prev, [name]: value }));
  };

  const handleJobLogLevelToggle = (level) => {
    setJobForm(prev => ({
      ...prev,
      logLevels: prev.logLevels.includes(level)
        ? prev.logLevels.filter(l => l !== level)
        : [...prev.logLevels, level]
    }));
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setJobLoading(true);
    setJobError('');
    try {
      const job = {
        name: jobForm.name,
        namespace: selectedNamespaces[0],
        log_levels: jobForm.logLevels,
        interval: parseInt(jobForm.interval, 10) * 60,
        pods: jobForm.pods,
        cluster: selectedCluster,
        microservices: [
          'log_analyzer',
          'root_cause_predictor',
          'knowledge_base',
          'action_recommender',
        ],
      };
      await api.createLogScanJob(job);
      setJobForm({ name: '', namespace: 'default', logLevels: ['ERROR', 'WARN', 'CRITICAL'], interval: 300, pods: [] });
      fetchJobs();
      notify('Scheduled log scan job created!', 'success');
    } catch (err) {
      setJobError('Failed to create job: ' + err.message);
    } finally {
      setJobLoading(false);
    }
  };

  const handleDeleteJob = async (jobId) => {
    setJobLoading(true);
    setJobError('');
    try {
      await api.deleteLogScanJob(jobId);
      fetchJobs();
      notify('Job deleted', 'success');
    } catch (err) {
      setJobError('Failed to delete job: ' + err.message);
    } finally {
      setJobLoading(false);
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
    <Box className="k8s-log-scanner" sx={{ maxWidth: 1100, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>Kubernetes Log Scanner</Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}
      {showJobForm && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Create New Log Scan Job</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Job Name"
                  name="name"
                  value={jobForm.name}
                  onChange={handleJobFormChange}
                  fullWidth
                  size="small"
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Interval (minutes)"
                  name="interval"
                  type="number"
                  value={jobForm.interval / 60}
                  onChange={e => setJobForm(prev => ({ ...prev, interval: (parseInt(e.target.value, 10) || 5) * 60 }))}
                  inputProps={{ min: 1, max: 1440 }}
                  fullWidth
                  size="small"
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1">Cluster</Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Select
                    fullWidth
                    value={selectedCluster}
                    onChange={e => handleClusterChange(e.target.value)}
                    displayEmpty
                  >
                    <MenuItem value="">Select a cluster...</MenuItem>
                    {Array.isArray(clusters) && clusters.filter(cluster => cluster.name !== '*').map(cluster => (
                      <MenuItem key={cluster.cluster} value={cluster.cluster}>
                        {cluster.name} ({cluster.cluster})
                      </MenuItem>
                    ))}
                  </Select>
                  <IconButton onClick={loadClusters} size="small"><RefreshIcon /></IconButton>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1">Namespaces</Typography>
                <Paper variant="outlined" sx={{ p: 1, minHeight: 56 }}>
                  {selectedCluster === '' ? (
                    <Typography color="text.secondary" fontStyle="italic">Select a cluster to view namespaces.</Typography>
                  ) : !Array.isArray(namespaces) || namespaces.length === 0 ? (
                    <Typography color="text.secondary" fontStyle="italic">
                      {error && error.toLowerCase().includes('namespace') || error.toLowerCase().includes('connect') || error.toLowerCase().includes('load') ? (
                        <>Could not connect to the cluster or fetch namespaces. Please check your cluster connectivity and try again.</>
                      ) : (
                        <>No namespaces found for this cluster, verify your logging to k8s cluster is enabled.</>
                      )}
                    </Typography>
                  ) : (
                    <FormGroup row>
                      {Array.isArray(namespaces) && namespaces.map(namespace => (
                        <FormControlLabel
                          key={namespace}
                          control={
                            <Checkbox
                              checked={selectedNamespaces.includes(namespace)}
                              onChange={() => handleNamespaceToggle(namespace)}
                            />
                          }
                          label={namespace}
                        />
                      ))}
                    </FormGroup>
                  )}
                </Paper>
              </Grid>
              {selectedCluster && selectedNamespaces.length === 1 && (
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1">Pods</Typography>
                  <Paper variant="outlined" sx={{ p: 1, minHeight: 56 }}>
                    {!Array.isArray(availablePods) || availablePods.length === 0 ? (
                      <Typography color="text.secondary" fontStyle="italic">
                        {error && error.toLowerCase().includes('pod') ? (
                          <>Could not fetch pods. Please check your cluster connectivity and try again.</>
                        ) : (
                          <>No pods found for this namespace.</>
                        )}
                      </Typography>
                    ) : (
                      <FormGroup row>
                        {availablePods.map(pod => (
                          <FormControlLabel
                            key={pod}
                            control={
                              <Checkbox
                                checked={jobForm.pods.includes(pod)}
                                onChange={() => setJobForm(prev => ({
                                  ...prev,
                                  pods: prev.pods.includes(pod)
                                    ? prev.pods.filter(p => p !== pod)
                                    : [...prev.pods, pod],
                                }))}
                              />
                            }
                            label={pod}
                          />
                        ))}
                      </FormGroup>
                    )}
                  </Paper>
                </Grid>
              )}
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1">Scan Configuration</Typography>
                <Box>
                  <TextField
                    label="Time Range (minutes)"
                    type="number"
                    value={scanConfig.timeRangeMinutes}
                    onChange={e => setScanConfig(prev => ({ ...prev, timeRangeMinutes: parseInt(e.target.value) || 60 }))}
                    inputProps={{ min: 1, max: 1440 }}
                    size="small"
                    sx={{ mb: 1, width: '100%' }}
                  />
                  <TextField
                    label="Max Lines per Pod"
                    type="number"
                    value={scanConfig.maxLinesPerPod}
                    onChange={e => setScanConfig(prev => ({ ...prev, maxLinesPerPod: parseInt(e.target.value) || 1000 }))}
                    inputProps={{ min: 1, max: 10000 }}
                    size="small"
                    sx={{ mb: 1, width: '100%' }}
                  />
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>Log Levels:</Typography>
                    {['ERROR', 'WARN', 'CRITICAL', 'INFO', 'DEBUG'].map(level => (
                      <FormControlLabel
                        key={level}
                        control={
                          <Checkbox
                            checked={scanConfig.logLevels.includes(level)}
                            onChange={() => handleLogLevelToggle(level)}
                          />
                        }
                        label={level}
                      />
                    ))}
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2">Search Patterns:</Typography>
                    {scanConfig.searchPatterns.map((pattern, index) => (
                      <Chip
                        key={index}
                        label={pattern}
                        onDelete={() => removeSearchPattern(index)}
                        sx={{ mr: 1, mb: 0.5 }}
                      />
                    ))}
                    <IconButton onClick={addSearchPattern} size="small"><AddIcon fontSize="small" /></IconButton>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2">Pod Labels:</Typography>
                    {Object.entries(scanConfig.podLabels).map(([key, value]) => (
                      <Chip
                        key={key}
                        label={`${key}=${value}`}
                        onDelete={() => removePodLabel(key)}
                        sx={{ mr: 1, mb: 0.5 }}
                      />
                    ))}
                    <IconButton onClick={addPodLabel} size="small"><AddIcon fontSize="small" /></IconButton>
                  </Box>
                </Box>
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={scanLogs}
                disabled={scanning || !selectedCluster}
              >
                {scanning ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                {scanning ? 'Scanning...' : 'Scan Now'}
              </Button>
              {editingJobId ? (
                <Button
                  variant="contained"
                  color="success"
                  onClick={async () => {
                    setJobLoading(true);
                    setJobError('');
                    try {
                      await api.updateLogScanJob(editingJobId, {
                        name: jobForm.name,
                        namespace: selectedNamespaces[0],
                        log_levels: jobForm.logLevels,
                        interval: parseInt(jobForm.interval, 10) * 60,
                        pods: jobForm.pods,
                        cluster: selectedCluster,
                        microservices: [
                          'log_analyzer',
                          'root_cause_predictor',
                          'knowledge_base',
                          'action_recommender',
                        ],
                      });
                      setEditingJobId(null);
                      setShowJobForm(false);
                      setJobForm({ name: '', namespace: 'default', logLevels: ['ERROR', 'WARN', 'CRITICAL'], interval: 300, pods: [] });
                      fetchJobs();
                      notify('Job updated!', 'success');
                    } catch (err) {
                      setJobError('Failed to update job: ' + err.message);
                    } finally {
                      setJobLoading(false);
                    }
                  }}
                  disabled={jobLoading || !selectedCluster || selectedNamespaces.length === 0}
                >
                  {jobLoading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                  {jobLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleCreateJob}
                  disabled={jobLoading || !selectedCluster || selectedNamespaces.length === 0}
                >
                  {jobLoading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                  {jobLoading ? 'Creating...' : 'Create Job'}
                </Button>
              )}
              <Button variant="outlined" color="secondary" onClick={() => setShowJobForm(false)}>Cancel</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Log Scan Jobs Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6">Scheduled Log Scan Jobs</Typography>
            {!showJobForm && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowJobForm(true)}>
                Create New Job
              </Button>
            )}
          </Box>
          {jobError && <Alert severity="error" sx={{ mb: 2 }}>{jobError}</Alert>}
          {jobLoading && <Box display="flex" alignItems="center" gap={1}><CircularProgress size={20} /> Loading jobs...</Box>}
          <Grid container spacing={2}>
            {Array.isArray(jobs) && jobs.length > 0 ? jobs.map(job => (
              <Grid item xs={12} md={6} key={job.id}>
                <Paper variant="outlined" sx={{ p: 2, mb: 1, borderLeft: '6px solid #1976d2' }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>{job.name || 'Untitled Job'}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Namespace: <b>{job.namespace}</b> | Log Levels: <b>{(job.logLevels || job.log_levels || []).join(', ')}</b> | Interval: <b>{(job.interval / 60).toFixed(1)} min</b>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Created: {new Date(job.createdAt || job.created_at).toLocaleString()} | Last Run: {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Never'}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <IconButton color="primary" onClick={async () => {
                        setEditingJobId(job.id);
                        setShowJobForm(true);
                        const cluster = job.cluster || selectedCluster;
                        const ns = job.namespace;
                        setSelectedCluster(cluster);
                        setSelectedNamespaces([ns]);
                        // Fetch namespaces for the cluster
                        if (cluster) {
                          const nsResp = await api.getK8sNamespaces(cluster);
                          setNamespaces(nsResp.namespaces || []);
                        }
                        // Fetch pods for the cluster/namespace
                        if (cluster && ns) {
                          const pods = await api.getK8sPods(cluster, ns);
                          setAvailablePods(pods);
                        }
                        setJobForm({
                          name: job.name || '',
                          namespace: ns, // ensure this is set to the job's actual namespace
                          logLevels: job.logLevels || job.log_levels || ['ERROR', 'WARN', 'CRITICAL'],
                          interval: job.interval ? Math.round(job.interval / 60) : 5,
                          pods: job.pods || [],
                        });
                      }} disabled={jobLoading} title="Edit Job">
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleDeleteJob(job.id)} disabled={jobLoading} title="Delete Job">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            )) : (
              <Grid item xs={12}><Typography color="text.secondary">No scheduled jobs found.</Typography></Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {scanResults && Array.isArray(scanResults.results) ? (
        <div className="scan-results">
          <h3>Scan Results</h3>
          {Array.isArray(scanResults?.results) ? (
            scanResults.results.length === 0 ? (
              <div className="no-data">No log events found for this scan.</div>
            ) : (
              Array.isArray(scanResults.results) && scanResults.results.map((item, idx) => (
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
            )
          ) : null}
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
                {Array.isArray(scanResults.errors) && scanResults.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(scanResults.pods_scanned) && scanResults.pods_scanned.length > 0 && (
            <div className="pods-scanned">
              <h4>Pods Scanned:</h4>
              <ul>
                {Array.isArray(scanResults.pods_scanned) && scanResults.pods_scanned.map((pod, index) => (
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
    </Box>
  );
};

export default K8sLogScanner; 