import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Alert,
  CircularProgress,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh,
  Speed,
  Memory,
  Storage,
  NetworkCheck,
  BugReport,
  Security,
  Timeline,
  TrendingUp,
  TrendingDown,
  Warning
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';
import { api } from '../services/api';

const RealTimeMetrics = () => {
  const [metrics, setMetrics] = useState({
    system: {},
    services: {},
    performance: [],
    alerts: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [live, setLive] = useState(false);

  // Mock real-time data
  const generateMockPerformanceData = () => {
    const now = new Date();
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5000); // 5-second intervals
      data.push({
        time: time.toLocaleTimeString(),
        cpu: Math.random() * 30 + 40, // 40-70%
        memory: Math.random() * 20 + 60, // 60-80%
        network: Math.random() * 40 + 30, // 30-70%
        disk: Math.random() * 15 + 35 // 35-50%
      });
    }
    return data;
  };

  const mockSystemMetrics = {
    cpu: Math.random() * 30 + 40,
    memory: Math.random() * 20 + 60,
    disk: Math.random() * 15 + 35,
    network: Math.random() * 40 + 30,
    activeConnections: Math.floor(Math.random() * 1000) + 500,
    requestsPerSecond: Math.floor(Math.random() * 50) + 20,
    errorRate: Math.random() * 2 + 0.1,
    uptime: 99.8 + Math.random() * 0.2
  };

  const mockServiceMetrics = {
    'log-analyzer': { status: 'UP', responseTime: 45 + Math.random() * 20, requests: 15420 + Math.floor(Math.random() * 100) },
    'root-cause-predictor': { status: 'UP', responseTime: 120 + Math.random() * 30, requests: 8230 + Math.floor(Math.random() * 50) },
    'knowledge-base': { status: 'UP', responseTime: 85 + Math.random() * 25, requests: 12340 + Math.floor(Math.random() * 80) },
    'action-recommender': { status: 'UP', responseTime: 95 + Math.random() * 35, requests: 9870 + Math.floor(Math.random() * 60) },
    'incident-integrator': { status: 'UP', responseTime: 150 + Math.random() * 40, requests: 4560 + Math.floor(Math.random() * 30) },
    'k8s-log-scanner': { status: 'UP', responseTime: 200 + Math.random() * 50, requests: 3420 + Math.floor(Math.random() * 40) }
  };

  const mockAlerts = [
    { id: 1, level: 'warning', message: 'High memory usage detected', time: new Date() },
    { id: 2, level: 'info', message: 'Service restart completed', time: new Date(Date.now() - 300000) },
    { id: 3, level: 'error', message: 'Database connection timeout', time: new Date(Date.now() - 600000) }
  ];

  const fetchRealTimeMetrics = async () => {
    setLoading(true);
    try {
      // Fetch service health status
      const serviceStatuses = await api.getAllServiceStatuses();
      const serviceMetrics = {};
      
      Object.entries(serviceStatuses).forEach(([service, status]) => {
        serviceMetrics[service] = {
          status: status.status === 'UP' ? 'UP' : 'DOWN',
          responseTime: Math.random() * 100 + 50, // Simulate response time
          requests: Math.floor(Math.random() * 10000) + 5000 // Simulate request count
        };
      });

      setMetrics({
        system: mockSystemMetrics,
        services: serviceMetrics,
        performance: generateMockPerformanceData(),
        alerts: mockAlerts
      });
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch real-time metrics:', err);
      setError('Failed to fetch real-time metrics: ' + err.message);
      // Fallback to mock data
      setMetrics({
        system: mockSystemMetrics,
        services: mockServiceMetrics,
        performance: generateMockPerformanceData(),
        alerts: mockAlerts
      });
    } finally {
      setLoading(false);
    }
  };

  // SSE connection for real-time metrics
  useEffect(() => {
    let eventSource;
    let fallbackInterval;
    setLoading(true);
    setLive(false);
    try {
      eventSource = new window.EventSource('http://localhost:8080/metrics/stream');
      eventSource.onopen = () => setLive(true);
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          setMetrics((prev) => ({
            ...prev,
            system: data,
            performance: [
              ...prev.performance.slice(-11),
              {
                time: new Date().toLocaleTimeString(),
                cpu: data.cpu,
                memory: data.memory,
                network: data.network,
                disk: data.disk
              }
            ]
          }));
          setLastUpdated(new Date());
          setLoading(false);
        } catch (err) {
          setError('Failed to parse real-time metrics');
        }
      };
      eventSource.onerror = () => {
        setLive(false);
        eventSource.close();
        // Fallback to polling
        fallbackInterval = setInterval(fetchRealTimeMetrics, 5000);
      };
    } catch (err) {
      setError('Failed to connect to real-time metrics');
      // Fallback to polling
      fallbackInterval = setInterval(fetchRealTimeMetrics, 5000);
    }
    return () => {
      if (eventSource) eventSource.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
    // eslint-disable-next-line
  }, []);

  const getMetricColor = (value, thresholds) => {
    if (value >= thresholds.high) return 'error';
    if (value >= thresholds.medium) return 'warning';
    return 'success';
  };

  const getStatusColor = (status) => {
    return status === 'UP' ? 'success' : 'error';
  };

  const getAlertColor = (level) => {
    switch (level) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  if (loading && Object.keys(metrics.system).length === 0) {
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
            Real-Time Metrics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Live system performance and health monitoring
            {lastUpdated && (
              <span> • Last updated: {lastUpdated.toLocaleTimeString()}</span>
            )}
          </Typography>
        </Box>
        <Chip label={live ? 'Live' : 'Offline'} color={live ? 'success' : 'default'} size="small" sx={{ ml: 2 }} />
        <Button
          variant="contained"
          onClick={fetchRealTimeMetrics}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* System Metrics Cards */}
      <Grid container spacing={3} mb={3} sx={{ overflowX: 'auto', flexWrap: { xs: 'nowrap', sm: 'wrap' } }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Speed color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">CPU Usage</Typography>
              </Box>
              <Typography variant="h4" color="primary" gutterBottom>
                {metrics.system.cpu?.toFixed(1)}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={metrics.system.cpu} 
                color={getMetricColor(metrics.system.cpu, { medium: 70, high: 85 })}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Memory color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">Memory Usage</Typography>
              </Box>
              <Typography variant="h4" color="secondary" gutterBottom>
                {metrics.system.memory?.toFixed(1)}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={metrics.system.memory} 
                color={getMetricColor(metrics.system.memory, { medium: 75, high: 90 })}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <NetworkCheck color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Network I/O</Typography>
              </Box>
              <Typography variant="h4" color="info" gutterBottom>
                {metrics.system.network?.toFixed(1)}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={metrics.system.network} 
                color={getMetricColor(metrics.system.network, { medium: 70, high: 85 })}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Storage color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Disk Usage</Typography>
              </Box>
              <Typography variant="h4" color="warning" gutterBottom>
                {metrics.system.disk?.toFixed(1)}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={metrics.system.disk} 
                color={getMetricColor(metrics.system.disk, { medium: 80, high: 90 })}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Chart */}
      <Grid container spacing={3} mb={3} sx={{ overflowX: 'auto', flexWrap: { xs: 'nowrap', sm: 'wrap' } }}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Performance (Last Minute)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics.performance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <RechartsTooltip />
                  <Area type="monotone" dataKey="cpu" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} name="CPU %" />
                  <Area type="monotone" dataKey="memory" stackId="1" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} name="Memory %" />
                  <Area type="monotone" dataKey="network" stackId="1" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} name="Network %" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Stats
              </Typography>
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Active Connections
                </Typography>
                <Typography variant="h5" color="primary">
                  {metrics.system.activeConnections?.toLocaleString()}
                </Typography>
              </Box>
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Requests/Second
                </Typography>
                <Typography variant="h5" color="secondary">
                  {metrics.system.requestsPerSecond}
                </Typography>
              </Box>
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Error Rate
                </Typography>
                <Typography variant="h5" color="error">
                  {metrics.system.errorRate?.toFixed(2)}%
                </Typography>
              </Box>
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  System Uptime
                </Typography>
                <Typography variant="h5" color="success">
                  {metrics.system.uptime?.toFixed(2)}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Service Status Grid */}
      <Card sx={{ mb: 3, overflowX: 'auto' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Service Health Status
          </Typography>
          <Grid container spacing={2} sx={{ flexWrap: { xs: 'nowrap', sm: 'wrap' }, overflowX: 'auto' }}>
            {Object.entries(metrics.services).map(([service, data]) => (
              <Grid item xs={12} sm={6} md={4} key={service}>
                <Box 
                  sx={{ 
                    p: 2, 
                    border: 1, 
                    borderColor: 'divider', 
                    borderRadius: 1,
                    bgcolor: data.status === 'UP' ? 'success.light' : 'error.light'
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle1">
                      {service.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Typography>
                    <Chip 
                      label={data.status} 
                      color={getStatusColor(data.status)}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Response: {data.responseTime}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Requests: {data.requests.toLocaleString()}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Alerts
          </Typography>
          {metrics.alerts.length > 0 ? (
            <Box>
              {metrics.alerts.map((alert) => (
                <Box 
                  key={alert.id} 
                  sx={{ 
                    p: 2, 
                    mb: 1, 
                    border: 1, 
                    borderColor: `${getAlertColor(alert.level)}.main`,
                    borderRadius: 1,
                    bgcolor: `${getAlertColor(alert.level)}.light`
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center">
                      <Warning color={getAlertColor(alert.level)} sx={{ mr: 1 }} />
                      <Typography variant="body1">
                        {alert.message}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {alert.time.toLocaleTimeString()}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No recent alerts
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default RealTimeMetrics; 