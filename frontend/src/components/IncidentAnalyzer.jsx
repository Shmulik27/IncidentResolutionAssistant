import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import { ExpandMore, PlayArrow, CheckCircle } from '@mui/icons-material';
import { api } from '../services/api';

const steps = ['Log Analysis', 'Root Cause Prediction', 'Knowledge Search', 'Action Recommendations'];

const IncidentAnalyzer = () => {
  const [logs, setLogs] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stepResults, setStepResults] = useState({});

  const handleAnalyze = async () => {
    if (!logs.trim()) {
      setError('Please enter log lines');
      return;
    }

    setLoading(true);
    setError(null);
    setActiveStep(0);
    setResults({});
    setStepResults({});

    try {
      const logLines = logs.split('\n').filter(line => line.trim());

      // Step 1: Log Analysis
      setActiveStep(0);
      const analysisResult = await api.analyzeIncident(logLines);
      setStepResults(prev => ({ ...prev, analysis: analysisResult }));
      setResults(prev => ({ ...prev, analysis: analysisResult }));

      // Step 2: Root Cause Prediction
      setActiveStep(1);
      const predictionResult = await api.predictRootCause(logLines);
      setStepResults(prev => ({ ...prev, prediction: predictionResult }));
      setResults(prev => ({ ...prev, prediction: predictionResult }));

      // Step 3: Knowledge Search
      setActiveStep(2);
      const searchQuery = predictionResult.root_cause || predictionResult.prediction || 'error';
      const searchResult = await api.searchKnowledgeBase(searchQuery);
      setStepResults(prev => ({ ...prev, search: searchResult }));
      setResults(prev => ({ ...prev, search: searchResult }));

      // Step 4: Action Recommendations
      setActiveStep(3);
      const recommendationsResult = await api.getRecommendations(searchQuery);
      setStepResults(prev => ({ ...prev, recommendations: recommendationsResult }));
      setResults(prev => ({ ...prev, recommendations: recommendationsResult }));

      setActiveStep(4);
    } catch (err) {
      setError(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return stepResults.analysis ? (
          <Box>
            <Typography variant="h6" gutterBottom>Log Analysis Results</Typography>
            <pre>{JSON.stringify(stepResults.analysis, null, 2)}</pre>
          </Box>
        ) : null;
      case 1:
        return stepResults.prediction ? (
          <Box>
            <Typography variant="h6" gutterBottom>Root Cause Prediction</Typography>
            <pre>{JSON.stringify(stepResults.prediction, null, 2)}</pre>
          </Box>
        ) : null;
      case 2:
        return stepResults.search ? (
          <Box>
            <Typography variant="h6" gutterBottom>Knowledge Base Search</Typography>
            <pre>{JSON.stringify(stepResults.search, null, 2)}</pre>
          </Box>
        ) : null;
      case 3:
        return stepResults.recommendations ? (
          <Box>
            <Typography variant="h6" gutterBottom>Action Recommendations</Typography>
            <pre>{JSON.stringify(stepResults.recommendations, null, 2)}</pre>
          </Box>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Incident Analyzer
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Input Log Lines
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={8}
            label="Enter Log Lines"
            value={logs}
            onChange={(e) => setLogs(e.target.value)}
            placeholder="Paste your log lines here...
Example:
2024-07-07 12:00:01 ERROR Database connection failed
2024-07-07 12:00:02 WARN Retrying connection
2024-07-07 12:00:03 ERROR Database connection failed"
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={handleAnalyze}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <PlayArrow />}
            size="large"
          >
            {loading ? 'Analyzing...' : 'Analyze Incident'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {steps.map((label, index) => (
          <Step key={label}>
            <StepLabel>
              <Box display="flex" alignItems="center">
                {label}
                {stepResults[Object.keys(stepResults)[index]] && (
                  <CheckCircle color="success" sx={{ ml: 1 }} />
                )}
              </Box>
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {Object.keys(stepResults).length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Analysis Progress
            </Typography>
            {steps.map((step, index) => (
              <Accordion key={step} disabled={!stepResults[Object.keys(stepResults)[index]]}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box display="flex" alignItems="center" width="100%">
                    <Typography variant="subtitle1">{step}</Typography>
                    {stepResults[Object.keys(stepResults)[index]] && (
                      <Chip 
                        label="Complete" 
                        color="success" 
                        size="small" 
                        sx={{ ml: 2 }}
                      />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {getStepContent(index)}
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </Card>
      )}

      {Object.keys(results).length > 0 && activeStep === 4 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Complete Analysis Results
            </Typography>
            <pre style={{ maxHeight: '400px', overflow: 'auto' }}>
              {JSON.stringify(results, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default IncidentAnalyzer; 