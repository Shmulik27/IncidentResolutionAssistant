import React, { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, Table, TableBody, TableCell, TableContainer, TableRow, Paper, Grid, Switch, FormControlLabel, Snackbar, Alert, Divider, IconButton, InputAdornment
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { api } from '../services/api';

const FIELD_GROUPS = [
  {
    label: 'Service URLs',
    fields: [
      { key: 'log_analyzer_url', label: 'Log Analyzer URL', placeholder: 'http://localhost:8001', helper: 'URL for the Log Analyzer service.' },
      { key: 'root_cause_predictor_url', label: 'Root Cause Predictor URL', placeholder: 'http://localhost:8002', helper: 'URL for the Root Cause Predictor service.' },
      { key: 'knowledge_base_url', label: 'Knowledge Base URL', placeholder: 'http://localhost:8003', helper: 'URL for the Knowledge Base service.' },
      { key: 'action_recommender_url', label: 'Action Recommender URL', placeholder: 'http://localhost:8004', helper: 'URL for the Action Recommender service.' },
      { key: 'incident_integrator_url', label: 'Incident Integrator URL', placeholder: 'http://localhost:8005', helper: 'URL for the Incident Integrator service.' },
    ]
  },
  {
    label: 'Integrations',
    fields: [
      { key: 'GITHUB_REPO', label: 'GitHub Repo', placeholder: 'owner/repo', helper: 'GitHub repository for incident tracking.' },
      { key: 'GITHUB_TOKEN', label: 'GitHub Token', type: 'password', helper: 'Personal access token for GitHub API.' },
      { key: 'JIRA_SERVER', label: 'Jira Server', placeholder: 'https://your-domain.atlassian.net', helper: 'Jira server URL.' },
      { key: 'JIRA_USER', label: 'Jira User', placeholder: 'user@example.com', helper: 'Jira username/email.' },
      { key: 'JIRA_TOKEN', label: 'Jira Token', type: 'password', helper: 'Jira API token.' },
      { key: 'JIRA_PROJECT', label: 'Jira Project Key', placeholder: 'PROJ', helper: 'Jira project key.' },
      { key: 'WEBHOOK_SECRET', label: 'Webhook Secret', type: 'password', helper: 'Secret for securing webhooks.' },
      { key: 'SLACK_WEBHOOK_URL', label: 'Slack Webhook URL', type: 'password', helper: 'Slack Incoming Webhook URL.' },
    ]
  },
  {
    label: 'Feature Flags',
    fields: [
      { key: 'enable_auto_analysis', label: 'Enable Auto Analysis', type: 'boolean', helper: 'Automatically analyze incidents.' },
      { key: 'enable_jira_integration', label: 'Enable Jira Integration', type: 'boolean', helper: 'Enable Jira issue creation and updates.' },
      { key: 'enable_github_integration', label: 'Enable GitHub Integration', type: 'boolean', helper: 'Enable GitHub PR/issue integration.' },
      { key: 'enable_notifications', label: 'Enable Notifications', type: 'boolean', helper: 'Enable in-app and Slack notifications.' },
    ]
  },
  {
    label: 'Advanced',
    fields: [
      { key: 'request_timeout', label: 'Request Timeout (seconds)', type: 'number', helper: 'Timeout for backend requests.' },
      { key: 'max_retries', label: 'Max Retries', type: 'number', helper: 'Maximum number of retries for failed requests.' },
      { key: 'log_level', label: 'Log Level', type: 'text', placeholder: 'INFO', helper: 'Logging level (DEBUG, INFO, WARNING, ERROR).' },
      { key: 'cache_ttl', label: 'Cache TTL (minutes)', type: 'number', helper: 'Cache time-to-live for backend data.' },
    ]
  }
];

function Configuration() {
  const [config, setConfig] = useState({});
  const [edit, setEdit] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showSecret, setShowSecret] = useState({});

  useEffect(() => {
    setLoading(true);
    api.getConfiguration()
      .then(data => {
        setConfig(data);
        setEdit({});
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load configuration:', err);
        setError('Failed to load configuration: ' + err.message);
        setLoading(false);
      });
  }, []);

  const handleChange = (key, value) => {
    setEdit(prev => ({ ...prev, [key]: value }));
    setSuccess(false);
  };

  const handleSwitch = (key, value) => {
    setEdit(prev => ({ ...prev, [key]: value }));
    setSuccess(false);
  };

  const handleSave = () => {
    setSaving(true);
    setError(null);
    api.updateConfiguration(edit)
      .then(data => {
        setConfig(data.config || data);
        setEdit({});
        setSuccess(true);
        setSaving(false);
      })
      .catch((err) => {
        console.error('Failed to save configuration:', err);
        setError('Failed to save configuration: ' + err.message);
        setSaving(false);
      });
  };

  const handleShowSecret = (key) => {
    setShowSecret(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) return <Typography>Loading configuration...</Typography>;

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>Configuration</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Snackbar open={success} autoHideDuration={4000} onClose={() => setSuccess(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Configuration saved!
        </Alert>
      </Snackbar>
      <Divider sx={{ mb: 3 }} />
      <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
        {FIELD_GROUPS.map(group => (
          <Box key={group.label} sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>{group.label}</Typography>
            <Grid container spacing={2}>
              {group.fields.map(field => (
                <Grid item xs={12} sm={6} md={4} key={field.key}>
                  {field.type === 'boolean' ? (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={edit[field.key] !== undefined ? edit[field.key] : !!config[field.key]}
                          onChange={e => handleSwitch(field.key, e.target.checked)}
                          color="primary"
                        />
                      }
                      label={field.label}
                    />
                  ) : (
                    <TextField
                      fullWidth
                      type={field.type === 'password' ? (showSecret[field.key] ? 'text' : 'password') : (field.type || 'text')}
                      label={field.label}
                      value={edit[field.key] !== undefined ? edit[field.key] : (config[field.key] === '****' ? '' : config[field.key] || '')}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder || ''}
                      helperText={field.helper}
                      InputProps={field.type === 'password' ? {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => handleShowSecret(field.key)} edge="end" size="small">
                              {showSecret[field.key] ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      } : undefined}
                    />
                  )}
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}
        <Divider sx={{ my: 3 }} />
        <Button
          variant="contained"
          color="primary"
          sx={{ mt: 2, minWidth: 120 }}
          type="submit"
          disabled={saving || Object.keys(edit).length === 0}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </Box>
  );
}

export default Configuration; 