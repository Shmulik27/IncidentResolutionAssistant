import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Divider,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh,
  TrendingUp,
  TrendingDown,
  Speed,
  Memory,
  Storage,
  NetworkCheck,
  BugReport,
  Security,
  Timeline
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
  ResponsiveContainer
} from 'recharts';
import { api } from '../services/api';

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState({
    serviceMetrics: {},
    performanceData: [],
    incidentTrends: [],
    resourceUsage: {},
    testResults: {},
    k8sMetrics: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Mock data for demonstration - in real app, this would come from backend
  const mockPerformanceData = [
    { time: '00:00', responseTime: 120, throughput: 150, errors: 2 },
    { time: '02:00', responseTime: 95, throughput: 180, errors: 1 },
    { time: '04:00', responseTime: 110, throughput: 160, errors: 3 },
    { time: '06:00', responseTime: 85, throughput: 200, errors: 0 },
    { time: '08:00', responseTime: 130, throughput: 140, errors: 5 },
    { time: '10:00', responseTime: 100, throughput: 170, errors: 2 },
    { time: '12:00', responseTime: 115, throughput: 155, errors: 1 },
    { time: '14:00', responseTime: 90, throughput: 190, errors: 0 },
    { time: '16:00', responseTime: 125, throughput: 145, errors: 4 },
    { time: '18:00', responseTime: 105, throughput: 165, errors: 2 },
    { time: '20:00', responseTime: 140, throughput: 130, errors: 6 },
    { time: '22:00', responseTime: 95, throughput: 175, errors: 1 }
  ];

  const mockIncidentTrends = [
    { month: 'Jan', incidents: 12, resolved: 10, avgResolutionTime: 2.5 },
    { month: 'Feb', incidents: 8, resolved: 8, avgResolutionTime: 1.8 },
    { month: 'Mar', incidents: 15, resolved: 13, avgResolutionTime: 3.2 },
    { month: 'Apr', incidents: 6, resolved: 6, avgResolutionTime: 1.5 },
    { month: 'May', incidents: 11, resolved: 9, avgResolutionTime: 2.8 },
    { month: 'Jun', incidents: 9, resolved: 9, avgResolutionTime: 2.1 }
  ];

  const mockServiceMetrics = {
    'log-analyzer': { uptime: 99.8, avgResponseTime: 45, totalRequests: 15420 },
    'root-cause-predictor': { uptime: 99.5, avgResponseTime: 120, totalRequests: 8230 },
    'knowledge-base': { uptime: 99.9, avgResponseTime: 85, totalRequests: 12340 },
    'action-recommender': { uptime: 99.7, avgResponseTime: 95, totalRequests: 9870 },
    'incident-integrator': { uptime: 99.6, avgResponseTime: 150, totalRequests: 4560 },
    'k8s-log-scanner': { uptime: 99.4, avgResponseTime: 200, totalRequests: 3420 }
  };

  const mockResourceUsage = {
    cpu: 65,
    memory: 78,
    disk: 45,
    network: 82
  };

  const mockTestResults = {
    total: 156,
    passed: 142,
    failed: 8,
    skipped: 6,
    coverage: 87.5
  };

  const mockK8sMetrics = {
    totalPods: 24,
    runningPods: 22,
    failedPods: 2,
    totalNamespaces: 8,
    activeClusters: 3
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // In a real implementation, these would be API calls
      // For now, using mock data
      setAnalytics({
        serviceMetrics: mockServiceMetrics,
        performanceData: mockPerformanceData,
        incidentTrends: mockIncidentTrends,
        resourceUsage: mockResourceUsage,
        testResults: mockTestResults,
        k8sMetrics: mockK8sMetrics
      });
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const getUptimeColor = (uptime) => {
    if (uptime >= 99.9) return 'success';
    if (uptime >= 99.5) return 'warning';
    return 'error';
  };

  const getResponseTimeColor = (time) => {
    if (time < 100) return 'success';
    if (time < 200) return 'warning';
    return 'error';
  };

  if (loading && Object.keys(analytics.serviceMetrics).length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Analytics Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time metrics and performance insights
            {lastUpdated && (
              <span> • Last updated: {lastUpdated.toLocaleTimeString()}</span>
            )}
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={fetchAnalytics}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
        >
          {loading ? 'Refreshing...' : 'Refresh Analytics'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Key Metrics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Speed color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">Avg Response Time</Typography>
                  <Typography variant="h4" color="primary">
                    {Math.round(analytics.performanceData.reduce((sum, d) => sum + d.responseTime, 0) / analytics.performanceData.length)}ms
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
                <TrendingUp color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">System Uptime</Typography>
                  <Typography variant="h4" color="success">
                    {Math.min(...Object.values(analytics.serviceMetrics).map(m => m.uptime)).toFixed(1)}%
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
                <BugReport color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">Test Coverage</Typography>
                  <Typography variant="h4" color="warning">
                    {analytics.testResults.coverage}%
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
                <NetworkCheck color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">Active Pods</Typography>
                  <Typography variant="h4" color="info">
                    {analytics.k8sMetrics.runningPods}/{analytics.k8sMetrics.totalPods}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Trends (24h)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="responseTime" stroke="#8884d8" name="Response Time (ms)" />
                  <Line type="monotone" dataKey="throughput" stroke="#82ca9d" name="Throughput (req/s)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resource Usage
              </Typography>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">CPU</Typography>
                  <Typography variant="body2">{analytics.resourceUsage.cpu}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={analytics.resourceUsage.cpu} 
                  color={analytics.resourceUsage.cpu > 80 ? 'error' : 'primary'}
                />
              </Box>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Memory</Typography>
                  <Typography variant="body2">{analytics.resourceUsage.memory}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={analytics.resourceUsage.memory} 
                  color={analytics.resourceUsage.memory > 80 ? 'error' : 'primary'}
                />
              </Box>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Disk</Typography>
                  <Typography variant="body2">{analytics.resourceUsage.disk}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={analytics.resourceUsage.disk} 
                  color={analytics.resourceUsage.disk > 80 ? 'error' : 'primary'}
                />
              </Box>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Network</Typography>
                  <Typography variant="body2">{analytics.resourceUsage.network}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={analytics.resourceUsage.network} 
                  color={analytics.resourceUsage.network > 80 ? 'error' : 'primary'}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Incident Trends (6 Months)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.incidentTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="incidents" fill="#8884d8" name="Total Incidents" />
                  <Bar dataKey="resolved" fill="#82ca9d" name="Resolved" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Results
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Passed', value: analytics.testResults.passed, color: '#4caf50' },
                      { name: 'Failed', value: analytics.testResults.failed, color: '#f44336' },
                      { name: 'Skipped', value: analytics.testResults.skipped, color: '#ff9800' }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'Passed', value: analytics.testResults.passed, color: '#4caf50' },
                      { name: 'Failed', value: analytics.testResults.failed, color: '#f44336' },
                      { name: 'Skipped', value: analytics.testResults.skipped, color: '#ff9800' }
                    ].map((entry, index) => (
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

      {/* Service Metrics Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Service Performance Metrics
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(analytics.serviceMetrics).map(([service, metrics]) => (
              <Grid item xs={12} sm={6} md={4} key={service}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    {service.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Typography>
                  <Box mb={1}>
                    <Chip 
                      label={`${metrics.uptime}% Uptime`}
                      color={getUptimeColor(metrics.uptime)}
                      size="small"
                    />
                  </Box>
                  <Box mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      Avg Response: {metrics.avgResponseTime}ms
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Requests: {metrics.totalRequests.toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AnalyticsDashboard; 