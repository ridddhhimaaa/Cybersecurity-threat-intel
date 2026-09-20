const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 15000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = '';
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.detail || JSON.stringify(errorJson);
      } catch {
        errorDetail = await response.text();
      }
      throw new ApiError(
        errorDetail || `Request failed with status ${response.status}`,
        response.status,
        errorDetail
      );
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out while contacting threat intelligence backend.', 408);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network error connecting to API.', 0);
  }
}

export const api = {
  // Health
  getHealth: () => request('/api/health'),

  // CVEs
  getCVEs: (params = {}) => {
    const query = new URLSearchParams();
    if (params.severity) query.append('severity', params.severity);
    if (params.min_cvss !== undefined && params.min_cvss !== null && params.min_cvss !== '') {
      query.append('min_cvss', params.min_cvss);
    }
    if (params.max_cvss !== undefined && params.max_cvss !== null && params.max_cvss !== '') {
      query.append('max_cvss', params.max_cvss);
    }
    if (params.attack_vector) query.append('attack_vector', params.attack_vector);
    if (params.cwe_id) query.append('cwe_id', params.cwe_id);
    if (params.limit !== undefined) query.append('limit', params.limit);
    if (params.offset !== undefined) query.append('offset', params.offset);

    const queryString = query.toString();
    return request(`/api/cves${queryString ? `?${queryString}` : ''}`);
  },

  getCVE: (cveId) => request(`/api/cves/${encodeURIComponent(cveId)}`),

  // Summaries
  getSeveritySummary: () => request('/api/summary/severity'),
  getCVSSSummary: () => request('/api/summary/cvss'),
  getTrends: () => request('/api/summary/trends'),
  getAttackVectors: () => request('/api/summary/attack-vectors'),
  getAttackComplexity: () => request('/api/summary/attack-complexity'),
  getPrivileges: () => request('/api/summary/privileges'),
  getUserInteraction: () => request('/api/summary/user-interaction'),
  getScope: () => request('/api/summary/scope'),
  getCWESummary: () => request('/api/summary/cwe'),
  getTopVulnerabilities: () => request('/api/summary/top-vulnerabilities'),

  // Machine Learning
  getMLFeatures: () => request('/api/ml/features'),
  getMLClusters: () => request('/api/ml/clusters'),
};

export default api;
