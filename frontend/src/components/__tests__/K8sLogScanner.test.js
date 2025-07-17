import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ clusters: [
          { name: 'Test Cluster', cluster: 'test-cluster-arn' }
        ] })
      })
    );
    api.getScheduledJobs.mockResolvedValue([
      {
        id: 'job1',
        name: 'Test Job',
        cluster: 'test-cluster-arn',
        namespace: 'default',
        schedule: '0 0 * * *',
        lastRun: null,
      }
    ]);
    api.createScheduledJob.mockResolvedValue({ status: 'ok' });
    api.deleteScheduledJob.mockResolvedValue({ status: 'ok' });
  });

  it('renders and creates a new job', async () => {
    renderWithContext(<K8sLogScanner />);
    // Wait for cluster select to appear
    const clusterSelect = await screen.findByLabelText(/cluster/i);
    fireEvent.mouseDown(clusterSelect);
    const option = await screen.findByText(/test cluster/i);
    fireEvent.click(option);
    // Fill in job name
    fireEvent.change(screen.getByLabelText(/job name/i), { target: { value: 'My Job' } });
    // Fill in namespace
    fireEvent.change(screen.getByLabelText(/namespace/i), { target: { value: 'default' } });
    // Fill in schedule
    fireEvent.change(screen.getByLabelText(/schedule/i), { target: { value: '0 0 * * *' } });
    // Create job
    const createBtn = screen.getByRole('button', { name: /create job/i });
    expect(createBtn).not.toBeDisabled();
    fireEvent.click(createBtn);
    await waitFor(() => expect(api.createScheduledJob).toHaveBeenCalled());
  });

  it('deletes a job and shows notification', async () => {
    renderWithContext(<K8sLogScanner />);
    // Wait for job card
    const jobCard = await screen.findByText(/test job/i);
    // Find delete button
    const deleteBtn = screen.getByRole('button', { name: /delete job/i });
    fireEvent.click(deleteBtn);
    await waitFor(() => expect(api.deleteScheduledJob).toHaveBeenCalled());
    // Notification should be called
    await waitFor(() => expect(mockNotify).toHaveBeenCalled());
  });

  it('shows last run as Never if not run', async () => {
    renderWithContext(<K8sLogScanner />);
    expect(await screen.findByText(/last run: never/i)).toBeInTheDocument();
  });
}); 