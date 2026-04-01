import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!ai) {
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY is not configured. Add it to your .env file.');
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
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
  const genAI = getAI();
  
  const prompt = `Eres una asesora de imagen profesional. Analiza esta selfie y determina el tipo de rostro de la persona.

Clasifica en uno de estos tipos: Ovalado, Redondo, Cuadrado, Corazón, Oblongo, Diamante, Triángulo.

Responde SOLO con JSON válido, sin markdown, sin backticks, en este formato exacto:
{
  "faceType": "tipo de rostro",
  "features": {
    "forehead": "descripción breve de la frente",
    "jawline": "descripción breve de la mandíbula",
    "cheekbones": "descripción breve de los pómulos",
    "proportions": "descripción breve de las proporciones"
  },
  "recommendations": [
    "recomendación 1 sobre accesorios o peinados que favorecen",
    "recomendación 2",
    "recomendación 3"
  ]
}`;

  const response = await genAI.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
        ]
      }
    ]
  });

  const text = response.text?.trim() || '';
  // Remove potential markdown code blocks
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned) as FaceDiagnosis;
}

// ─── COLOR ANALYSIS ──────────────────────────────────────
export interface ColorDiagnosis {
  season: string;
  subSeason: string;
  undertone: string;
  palette: string[];      // hex colors that favor them
  avoidColors: string[];  // hex colors to avoid
  symbology: string;
}

export async function analyzeColor(imageBase64: string): Promise<ColorDiagnosis> {
  const genAI = getAI();
  
  const prompt = `Eres una asesora de imagen especializada en colorimetría personal y el sistema de 12 estaciones de color.

Analiza esta selfie y determina:
1. Subtono de piel (cálido, frío, neutro)
2. Estación de color (Primavera clara/cálida/brillante, Verano claro/suave/frío, Otoño suave/cálido/profundo, Invierno profundo/frío/brillante)
3. Paleta de colores que favorecen (6 colores en hex)
4. Colores a evitar (3 colores en hex)
5. Simbología: qué comunican los colores de su paleta ideal

Responde SOLO con JSON válido, sin markdown, sin backticks, en este formato exacto:
{
  "season": "nombre de la estación (ejemplo: Otoño)",
  "subSeason": "sub-estación (ejemplo: Otoño cálido)",
  "undertone": "cálido/frío/neutro",
  "palette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5", "#hex6"],
  "avoidColors": ["#hex1", "#hex2", "#hex3"],
  "symbology": "Descripción breve de lo que comunican los colores de su paleta ideal en términos de imagen personal y psicología del color"
}`;

  const response = await genAI.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
        ]
      }
    ]
  });

  const text = response.text?.trim() || '';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned) as ColorDiagnosis;
}

// ─── AUTO-CATEGORIZE CLOTHING ────────────────────────────
export interface ClothingCategory {
  name: string;
  category: string;
  subcategory: string;
  color: string;
}

export async function categorizeClothing(imageBase64: string): Promise<ClothingCategory> {
  const genAI = getAI();
  
  const prompt = `Eres una asesora de moda. Analiza esta foto de una prenda de ropa y categorízala.

Responde SOLO con JSON válido, sin markdown, sin backticks:
{
  "name": "nombre descriptivo corto de la prenda (ej: 'Blazer negro', 'Vestido floral')",
  "category": "una de: Tops, Bottoms, Dresses, Outerwear, Shoes, Accessories, Bags",
  "subcategory": "subcategoría específica (ej: 'Blazer', 'Jeans', 'Vestido midi')",
  "color": "color principal de la prenda"
}`;

  const response = await genAI.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
        ]
      }
    ]
  });

  const text = response.text?.trim() || '';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned) as ClothingCategory;
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
  const genAI = getAI();

  const systemPrompt = `Eres Vane, asesora de imagen personal con formación en psicología del color, simbología y comunicación no verbal. Tu enfoque es empoderar a las mujeres a vestirse con propósito, no solo por estética.

Tu estilo de comunicación:
- Cálida, profesional y editorial
- Das consejos prácticos y accionables  
- Hablas siempre en español
- Usas analogías del mundo de la moda editorial
- Nunca usas emojis
- Respondes de forma concisa pero profunda

${userProfile ? `
Contexto de la usuaria:
- Tipo de rostro: ${userProfile.faceType || 'No diagnosticado'}
- Estación de color: ${userProfile.season || 'No diagnosticada'}
- Objetivo de imagen: ${userProfile.styleGoal || 'No definido'}
` : ''}

Responde siempre en español. Sé concisa (máximo 3 párrafos).`;

  const contents = [
    {
      role: 'user' as const,
      parts: [{ text: systemPrompt }]
    },
    {
      role: 'model' as const,
      parts: [{ text: 'Entendido. Soy Vane, asesora de imagen. Estoy lista para ayudarte a vestir con propósito.' }]
    },
    ...messages.map(m => ({
      role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
      parts: [{ text: m.content }]
    }))
  ];

  const response = await genAI.models.generateContent({
    model: 'gemini-2.0-flash',
    contents
  });

  return response.text?.trim() || 'Lo siento, no pude procesar tu mensaje. Intenta de nuevo.';
}
