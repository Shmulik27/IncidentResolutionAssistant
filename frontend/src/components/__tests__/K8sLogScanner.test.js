import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import K8sLogScanner from '../K8sLogScanner';
import { api } from '../../services/api';
import { act } from 'react';
import { NotificationContext } from '../../App';

jest.mock('../../services/api');

const mockNotify = jest.fn();

beforeEach(() => {
  mockNotify.mockReset();
});

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
    if (!api.getScheduledJobs) api.getScheduledJobs = jest.fn();
    if (!api.createScheduledJob) api.createScheduledJob = jest.fn();
    if (!api.deleteScheduledJob) api.deleteScheduledJob = jest.fn();
    if (!api.getK8sNamespaces) api.getK8sNamespaces = jest.fn();
    if (!api.getK8sPods) api.getK8sPods = jest.fn();
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
    api.getK8sNamespaces.mockResolvedValue({ namespaces: ['default'] });
    api.getK8sPods.mockResolvedValue(['pod-1']);
  });

  it('renders and creates a new job', async () => {
    // Ensure cluster and namespace mocks are set
    api.getK8sNamespaces.mockResolvedValue({ namespaces: ['default'] });
    api.createLogScanJob = jest.fn().mockResolvedValue({ status: 'ok' });
    renderWithContext(<K8sLogScanner />);
    // Open the job creation form
    const createBtn = await screen.findByRole('button', { name: /create new job/i });
    await act(async () => {
      fireEvent.click(createBtn);
    });
    // Wait for cluster select to appear
    const clusterSelect = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.mouseDown(clusterSelect);
    });
    const option = await screen.findByText(/test cluster/i);
    await act(async () => {
      fireEvent.click(option);
    });
    // Wait for namespace checkbox to appear
    const namespaceCheckbox = await screen.findByRole('checkbox', { name: /default/i });
    await act(async () => {
      fireEvent.click(namespaceCheckbox);
    });
    // Fill in job name
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/job name/i), { target: { value: 'My Job' } });
    });
    // Fill in interval
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/interval/i), { target: { value: '5' } });
    });
    // Create job
    const createBtn2 = screen.getByRole('button', { name: /create job/i });
    expect(createBtn2).not.toBeDisabled();
    await act(async () => {
      fireEvent.click(createBtn2);
    });
    await act(async () => {
      await waitFor(() => expect(api.createLogScanJob).toHaveBeenCalled(), { timeout: 2000 });
      await waitFor(() => expect(mockNotify).toHaveBeenCalled(), { timeout: 2000 });
    });
  });

  it('deletes a job and shows notification', async () => {
    // Ensure job mock is set
    api.listLogScanJobs.mockResolvedValue([
      {
        id: 'job1',
        name: 'Test Job',
        namespace: 'default',
        logLevels: ['ERROR'],
        interval: 300,
        createdAt: new Date().toISOString(),
        lastRun: null,
        pods: [],
        cluster: 'test-cluster-arn',
      }
    ]);
    api.deleteLogScanJob = jest.fn().mockResolvedValue({ status: 'ok' });
    renderWithContext(<K8sLogScanner />);
    // Wait for job card
    const jobCard = await screen.findByText(/test job/i, { exact: false });
    // Find delete button
    const deleteBtn = screen.getByRole('button', { name: /delete job/i });
    await act(async () => {
      fireEvent.click(deleteBtn);
    });
    await act(async () => {
      await waitFor(() => expect(api.deleteLogScanJob).toHaveBeenCalled(), { timeout: 2000 });
      await waitFor(() => expect(mockNotify).toHaveBeenCalled(), { timeout: 2000 });
    });
  });

  it('shows last run as Never if not run', async () => {
    // Ensure job mock is set
    api.listLogScanJobs.mockResolvedValue([
      {
        id: 'job1',
        name: 'Test Job',
        namespace: 'default',
        logLevels: ['ERROR'],
        interval: 300,
        createdAt: new Date().toISOString(),
        lastRun: null,
        pods: [],
        cluster: 'test-cluster-arn',
      }
    ]);
    renderWithContext(<K8sLogScanner />);
    expect(
      await screen.findByText(/last run: never/i, { exact: false })
    ).toBeInTheDocument();
  });
}); 