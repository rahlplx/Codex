export type UserRole = 'admin' | 'user';

export interface Tenant {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  createdAt: string;
  lastActive: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: Tenant;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}
