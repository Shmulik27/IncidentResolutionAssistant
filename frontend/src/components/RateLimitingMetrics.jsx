import React, { useState, useEffect } from 'react';
import { Box, Grid, Card, CardContent, Typography, LinearProgress, Alert, CircularProgress, Button } from '@mui/material';
import { Speed, Warning, Timeline } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const mockRateLimitData = {
  currentUsage: 72, // percent
  maxRequestsPerMinute: 1000,
  currentRequests: 720,
  recentEvents: [
    { time: '10:01', type: 'limit', message: 'Rate limit hit for /scan-logs', count: 3 },
    { time: '10:05', type: 'warn', message: 'High request rate for /config', count: 1 },
    { time: '10:10', type: 'limit', message: 'Rate limit hit for /scan-logs', count: 2 },
  ],
  latencyDistribution: [
    { bucket: '<100ms', count: 120 },
    { bucket: '100-200ms', count: 80 },
    { bucket: '200-500ms', count: 30 },
    { bucket: '>500ms', count: 5 },
  ]
};

const RateLimitingMetrics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setData(mockRateLimitData);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px"><CircularProgress /></Box>;
  }
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant="h4" gutterBottom>Rate Limiting & Latency</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Monitor API rate limiting and latency distribution across the system.
      </Typography>
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Warning color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Current Rate Limit Usage</Typography>
              </Box>
              <Typography variant="h4" color="warning" gutterBottom>
                {data.currentUsage}%
              </Typography>
              <LinearProgress variant="determinate" value={data.currentUsage} color={data.currentUsage > 90 ? 'error' : data.currentUsage > 75 ? 'warning' : 'success'} sx={{ height: 8, borderRadius: 4 }} />
              <Typography variant="body2" color="text.secondary" mt={2}>
                {data.currentRequests} / {data.maxRequestsPerMinute} requests/min
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Timeline color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Recent Rate Limit Events</Typography>
              </Box>
              {data.recentEvents.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No recent events</Typography>
              ) : (
                data.recentEvents.map((event, idx) => (
                  <Box key={idx} mb={1}>
                    <Typography variant="body2" color={event.type === 'limit' ? 'error' : 'warning'}>
                      [{event.time}] {event.message} (x{event.count})
                    </Typography>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Speed color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Latency Distribution</Typography>
              </Box>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={data.latencyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" />
                  <YAxis allowDecimals={false} />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RateLimitingMetrics; 