import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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
        title: 'Database Outage',
        service: 'db-service',
        severity: 'High',
        status: 'Open',
        category: 'Database',
        createdAt: '2024-06-01T12:00:00Z',
        resolutionTime: null,
      }
    ]);
  });

  it('renders recent incidents in the table', async () => {
    render(<IncidentAnalytics active={true} />);
    // Wait for the incident title to appear
    expect(await screen.findByText(/database outage/i)).toBeInTheDocument();
  });

  it('shows info message when no incidents', async () => {
    api.getRecentIncidents.mockResolvedValue([]);
    render(<IncidentAnalytics active={true} />);
    expect(await screen.findByText(/no recent incidents found/i)).toBeInTheDocument();
  });
}); 