// Tipos de usuario
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'COACH';
  createdAt: string;
  updatedAt: string;
}

// Tipos de autenticación
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user?: User;
}

// Tipos de coach
export interface Coach {
  id: string;
  userId: string;
  specialties: string[];
  experience: number;
  rating: number;
  bio: string;
  hourlyRate: number;
  availability: string[];
  user: User;
  createdAt: string;
  updatedAt: string;
}

// Tipos de sesión
export interface Session {
  id: string;
  coachId: string;
  userId: string;
  scheduledAt: string;
  duration: number;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  coach: Coach;
  user: User;
  createdAt: string;
  updatedAt: string;
}

// Tipos de recomendación
export interface Recommendation {
  id: string;
  userId: string;
  coachId: string;
  score: number;
  reasons: string[];
  coach: Coach;
  createdAt: string;
}

// Tipos de respuesta de la API
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}