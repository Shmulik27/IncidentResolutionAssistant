import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import IncidentAnalytics from '../IncidentAnalytics.jsx';
import { api } from '../../services/api';

jest.mock('../../services/api');

describe('IncidentAnalytics recent incidents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.getRecentIncidents.mockResolvedValue([
      {
        id: 'inc1',
        timestamp: new Date().toISOString(),
        job_id: 'job1',
        log_line: 'ERROR something failed',
        analysis: '{"result":"fail"}',
        root_cause: '{"root":"bad config"}',
        knowledge: '{"kb":"restart"}',
        action: '{"action":"restart pod"}'
      }
    ]);
  });

  it('renders recent incidents table', async () => {
    render(<IncidentAnalytics />);
    expect(await screen.findByText('Recent Incidents (from Scheduled Log Scan Jobs)')).toBeInTheDocument();
    expect(await screen.findByText('job1')).toBeInTheDocument();
    expect(await screen.findByText('ERROR something failed')).toBeInTheDocument();
    expect(await screen.findByText('{"result":"fail"}')).toBeInTheDocument();
    expect(await screen.findByText('{"action":"restart pod"}')).toBeInTheDocument();
  });

  it('shows info if no incidents', async () => {
    api.getRecentIncidents.mockResolvedValue([]);
    render(<IncidentAnalytics />);
    expect(await screen.findByText('No recent incidents found.')).toBeInTheDocument();
  });
}); 