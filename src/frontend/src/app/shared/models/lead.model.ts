export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
export type LeadClassification = 'Hot' | 'Warm' | 'Cold';

export interface Lead {
  id: string;
  owner_id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  job_title?: string;
  source?: string;
  status: LeadStatus;
  score: number;
  classification?: LeadClassification;
  tags: string[];
  enrichment_data?: Record<string, any>;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadCreate {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  job_title?: string;
  source?: string;
  tags?: string[];
  notes?: string;
}

export interface LeadUpdate {
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
  job_title?: string;
  source?: string;
  status?: LeadStatus;
  tags?: string[];
  notes?: string;
}

export interface LeadListResponse {
  leads: Lead[];
  total: number;
  skip: number;
  limit: number;
}

export interface LeadQualificationResult {
  lead_id: string;
  score: number;
  classification: LeadClassification;
  reasoning: string;
  next_actions: string[];
  bant: {
    budget: string;
    authority: string;
    need: string;
    timeline: string;
  };
}
