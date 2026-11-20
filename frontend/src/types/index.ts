export interface User {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Reliability Engineer' | 'Technician' | 'Viewer';
  line_ids: string[];
  status: string;
  must_change_password?: boolean;
}

export interface Machine {
  id: string;
  line_id: string;
  name: string;
  type: string;
  manufacturer: string;
  install_date: string;
  criticality: number;
  downtime_cost_per_hour: number;
  map_position: { room: string; x: number; y: number };
  active: boolean;
  health_index: number;
  risk_score: number;
  state: 'Healthy' | 'Watch' | 'Alert' | 'Critical';
  last_maintenance?: string;
  sensors?: Sensor[];
}

export interface Sensor {
  id: string;
  machine_id: string;
  name: string;
  type: string;
  unit: string;
  min_val: number;
  max_val: number;
  sampling_seconds: number;
}

export interface Alert {
  id: string;
  machine_id: string;
  machine_name: string;
  severity: 'Watch' | 'Alert' | 'Critical';
  risk_score: number;
  opened_at: string;
  status: string;
  top_features: FeatureDeviation[];
  review_id?: string;
}

export interface FeatureDeviation {
  feature: string;
  sensor: string;
  current_value: number;
  baseline_value: number;
  deviation_z: number;
  contribution_pct: number;
}

export interface Model {
  id: string;
  name: string;
  family: string;
  feature_set_id: string;
  trained_range: string;
  metrics: {
    pr_auc?: number;
    recall?: number;
    f1?: number;
    false_alarms_per_month?: number;
  };
  threshold: number;
  status: 'draft' | 'validated' | 'active' | 'retired';
  approved_by?: string;
  approval_note?: string;
}

export interface PlanItem {
  id: string;
  machine_id: string;
  machine_name: string;
  priority_score: number;
  risk_prob: number;
  criticality: number;
  downtime_cost: number;
  window_start: string;
  window_end: string;
  suggested_action: string;
  rationale: string;
  status: 'suggested' | 'approved' | 'done';
}
