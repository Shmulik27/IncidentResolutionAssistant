import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';
const SERVICES = {
  goBackend: 'http://localhost:8080',
  logAnalyzer: 'http://localhost:8001',
  rootCausePredictor: 'http://localhost:8002',
  knowledgeBase: 'http://localhost:8003',
  actionRecommender: 'http://localhost:8004',
  incidentIntegrator: 'http://localhost:8005'
};

// Default configuration that matches the UI expectations
const DEFAULT_CONFIG = {
  log_analyzer_url: 'http://localhost:8001',
  root_cause_predictor_url: 'http://localhost:8002',
  knowledge_base_url: 'http://localhost:8003',
  action_recommender_url: 'http://localhost:8004',
  incident_integrator_url: 'http://localhost:8005',
  enable_auto_analysis: true,
  enable_jira_integration: true,
  enable_github_integration: true,
  enable_notifications: true,
  request_timeout: 30,
  max_retries: 3,
  log_level: 'INFO',
  cache_ttl: 60
};

export const api = {
  // Service health checks
  async checkServiceHealth(serviceUrl) {
    try {
      const response = await axios.get(`${serviceUrl}/health`);
      return { status: 'UP', response: response.data };
    } catch (error) {
      return { status: 'DOWN', error: error.message };
    }
  },

  // Incident analysis
  async analyzeIncident(logs) {
    const response = await axios.post(`${API_BASE_URL}/analyze`, { logs });
    return response.data;
  },

  async predictRootCause(logs) {
    const response = await axios.post(`${API_BASE_URL}/predict`, { logs });
    return response.data;
  },

  async searchKnowledgeBase(query, topK = 3) {
    const response = await axios.post(`${API_BASE_URL}/search`, { query, top_k: topK });
    return response.data;
  },

  async getRecommendations(rootCause) {
    const response = await axios.post(`${API_BASE_URL}/recommend`, { root_cause: rootCause });
    return response.data;
  },

  // Get all service statuses
  async getAllServiceStatuses() {
    const statuses = {};
    for (const [name, url] of Object.entries(SERVICES)) {
      statuses[name] = await this.checkServiceHealth(url);
    }
    return statuses;
  },

  // Test execution
  async runTests() {
    try {
      const response = await axios.post(`${API_BASE_URL}/test`, {});
      return response.data;
    } catch (error) {
      throw new Error('Failed to run tests');
    }
  },

  // Configuration management
  async getConfiguration() {
    try {
      const response = await axios.get(`${API_BASE_URL}/config`);
      return response.data;
    } catch (error) {
      // Return default configuration if endpoint is not available
      return DEFAULT_CONFIG;
    }
  },

  async updateConfiguration(config) {
    try {
      const response = await axios.post(`${API_BASE_URL}/config`, config);
      return response.data;
    } catch (error) {
      throw new Error('Failed to update configuration');
    }
  },

  // K8s Log Scanner endpoints
  async getK8sClusters() {
    try {
      const response = await axios.get(`${API_BASE_URL}/k8s-clusters`);
      return response.data;
    } catch (error) {
      console.error('Error fetching K8s clusters:', error);
      throw new Error('Failed to fetch K8s clusters');
    }
  },

  async scanK8sLogs(scanRequest) {
    try {
      const response = await axios.post(`${API_BASE_URL}/scan-k8s-logs`, scanRequest);
      return response.data;
    } catch (error) {
      console.error('Error scanning K8s logs:', error);
      throw new Error('Failed to scan K8s logs');
    }
  },

  async getK8sNamespaces(cluster) {
    try {
      const response = await axios.get(`${API_BASE_URL}/k8s-namespaces?cluster=${encodeURIComponent(cluster)}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching K8s namespaces:', error);
      throw new Error('Failed to fetch K8s namespaces');
    }
  }
}; 