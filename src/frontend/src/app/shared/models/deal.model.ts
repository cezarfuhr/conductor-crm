export type DealStage = 'prospect' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

export interface Deal {
  id: string;
  owner_id: string;
  lead_id?: string;
  title: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number;
  expected_close_date?: string;
  contact_ids: string[];
  company_id?: string;
  ai_insights?: DealAIInsights;
  risk_factors: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DealAIInsights {
  win_probability: number;
  health_score: number;
  predicted_close_date?: string;
  risk_factors: string[];
  recommended_actions: string[];
  last_analysis: string;
}

export interface DealCreate {
  lead_id?: string;
  title: string;
  value: number;
  currency?: string;
  expected_close_date?: string;
  contact_ids?: string[];
  company_id?: string;
  notes?: string;
}

export interface DealUpdate {
  title?: string;
  value?: number;
  currency?: string;
  stage?: DealStage;
  probability?: number;
  expected_close_date?: string;
  contact_ids?: string[];
  notes?: string;
}

export interface DealListResponse {
  deals: Deal[];
  total: number;
  skip: number;
  limit: number;
}

export interface DealPredictionResult {
  deal_id: string;
  win_probability: number;
  health_score: number;
  predicted_close_date?: string;
  risk_factors: string[];
  recommended_actions: string[];
  reasoning: string;
}
