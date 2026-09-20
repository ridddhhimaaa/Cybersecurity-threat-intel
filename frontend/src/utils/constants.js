export const NAV_ITEMS = [
  { id: 'command-center', label: 'Command Center', path: '/', icon: 'Globe' },
  { id: 'overview', label: 'Overview', path: '/dashboard', icon: 'LayoutDashboard' },
  { id: 'vulnerabilities', label: 'Vulnerabilities', path: '/vulnerabilities', icon: 'ShieldAlert' },
  { id: 'analytics', label: 'Threat Analytics', path: '/analytics', icon: 'BarChart3' },
  { id: 'cwe', label: 'CWE Intelligence', path: '/cwe', icon: 'FolderGit2' },
  { id: 'risk-ml', label: 'Risk & ML', path: '/risk-ml', icon: 'Cpu' },
  { id: 'cvss', label: 'CVSS Analysis', path: '/cvss', icon: 'Binary' },
];

export const WORKSPACE_TABS = [
  { id: 'command-center', label: 'Command Center', path: '/' },
  { id: 'overview', label: 'Overview', path: '/dashboard' },
  { id: 'threats', label: 'Vulnerabilities', path: '/vulnerabilities' },
  { id: 'analytics', label: 'Analytics', path: '/analytics' },
  { id: 'cwe', label: 'CWE', path: '/cwe' },
  { id: 'risk', label: 'Risk & ML', path: '/risk-ml' },
  { id: 'cvss', label: 'CVSS', path: '/cvss' },
];

export const ATTACK_VECTOR_OPTIONS = [
  { label: 'All Attack Vectors', value: '' },
  { label: 'Network', value: 'NETWORK' },
  { label: 'Local', value: 'LOCAL' },
  { label: 'Adjacent', value: 'ADJACENT' },
  { label: 'Physical', value: 'PHYSICAL' },
];

export const SEVERITY_OPTIONS = [
  { label: 'All Severities', value: '' },
  { label: 'Critical', value: 'CRITICAL' },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
];
