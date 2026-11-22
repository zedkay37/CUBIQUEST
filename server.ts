import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/codex/search', async (req, res) => {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    const teamSummary = typeof req.body?.teamSummary === 'string' ? req.body.teamSummary : '';
    const currentBiome = typeof req.body?.currentBiome === 'string' ? req.body.currentBiome : '';

    if (!query || query.length < 2) {
      return res.status(400).json({
        error: 'Veuillez saisir une question d’au moins 2 caractères pour le Professeur Cubix.',
      });
    }

    const ai = createGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error:
          'Clé API Gemini absente côté serveur. Vérifiez GEMINI_API_KEY dans les secrets de l’application.',
      });
    }

    const systemInstruction = [
      'Tu es le Professeur Cubix, expert des mécaniques de CubiQuest (escouade de 3 créatures voxel, Marmite à 5 ingrédients, Galets ATQ/PV, Runes d’Ampleur, de Cadence, de Force, de Partage, de Précision et de Vigueur, bouton Esquive contre les attaques annoncées).',
      'Réponds toujours en français clair, structuré et concis (maximum 180 mots, 3 à 4 points clés concrets).',
      'Appuie-toi sur la recherche Google pour donner des stratégies vérifiées (synergies d’éléments et de runes, tactiques de boss, ou anecdotes réelles sur la cuisine et la faune) et fais le pont avec l’équipe du joueur si pertinent.',
      'Ne mentionne jamais de clés API ni de détails techniques internes.',
    ].join(' ');

    const contextLine =
      teamSummary || currentBiome
        ? `\n\nContexte joueur actuel : Équipe = ${teamSummary || 'en formation'} ; Biome actif = ${currentBiome || 'Prairie Émeraude'}.`
        : '';

    let lastError: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `${query}${contextLine}`,
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });

        const text = (response.text ?? '').trim();
        const rawChunks =
          response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

        const seen = new Set<string>();
        const sources: { title: string; uri: string }[] = [];
        for (const chunk of rawChunks) {
          const uri = chunk.web?.uri;
          const title = chunk.web?.title || uri;
          if (uri && !seen.has(uri)) {
            seen.add(uri);
            sources.push({ title: title || 'Source web', uri });
          }
        }

        if (!text) {
          return res.status(502).json({
            error: 'Le Professeur Cubix n’a reçu aucune réponse exploitable. Réessayez.',
          });
        }

        return res.json({
          query,
          answer: text,
          sources: sources.slice(0, 5),
        });
      } catch (err: unknown) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        // Do not retry auth or invalid request errors
        if (/400|403|PERMISSION_DENIED|API_KEY_INVALID|NOT_FOUND/i.test(msg)) {
          break;
        }
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
      }
    }

    const message = lastError instanceof Error ? lastError.message : 'Erreur inconnue';
    const status = /429|RESOURCE_EXHAUSTED/i.test(message)
      ? 429
      : /403|PERMISSION_DENIED|API_KEY_INVALID/i.test(message)
        ? 403
        : 502;

    return res.status(status).json({
      error:
        status === 429
          ? 'Quota temporairement atteint pour le Codex en ligne. Patientez quelques instants avant de réessayer.'
          : status === 403
            ? 'Accès refusé par l’API Gemini. Vérifiez la clé API configurée dans Settings > Secrets.'
            : `Impossible de contacter la recherche Google pour le moment (${message.slice(0, 120)}).`,
    });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CubiQuest server running on http://localhost:${PORT}`);
  });
}

startServer();
