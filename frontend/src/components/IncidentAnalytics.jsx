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
  InputLabel
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

const IncidentAnalytics = () => {
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

  // Mock incident data
  const mockIncidents = [
    { id: 1, title: 'Database Connection Timeout', severity: 'High', status: 'Resolved', createdAt: '2024-01-15', resolvedAt: '2024-01-15', resolutionTime: 2.5, service: 'log-analyzer', category: 'Infrastructure' },
    { id: 2, title: 'Memory Leak in Service', severity: 'Medium', status: 'Open', createdAt: '2024-01-14', resolvedAt: null, resolutionTime: null, service: 'root-cause-predictor', category: 'Performance' },
    { id: 3, title: 'API Rate Limit Exceeded', severity: 'Low', status: 'Resolved', createdAt: '2024-01-13', resolvedAt: '2024-01-13', resolutionTime: 1.2, service: 'knowledge-base', category: 'API' },
    { id: 4, title: 'Disk Space Full', severity: 'High', status: 'Resolved', createdAt: '2024-01-12', resolvedAt: '2024-01-12', resolutionTime: 4.0, service: 'action-recommender', category: 'Infrastructure' },
    { id: 5, title: 'Authentication Failure', severity: 'Medium', status: 'Resolved', createdAt: '2024-01-11', resolvedAt: '2024-01-11', resolutionTime: 3.1, service: 'incident-integrator', category: 'Security' },
    { id: 6, title: 'Network Latency', severity: 'Low', status: 'Open', createdAt: '2024-01-10', resolvedAt: null, resolutionTime: null, service: 'k8s-log-scanner', category: 'Network' },
    { id: 7, title: 'Service Crash', severity: 'Critical', status: 'Resolved', createdAt: '2024-01-09', resolvedAt: '2024-01-09', resolutionTime: 6.5, service: 'log-analyzer', category: 'Stability' },
    { id: 8, title: 'Data Corruption', severity: 'High', status: 'Resolved', createdAt: '2024-01-08', resolvedAt: '2024-01-08', resolutionTime: 8.2, service: 'knowledge-base', category: 'Data' }
  ];

  const mockTrends = [
    { date: '2024-01-01', incidents: 3, resolved: 2, avgResolutionTime: 2.1 },
    { date: '2024-01-02', incidents: 1, resolved: 1, avgResolutionTime: 1.5 },
    { date: '2024-01-03', incidents: 5, resolved: 4, avgResolutionTime: 3.2 },
    { date: '2024-01-04', incidents: 2, resolved: 2, avgResolutionTime: 2.8 },
    { date: '2024-01-05', incidents: 4, resolved: 3, avgResolutionTime: 4.1 },
    { date: '2024-01-06', incidents: 0, resolved: 0, avgResolutionTime: 0 },
    { date: '2024-01-07', incidents: 6, resolved: 5, avgResolutionTime: 2.9 },
    { date: '2024-01-08', incidents: 3, resolved: 2, avgResolutionTime: 3.5 },
    { date: '2024-01-09', incidents: 7, resolved: 6, avgResolutionTime: 4.2 },
    { date: '2024-01-10', incidents: 2, resolved: 1, avgResolutionTime: 1.8 },
    { date: '2024-01-11', incidents: 4, resolved: 4, avgResolutionTime: 2.3 },
    { date: '2024-01-12', incidents: 1, resolved: 1, avgResolutionTime: 1.2 },
    { date: '2024-01-13', incidents: 3, resolved: 2, avgResolutionTime: 3.1 },
    { date: '2024-01-14', incidents: 5, resolved: 4, avgResolutionTime: 2.7 },
    { date: '2024-01-15', incidents: 2, resolved: 1, avgResolutionTime: 2.5 }
  ];

  const mockTopIssues = [
    { category: 'Infrastructure', count: 15, avgResolutionTime: 3.2 },
    { category: 'Performance', count: 12, avgResolutionTime: 4.1 },
    { category: 'API', count: 8, avgResolutionTime: 1.8 },
    { category: 'Security', count: 6, avgResolutionTime: 2.9 },
    { category: 'Network', count: 5, avgResolutionTime: 2.3 },
    { category: 'Data', count: 4, avgResolutionTime: 5.2 }
  ];

  const mockSeverityDistribution = [
    { severity: 'Critical', count: 3, color: '#f44336' },
    { severity: 'High', count: 8, color: '#ff9800' },
    { severity: 'Medium', count: 12, color: '#ffc107' },
    { severity: 'Low', count: 6, color: '#4caf50' }
  ];

  const mockResolutionTimes = [
    { service: 'log-analyzer', avgTime: 2.8, totalIncidents: 5 },
    { service: 'root-cause-predictor', avgTime: 3.5, totalIncidents: 3 },
    { service: 'knowledge-base', avgTime: 2.1, totalIncidents: 4 },
    { service: 'action-recommender', avgTime: 4.2, totalIncidents: 2 },
    { service: 'incident-integrator', avgTime: 3.1, totalIncidents: 3 },
    { service: 'k8s-log-scanner', avgTime: 2.9, totalIncidents: 2 }
  ];

  const fetchIncidentAnalytics = async () => {
    setLoading(true);
    try {
      // In a real implementation, these would be API calls
      setAnalytics({
        incidents: mockIncidents,
        trends: mockTrends,
        patterns: mockIncidents.filter(i => i.resolutionTime),
        topIssues: mockTopIssues,
        resolutionTimes: mockResolutionTimes,
        severityDistribution: mockSeverityDistribution
      });
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to fetch incident analytics');
    } finally {
      setLoading(false);
    }
  };

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
        fallbackInterval = setInterval(fetchIncidentAnalytics, 5000);
      };
    } catch (err) {
      setLive(false);
      fallbackInterval = setInterval(fetchIncidentAnalytics, 5000);
    }
    return () => {
      if (eventSource) eventSource.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    fetchIncidentAnalytics();
    const interval = setInterval(fetchIncidentAnalytics, 300000); // Refresh every 5 minutes
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
    const totalIncidents = analytics.incidents.length;
    const resolvedIncidents = analytics.incidents.filter(i => i.status === 'Resolved').length;
    const openIncidents = totalIncidents - resolvedIncidents;
    const avgResolutionTime = analytics.patterns.length > 0 
      ? analytics.patterns.reduce((sum, i) => sum + i.resolutionTime, 0) / analytics.patterns.length
      : 0;
    
    return { totalIncidents, resolvedIncidents, openIncidents, avgResolutionTime };
  };

  const metrics = calculateMetrics();

  if (loading && analytics.incidents.length === 0) {
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
            Incident Analytics
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
          <Button
            variant="contained"
            onClick={fetchIncidentAnalytics}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

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
                  {analytics.incidents.slice(0, 10).map((incident) => (
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
    </Box>
  );
};

export default IncidentAnalytics; 