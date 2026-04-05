const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// ─── SMART CONNECT: DETECTAR MODELO DISPONIBLE ──────────
async function getBestAvailableModel(): Promise<string> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();
    
    if (!data.models || data.models.length === 0) {
      throw new Error('No se encontraron modelos disponibles en tu proyecto de Google Cloud.');
    }

    // Prioridad: gemini-2.5-flash > gemini-1.5-flash > cualquier modelo con generateContent
    const preferredModels = ['gemini-2.5-flash', 'gemini-1.5-flash'];
    
    for (const preferred of preferredModels) {
      const found = data.models.find((m: any) =>
        m.name.includes(preferred) && m.supportedGenerationMethods.includes('generateContent')
      );
      if (found) {
        console.log(`[Smart Connect] Modelo óptimo encontrado: ${found.name}`);
        return found.name;
      }
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
    // Si falla la detección, usamos gemini-1.5-flash como respaldo seguro
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

// ─── OUTFIT GENERATION ───────────────────────────────────
export interface OutfitSuggestion {
  name: string;
  itemIds: string[];
  reasoning: string;
  matchScore: number;
  missingItem?: { category: string; description: string };
}

function createFallbackSuggestions(
  anchor: { id: string; name: string; color: string },
  items: Array<{ id: string; name: string; category: string; color: string }>,
  occasion: string
): OutfitSuggestion[] {
  const bottoms = items.filter(i =>
    ['pantalón', 'falda', 'jeans', 'jean', 'bottom', 'skirt', 'pants'].some(k =>
      i.category?.toLowerCase().includes(k) || i.name?.toLowerCase().includes(k)
    )
  );
  const shoes = items.filter(i =>
    ['zapato', 'zapatilla', 'bota', 'shoe', 'boot', 'tenis', 'calzado', 'tacón'].some(k =>
      i.category?.toLowerCase().includes(k) || i.name?.toLowerCase().includes(k)
    )
  );
  const others = items.filter(i => !bottoms.includes(i) && !shoes.includes(i));

  const suggestions: OutfitSuggestion[] = [];

  const pool1 = [...(bottoms.slice(0, 1)), ...(shoes.slice(0, 1))];
  if (pool1.length > 0) {
    suggestions.push({
      name: 'Look clásico',
      itemIds: pool1.map(i => i.id),
      reasoning: `La combinación de ${anchor.color} con estas prendas crea un look equilibrado para ${occasion}.`,
      matchScore: 84,
    });
  }

  const pool2 = [...(bottoms.slice(1, 2)), ...(shoes.slice(1, 2)), ...(others.slice(0, 1))];
  if (pool2.length > 0) {
    suggestions.push({
      name: 'Look alternativo',
      itemIds: pool2.map(i => i.id),
      reasoning: 'Una combinación diferente que mantiene coherencia con tu paleta.',
      matchScore: 78,
    });
  }

  const pool3 = [...(others.slice(1, 2)), ...(bottoms.slice(2, 3)), ...(shoes.slice(2, 3))];
  const fallbackPool = pool3.length > 0 ? pool3 : items.slice(0, 2);
  if (suggestions.length < 3) {
    suggestions.push({
      name: 'Look casual',
      itemIds: fallbackPool.map(i => i.id),
      reasoning: 'Una opción relajada que funciona para el día a día.',
      matchScore: 72,
    });
  }

  return suggestions.slice(0, 3);
}

export async function generateOutfits(
  anchorItem: { id: string; name: string; category: string; color: string },
  otherItems: Array<{ id: string; name: string; category: string; color: string }>,
  occasion: string,
  diagnosis: { faceType?: string; colorSeason?: string; palette?: string[] }
): Promise<OutfitSuggestion[]> {
  const itemsList = otherItems
    .map(i => `ID:${i.id} | ${i.name} | ${i.category} | Color: ${i.color}`)
    .join('\n');

  const paletteStr = diagnosis.palette?.slice(0, 6).join(', ') || 'no definida';

  const prompt = `Eres Vane, asesora de imagen personal experta en estilismo y colorimetría.

PRENDA ANCLA (siempre incluida en todos los outfits):
ID:${anchorItem.id} | ${anchorItem.name} | ${anchorItem.category} | Color: ${anchorItem.color}

OTRAS PRENDAS DEL CLOSET (SOLO usa estas):
${itemsList || 'Sin otras prendas disponibles'}

OCASIÓN: ${occasion}
TEMPORADA DE COLOR: ${diagnosis.colorSeason || 'no definida'}
PALETA: ${paletteStr}

REGLAS:
- itemIds = solo IDs de prendas ADICIONALES (no incluir el ID de la ancla)
- Máximo 2 prendas adicionales por outfit
- 3 combinaciones claramente diferentes
- matchScore entre 70-99 según armonía de colores
- nombres cortos en español (2-3 palabras)
- reasoning: 1-2 oraciones directas y seguras, como lo diría Vane

Responde ÚNICAMENTE con JSON válido, sin markdown, sin texto extra:
[{"name":"Look X","itemIds":["id1","id2"],"reasoning":"texto directo","matchScore":95,"missingItem":{"category":"bolso","description":"Un bolso estructurado completaría el look"}}]`;

  try {
    const text = await callGeminiREST(prompt);
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1) throw new Error('No JSON array found');
    const parsed = JSON.parse(cleaned.substring(start, end + 1)) as OutfitSuggestion[];
    return parsed.slice(0, 3);
  } catch (error) {
    console.warn('[generateOutfits] AI failed, using fallback:', error);
    return createFallbackSuggestions(anchorItem, otherItems, occasion);
  }
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


