import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Paper
} from '@mui/material';
import { 
  Refresh, 
  CheckCircle, 
  Error, 
  Warning,
  TrendingUp,
  Speed,
  BugReport,
  Assessment
} from '@mui/icons-material';
import { api } from '../services/api';

const Dashboard = () => {
  const [serviceStatuses, setServiceStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [quickStats, setQuickStats] = useState({
    totalServices: 0,
    healthyServices: 0,
    avgResponseTime: 0,
    systemUptime: 0
  });

  const checkServices = async () => {
    setLoading(true);
    try {
      const statuses = await api.getAllServiceStatuses();
      setServiceStatuses(statuses);
      
      // Calculate quick stats
      const totalServices = Object.keys(statuses).length;
      const healthyServices = Object.values(statuses).filter(s => s.status === 'UP').length;
      const avgResponseTime = totalServices > 0 ? 
        Object.values(statuses).reduce((sum, s) => sum + (s.responseTime || 0), 0) / totalServices : 0;
      const systemUptime = totalServices > 0 ? (healthyServices / totalServices) * 100 : 0;
      
      setQuickStats({
        totalServices,
        healthyServices,
        avgResponseTime: Math.round(avgResponseTime),
        systemUptime: Math.round(systemUptime)
      });
      
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to check service statuses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkServices();
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkServices, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'UP':
        return <CheckCircle color="success" />;
      case 'DOWN':
        return <Error color="error" />;
      default:
        return <Warning color="warning" />;
    }
  };

  const getStatusColor = (status) => {
    return status === 'UP' ? 'success' : 'error';
  };

  const getServiceDisplayName = (name) => {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const getOverallStatus = () => {
    const statuses = Object.values(serviceStatuses);
    const upCount = statuses.filter(s => s.status === 'UP').length;
    const totalCount = statuses.length;
    
    if (upCount === totalCount) return 'All Services Operational';
    if (upCount === 0) return 'All Services Down';
    return `${upCount}/${totalCount} Services Operational`;
  };

  if (loading && Object.keys(serviceStatuses).length === 0) {
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
            Service Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {getOverallStatus()}
            {lastUpdated && (
              <span> • Last updated: {lastUpdated.toLocaleTimeString()}</span>
            )}
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          onClick={checkServices}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
        >
          {loading ? 'Checking...' : 'Refresh Status'}
        </Button>
      </Box>

      {/* Quick Stats Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUp color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">System Uptime</Typography>
                  <Typography variant="h4" color="primary">
                    {quickStats.systemUptime}%
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
                  <Typography variant="h6">Healthy Services</Typography>
                  <Typography variant="h4" color="success">
                    {quickStats.healthyServices}/{quickStats.totalServices}
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
                <Speed color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">Avg Response</Typography>
                  <Typography variant="h4" color="info">
                    {quickStats.avgResponseTime}ms
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
                  <Typography variant="h6">Active Issues</Typography>
                  <Typography variant="h4" color="warning">
                    {quickStats.totalServices - quickStats.healthyServices}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item>
            <Button 
              variant="outlined" 
              startIcon={<Assessment />}
              href="/analytics"
            >
              View Analytics
            </Button>
          </Grid>
          <Grid item>
            <Button 
              variant="outlined" 
              startIcon={<TrendingUp />}
              href="/metrics"
            >
              Real-Time Metrics
            </Button>
          </Grid>
          <Grid item>
            <Button 
              variant="outlined" 
              startIcon={<BugReport />}
              href="/incident-analytics"
            >
              Incident Analytics
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {Object.entries(serviceStatuses).map(([serviceName, status]) => (
          <Grid item xs={12} sm={6} md={4} key={serviceName}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6">
                    {getServiceDisplayName(serviceName)}
                  </Typography>
                  {getStatusIcon(status.status)}
                </Box>
                
                <Chip 
                  label={status.status} 
                  color={getStatusColor(status.status)}
                  size="small"
                  sx={{ mb: 1 }}
                />
                
                {status.response && (
                  <Typography variant="body2" color="text.secondary">
                    Response: {JSON.stringify(status.response)}
                  </Typography>
                )}
                
                {status.error && (
                  <Typography variant="body2" color="error">
                    Error: {status.error}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {Object.keys(serviceStatuses).length === 0 && !loading && (
        <Alert severity="info">
          No services found. Make sure all services are running.
        </Alert>
      )}
    </Box>
  );
};

export default Dashboard; 