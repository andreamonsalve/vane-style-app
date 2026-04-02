const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// ─── SMART CONNECT: DETECTAR MODELO DISPONIBLE ──────────
async function getBestAvailableModel(): Promise<string> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();
    
    if (!data.models || data.models.length === 0) {
      throw new Error('No se encontraron modelos disponibles en tu proyecto de Google Cloud.');
    }

    // Priorizamos nombres que contengan '1.5-flash'
    const bestModel = data.models.find((m: any) => 
      m.name.includes('gemini-1.5-flash') && m.supportedGenerationMethods.includes('generateContent')
    );

    if (bestModel) {
      console.log(`[Smart Connect] Modelo óptimo encontrado: ${bestModel.name}`);
      return bestModel.name;
    }

    // Si no, el primero que permita generar contenido
    const fallback = data.models.find((m: any) => m.supportedGenerationMethods.includes('generateContent'));
    if (fallback) {
      console.log(`[Smart Connect] Usando modelo de respaldo: ${fallback.name}`);
      return fallback.name;
    }

    throw new Error('Ninguno de tus modelos disponibles soporta generación de contenido.');
  } catch (e: any) {
    console.error('[Smart Connect] Error al detectar modelos:', e.message);
    // Si falla la detección, intentamos el nombre estándar como último recurso
    return 'models/gemini-1.5-flash';
  }
}

// ─── HELPER DE CONEXIÓN DIRECTA (REST) ───────────────────
async function callGeminiREST(prompt: string, imageBase64?: string) {
  if (!API_KEY) throw new Error('API Key no configurada');

  const modelName = await getBestAvailableModel();
  const apiVersions = ['v1beta', 'v1'];
  let lastError: any = null;

  for (const version of apiVersions) {
    try {
      console.log(`[REST API] Enviando petición a ${modelName} (${version})...`);
      
      const payload = {
        contents: [{
          parts: [
            { text: prompt },
            ...(imageBase64 ? [{ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }] : [])
          ]
        }]
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/${version}/${modelName}:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (response.ok) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          console.log(`[REST API] ¡ÉXITO!`);
          return text;
        }
      }

      console.warn(`[REST API] ${version} falló: ${data.error?.message || 'Sin mensaje'}`);
      lastError = new Error(data.error?.message || 'Error desconocido');
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError;
}

// ─── FACE ANALYSIS ───────────────────────────────────────
export interface FaceDiagnosis {
  faceType: string;
  features: {
    forehead: string;
    jawline: string;
    cheekbones: string;
    proportions: string;
  };
  recommendations: string[];
}

export async function analyzeFace(imageBase64: string): Promise<FaceDiagnosis> {
  const prompt = `Eres una asesora de imagen profesional. Analiza esta selfie y determina el tipo de rostro de la persona.
Clasifica en uno de estos tipos: Ovalado, Redondo, Cuadrado, Corazón, Oblongo, Diamante, Triángulo.
Responde SOLO con JSON válido, sin markdown, sin backticks:
{
  "faceType": "tipo de rostro",
  "features": {
    "forehead": "descripción",
    "jawline": "descripción",
    "cheekbones": "descripción",
    "proportions": "descripción"
  },
  "recommendations": ["rec 1", "rec 2", "rec 3"]
}`;

  try {
    const text = await callGeminiREST(prompt, imageBase64);
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    return JSON.parse(cleaned.substring(start, end + 1)) as FaceDiagnosis;
  } catch (error: any) {
    console.error('Error en analyzeFace:', error);
    if (error.message.includes('429')) {
      throw new Error('CUOTA_AGOTADA: Google ha limitado tu uso gratuito hoy. Intenta crear una nueva API Key en un proyecto nuevo o espera 24 horas.');
    }
    throw new Error('No se pudo analizar el rostro. Intenta con una foto más clara.');
  }
}

// ─── COLOR ANALYSIS ──────────────────────────────────────
export interface ColorDiagnosis {
  season: string;
  subSeason: string;
  undertone: string;
  palette: string[];
  avoidColors: string[];
  symbology: string;
}

export async function analyzeColor(imageBase64: string): Promise<ColorDiagnosis> {
  const prompt = `Analiza esta selfie y determina la colorimetría (12 estaciones). Responde SOLO con JSON:
{
  "season": "Estación",
  "subSeason": "Sub-estación",
  "undertone": "cálido/frío/neutro",
  "palette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5", "#hex6"],
  "avoidColors": ["#hex1", "#hex2", "#hex3"],
  "symbology": "Descripción"
}`;

  try {
    const text = await callGeminiREST(prompt, imageBase64);
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    return JSON.parse(cleaned.substring(start, end + 1)) as ColorDiagnosis;
  } catch (error) {
    throw new Error('No se pudo determinar tu colorimetría.');
  }
}

// ─── AUTO-CATEGORIZE CLOTHING ────────────────────────────
export interface ClothingCategory {
  name: string;
  category: string;
  subcategory: string;
  color: string;
}

export async function categorizeClothing(imageBase64: string): Promise<ClothingCategory> {
  const prompt = `Categoriza esta prenda. Responde SOLO con JSON:
  {"name": "nombre", "category": "Categoría", "subcategory": "Sub", "color": "color"}`;

  const text = await callGeminiREST(prompt, imageBase64);
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  return JSON.parse(cleaned.substring(start, end + 1)) as ClothingCategory;
}

// ─── CHATBOT ─────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chatWithVane(
  messages: ChatMessage[],
  userProfile?: { faceType?: string; season?: string; styleGoal?: string }
): Promise<string> {
  const systemPrompt = `Eres Vane, asesora de imagen. Habla en español, sé profesional y concisa. No uses emojis.
  Contexto: ${JSON.stringify(userProfile || {})}`;

  const prompt = `${systemPrompt}\n\nHistorial:\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}\nassistant:`;

  try {
    return await callGeminiREST(prompt);
  } catch (error) {
    return 'Lo siento, no pude procesar tu mensaje.';
  }
}


