export const SEVERITY_CONFIG = {
  CRITICAL: {
    label: 'Critical',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    badge: 'bg-red-500/15 text-red-300 border-red-500/30',
    dot: 'bg-red-500',
    chartColor: '#EF4444',
  },
  HIGH: {
    label: 'High',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    dot: 'bg-orange-500',
    chartColor: '#F97316',
  },
  MEDIUM: {
    label: 'Medium',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    dot: 'bg-yellow-500',
    chartColor: '#EAB308',
  },
  LOW: {
    label: 'Low',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-500',
    chartColor: '#10B981',
  },
  UNKNOWN: {
    label: 'Unknown',
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    dot: 'bg-slate-500',
    chartColor: '#64748B',
  },
};

export function getSeverityStyle(severity) {
  const key = (severity || 'UNKNOWN').toUpperCase();
  return SEVERITY_CONFIG[key] || SEVERITY_CONFIG.UNKNOWN;
}

export function formatCVSS(score) {
  if (score === null || score === undefined || isNaN(score)) {
    return 'N/A';
  }
  return Number(score).toFixed(1);
}

export function formatDate(dateString) {
  if (!dateString) return 'Not available';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(dateString);
  }
}

export function formatDateTime(dateString) {
  if (!dateString) return 'Not available';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateString);
  }
}

export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${Number(value).toFixed(decimals)}%`;
}

/**
 * Distinguish between CVSS v2 absence vs unrecorded v3
 */
export function formatCVSSv2Metric(value, cvssVersion, fieldName) {
  if (value !== null && value !== undefined && value !== '') {
    return String(value);
  }
  if (cvssVersion === '2.0') {
    return `Not applicable in CVSS v2`;
  }
  return 'Not specified';
}

export function formatAttackVector(vector) {
  if (!vector) return 'Not specified';
  const v = String(vector).toUpperCase();
  switch (v) {
    case 'NETWORK': return 'Network (Remote)';
    case 'ADJACENT_NETWORK':
    case 'ADJACENT': return 'Adjacent Network';
    case 'LOCAL': return 'Local';
    case 'PHYSICAL': return 'Physical';
    default: return String(vector);
  }
}
