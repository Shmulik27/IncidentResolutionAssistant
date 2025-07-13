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
  Tooltip
} from '@mui/material';
import { Refresh, CheckCircle, Error, Warning } from '@mui/icons-material';
import { api } from '../services/api';

const Dashboard = () => {
  const [serviceStatuses, setServiceStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const checkServices = async () => {
    setLoading(true);
    try {
      const statuses = await api.getAllServiceStatuses();
      setServiceStatuses(statuses);
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