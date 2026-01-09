import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'es' | 'en';

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  timezone: string;
  setTimezone: (tz: string) => void;
  t: (key: string) => string;
  formatDate: (date: Date | string) => string;
  formatDateTime: (date: Date | string) => string;
  formatTime: (date: Date | string) => string;
}

export const timezones: TimezoneOption[] = [
  // América del Sur
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (Buenos Aires)', offset: 'UTC-3' },
  { value: 'America/Sao_Paulo', label: 'Brasil (São Paulo)', offset: 'UTC-3' },
  { value: 'America/Santiago', label: 'Chile (Santiago)', offset: 'UTC-4' },
  { value: 'America/Bogota', label: 'Colombia (Bogotá)', offset: 'UTC-5' },
  { value: 'America/Lima', label: 'Perú (Lima)', offset: 'UTC-5' },
  { value: 'America/Montevideo', label: 'Uruguay (Montevideo)', offset: 'UTC-3' },
  { value: 'America/Caracas', label: 'Venezuela (Caracas)', offset: 'UTC-4' },
  
  // América del Norte
  { value: 'America/Mexico_City', label: 'México (Ciudad de México)', offset: 'UTC-6' },
  { value: 'America/New_York', label: 'Estados Unidos (Nueva York)', offset: 'UTC-5' },
  { value: 'America/Los_Angeles', label: 'Estados Unidos (Los Ángeles)', offset: 'UTC-8' },
  { value: 'America/Chicago', label: 'Estados Unidos (Chicago)', offset: 'UTC-6' },
  
  // Europa
  { value: 'Europe/Madrid', label: 'España (Madrid)', offset: 'UTC+1' },
  { value: 'Europe/London', label: 'Reino Unido (Londres)', offset: 'UTC+0' },
  { value: 'Europe/Paris', label: 'Francia (París)', offset: 'UTC+1' },
  { value: 'Europe/Berlin', label: 'Alemania (Berlín)', offset: 'UTC+1' },
  { value: 'Europe/Rome', label: 'Italia (Roma)', offset: 'UTC+1' },
  
  // Asia
  { value: 'Asia/Tokyo', label: 'Japón (Tokio)', offset: 'UTC+9' },
  { value: 'Asia/Shanghai', label: 'China (Shanghái)', offset: 'UTC+8' },
  { value: 'Asia/Dubai', label: 'Emiratos Árabes (Dubái)', offset: 'UTC+4' },
  
  // Oceanía
  { value: 'Australia/Sydney', label: 'Australia (Sídney)', offset: 'UTC+11' },
  { value: 'Pacific/Auckland', label: 'Nueva Zelanda (Auckland)', offset: 'UTC+13' },
];

const translations: Record<Language, Record<string, string>> = {
  es: {
    // Navigation
    'nav.dashboard': 'Panel Principal',
    'nav.agents': 'Agentes IA',
    'nav.documents': 'Documentos',
    'nav.conversations': 'Conversaciones',
    'nav.analytics': 'Analíticas',
    'nav.billing': 'Facturación',
    'nav.settings': 'Configuración',
    'nav.user': 'Usuario',
    'nav.admin': 'Admin',
    
    // Admin nav
    'nav.admin.overview': 'Vista General',
    'nav.admin.users': 'Usuarios',
    'nav.admin.allAgents': 'Todos los Agentes',
    'nav.admin.metrics': 'Métricas',
    'nav.admin.integrations': 'Integraciones',
    'nav.admin.aiConfig': 'Config. IA',
    'nav.admin.security': 'Seguridad',
    'nav.admin.dangerZone': 'Zona de Peligro',
    
    // Header
    'header.search': 'Buscar agentes, documentos...',
    'header.credits': 'créditos',
    'header.profile': 'Perfil',
    'header.logout': 'Cerrar Sesión',
    
    // Dashboard
    'dashboard.title': 'Panel Principal',
    'dashboard.welcome': '¡Bienvenido de nuevo, {name}! Aquí tienes un resumen de tus agentes IA.',
    'dashboard.newAgent': 'Nuevo Agente',
    'dashboard.activeAgents': 'Agentes Activos',
    'dashboard.conversations': 'Conversaciones',
    'dashboard.creditsRemaining': 'Créditos Restantes',
    'dashboard.tokensUsed': 'Tokens Usados',
    'dashboard.yourAgents': 'Tus Agentes',
    'dashboard.viewAll': 'Ver Todos',
    'dashboard.loadingAgents': 'Cargando agentes...',
    'dashboard.noAgentsYet': 'Aún no hay agentes',
    'dashboard.createFirstAgent': 'Crea tu primer agente IA para comenzar',
    'dashboard.createAgent': 'Crear Agente',
    
    // Settings
    'settings.title': 'Configuración',
    'settings.subtitle': 'Gestiona tu cuenta y preferencias',
    'settings.profile': 'Perfil',
    'settings.company': 'Empresa',
    'settings.notifications': 'Notificaciones',
    'settings.security': 'Seguridad',
    'settings.preferences': 'Preferencias',
    'settings.preferencesDesc': 'Configura idioma y zona horaria',
    'settings.profileInfo': 'Información del Perfil',
    'settings.updatePersonalDetails': 'Actualiza tus datos personales',
    'settings.changeAvatar': 'Cambiar Avatar',
    'settings.fullName': 'Nombre Completo',
    'settings.email': 'Correo Electrónico',
    'settings.phone': 'Teléfono',
    'settings.saveChanges': 'Guardar Cambios',
    'settings.saving': 'Guardando...',
    'settings.companyInfo': 'Información de la Empresa',
    'settings.companyDetails': 'Detalles de tu organización',
    'settings.companyName': 'Nombre de la Empresa',
    'settings.website': 'Sitio Web',
    'settings.notificationPrefs': 'Preferencias de Notificación',
    'settings.chooseUpdates': 'Elige qué actualizaciones recibir',
    'settings.emailNotifications': 'Notificaciones por Email',
    'settings.receiveEmailUpdates': 'Recibir actualizaciones por email',
    'settings.usageAlerts': 'Alertas de Uso',
    'settings.lowCreditsNotify': 'Recibir aviso cuando los créditos estén bajos',
    'settings.weeklyReports': 'Reportes Semanales',
    'settings.performanceSummary': 'Resumen de rendimiento de agentes',
    'settings.marketingUpdates': 'Actualizaciones de Marketing',
    'settings.newsAndProducts': 'Noticias y actualizaciones de productos',
    'settings.password': 'Contraseña',
    'settings.updatePassword': 'Actualiza tu contraseña',
    'settings.currentPassword': 'Contraseña Actual',
    'settings.newPassword': 'Nueva Contraseña',
    'settings.confirmPassword': 'Confirmar Nueva Contraseña',
    'settings.updatePasswordBtn': 'Actualizar Contraseña',
    'settings.dataManagement': 'Gestión de Datos',
    'settings.exportOrDelete': 'Exportar o eliminar tus datos',
    'settings.exportData': 'Exportar Datos',
    'settings.downloadData': 'Descargar todos tus datos',
    'settings.export': 'Exportar',
    'settings.deleteAccount': 'Eliminar Cuenta',
    'settings.permanentlyDelete': 'Eliminar permanentemente tu cuenta',
    'settings.delete': 'Eliminar',
    'settings.deleteConfirmTitle': '¿Estás absolutamente seguro?',
    'settings.deleteConfirmDesc': 'Esta acción no se puede deshacer. Esto eliminará permanentemente tu cuenta y todos tus datos de nuestros servidores.',
    'settings.cancel': 'Cancelar',
    'settings.deleteAccountBtn': 'Eliminar Cuenta',
    'settings.exportStarted': 'Exportación iniciada',
    'settings.exportReady': 'Tu exportación de datos estará lista pronto.',
    'settings.loading': 'Cargando...',
    'settings.language': 'Idioma',
    'settings.languageDesc': 'Selecciona el idioma de la interfaz',
    'settings.spanish': 'Español',
    'settings.english': 'Inglés',
    'settings.timezone': 'Zona Horaria',
    'settings.timezoneDesc': 'Todas las fechas y horas se mostrarán en esta zona horaria',
    'settings.selectTimezone': 'Seleccionar zona horaria',
    
    // Agents
    'agents.title': 'Agentes IA',
    'agents.subtitle': 'Gestiona y configura tus agentes conversacionales',
    'agents.search': 'Buscar agentes...',
    'agents.all': 'Todos',
    'agents.active': 'Activos',
    'agents.paused': 'Pausados',
    'agents.draft': 'Borradores',
    'agents.noAgentsFound': 'No se encontraron agentes',
    'agents.trySearchOrCreate': 'Intenta buscar o crea un nuevo agente',
    'agents.edit': 'Editar',
    'agents.delete': 'Eliminar',
    'agents.deleteConfirmTitle': '¿Eliminar agente?',
    'agents.deleteConfirmDesc': 'Esta acción no se puede deshacer. El agente y todos sus datos serán eliminados permanentemente.',
    
    // Create Agent
    'createAgent.title': 'Crear Nuevo Agente',
    'createAgent.subtitle': 'Configura tu nuevo agente IA conversacional',
    'createAgent.back': 'Volver a Agentes',
    'createAgent.basicInfo': 'Información Básica',
    'createAgent.basicInfoDesc': 'Información básica sobre tu agente',
    'createAgent.agentName': 'Nombre del Agente',
    'createAgent.agentNamePlaceholder': 'Ej: Asistente de Ventas',
    'createAgent.description': 'Descripción',
    'createAgent.descriptionPlaceholder': 'Describe brevemente qué hace este agente...',
    'createAgent.objective': 'Objetivo',
    'createAgent.selectObjective': 'Seleccionar objetivo',
    'createAgent.sales': 'Ventas',
    'createAgent.support': 'Soporte',
    'createAgent.information': 'Información',
    'createAgent.welcomeMessage': 'Mensaje de Bienvenida',
    'createAgent.welcomePlaceholder': '¡Hola! ¿En qué puedo ayudarte hoy?',
    'createAgent.personality': 'Personalidad y Comportamiento',
    'createAgent.personalityDesc': 'Define cómo se comporta tu agente',
    'createAgent.personalityLabel': 'Personalidad',
    'createAgent.personalityPlaceholder': 'Describe la personalidad del agente...',
    'createAgent.tone': 'Tono',
    'createAgent.tonePlaceholder': 'Ej: Profesional pero amigable',
    'createAgent.systemPrompt': 'System Prompt',
    'createAgent.systemPromptPlaceholder': 'Instrucciones detalladas para el comportamiento del agente...',
    'createAgent.creating': 'Creando...',
    'createAgent.create': 'Crear Agente',
    
    // Documents
    'documents.title': 'Documentos',
    'documents.subtitle': 'Gestiona la base de conocimiento de tus agentes',
    'documents.uploadFile': 'Subir Archivo',
    'documents.addUrl': 'Añadir URL',
    'documents.search': 'Buscar documentos...',
    'documents.name': 'Nombre',
    'documents.type': 'Tipo',
    'documents.status': 'Estado',
    'documents.size': 'Tamaño',
    'documents.date': 'Fecha',
    'documents.actions': 'Acciones',
    'documents.pending': 'Pendiente',
    'documents.processing': 'Procesando',
    'documents.indexed': 'Indexado',
    'documents.failed': 'Fallido',
    'documents.retry': 'Reintentar',
    'documents.noDocuments': 'No hay documentos',
    'documents.uploadFirst': 'Sube tu primer documento para comenzar',
    
    // Billing
    'billing.title': 'Facturación',
    'billing.subtitle': 'Gestiona tu suscripción y créditos',
    'billing.currentPlan': 'Plan Actual',
    'billing.upgrade': 'Mejorar',
    'billing.creditsBalance': 'Balance de Créditos',
    'billing.purchased': 'Comprados',
    'billing.used': 'Usados',
    'billing.available': 'Disponibles',
    'billing.buyCredits': 'Comprar Créditos',
    'billing.transactionHistory': 'Historial de Transacciones',
    'billing.noTransactions': 'No hay transacciones',
    'billing.purchase': 'Compra',
    'billing.usage': 'Uso',
    'billing.bonus': 'Bonificación',
    'billing.refund': 'Reembolso',
    
    // Common
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.create': 'Crear',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.status': 'Estado',
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.agents': 'AI Agents',
    'nav.documents': 'Documents',
    'nav.conversations': 'Conversations',
    'nav.analytics': 'Analytics',
    'nav.billing': 'Billing',
    'nav.settings': 'Settings',
    'nav.user': 'User',
    'nav.admin': 'Admin',
    
    // Admin nav
    'nav.admin.overview': 'Overview',
    'nav.admin.users': 'Users',
    'nav.admin.allAgents': 'All Agents',
    'nav.admin.metrics': 'Metrics',
    'nav.admin.integrations': 'Integrations',
    'nav.admin.aiConfig': 'AI Config',
    'nav.admin.security': 'Security',
    'nav.admin.dangerZone': 'Danger Zone',
    
    // Header
    'header.search': 'Search agents, documents...',
    'header.credits': 'credits',
    'header.profile': 'Profile',
    'header.logout': 'Logout',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome back, {name}! Here\'s an overview of your AI agents.',
    'dashboard.newAgent': 'New Agent',
    'dashboard.activeAgents': 'Active Agents',
    'dashboard.conversations': 'Conversations',
    'dashboard.creditsRemaining': 'Credits Remaining',
    'dashboard.tokensUsed': 'Tokens Used',
    'dashboard.yourAgents': 'Your Agents',
    'dashboard.viewAll': 'View All',
    'dashboard.loadingAgents': 'Loading agents...',
    'dashboard.noAgentsYet': 'No agents yet',
    'dashboard.createFirstAgent': 'Create your first AI agent to get started',
    'dashboard.createAgent': 'Create Agent',
    
    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage your account and preferences',
    'settings.profile': 'Profile',
    'settings.company': 'Company',
    'settings.notifications': 'Notifications',
    'settings.security': 'Security',
    'settings.preferences': 'Preferences',
    'settings.preferencesDesc': 'Configure language and timezone',
    'settings.profileInfo': 'Profile Information',
    'settings.updatePersonalDetails': 'Update your personal details',
    'settings.changeAvatar': 'Change Avatar',
    'settings.fullName': 'Full Name',
    'settings.email': 'Email',
    'settings.phone': 'Phone',
    'settings.saveChanges': 'Save Changes',
    'settings.saving': 'Saving...',
    'settings.companyInfo': 'Company Information',
    'settings.companyDetails': 'Your organization details',
    'settings.companyName': 'Company Name',
    'settings.website': 'Website',
    'settings.notificationPrefs': 'Notification Preferences',
    'settings.chooseUpdates': 'Choose what updates you receive',
    'settings.emailNotifications': 'Email Notifications',
    'settings.receiveEmailUpdates': 'Receive updates via email',
    'settings.usageAlerts': 'Usage Alerts',
    'settings.lowCreditsNotify': 'Get notified when credits are low',
    'settings.weeklyReports': 'Weekly Reports',
    'settings.performanceSummary': 'Summary of agent performance',
    'settings.marketingUpdates': 'Marketing Updates',
    'settings.newsAndProducts': 'News and product updates',
    'settings.password': 'Password',
    'settings.updatePassword': 'Update your password',
    'settings.currentPassword': 'Current Password',
    'settings.newPassword': 'New Password',
    'settings.confirmPassword': 'Confirm New Password',
    'settings.updatePasswordBtn': 'Update Password',
    'settings.dataManagement': 'Data Management',
    'settings.exportOrDelete': 'Export or delete your data',
    'settings.exportData': 'Export Data',
    'settings.downloadData': 'Download all your data',
    'settings.export': 'Export',
    'settings.deleteAccount': 'Delete Account',
    'settings.permanentlyDelete': 'Permanently delete your account',
    'settings.delete': 'Delete',
    'settings.deleteConfirmTitle': 'Are you absolutely sure?',
    'settings.deleteConfirmDesc': 'This action cannot be undone. This will permanently delete your account and remove all your data from our servers.',
    'settings.cancel': 'Cancel',
    'settings.deleteAccountBtn': 'Delete Account',
    'settings.exportStarted': 'Export started',
    'settings.exportReady': 'Your data export will be ready shortly.',
    'settings.loading': 'Loading...',
    'settings.language': 'Language',
    'settings.languageDesc': 'Select interface language',
    'settings.spanish': 'Spanish',
    'settings.english': 'English',
    'settings.timezone': 'Timezone',
    'settings.timezoneDesc': 'All dates and times will be displayed in this timezone',
    'settings.selectTimezone': 'Select timezone',
    
    // Agents
    'agents.title': 'AI Agents',
    'agents.subtitle': 'Manage and configure your conversational agents',
    'agents.search': 'Search agents...',
    'agents.all': 'All',
    'agents.active': 'Active',
    'agents.paused': 'Paused',
    'agents.draft': 'Draft',
    'agents.noAgentsFound': 'No agents found',
    'agents.trySearchOrCreate': 'Try searching or create a new agent',
    'agents.edit': 'Edit',
    'agents.delete': 'Delete',
    'agents.deleteConfirmTitle': 'Delete agent?',
    'agents.deleteConfirmDesc': 'This action cannot be undone. The agent and all its data will be permanently deleted.',
    
    // Create Agent
    'createAgent.title': 'Create New Agent',
    'createAgent.subtitle': 'Configure your new conversational AI agent',
    'createAgent.back': 'Back to Agents',
    'createAgent.basicInfo': 'Basic Information',
    'createAgent.basicInfoDesc': 'Basic information about your agent',
    'createAgent.agentName': 'Agent Name',
    'createAgent.agentNamePlaceholder': 'E.g: Sales Assistant',
    'createAgent.description': 'Description',
    'createAgent.descriptionPlaceholder': 'Briefly describe what this agent does...',
    'createAgent.objective': 'Objective',
    'createAgent.selectObjective': 'Select objective',
    'createAgent.sales': 'Sales',
    'createAgent.support': 'Support',
    'createAgent.information': 'Information',
    'createAgent.welcomeMessage': 'Welcome Message',
    'createAgent.welcomePlaceholder': 'Hello! How can I help you today?',
    'createAgent.personality': 'Personality and Behavior',
    'createAgent.personalityDesc': 'Define how your agent behaves',
    'createAgent.personalityLabel': 'Personality',
    'createAgent.personalityPlaceholder': 'Describe the agent personality...',
    'createAgent.tone': 'Tone',
    'createAgent.tonePlaceholder': 'E.g: Professional but friendly',
    'createAgent.systemPrompt': 'System Prompt',
    'createAgent.systemPromptPlaceholder': 'Detailed instructions for agent behavior...',
    'createAgent.creating': 'Creating...',
    'createAgent.create': 'Create Agent',
    
    // Documents
    'documents.title': 'Documents',
    'documents.subtitle': 'Manage the knowledge base for your agents',
    'documents.uploadFile': 'Upload File',
    'documents.addUrl': 'Add URL',
    'documents.search': 'Search documents...',
    'documents.name': 'Name',
    'documents.type': 'Type',
    'documents.status': 'Status',
    'documents.size': 'Size',
    'documents.date': 'Date',
    'documents.actions': 'Actions',
    'documents.pending': 'Pending',
    'documents.processing': 'Processing',
    'documents.indexed': 'Indexed',
    'documents.failed': 'Failed',
    'documents.retry': 'Retry',
    'documents.noDocuments': 'No documents',
    'documents.uploadFirst': 'Upload your first document to get started',
    
    // Billing
    'billing.title': 'Billing',
    'billing.subtitle': 'Manage your subscription and credits',
    'billing.currentPlan': 'Current Plan',
    'billing.upgrade': 'Upgrade',
    'billing.creditsBalance': 'Credits Balance',
    'billing.purchased': 'Purchased',
    'billing.used': 'Used',
    'billing.available': 'Available',
    'billing.buyCredits': 'Buy Credits',
    'billing.transactionHistory': 'Transaction History',
    'billing.noTransactions': 'No transactions',
    'billing.purchase': 'Purchase',
    'billing.usage': 'Usage',
    'billing.bonus': 'Bonus',
    'billing.refund': 'Refund',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.status': 'Status',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('language') as Language;
      return stored || 'es';
    }
    return 'es';
  });

  const [timezone, setTimezoneState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('timezone');
      return stored || 'America/Argentina/Buenos_Aires';
    }
    return 'America/Argentina/Buenos_Aires';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('timezone', timezone);
  }, [timezone]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const setTimezone = (tz: string) => {
    setTimezoneState(tz);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(language === 'es' ? 'es-AR' : 'en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  };

  const formatDateTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(language === 'es' ? 'es-AR' : 'en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  const formatTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(language === 'es' ? 'es-AR' : 'en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      timezone, 
      setTimezone, 
      t, 
      formatDate, 
      formatDateTime, 
      formatTime 
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
