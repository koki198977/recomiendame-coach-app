// Tipos para el sistema de nutrición basados en tu API real

export interface Allergy {
  id: number;
  name: string;
}

export interface Condition {
  id: number;
  code: string;
  label: string;
}

export interface Cuisine {
  id: number;
  name: string;
}

export interface UserProfile {
  userId: string;
  sex?: "MALE" | "FEMALE";
  birthDate?: string;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";
  country?: string;
  budgetLevel?: number;
  cookTimePerMeal?: number;
  allergies?: Allergy[];
  conditions?: Condition[];
  cuisinesLike?: Cuisine[];
  cuisinesDislike?: Cuisine[];
}

export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  servingSize: string;
  category: string;
}

export interface Meal {
  id: string;
  name: string;
  type: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  foods: MealFood[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  preparationTime: number;
  instructions?: string;
}

export interface MealFood {
  food: Food;
  quantity: number;
  unit: string;
}

export interface NutritionPlan {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  dailyCalories: number;
  meals: DailyMeal[];
  isActive: boolean;
  generatedByAI: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyMeal {
  date: string;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snacks: Meal[];
}

export interface Progress {
  id: string;
  userId: string;
  date: string;
  weight?: number;
  caloriesConsumed: number;
  caloriesTarget: number;
  proteinConsumed: number;
  carbsConsumed: number;
  fatConsumed: number;
  waterIntake?: number;
  notes?: string;
}

export interface WeightEntry {
  id: string;
  userId: string;
  weight: number;
  date: string;
  notes?: string;
}

export interface AIGenerationRequest {
  userProfile: UserProfile;
  duration: number; // días
  preferences?: string[];
  excludeFoods?: string[];
}

export interface AIGenerationResponse {
  plan: NutritionPlan;
  recommendations: string[];
  nutritionalAnalysis: {
    averageCalories: number;
    macroDistribution: {
      protein: number;
      carbs: number;
      fat: number;
    };
  };
}

// Tipos para el plan semanal basados en la API real
export interface WeeklyPlan {
  id: string;
  userId: string;
  weekStart: string;
  macros: {
    kcalTarget: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  notes: string;
  days: WeeklyPlanDay[];
}

export interface WeeklyPlanDay {
  dayIndex: number; // 1-7 (lunes a domingo)
  meals: WeeklyPlanMeal[];
}

export interface WeeklyPlanIngredient {
  id?: number;
  name: string;
  qty?: string | number; // La API usa 'qty' en lugar de 'quantity'
  quantity?: number; // Mantener por compatibilidad
  unit?: string;
}

export interface WeeklyPlanMeal {
  slot: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  title: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  tags: string[];
  ingredients: WeeklyPlanIngredient[] | string[]; // Puede ser array de objetos o strings
}

// Respuesta del endpoint de generación de plan
export interface GeneratePlanResponse {
  planId: string;
  created: boolean;
}

// Lista de compras
export interface ShoppingListItem {
  name: string;
  unit: string;
  qty: number;
  category?: string;
}

export interface ShoppingListResponse {
  planId: string;
  items: ShoppingListItem[];
  nextCursor: string | null;
  total: number;
}

// Checkins y tracking diario
export interface CheckinRequest {
  weightKg?: number;
  adherencePct?: number;
  hungerLvl?: number; // 1-10 scale
  notes?: string;
}

export interface CheckinResponse {
  ok: boolean;
  id: string;
  date: string;
  gamification: {
    streakDays: number;
    pointsAdded: number;
    unlocked: string[];
    totalPoints: number;
  };
}

export interface Checkin {
  id: string;
  userId?: string;
  date: string;
  weightKg?: number;
  adherencePct?: number;
  hungerLvl?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TodayCheckinResponse {
  checkin: Checkin | null;
  hasCheckin: boolean;
  date: string;
}

export interface CheckinHistoryResponse {
  items: Checkin[];
}

// Sistema de redes sociales
export interface User {
  id: string;
  name?: string;
  email: string;
  avatar?: string;
}

export interface PostAuthor {
  id: string;
  email: string;
  name?: string;
}

export interface PostMedia {
  id: string;
  url: string;
  width?: number | null;
  height?: number | null;
}

// Tipo unificado que maneja ambos formatos de la API
export interface Post {
  id: string;
  caption: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  challengeId?: string | null;

  // Formato 1: /posts/following
  author?: PostAuthor;
  media?: PostMedia | null;
  likedByMe?: boolean;
  visibility?: string;
  challenge?: any | null;

  // Formato 2: /posts/me y /posts
  authorId?: string;
  authorName?: string;
  mediaUrl?: string | null;
  isLikedByMe?: boolean;
}

export interface PostsResponse {
  items: Post[];
  total: number;
}

export interface CreatePostRequest {
  caption: string;
  challengeId?: string | null;
  mediaUrl?: string;
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    email: string;
  };
}

export interface CreateCommentRequest {
  body: string;
}

export interface CommentsResponse {
  items: Comment[];
  total: number;
  skip: number;
  take: number;
}

export interface LikeResponse {
  liked: boolean;
  likesCount: number;
}

// Sistema de seguimientos
export interface FollowResponse {
  following: boolean;
  followersCount: number;
  followingCount: number;
}

export interface SocialUserProfile {
  id: string;
  email: string;
  role?: string;
  emailVerified?: boolean;
  name?: string;
  avatar?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  isFollowedByMe?: boolean; // Campo que viene del endpoint
}

export interface UsersResponse {
  items: SocialUserProfile[];
  total: number;
}
