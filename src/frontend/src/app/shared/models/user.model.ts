export interface User {
  id: string;
  email: string;
  full_name: string;
  company?: string;
  is_active: boolean;
  google_connected: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  company?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
