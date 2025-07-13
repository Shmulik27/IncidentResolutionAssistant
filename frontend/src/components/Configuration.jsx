import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import { Save, Refresh } from '@mui/icons-material';
import { api } from '../services/api';

const Configuration = () => {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      const configData = await api.getConfiguration();
      setConfig(configData);
      setError(null);
    } catch (err) {
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.updateConfiguration(config);
      setSuccess('Configuration saved successfully');
    } catch (err) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleBooleanChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Configuration
        </Typography>
        <Box>
          <Button
            variant="outlined"
            onClick={loadConfiguration}
            startIcon={<Refresh />}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            onClick={saveConfiguration}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Service Configuration
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <TextField
                fullWidth
                label="Log Analyzer URL"
                value={config.log_analyzer_url || ''}
                onChange={(e) => handleConfigChange('log_analyzer_url', e.target.value)}
                sx={{ mb: 2 }}
                placeholder="http://localhost:8001"
              />
              
              <TextField
                fullWidth
                label="Root Cause Predictor URL"
                value={config.root_cause_predictor_url || ''}
                onChange={(e) => handleConfigChange('root_cause_predictor_url', e.target.value)}
                sx={{ mb: 2 }}
                placeholder="http://localhost:8002"
              />
              
              <TextField
                fullWidth
                label="Knowledge Base URL"
                value={config.knowledge_base_url || ''}
                onChange={(e) => handleConfigChange('knowledge_base_url', e.target.value)}
                sx={{ mb: 2 }}
                placeholder="http://localhost:8003"
              />
              
              <TextField
                fullWidth
                label="Action Recommender URL"
                value={config.action_recommender_url || ''}
                onChange={(e) => handleConfigChange('action_recommender_url', e.target.value)}
                sx={{ mb: 2 }}
                placeholder="http://localhost:8004"
              />
              
              <TextField
                fullWidth
                label="Incident Integrator URL"
                value={config.incident_integrator_url || ''}
                onChange={(e) => handleConfigChange('incident_integrator_url', e.target.value)}
                sx={{ mb: 2 }}
                placeholder="http://localhost:8005"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Feature Flags
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={config.enable_auto_analysis || false}
                    onChange={(e) => handleBooleanChange('enable_auto_analysis', e.target.checked)}
                  />
                }
                label="Enable Auto Analysis"
                sx={{ mb: 2 }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={config.enable_jira_integration || false}
                    onChange={(e) => handleBooleanChange('enable_jira_integration', e.target.checked)}
                  />
                }
                label="Enable Jira Integration"
                sx={{ mb: 2 }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={config.enable_github_integration || false}
                    onChange={(e) => handleBooleanChange('enable_github_integration', e.target.checked)}
                  />
                }
                label="Enable GitHub Integration"
                sx={{ mb: 2 }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={config.enable_notifications || false}
                    onChange={(e) => handleBooleanChange('enable_notifications', e.target.checked)}
                  />
                }
                label="Enable Notifications"
                sx={{ mb: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Advanced Settings
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Request Timeout (seconds)"
                    type="number"
                    value={config.request_timeout || 30}
                    onChange={(e) => handleConfigChange('request_timeout', parseInt(e.target.value))}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Max Retries"
                    type="number"
                    value={config.max_retries || 3}
                    onChange={(e) => handleConfigChange('max_retries', parseInt(e.target.value))}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Log Level"
                    value={config.log_level || 'INFO'}
                    onChange={(e) => handleConfigChange('log_level', e.target.value)}
                    sx={{ mb: 2 }}
                    select
                    SelectProps={{
                      native: true,
                    }}
                  >
                    <option value="DEBUG">DEBUG</option>
                    <option value="INFO">INFO</option>
                    <option value="WARNING">WARNING</option>
                    <option value="ERROR">ERROR</option>
                  </TextField>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Cache TTL (minutes)"
                    type="number"
                    value={config.cache_ttl || 60}
                    onChange={(e) => handleConfigChange('cache_ttl', parseInt(e.target.value))}
                    sx={{ mb: 2 }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {config.error && (
          <Grid item xs={12}>
            <Alert severity="warning">
              Configuration endpoint not available. This is a read-only view.
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Configuration; 