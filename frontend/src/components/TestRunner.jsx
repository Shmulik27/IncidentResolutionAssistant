import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid
} from '@mui/material';
import { ExpandMore, PlayArrow, CheckCircle, Error } from '@mui/icons-material';
import { api } from '../services/api';

const TestRunner = () => {
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runTests = async () => {
    setLoading(true);
    setError(null);
    setTestResults(null);

    try {
      const results = await api.runTests();
      setTestResults(results);
    } catch (err) {
      setError(err.message || 'Failed to run tests');
    } finally {
      setLoading(false);
    }
  };

  const getTestStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'passed':
      case 'success':
        return <CheckCircle color="success" />;
      case 'failed':
      case 'error':
        return <Error color="error" />;
      default:
        return <CircularProgress size={20} />;
    }
  };

  const getTestStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'passed':
      case 'success':
        return 'success';
      case 'failed':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Test Runner
        </Typography>
        <Button
          variant="contained"
          onClick={runTests}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <PlayArrow />}
          size="large"
        >
          {loading ? 'Running Tests...' : 'Run All Tests'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {testResults && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Test Results Summary
                </Typography>
                <Box display="flex" gap={2} mb={2}>
                  <Chip 
                    label={`Total: ${testResults.total || 0}`}
                    color="primary"
                  />
                  <Chip 
                    label={`Passed: ${testResults.passed || 0}`}
                    color="success"
                  />
                  <Chip 
                    label={`Failed: ${testResults.failed || 0}`}
                    color="error"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {testResults.services && Object.entries(testResults.services).map(([serviceName, serviceResults]) => (
            <Grid item xs={12} key={serviceName}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {serviceName}
                    </Typography>
                    {getTestStatusIcon(serviceResults.status)}
                    <Chip 
                      label={serviceResults.status || 'Unknown'}
                      color={getTestStatusColor(serviceResults.status)}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Box>

                  {serviceResults.tests && (
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography>View Test Details</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box>
                          {serviceResults.tests.map((test, index) => (
                            <Box key={index} mb={2} p={2} border={1} borderColor="divider" borderRadius={1}>
                              <Box display="flex" alignItems="center" mb={1}>
                                <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                                  {test.name || `Test ${index + 1}`}
                                </Typography>
                                {getTestStatusIcon(test.status)}
                                <Chip 
                                  label={test.status || 'Unknown'}
                                  color={getTestStatusColor(test.status)}
                                  size="small"
                                  sx={{ ml: 1 }}
                                />
                              </Box>
                              
                              {test.duration && (
                                <Typography variant="body2" color="text.secondary">
                                  Duration: {test.duration}ms
                                </Typography>
                              )}
                              
                              {test.error && (
                                <Alert severity="error" sx={{ mt: 1 }}>
                                  {test.error}
                                </Alert>
                              )}
                              
                              {test.output && (
                                <pre style={{ fontSize: '12px', marginTop: '8px' }}>
                                  {test.output}
                                </pre>
                              )}
                            </Box>
                          ))}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  )}

                  {serviceResults.error && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {serviceResults.error}
                    </Alert>
                  )}

                  {serviceResults.output && (
                    <pre style={{ fontSize: '12px', marginTop: '8px' }}>
                      {serviceResults.output}
                    </pre>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}

          {testResults.e2e && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      End-to-End Tests
                    </Typography>
                    {getTestStatusIcon(testResults.e2e.status)}
                    <Chip 
                      label={testResults.e2e.status || 'Unknown'}
                      color={getTestStatusColor(testResults.e2e.status)}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Box>

                  {testResults.e2e.error && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {testResults.e2e.error}
                    </Alert>
                  )}

                  {testResults.e2e.output && (
                    <pre style={{ fontSize: '12px', marginTop: '8px' }}>
                      {testResults.e2e.output}
                    </pre>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {!testResults && !loading && (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              Click "Run All Tests" to execute the test suite and view results.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default TestRunner; 