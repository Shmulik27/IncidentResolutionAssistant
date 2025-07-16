import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import K8sLogScanner from '../K8sLogScanner';
import { api } from '../../services/api';

jest.mock('../../services/api');

const mockNotify = jest.fn();

const NotificationContext = React.createContext({ notify: mockNotify });

function renderWithContext(ui) {
  return render(
    <NotificationContext.Provider value={{ notify: mockNotify }}>
      {ui}
    </NotificationContext.Provider>
  );
}

describe('K8sLogScanner scheduled jobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.listLogScanJobs.mockResolvedValue([
      { id: 'job1', name: 'Test Job', namespace: 'default', logLevels: ['ERROR'], interval: 300, createdAt: new Date().toISOString(), lastRun: null }
    ]);
    api.createLogScanJob.mockResolvedValue({});
    api.deleteLogScanJob.mockResolvedValue({});
    api.getK8sNamespaces = jest.fn().mockResolvedValue({ namespaces: ['default'] });
  });

  it('renders scheduled jobs list', async () => {
    renderWithContext(<K8sLogScanner />);
    expect(await screen.findByText('Scheduled Log Scan Jobs')).toBeInTheDocument();
    expect(await screen.findByText('Test Job')).toBeInTheDocument();
  });

  it('can create a new job', async () => {
    renderWithContext(<K8sLogScanner />);
    fireEvent.change(screen.getByPlaceholderText('Job Name'), { target: { value: 'New Job' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: '' }), { target: { value: 600 } });
    fireEvent.click(screen.getByText('Create Job'));
    await waitFor(() => expect(api.createLogScanJob).toHaveBeenCalled());
    expect(mockNotify).toHaveBeenCalledWith('Scheduled log scan job created!', 'success');
  });

  it('can delete a job', async () => {
    renderWithContext(<K8sLogScanner />);
    const deleteBtn = await screen.findByText('Delete');
    fireEvent.click(deleteBtn);
    await waitFor(() => expect(api.deleteLogScanJob).toHaveBeenCalled());
    expect(mockNotify).toHaveBeenCalledWith('Job deleted', 'success');
  });

  it('shows Last Run updated after job creation', async () => {
    // Initial job with no lastRun
    api.listLogScanJobs.mockResolvedValueOnce([
      { id: 'job2', name: 'Immediate Job', namespace: 'default', logLevels: ['ERROR'], interval: 300, createdAt: new Date().toISOString(), lastRun: null }
    ]);
    renderWithContext(<K8sLogScanner />);
    expect(await screen.findByText('Immediate Job')).toBeInTheDocument();
    expect(screen.getByText(/Last Run: Never/)).toBeInTheDocument();

    // Simulate backend updating lastRun after job runs
    const now = new Date().toISOString();
    api.listLogScanJobs.mockResolvedValueOnce([
      { id: 'job2', name: 'Immediate Job', namespace: 'default', logLevels: ['ERROR'], interval: 300, createdAt: new Date().toISOString(), lastRun: now }
    ]);

    // Simulate UI refresh (e.g., user clicks refresh or auto-refresh)
    // Call fetchJobs directly or re-render
    fireEvent.click(screen.getByText('Scheduled Log Scan Jobs'));
    // Wait for UI to update
    await waitFor(() => expect(screen.queryByText(/Last Run: Never/)).not.toBeInTheDocument());
    expect(screen.getByText(/Last Run:/)).not.toHaveTextContent('Never');
  });
}); 