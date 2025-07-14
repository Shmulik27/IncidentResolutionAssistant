import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import AnalyticsDashboard from './AnalyticsDashboard';
import RealTimeMetrics from './RealTimeMetrics';

const ApplicationMonitoring = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} aria-label="monitoring tabs" sx={{ mb: 2 }}>
        <Tab label="Analytics" />
        <Tab label="Real-Time Metrics" />
      </Tabs>
      {tab === 0 && <AnalyticsDashboard />}
      {tab === 1 && <RealTimeMetrics />}
    </Box>
  );
};

export default ApplicationMonitoring; 