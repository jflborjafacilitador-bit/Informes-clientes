import { supabase } from './supabaseClient';

// ─── Config de entorno ────────────────────────────────────────────────────────
export const EVOLUTION_API_URL = import.meta.env.VITE_EVOLUTION_API_URL as string;
export const EVOLUTION_API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY as string;
export const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL as string;
export const WHATSAPP_WEBHOOK_URL = `${N8N_BASE_URL}/webhook/whatsapp-agent`;

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type WhatsappStatus = 'disconnected' | 'qr_ready' | 'connected' | 'error';

export interface WhatsappInstance {
  id: string;
  instance_name: string;
  phone_label: string;
  phone_number: string | null;
  status: WhatsappStatus;
  qr_code: string | null;
  evolution_instance_id: string | null;
  n8n_workflow_id: string | null;
  webhook_url: string | null;
  llms_context: string | null;
  ai_enabled: boolean;
  ai_model: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsappMessage {
  id: string;
  instance_id: string;
  phone_from: string;
  phone_name: string | null;
  message_in: string;
  message_out: string | null;
  responded_by: 'ai' | 'manual' | 'none';
  tokens_used: number | null;
  latency_ms: number | null;
  created_at: string;
}

export interface CreateInstanceData {
  instance_name: string;
  phone_label: string;
  llms_context?: string;
  ai_model?: string;
}

// ─── Headers de Evolution API ────────────────────────────────────────────────
const evolutionHeaders = () => ({
  'Content-Type': 'application/json',
  'apikey': EVOLUTION_API_KEY,
});

// ─── Evolution API ────────────────────────────────────────────────────────────
export const evolutionApi = {

  // Crear instancia en Evolution API
  async createInstance(instanceName: string): Promise<void> {
    const res = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers: evolutionHeaders(),
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: {
          url: WHATSAPP_WEBHOOK_URL,
          byEvents: false,
          base64: false,
          headers: {},
          events: ['MESSAGES_UPSERT'],
        },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Evolution API error: ${err}`);
    }
  },

  // Obtener QR para conectar
  async getQRCode(instanceName: string): Promise<string> {
    const res = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: evolutionHeaders(),
    });
    if (!res.ok) throw new Error('No se pudo obtener el QR');
    const json = await res.json();
    // v2 devuelve { code, base64 } o { qrcode: { base64 } }
    return json.base64 ?? json.qrcode?.base64 ?? json.code ?? '';
  },

  // Verificar estado de conexión
  async getConnectionState(instanceName: string): Promise<'open' | 'close' | 'connecting'> {
    try {
      const res = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: evolutionHeaders(),
      });
      if (!res.ok) return 'close';
      const json = await res.json();
      return json.instance?.state ?? json.state ?? 'close';
    } catch {
      return 'close';
    }
  },

  // Desconectar instancia
  async logoutInstance(instanceName: string): Promise<void> {
    await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: evolutionHeaders(),
    });
  },

  // Eliminar instancia de Evolution API
  async deleteInstance(instanceName: string): Promise<void> {
    await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: evolutionHeaders(),
    });
  },

  // Enviar mensaje de texto (para pruebas desde el panel)
  async sendTextMessage(instanceName: string, phone: string, text: string): Promise<void> {
    await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: evolutionHeaders(),
      body: JSON.stringify({
        number: phone,
        options: { delay: 1200, presence: 'composing' },
        textMessage: { text },
      }),
    });
  },
};

// ─── Supabase Service ─────────────────────────────────────────────────────────
export const whatsappService = {

  // Obtener todas las instancias
  async getInstances(): Promise<WhatsappInstance[]> {
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data as WhatsappInstance[];
  },

  // Obtener una instancia
  async getInstance(id: string): Promise<WhatsappInstance | null> {
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as WhatsappInstance;
  },

  // Crear nueva instancia (Supabase + Evolution API)
  async createInstance(payload: CreateInstanceData): Promise<WhatsappInstance> {
    const { data: userData } = await supabase.auth.getUser();
    const instanceName = payload.instance_name.toLowerCase().replace(/\s+/g, '-');

    // 1. Crear en Evolution API
    await evolutionApi.createInstance(instanceName);

    // 2. Guardar en Supabase
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .insert({
        instance_name: instanceName,
        phone_label: payload.phone_label,
        llms_context: payload.llms_context ?? DEFAULT_LLMS_CONTEXT,
        ai_model: payload.ai_model ?? 'deepseek-chat',
        webhook_url: WHATSAPP_WEBHOOK_URL,
        status: 'disconnected',
        ai_enabled: false,
        created_by: userData.user?.id ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as WhatsappInstance;
  },

  // Actualizar instancia
  async updateInstance(id: string, updates: Partial<WhatsappInstance>): Promise<void> {
    const { error } = await supabase
      .from('whatsapp_instances')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  // Eliminar instancia (Evolution API + Supabase)
  async deleteInstance(id: string, instanceName: string): Promise<void> {
    await evolutionApi.deleteInstance(instanceName).catch(() => {});
    await supabase.from('whatsapp_messages').delete().eq('instance_id', id);
    const { error } = await supabase.from('whatsapp_instances').delete().eq('id', id);
    if (error) throw error;
  },

  // Toggle AI
  async toggleAI(id: string, enabled: boolean): Promise<void> {
    await whatsappService.updateInstance(id, { ai_enabled: enabled });
  },

  // Guardar contexto LLMS
  async saveContext(id: string, context: string): Promise<void> {
    await whatsappService.updateInstance(id, { llms_context: context });
  },

  // Obtener messages de una instancia
  async getMessages(instanceId: string, limit = 50): Promise<WhatsappMessage[]> {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('instance_id', instanceId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as WhatsappMessage[];
  },

  // Suscripción Realtime a cambios de instancias
  subscribeToInstances(callback: (instances: WhatsappInstance[]) => void) {
    const channel = supabase
      .channel('wa_instances_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_instances' },
        async () => {
          const instances = await whatsappService.getInstances();
          callback(instances);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  },

  // Suscripción Realtime a mensajes nuevos
  subscribeToMessages(instanceId: string, callback: (msg: WhatsappMessage) => void) {
    const channel = supabase
      .channel(`wa_messages_${instanceId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'whatsapp_messages',
        filter: `instance_id=eq.${instanceId}`,
      }, (payload) => callback(payload.new as WhatsappMessage))
      .subscribe();
    return () => supabase.removeChannel(channel);
  },
};

// ─── Contexto LLMS por defecto ────────────────────────────────────────────────
export const DEFAULT_LLMS_CONTEXT = `[OBJECTIVE] Representar a Residencial Los Quetzales como un Anfitrión Local Experto. Tu meta es perfilar leads (presupuesto, crédito, tiempo) y agendar citas presenciales en HighLevel, vendiendo una "experiencia de vida" y no solo una casa.

[LIFESTYLE NARRATIVE - EL GANCHO]
El Despertar: Aire limpio, vista a los volcanes y paz absoluta en Ayala.
Planes Locales: Desayuno de cecina en el centro, tardes en Agua Hedionda o visitas al Museo Casa Zapata.
Conectividad: Plaza Atrios a 15 min, pero con el sabor local del tamal de bagre en "La Curva".

[KNOWLEDGE BASE: INVENTARIO 2026]

📍 MANZANA 2 (Entrega Inmediata):
Quetzal (2 Niv): Austera $1.456M | Aust. Elite $1.545M | Equipada $1.587M | Eq. Elite $1.676M
Quetzal Plus (3 Niv): Austera $1.768M | Aust. Elite $1.857M | Equipada $1.943M | Eq. Elite $2.032M

📍 MANZANA 3 (PREVENTA - Agosto 2026):
Quetzal: Austera $1.503M | Aust. Elite $1.590M | Equipada $1.620M | Eq. Elite $1.689M
Quetzal Roof Garden: Austera $1.687M | Aust. Elite $1.774M | Equipada $1.752M | Eq. Elite $1.839M
Quetzal Plus: Austera $1.807M | Aust. Elite $1.895M | Equipada $1.966M | Eq. Elite $2.053M
Quetzal Plus F.A. (Frente Alberca): Austera $1.837M | Aust. Elite $1.925M | Equipada $1.976M | Eq. Elite $2.083M

[DEFINICIÓN DE EQUIPAMIENTO]
Austera: Tarja básica y ventiladores.
Equipada: Cocina Plus (granito), closets, persianas, cancel en baño de recamara principal.
Elite: Agrega una recámara extra en Planta Baja (Total: hasta 4 recámaras).

[AMENIDADES GLOBALES DEL DESARROLLO]
Seguridad: 24/7, Circuito Cerrado (CCTV), acceso con Tag y portón eléctrico.
Deporte/Social: Pet Park, Ciclopista, Cancha usos múltiples, Gym aire libre, Juegos infantiles, Alberca por privada, palapas y asadores.

[REGLAS DE NEGOCIO Y OBJECIONES]
- En presupuestos menores de 1,000,000, confirma cuanto gana mensualmente, si gana menos de 30,000 pesos mensuales, oferta las opciones de juntar créditos.
- Si te dan un presupuesto verifica si es contado o un esquema de financiamiento, no ofrezcas viviendas por encima del presupuesto salvo que el cliente lo pida, busca si el cliente quiere usar la opción de Mifel para incrementarlo.
- Filtro de Precio: Anclaje inicial en $1.6 MDP.
- Escrituración: Informar siempre que es un aproximado del 5% al 7% del valor.
- Financiamiento: Infonavit (Total, Cofinavit, Unamos), Fovissste, Bancarios, Contado (10% apartado). PROHIBIDO: Infonavit Tradicional.
- Ubicación: Enviar siempre: https://maps.app.goo.gl/UyYBgGzc6p6HkLch6
- Objeción Distancia: "Es la distancia perfecta para desconectarte del caos sin perder servicios de lujo".

[CONVERSATION LOGIC & HIGHLEVEL FLOW]
Interacción: Mensajes cortos (<20 palabras), naturales, estilo WhatsApp.
Perfilamiento: Haz 1 pregunta por mensaje (¿Uso? -> ¿Presupuesto? -> ¿Crédito? -> ¿Tiempo?).
Cierre de Cita: Al agendar, solicita que el cliente confirme día y hora. Nota Obligatoria: "Dime el día y la hora para dejar la nota en el sistema y que el asesor te reciba con la ubicación exacta".

[RECURSOS]
- Catálogo: https://marea.pro/joseph-borja-asesor
- Recorrido Quetzal: https://my.matterport.com/show/?m=gmCEbVbLvKr
- Recorrido Plus: https://my.matterport.com/show/?m=Z7yHuZ1yPye

[GUARDRAILS]
- Las oficinas son en la ubicación del residencial.
- Cada cerrada en Residencial Los Quetzales tiene entre 60 y 70 viviendas aproximadamente.
- Siempre que pidan la ubicación envíala sin excepciones.
- Los horarios para agendar citas solo son de 10:00 am a 4:00 pm de lunes a domingos.
- Quetzal (2 rec. / Elite 3) vs Quetzal Plus (3 rec. / Elite 4).
- El roof garden es solo para versión Quetzal; Quetzal Plus NO tiene roof garden.
- No inventes precios. Si el dato es ultra específico, deriva al "compañero experto".
- Nunca pidas el WhatsApp (ya estás hablando por ahí).
- La preventa se entrega en Agosto 2026.

[CRÉDITO MIFEL 2026 - CAMPAÑA AÑO NUEVO]
- Vigencia: Hasta el 27 de febrero de 2026.
- Tasa: 9.70% fija preferencial. 0% Comisión por Apertura.
- Financiamiento: Hasta 90% (Tradicional) o 97% (Cofinavit/Apoyo Infonavit).
- Perfil: 21-69 años. Suma edad + plazo < 80 años.
- Seguros: Vida, Daños y Desempleo (para asalariados).
- Restricción: No se aceptan firmas digitales ni documentos editados digitalmente.`;
