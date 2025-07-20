import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import AnalyticsDashboard from './AnalyticsDashboard';
import RealTimeMetrics from './RealTimeMetrics';
import RateLimitingMetrics from './RateLimitingMetrics';

const ApplicationMonitoring = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} aria-label="monitoring tabs" sx={{ mb: 2 }}>
        <Tab label="Performance Overview" />
        <Tab label="Live System Metrics" />
        <Tab label="Rate Limiting & Latency" />
      </Tabs>
      {tab === 0 && <AnalyticsDashboard active={tab === 0} />}
      {tab === 1 && <RealTimeMetrics />}
      {tab === 2 && <RateLimitingMetrics />}
    </Box>
  );
};

export default ApplicationMonitoring; 