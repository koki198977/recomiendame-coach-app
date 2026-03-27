export interface OnboardingStep {
  id: string;
  stepNumber: number;
  screen: 'home' | 'plan' | string;
  targetRef: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: string;
  requiredPlan?: string;
  isActive: boolean;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    stepNumber: 1,
    screen: 'home',
    targetRef: 'appHeader',
    title: '¡Hola! Soy Chapi 👋',
    description: '¡Bienvenido/a a Recomiéndame Coach! Soy Chapi, tu asistente personal. Déjame mostrarte todo lo que podemos hacer juntos 💪',
    position: 'bottom',
    isActive: true,
  },
  {
    id: 'nutrition_dashboard',
    stepNumber: 2,
    screen: 'home',
    targetRef: 'nutritionProgress',
    title: 'Tu progreso nutricional 🥗',
    description: 'Aquí ves tus calorías y macros del día en tiempo real. ¡Cada comida que registres aparece aquí al instante! 📊',
    position: 'bottom',
    isActive: true,
  },
  {
    id: 'food_log_camera',
    stepNumber: 3,
    screen: 'home',
    targetRef: 'nutritionScanner',
    title: 'Escanea tus comidas 📸',
    description: 'Con la cámara puedes escanear el código de barras de cualquier alimento y lo agrego automáticamente a tu registro. ¡Súper fácil! 🍎',
    position: 'top',
    isActive: true,
  },
  {
    id: 'checkin_daily',
    stepNumber: 4,
    screen: 'home',
    targetRef: 'checkinCard',
    title: 'Check-in diario ✅',
    description: 'Cada día puedes registrar tu peso, cómo te sientes y qué tan bien seguiste el plan. ¡Así puedo darte mejores recomendaciones! 🎯',
    position: 'top',
    isActive: true,
  },
  {
    id: 'floating_meal_log',
    stepNumber: 5,
    screen: 'home',
    targetRef: 'floatingMealLog',
    title: 'Registra rápido ⚡',
    description: 'Este botón flotante te permite registrar tus comidas rápidamente en cualquier momento. ¡Se activará en cuanto crees tu primer plan nutricional!',
    position: 'top',
    isActive: true,
  },
  {
    id: 'chapi_chat',
    stepNumber: 6,
    screen: 'home',
    targetRef: 'chapiBubble',
    title: '¡Habla conmigo! 💬',
    description: 'Ese botón flotante soy yo 😄 Tócame cuando quieras preguntarme algo sobre nutrición, ejercicio o tu plan. ¡Estoy aquí para ayudarte! 🤗',
    position: 'top',
    isActive: true,
  },
  {
    id: 'tab_plan',
    stepNumber: 7,
    screen: 'home',
    targetRef: 'bottomTabPlan',
    title: 'Mi Programa 🍎💪',
    description: 'Aquí encontrarás tu plan nutricional y tu rutina de ejercicios personalizados, generados con IA para ti.',
    position: 'top',
    isActive: true,
  },
  {
    id: 'tab_social',
    stepNumber: 8,
    screen: 'home',
    targetRef: 'bottomTabSocial',
    title: 'Nuestra Comunidad 👥',
    description: 'Comparte tu progreso, descubre historias inspiradoras y apóyate en personas con objetivos similares a los tuyos.',
    position: 'top',
    isActive: true,
  },
  {
    id: 'tab_progress',
    stepNumber: 9,
    screen: 'home',
    targetRef: 'bottomTabProgress',
    title: 'Analiza tu progreso 📊',
    description: 'Revisa tu historial, tendencias de peso y evolución a lo largo del tiempo. ¡Celebra cada logro!',
    position: 'top',
    isActive: true,
  },
  {
    id: 'tab_profile',
    stepNumber: 10,
    screen: 'home',
    targetRef: 'bottomTabProfile',
    title: 'Tu Perfil 👤',
    description: 'Ajusta tus datos, metas, restricciones alimenticias y preferencias en cualquier momento.',
    position: 'top',
    isActive: true,
  },
  {
    id: 'completed',
    stepNumber: 11,
    screen: 'home',
    targetRef: 'appHeader',
    title: '¡Ya estás listo/a! 🎉',
    description: '¡Genial! Ya conoces todo lo que necesitas. Recuerda que puedes contar conmigo siempre. ¡Vamos a alcanzar tus objetivos juntos! 🚀',
    position: 'bottom',
    isActive: true,
  },
];
