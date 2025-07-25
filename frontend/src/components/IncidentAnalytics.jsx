import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab
} from '@mui/material';
import {
  Refresh,
  TrendingUp,
  TrendingDown,
  BugReport,
  Schedule,
  Assessment,
  Warning,
  CheckCircle,
  Error
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts';
import { api } from '../services/api';

const IncidentAnalytics = ({ active }) => {
  const [analytics, setAnalytics] = useState({
    incidents: [],
    trends: [],
    patterns: [],
    topIssues: [],
    resolutionTimes: [],
    severityDistribution: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [live, setLive] = useState(false);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState(null);
  const [tab, setTab] = useState(0);

  // Compute analytics from recentIncidents
  useEffect(() => {
    setLoading(true);
    // Defensive: always use array
    const incidents = Array.isArray(recentIncidents) ? recentIncidents : [];
    // Trends: group by date (createdAt or timestamp)
    const trendsMap = {};
    incidents.forEach(inc => {
      const date = inc.createdAt ? inc.createdAt.slice(0, 10) : (inc.timestamp ? new Date(inc.timestamp).toISOString().slice(0, 10) : '');
      if (!trendsMap[date]) trendsMap[date] = { date, incidents: 0, resolved: 0, avgResolutionTime: 0, totalResolutionTime: 0 };
      trendsMap[date].incidents++;
      if (inc.status === 'Resolved') {
        trendsMap[date].resolved++;
        if (inc.resolutionTime) {
          trendsMap[date].totalResolutionTime += Number(inc.resolutionTime);
        }
      }
    });
    const trends = Object.values(trendsMap).map(t => ({
      ...t,
      avgResolutionTime: t.resolved > 0 ? t.totalResolutionTime / t.resolved : 0
    }));
    // Patterns: resolved incidents with resolutionTime
    const patterns = incidents.filter(i => i.resolutionTime);
    // Top Issues: group by category
    const topIssuesMap = {};
    incidents.forEach(inc => {
      const cat = inc.category || 'Other';
      if (!topIssuesMap[cat]) topIssuesMap[cat] = { category: cat, count: 0, totalResolutionTime: 0 };
      topIssuesMap[cat].count++;
      if (inc.resolutionTime) topIssuesMap[cat].totalResolutionTime += Number(inc.resolutionTime);
    });
    const topIssues = Object.values(topIssuesMap).map(t => ({
      ...t,
      avgResolutionTime: t.count > 0 ? t.totalResolutionTime / t.count : 0
    }));
    // Severity Distribution
    const severityColors = { Critical: '#f44336', High: '#ff9800', Medium: '#ffc107', Low: '#4caf50' };
    const severityMap = {};
    incidents.forEach(inc => {
      const sev = inc.severity || 'Other';
      if (!severityMap[sev]) severityMap[sev] = { severity: sev, count: 0, color: severityColors[sev] || '#90caf9' };
      severityMap[sev].count++;
    });
    const severityDistribution = Object.values(severityMap);
    // Resolution Times by Service
    const serviceMap = {};
    incidents.forEach(inc => {
      const svc = inc.service || 'Unknown';
      if (!serviceMap[svc]) serviceMap[svc] = { service: svc, avgTime: 0, totalIncidents: 0, totalTime: 0 };
      serviceMap[svc].totalIncidents++;
      if (inc.resolutionTime) serviceMap[svc].totalTime += Number(inc.resolutionTime);
    });
    const resolutionTimes = Object.values(serviceMap).map(s => ({
      ...s,
      avgTime: s.totalIncidents > 0 ? s.totalTime / s.totalIncidents : 0
    }));
    setAnalytics({
      incidents,
      trends,
      patterns,
      topIssues,
      resolutionTimes,
      severityDistribution
    });
    setLoading(false);
  }, [recentIncidents]);

  // Fetch real recent incidents from backend
  const fetchRecentIncidents = async () => {
    setRecentLoading(true);
    setRecentError(null);
    try {
      const incidents = await api.getRecentIncidents();
      setRecentIncidents(incidents);
    } catch (err) {
      setRecentError('Failed to fetch recent incidents: ' + err.message);
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => {
    if (active) {
      fetchRecentIncidents();
    }
    // eslint-disable-next-line
  }, [active]);

  // Real-time updates for metrics (demo: only update metrics, not incident list)
  useEffect(() => {
    let eventSource;
    let fallbackInterval;
    setLive(false);
    try {
      eventSource = new window.EventSource('http://localhost:8080/metrics/stream');
      eventSource.onopen = () => setLive(true);
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          setAnalytics((prev) => ({
            ...prev,
            // For demo, update only a few metrics
            incidents: prev.incidents,
            trends: prev.trends,
            patterns: prev.patterns,
            topIssues: prev.topIssues,
            resolutionTimes: prev.resolutionTimes,
            severityDistribution: prev.severityDistribution,
            _realtime: data // store for metrics
          }));
          setLastUpdated(new Date());
        } catch (err) {
          setLive(false);
        }
      };
      eventSource.onerror = () => {
        setLive(false);
        eventSource.close();
        fallbackInterval = setInterval(fetchRecentIncidents, 5000);
      };
    } catch (err) {
      setLive(false);
      fallbackInterval = setInterval(fetchRecentIncidents, 5000);
    }
    return () => {
      if (eventSource) eventSource.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    fetchRecentIncidents();
    const interval = setInterval(() => {
      fetchRecentIncidents();
    }, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [timeRange]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return 'error';
      case 'High': return 'warning';
      case 'Medium': return 'info';
      case 'Low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    return status === 'Resolved' ? 'success' : 'warning';
  };

  const calculateMetrics = () => {
    const incidentsArr = Array.isArray(analytics.incidents) ? analytics.incidents : [];
    const patternsArr = Array.isArray(analytics.patterns) ? analytics.patterns : [];
    const totalIncidents = incidentsArr.length;
    const resolvedIncidents = incidentsArr.filter(i => i.status === 'Resolved').length;
    const openIncidents = totalIncidents - resolvedIncidents;
    const avgResolutionTime = patternsArr.length > 0 
      ? patternsArr.reduce((sum, i) => sum + i.resolutionTime, 0) / patternsArr.length
      : 0;
    return { totalIncidents, resolvedIncidents, openIncidents, avgResolutionTime };
  };

  const metrics = calculateMetrics();

  if (loading && (!Array.isArray(analytics.incidents) || analytics.incidents.length === 0)) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Incident Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Incident trends, patterns, and resolution insights
            {lastUpdated && (
              <span> • Last updated: {lastUpdated.toLocaleTimeString()}</span>
            )}
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <Chip label={live ? 'Live' : 'Offline'} color={live ? 'success' : 'default'} size="small" />
          <FormControl size="small">
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} aria-label="incident dashboard tabs" sx={{ mb: 3 }}>
        <Tab label="Analytics Overview" />
        <Tab label="Recent Incidents Details" />
      </Tabs>

      {tab === 0 && (
        <>
          {/* Key Metrics Cards */}
          <Grid container spacing={3} mb={3} sx={{ overflowX: 'auto', flexWrap: { xs: 'nowrap', sm: 'wrap' } }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <BugReport color="primary" sx={{ mr: 2 }} />
                    <Box>
                      <Typography variant="h6">Total Incidents</Typography>
                      <Typography variant="h4" color="primary">
                        {metrics.totalIncidents}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <CheckCircle color="success" sx={{ mr: 2 }} />
                    <Box>
                      <Typography variant="h6">Resolved</Typography>
                      <Typography variant="h4" color="success">
                        {metrics.resolvedIncidents}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <Warning color="warning" sx={{ mr: 2 }} />
                    <Box>
                      <Typography variant="h6">Open</Typography>
                      <Typography variant="h4" color="warning">
                        {metrics.openIncidents}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <Schedule color="info" sx={{ mr: 2 }} />
                    <Box>
                      <Typography variant="h6">Avg Resolution</Typography>
                      <Typography variant="h4" color="info">
                        {metrics.avgResolutionTime.toFixed(1)}h
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts Row 1 */}
          <Grid container spacing={3} mb={3} sx={{ overflowX: 'auto', flexWrap: { xs: 'nowrap', sm: 'wrap' } }}>
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Incident Trends
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="incidents" stroke="#8884d8" name="Total Incidents" />
                      <Line type="monotone" dataKey="resolved" stroke="#82ca9d" name="Resolved" />
                      <Line type="monotone" dataKey="avgResolutionTime" stroke="#ffc658" name="Avg Resolution Time (h)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Severity Distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.severityDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ severity, percent }) => `${severity} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {analytics.severityDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts Row 2 */}
          <Grid container spacing={3} mb={3} sx={{ overflowX: 'auto', flexWrap: { xs: 'nowrap', sm: 'wrap' } }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Top Issue Categories
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.topIssues}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#8884d8" name="Incident Count" />
                      <Bar dataKey="avgResolutionTime" fill="#82ca9d" name="Avg Resolution Time (h)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Resolution Time by Service
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.resolutionTimes}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="service" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="avgTime" fill="#8884d8" name="Avg Resolution Time (h)" />
                      <Bar dataKey="totalIncidents" fill="#82ca9d" name="Total Incidents" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Recent Incidents Table */}
          <Box sx={{ width: '100%', overflowX: 'auto', mb: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Incidents
                </Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Service</TableCell>
                        <TableCell>Severity</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Resolution Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Array.isArray(analytics.incidents) && analytics.incidents.slice(0, 10).map((incident) => (
                        <TableRow key={incident.id}>
                          <TableCell>{incident.title}</TableCell>
                          <TableCell>{incident.service}</TableCell>
                          <TableCell>
                            <Chip 
                              label={incident.severity} 
                              color={getSeverityColor(incident.severity)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={incident.status} 
                              color={getStatusColor(incident.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{incident.category}</TableCell>
                          <TableCell>{incident.createdAt}</TableCell>
                          <TableCell>
                            {incident.resolutionTime 
                              ? `${incident.resolutionTime}h` 
                              : incident.status === 'Open' ? 'In Progress' : 'N/A'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        </>
      )}

      {tab === 1 && <RecentIncidentsDetails />}
    </Box>
  );
};

export default IncidentAnalytics; 

export function RecentIncidentsDetails() {
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState(null);
  const [jobs, setJobs] = useState([]);

  function safeParse(str) {
    try { return JSON.parse(str); } catch { return str; }
  }

  useEffect(() => {
    const fetchData = async () => {
      setRecentLoading(true);
      setRecentError(null);
      try {
        const [incidents, jobsList] = await Promise.all([
          api.getRecentIncidents(),
          api.listLogScanJobs()
        ]);
        setRecentIncidents(
          incidents.map(inc => ({
            ...inc,
            analysisObj: safeParse(inc.analysis),
            rootCauseObj: safeParse(inc.root_cause),
            knowledgeObj: safeParse(inc.knowledge),
            actionObj: safeParse(inc.action),
          }))
        );
        setJobs(jobsList);
      } catch (err) {
        setRecentError('Failed to fetch recent incidents or jobs: ' + err.message);
      } finally {
        setRecentLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  // Helper to get job info by job_id
  const getJobInfo = (jobId) => jobs.find(j => j.id === jobId) || {};

  return (
    <Box>
      {recentLoading ? (
        <CircularProgress />
      ) : recentError ? (
        <Alert severity="error">{recentError}</Alert>
      ) : !Array.isArray(recentIncidents) || recentIncidents.length === 0 ? (
        <Alert severity="info">No recent incidents found.</Alert>
      ) : (
        <>
          {/* Accordion view */}
          <Box className="scan-results" sx={{ background: '#f8f9fa', p: 2, borderRadius: 2, borderLeft: '4px solid #28a745' }}>
            {recentIncidents.map((item, idx) => {
              const jobInfo = getJobInfo(item.job_id || item.jobId);
              return (
                <Accordion key={item.id || idx} sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<TrendingUp />}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 500, color: '#007bff', background: '#e3f2fd', padding: '2px 8px', borderRadius: 4 }}>
                      {item.log_line || item.logLine}
                    </span>
                  </AccordionSummary>
                  <AccordionDetails>
                    <div style={{ marginBottom: 12 }}>
                      <strong>Title:</strong> {item.title}
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <strong>Service:</strong> {item.service}
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <strong>Severity:</strong> {item.severity}
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <strong>Status:</strong> {item.status}
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <strong>Category:</strong> {item.category}
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <strong>Created:</strong> {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <strong>Resolution Time:</strong> {item.resolution_time ? item.resolution_time : 'N/A'}
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <strong>Log Analysis:</strong>
                      <pre style={{ maxWidth: 400, whiteSpace: 'pre-wrap' }}>{JSON.stringify(item.analysisObj, null, 2)}</pre>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <strong>Root Cause Prediction:</strong>
                      <pre style={{ maxWidth: 400, whiteSpace: 'pre-wrap' }}>{JSON.stringify(item.rootCauseObj, null, 2)}</pre>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <strong>Knowledge Base Search:</strong>
                      <pre style={{ maxWidth: 400, whiteSpace: 'pre-wrap' }}>{JSON.stringify(item.knowledgeObj, null, 2)}</pre>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <strong>Action Recommendations:</strong>
                      <pre style={{ maxWidth: 400, whiteSpace: 'pre-wrap' }}>{JSON.stringify(item.actionObj, null, 2)}</pre>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <strong>Job:</strong> {item.job_id || item.jobId || ''} {jobInfo.name ? `(${jobInfo.name})` : ''}
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <strong>Namespace:</strong> {jobInfo.namespace || ''}
                    </div>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        </>
      )}
    </Box>
  );
} 