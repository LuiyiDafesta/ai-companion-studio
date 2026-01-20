/**
 * Email Templates for AgentHubs
 * Professional HTML templates with consistent branding
 */

// Base template with AgentHubs branding
const emailBaseTemplate = (content: string, preheader: string = '') => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>AgentHubs</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background-color: #f3f4f6;
      line-height: 1.6;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      font-size: 32px;
      font-weight: 700;
      color: #ffffff;
      text-decoration: none;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px 30px;
      color: #1f2937;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      box-shadow: 0 4px 6px rgba(59, 130, 246, 0.25);
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .footer a {
      color: #3B82F6;
      text-decoration: none;
    }
    h1 {
      color: #111827;
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 20px 0;
    }
    p {
      margin: 0 0 16px 0;
      color: #4b5563;
    }
    .highlight-box {
      background-color: #eff6ff;
      border-left: 4px solid #3B82F6;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .stats {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .preheader {
      display: none;
      max-height: 0;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div class="preheader">${preheader}</div>
  <div class="email-container">
    <div class="header">
      <div class="logo">AgentHubs</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>
        © 2026 AgentHubs. Todos los derechos reservados.<br>
        <a href="{{unsubscribe_url}}">Cancelar suscripción</a> | 
        <a href="https://agenthubs.com/settings">Preferencias</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

// Template 1: Welcome Email
export const welcomeEmailTemplate = (userName: string, userEmail: string) => {
  const content = `
    <h1>¡Bienvenido a AgentHubs, ${userName}! 🎉</h1>
    <p>Estamos emocionados de tenerte a bordo. AgentHubs te ayudará a crear y gestionar asistentes virtuales inteligentes para tu negocio.</p>
    
    <div class="highlight-box">
      <strong>📧 Tu cuenta:</strong> ${userEmail}
    </div>

    <h2 style="font-size: 20px; color: #111827; margin-top: 30px;">¿Qué puedes hacer ahora?</h2>
    <ul style="color: #4b5563; padding-left: 20px;">
      <li style="margin-bottom: 8px;">✨ Crear tu primer agente virtual</li>
      <li style="margin-bottom: 8px;">📚 Subir documentos para entrenar a tu agente</li>
      <li style="margin-bottom: 8px;">🎨 Personalizar el widget de chat</li>
      <li style="margin-bottom: 8px;">💬 Monitorear conversaciones en tiempo real</li>
    </ul>

    <center>
      <a href="https://agenthubs.com/agents/create" class="button">
        Crear mi primer agente
      </a>
    </center>

    <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
      ¿Necesitas ayuda para empezar? Consulta nuestra 
      <a href="https://agenthubs.com/docs" style="color: #3B82F6; text-decoration: none;">documentación</a> 
      o contáctanos en support@agenthubs.com
    </p>
  `;

  return emailBaseTemplate(content, `¡Bienvenido a AgentHubs! Comienza a crear tu primer agente virtual.`);
};

// Template 2: New Message Notification
export const newMessageEmailTemplate = (
  ownerName: string,
  agentName: string,
  visitorName: string,
  visitorEmail: string,
  message: string,
  conversationId: string
) => {
  const content = `
    <h1>💬 Nuevo mensaje en ${agentName}</h1>
    <p>Hola ${ownerName}, tienes un nuevo mensaje de un visitante en tu widget de chat.</p>
    
    <div class="stats">
      <p style="margin: 0 0 8px 0;"><strong>De:</strong> ${visitorName}</p>
      <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${visitorEmail}</p>
      <p style="margin: 0;"><strong>Agente:</strong> ${agentName}</p>
    </div>

    <div class="highlight-box">
      <p style="margin: 0; font-style: italic;">"${message}"</p>
    </div>

    <center>
      <a href="https://agenthubs.com/conversations?id=${conversationId}" class="button">
        Ver conversación completa
      </a>
    </center>

    <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
      Responde desde el panel de conversaciones para dar seguimiento a este lead.
    </p>
  `;

  return emailBaseTemplate(content, `Nuevo mensaje de ${visitorName} en ${agentName}`);
};

// Template 3: New Conversation Started
export const newConversationEmailTemplate = (
  ownerName: string,
  agentName: string,
  visitorName: string,
  visitorEmail: string,
  conversationId: string
) => {
  const content = `
    <h1>🚀 Nueva conversación iniciada</h1>
    <p>Hola ${ownerName}, un visitante ha iniciado una nueva conversación con tu agente <strong>${agentName}</strong>.</p>
    
    <div class="stats">
      <p style="margin: 0 0 8px 0;"><strong>👤 Visitante:</strong> ${visitorName}</p>
      <p style="margin: 0 0 8px 0;"><strong>📧 Email:</strong> ${visitorEmail}</p>
      <p style="margin: 0;"><strong>🤖 Agente:</strong> ${agentName}</p>
    </div>

    <div class="highlight-box">
      <p style="margin: 0;">
        💡 <strong>Tip:</strong> Revisa la conversación para dar seguimiento y convertir este lead en cliente.
      </p>
    </div>

    <center>
      <a href="https://agenthubs.com/conversations?id=${conversationId}" class="button">
        Ver conversación
      </a>
    </center>

    <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
      Puedes configurar las notificaciones en tu 
      <a href="https://agenthubs.com/settings" style="color: #3B82F6; text-decoration: none;">configuración</a>.
    </p>
  `;

  return emailBaseTemplate(content, `Nueva conversación de ${visitorName} en ${agentName}`);
};

// Template 4: Low Credits Alert
export const lowCreditsEmailTemplate = (
  userName: string,
  currentBalance: number,
  threshold: number
) => {
  const percentage = Math.round((currentBalance / threshold) * 100);

  const content = `
    <h1>⚠️ Créditos bajos en tu cuenta</h1>
    <p>Hola ${userName}, tu balance de créditos está por debajo del umbral configurado.</p>
    
    <div class="stats">
      <div style="text-align: center;">
        <div style="font-size: 48px; font-weight: 700; color: #EF4444; margin-bottom: 8px;">
          ${currentBalance}
        </div>
        <p style="margin: 0; color: #6b7280;">créditos restantes</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #9ca3af;">
          Umbral configurado: ${threshold} créditos
        </p>
      </div>
    </div>

    <div class="highlight-box">
      <p style="margin: 0;">
        📊 <strong>Tu balance actual:</strong> ${percentage}% del umbral configurado<br>
        ⚡ <strong>Estado de agentes:</strong> Se pausarán automáticamente si llegas a 0 créditos
      </p>
    </div>

    <center>
      <a href="https://agenthubs.com/credits" class="button">
        Recargar créditos
      </a>
    </center>

    <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
      Puedes ajustar el umbral de notificación en tu 
      <a href="https://agenthubs.com/settings" style="color: #3B82F6; text-decoration: none;">configuración</a>.
    </p>
  `;

  return emailBaseTemplate(content, `⚠️ Solo te quedan ${currentBalance} créditos`);
};

// Template 4: Marketing/Newsletter
export const marketingEmailTemplate = (
  userName: string,
  subject: string,
  mainContent: string,
  ctaText: string,
  ctaUrl: string
) => {
  const content = `
    <h1>${subject}</h1>
    <p>Hola ${userName},</p>
    
    ${mainContent}

    <center>
      <a href="${ctaUrl}" class="button">
        ${ctaText}
      </a>
    </center>

    <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
      Este email se envió porque estás suscrito a actualizaciones de AgentHubs. 
      Puedes <a href="{{unsubscribe_url}}" style="color: #3B82F6; text-decoration: none;">cancelar tu suscripción</a> 
      en cualquier momento.
    </p>
  `;

  return emailBaseTemplate(content, subject);
};


// Template 5: Weekly Report
export const weeklyReportEmailTemplate = (
  userName: string,
  startDate: string,
  endDate: string,
  totalConversations: number,
  totalMessages: number,
  activeAgents: number,
  topAgentName: string,
  topAgentConversations: number
) => {
  const content = `
    <h1>📊 Tu Resumen Semanal</h1>
    <p>Hola ${userName}, aquí tienes el rendimiento de tus agentes en la última semana (${startDate} - ${endDate}).</p>
    
    <div class="stats" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
      <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #3B82F6;">${totalConversations}</div>
        <div style="font-size: 12px; color: #6b7280;">Conversaciones</div>
      </div>
      <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #10B981;">${totalMessages}</div>
        <div style="font-size: 12px; color: #6b7280;">Mensajes</div>
      </div>
      <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #8B5CF6;">${activeAgents}</div>
        <div style="font-size: 12px; color: #6b7280;">Agentes Activos</div>
      </div>
    </div>

    <div class="highlight-box">
      <h3 style="margin: 0 0 10px 0; font-size: 16px;">🏆 Agente Estrella</h3>
      <p style="margin: 0;">
        <strong>${topAgentName}</strong> lideró la semana con <strong>${topAgentConversations}</strong> conversaciones.
      </p>
    </div>

    <center>
      <a href="https://agenthubs.com/analytics" class="button">
        Ver reporte completo
      </a>
    </center>
  `;

  return emailBaseTemplate(content, `Resumen semanal: ${totalConversations} conversaciones y ${totalMessages} mensajes.`);
};

// Helper function to generate payload with template
export const generateEmailPayload = (
  type: 'welcome' | 'new_message' | 'new_conversation' | 'low_credits' | 'marketing' | 'weekly_report',
  data: any
) => {
  let htmlTemplate = '';
  let subject = '';

  switch (type) {
    case 'welcome':
      htmlTemplate = welcomeEmailTemplate(data.name, data.email);
      subject = '¡Bienvenido a AgentHubs!';
      break;

    case 'new_message':
      htmlTemplate = newMessageEmailTemplate(
        data.ownerName,
        data.agentName,
        data.visitorName,
        data.visitorEmail,
        data.message,
        data.conversationId
      );
      subject = `💬 Nuevo mensaje en ${data.agentName}`;
      break;

    case 'new_conversation':
      htmlTemplate = newConversationEmailTemplate(
        data.ownerName,
        data.agentName,
        data.visitorName,
        data.visitorEmail,
        data.conversationId
      );
      subject = `🚀 Nueva conversación en ${data.agentName}`;
      break;

    case 'low_credits':
      htmlTemplate = lowCreditsEmailTemplate(
        data.name,
        data.balance,
        data.threshold
      );
      subject = '⚠️ Alerta: Créditos bajos en tu cuenta';
      break;

    case 'marketing':
      htmlTemplate = marketingEmailTemplate(
        data.name,
        data.subject,
        data.content,
        data.ctaText || 'Leer más',
        data.ctaUrl || 'https://agenthubs.com'
      );
      subject = data.subject;
      break;

    case 'weekly_report':
      htmlTemplate = weeklyReportEmailTemplate(
        data.name,
        data.startDate,
        data.endDate,
        data.totalConversations,
        data.totalMessages,
        data.activeAgents,
        data.topAgentName,
        data.topAgentConversations
      );
      subject = `📊 Tu reporte semanal (${data.startDate} - ${data.endDate})`;
      break;
  }

  return {
    to: data.email,
    subject,
    html: htmlTemplate,
    ...data
  };
};
