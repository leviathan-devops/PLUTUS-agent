// plutus-omni-vision — v4 Dual-Mode Multimodal Perception
// Cloned from Omni Vision Tool v4.0 ship package.
//
// MODE 1 (direct) — Extract media to images, chain batch-read via tool.execute.after
//   Video → ffmpeg scene detection → keyframe PNGs → hook injects batch-read directive
//   PDF   → pdftoppm               → page PNGs   → hook injects batch-read directive
//   Image → single: read tool, multi: batch tool  → hook injects explicit tool call
//   Audio → MiMo API call (no native audio pipeline)
//
// MODE 2 (api) — MiMo Direct API for ALL media types (text-only model fallback)
//   Image → image_url, Video → video_url, Audio → input_audio, PDF → image conversion
//
// CHAIN MECHANISM:
//   plutusOmniVisionAfterHook modifies the tool output to inject an EXPLICIT tool call
//   directive (e.g. `read({filePath: "..."})` or `batch({tool_calls: [...]})`).
//   The agent reads this and executes it immediately — no decision, no delay.

import { tool } from '@opencode-ai/plugin';

const z = tool.schema;

// ── MiMo API Config (mode: "api" fallback) ──
const MIMO_ENDPOINT = 'https://opencode.ai/zen/go/v1/chat/completions';
function mimoApiKey(): string {
  const k = process.env.OPENCODE_API_KEY ?? process.env.OPENCODE_GO_KEY ?? process.env.MIMO_API_KEY;
  if (!k) throw new Error("PLUTUS-VISION: OPENCODE_API_KEY env is not set");
  return k;
}
const MIMO_MODEL = 'mimo-v2.5';

// ── Media Type Detection ──
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.avi', '.mov', '.mkv']);
const AUDIO_EXTS = new Set(['.mp3', '.wav', '.flac', '.m4a', '.ogg']);
const PDF_EXTS = new Set(['.pdf']);

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime', '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.flac': 'audio/flac',
  '.m4a': 'audio/mp4', '.ogg': 'audio/ogg',
  '.pdf': 'application/pdf',
};

type MediaType = 'image' | 'video' | 'audio' | 'pdf';

function detectMediaType(filePath: string): MediaType | null {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (VIDEO_EXTS.has(ext)) return 'video';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  if (PDF_EXTS.has(ext)) return 'pdf';
  return null;
}

function getMime(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

// ── File I/O ──
function encodeBase64(filePath: string): string {
  const fs = require('node:fs');
  return fs.readFileSync(filePath).toString('base64');
}

function fileExists(filePath: string): boolean {
  try {
    const fs = require('node:fs');
    return fs.existsSync(filePath);
  } catch { return false; }
}

// ── ffmpeg Scene-Change Keyframe Extraction ──
function extractVideoFrames(videoPath: string, threshold: number, maxFrames: number): string[] {
  const { execSync } = require('node:child_process');
  const path = require('node:path');
  const os = require('node:os');
  const fs = require('node:fs');

  const tmpDir = path.join(os.tmpdir(), `omni-vision-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    execSync('which ffmpeg', { stdio: 'pipe', timeout: 5000 });
  } catch {
    console.error('[plutus-omni-vision] ffmpeg not found, auto-installing...');
    try {
      execSync('apt-get update -qq && apt-get install -y -qq ffmpeg', { timeout: 120000, stdio: 'pipe' });
    } catch {
      return [];
    }
  }

  // Scene detection: select frames where scene change exceeds threshold
  // Progressive: try user threshold, half, then ultra-sensitive (0.01)
  // Default 0.01 catches every candle change in TradingView chart replays
  const framePattern = path.join(tmpDir, 'frame-%04d.png');
  const sceneFilters = [threshold, threshold * 0.5, 0.01]; // Try user threshold, half, then ultra-sensitive
  let frames: string[] = [];

  for (const st of sceneFilters) {
    const select = `select='gt(scene\\,${st})',setpts=N/(25*TB)`;
    try {
      execSync(
        `ffmpeg -i "${videoPath}" -vf "${select}" -vsync vfr -frames:v ${maxFrames} -y "${framePattern}"`,
        { timeout: 180000, stdio: 'pipe' }
      );
      frames = fs.readdirSync(tmpDir)
        .filter((f: string) => f.startsWith('frame-') && f.endsWith('.png'))
        .sort()
        .map((f: string) => path.join(tmpDir, f));
      if (frames.length >= 3) break; // Enough frames found
      // Clean up, try more sensitive
      frames.forEach((f: string) => { try { fs.unlinkSync(f); } catch { /* best-effort cleanup */ } });
    } catch { continue; }
  }

  // Fallback: 1fps if scene detection yielded too few frames (static video)
  if (frames.length < 3) {
    frames.forEach((f: string) => { try { fs.unlinkSync(f); } catch { /* best-effort cleanup */ } });
    try {
      execSync(
        `ffmpeg -i "${videoPath}" -vf "fps=1,scale='min(1280,iw)':-2" -frames:v ${maxFrames} -y "${framePattern}"`,
        { timeout: 120000, stdio: 'pipe' }
      );
      frames = fs.readdirSync(tmpDir)
        .filter((f: string) => f.startsWith('frame-') && f.endsWith('.png'))
        .sort()
        .map((f: string) => path.join(tmpDir, f));
    } catch { return []; }
  }

  return frames;
}

// ── PDF to Images (via pdftoppm) ──
function convertPdfToImages(pdfPath: string, maxPages: number): string[] {
  const { execSync } = require('node:child_process');
  const path = require('node:path');
  const os = require('node:os');
  const fs = require('node:fs');

  const tmpDir = path.join(os.tmpdir(), `omni-pdf-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const prefix = path.join(tmpDir, 'page');

  try {
    execSync('which pdftoppm', { stdio: 'pipe', timeout: 5000 });
  } catch {
    try {
      execSync('apt-get update -qq && apt-get install -y -qq poppler-utils', { timeout: 60000, stdio: 'pipe' });
    } catch { return []; }
  }

  try {
    execSync(`pdftoppm -png -r 150 -l ${maxPages} "${pdfPath}" "${prefix}"`, { timeout: 60000, stdio: 'pipe' });
  } catch { return []; }

  return fs.readdirSync(tmpDir)
    .filter((f: string) => f.startsWith('page-') && f.endsWith('.png'))
    .sort((a: string, b: string) => {
      const na = parseInt(a.match(/\d+/)?.[0] || '0', 10);
      const nb = parseInt(b.match(/\d+/)?.[0] || '0', 10);
      return na - nb;
    })
    .map((f: string) => path.join(tmpDir, f));
}

// ── MiMo Direct API (mode: "api" fallback for all types) ──
async function callMiMoDirect(
  mediaType: MediaType,
  base64Data: string,
  mime: string,
  prompt: string,
  fps: number = 2,
): Promise<string> {
  let contentParts: any[];

  if (mediaType === 'image') {
    contentParts = [
      { type: 'image_url', image_url: { url: `data:${mime};base64,${base64Data}` } },
      { type: 'text', text: prompt },
    ];
  } else if (mediaType === 'video') {
    contentParts = [
      { type: 'video_url', video_url: { url: `data:${mime};base64,${base64Data}` }, fps, media_resolution: 'default' },
      { type: 'text', text: prompt },
    ];
  } else if (mediaType === 'audio') {
    const audioFormat = mime.includes('mpeg') ? 'mp3' : mime.includes('wav') ? 'wav' : mime.includes('flac') ? 'flac' : 'mp3';
    contentParts = [
      { type: 'input_audio', input_audio: { data: base64Data, format: audioFormat } },
      { type: 'text', text: prompt },
    ];
  } else {
    contentParts = [
      { type: 'image_url', image_url: { url: `data:${mime};base64,${base64Data}` } },
      { type: 'text', text: prompt },
    ];
  }

  const response = await fetch(MIMO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${mimoApiKey()}`,
      'User-Agent': 'opencode/1.14.43',
    },
    body: JSON.stringify({
      model: MIMO_MODEL,
      messages: [{ role: 'user', content: contentParts }],
      max_tokens: 128000,
      temperature: 0.1,
    })});

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`MiMo API ${response.status}: ${errText.substring(0, 300)}`);
  }

  const data: any = await response.json();
  return data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message?.reasoning_content || '';
}

// ── Parse file_path: string or string[] ──
function resolveFilePaths(input: string | string[]): string[] {
  if (Array.isArray(input)) return input;
  // If comma-separated, split and trim
  if (input.includes(',')) return input.split(',').map((s: string) => s.trim());
  return [input];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL: plutus-omni-vision
// ═══════════════════════════════════════════════════════════════════════════════

export const plutusOmniVisionTool: ReturnType<typeof tool> = tool({
  description: `plutus-omni-vision: Process media in two modes.

MODE 1 (direct — default): Direct read into your context.
  Video → Scene-detection keyframe extraction → batch-read all frames
  PDF   → pdftoppm page conversion → batch-read all pages
  Image → single: read() directly | multi: batch(read()) all at once
  Audio → API transcription (text summary)
  ⚠ Requires a multimodal model (MiMo, GPT-4V, Gemini). If using a text-only model
    (DeepSeek, etc.), call with mode="api" instead.

MODE 2 (api): MiMo API call — text summary returned. Works with ANY model.
  Sends the media directly to MiMo v2.5 and returns a description.
  No frames enter your context — you get a text summary.
  Use this when your model doesn't support image/video processing.

Params:
  file_path: Path to media file. For multiple images, pass array or comma-separated.
  mode: "direct" (default) | "api"
  prompt: (API mode only) What to analyze.
  scene_threshold: Scene-change sensitivity 0.01-0.9 (default 0.01).
  max_pages: Max PDF pages to convert (default 10).`,

  args: {
    file_path: z.union([z.string(), z.array(z.string())]).describe(
      'Absolute path to the media file(s). For multiple images, pass an array: ["file1.png", "file2.png"]'
    ),
    prompt: z.string().optional().describe('Required for API mode. Ignored in direct mode.'),
    mode: z.enum(['direct', 'api']).optional().describe('"direct" (default): load into context. "api": MiMo text summary'),
    scene_threshold: z.number().optional().describe('Video: scene-change sensitivity 0.01-0.9 (default 0.01). Lower = more frames.'),
    max_pages: z.number().optional().describe('PDF: max pages to convert (default 10)'),
    fps: z.number().optional().describe('Video: fallback fps if scene detection fails (default 2)'),
  },

  async execute(args: {
    file_path: string | string[];
    prompt?: string;
    mode?: string;
    scene_threshold?: number;
    max_pages?: number;
    fps?: number;
  }) {
    const mode = args.mode || 'direct';
    const paths = resolveFilePaths(args.file_path);

    // Validate all files exist
    const missing = paths.filter((p: string) => !fileExists(p));
    if (missing.length > 0) {
      return `ERROR: Files not found:\n${missing.join('\n')}`;
    }

    // Detect media type from first file
    const mediaType = detectMediaType(paths[0]);
    if (!mediaType) {
      return `ERROR: Unsupported format. Supported: image, video, audio, PDF.`;
    }

    // ── MODE 2: API FALLBACK ──
    if (mode === 'api') {
      const prompt = args.prompt;
      if (!prompt) return `ERROR: prompt is required for API mode. Pass a text description of what to analyze.`;
      // Single file API calls — same as v2 architecture
      if (mediaType === 'pdf') {
        // PDF: convert to images, send to MiMo
        const pages = convertPdfToImages(paths[0], args.max_pages ?? 10);
        if (pages.length === 0) return `ERROR: PDF conversion failed.`;
        const results: string[] = [];
        for (let i = 0; i < pages.length; i++) {
          const b64 = encodeBase64(pages[i]);
          const r = await callMiMoDirect('image', b64, 'image/png',
            `${prompt} (page ${i + 1} of ${pages.length})`);
          results.push(`--- Page ${i + 1} ---\n${r}`);
        }
        return results.join('\n\n');
      }

      // All other types: single file MiMo call
      const fps = args.fps ?? 2;
      const base64 = encodeBase64(paths[0]);
      const mime = getMime(paths[0]);
      if (mediaType === 'audio') return callMiMoDirect(mediaType, base64, mime, prompt);
      if (paths.length > 1 && mediaType === 'image') {
        // Multi-image API mode: send ALL images in one MiMo call
        const contentParts: any[] = paths.map((p: string) => ({
          type: 'image_url' as const,
          image_url: { url: `data:${getMime(p)};base64,${encodeBase64(p)}` },
        }));
        contentParts.push({ type: 'text' as const, text: prompt });
        const response = await fetch(MIMO_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mimoApiKey()}`,
            'User-Agent': 'opencode/1.14.43',
          },
          body: JSON.stringify({
            model: MIMO_MODEL,
            messages: [{ role: 'user', content: contentParts }],
            max_tokens: 128000,
            temperature: 0.1,
          }),
        });
        if (!response.ok) {
          const errText = await response.text().catch(() => response.statusText);
          throw new Error(`MiMo API ${response.status}: ${errText.substring(0, 300)}`);
        }
        const data: any = await response.json();
        return data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message?.reasoning_content || '';
      }
      return callMiMoDirect(mediaType, base64, mime, prompt, fps);
    }

    // ── MODE 1: DIRECT READ ──

    // VIDEO: Scene-detection keyframe extraction
    if (mediaType === 'video') {
      const threshold = args.scene_threshold ?? 0.01;
      // No frame limit — extract every meaningful scene change.
      // The only practical limit is the video file size (max 300MB for MiMo).
      const maxFrames = 9999;
      const frames = extractVideoFrames(paths[0], threshold, maxFrames);
      if (frames.length === 0) {
        return `ERROR: ffmpeg extraction failed. Ensure ffmpeg is installed.`;
      }
      return JSON.stringify({
        status: 'success',
        mode: 'direct',
        mediaType: 'video',
        sourceFile: paths[0],
        frameCount: frames.length,
        frames,
      });
    }

    // PDF: pdftoppm page conversion
    if (mediaType === 'pdf') {
      const pages = convertPdfToImages(paths[0], args.max_pages ?? 10);
      if (pages.length === 0) {
        return `ERROR: PDF conversion failed. Ensure poppler-utils is installed.`;
      }
      return JSON.stringify({
        status: 'success',
        mode: 'direct',
        mediaType: 'pdf',
        sourceFile: paths[0],
        frameCount: pages.length,
        frames: pages,
      });
    }

    // IMAGE: single or batch — smart detection
    if (mediaType === 'image') {
      // For images, the frames ARE the input files themselves
      return JSON.stringify({
        status: 'success',
        mode: 'direct',
        mediaType: 'image',
        frameCount: paths.length,
        frames: paths,
      });
    }

    // AUDIO: no native audio pipeline, API call
    if (mediaType === 'audio') {
      try {
        const base64 = encodeBase64(paths[0]);
        const mime = getMime(paths[0]);
        const audioPrompt = args.prompt || 'Transcribe and describe this audio.';
        const result = await callMiMoDirect('audio', base64, mime, audioPrompt);
        if (result && result.trim().length > 0) return result;
        return `ERROR: Audio processing returned empty result.`;
      } catch (e: any) {
        return `ERROR processing audio: ${e.message}`;
      }
    }

    return `ERROR: Unreachable code path.`;
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN HOOK: tool.execute.after
// ═══════════════════════════════════════════════════════════════════════════════
// Injects an EXPLICIT tool call directive into the tool output.
// The agent must call the specified tool immediately — no decision, no delay.
// Register this in the main plugin as: 'tool.execute.after': plutusOmniVisionAfterHook

export async function plutusOmniVisionAfterHook(event: any, output: any) {
  if (event?.tool !== 'plutus-omni-vision') return;

  let result: any;
  try {
    result = JSON.parse(output.output);
  } catch {
    return; // Not JSON (e.g., error string, audio result) — pass through
  }

  // Only chain for direct-mode results with frames
  if (result.mode !== 'direct') return;
  if (!result.frames || result.frames.length === 0) return;
  if (result.mediaType === 'audio') return;

  const count = result.frames.length;

  // Build explicit tool call directive
  if (count === 1) {
    // Single: use read() directly
    const toolCall = `read({filePath: "${result.frames[0].replace(/"/g, '\\"')}"})`;
    output.output = JSON.stringify({
      ...result,
      directive: `CALL THIS TOOL NOW (do not respond, do not explain):\n` + toolCall,
    }, null, 2);

  } else if (count <= 25) {
    // One batch call covers all frames
    const batchCalls = result.frames.map((f: string) =>
      `{tool: "read", parameters: {filePath: "${f.replace(/"/g, '\\"')}"}}`
    );
    const batchCall = `batch({tool_calls: [\n  ${batchCalls.join(',\n  ')}\n]})`;
    output.output = JSON.stringify({
      ...result,
      directive: `CALL THIS TOOL NOW (do not respond, do not explain):\n` + batchCall,
    }, null, 2);

  } else {
    // More than 25 — split into sequential batch calls (25 per batch)
    const chunks: string[][] = [];
    for (let i = 0; i < result.frames.length; i += 25) {
      chunks.push(result.frames.slice(i, i + 25));
    }
    const batchDirectives = chunks.map((chunk, idx) => {
      const calls = chunk.map((f: string) =>
        `{tool: "read", parameters: {filePath: "${f.replace(/"/g, '\\"')}"}}`
      );
      return `Batch ${idx + 1}/${chunks.length}: batch({tool_calls: [\n  ${calls.join(',\n  ')}\n]})`;
    });
    output.output = JSON.stringify({
      ...result,
      directive: `CALL THESE TOOLS SEQUENTIALLY (do not respond, do not explain between them):\n\n` +
                 batchDirectives.join('\n\n'),
    }, null, 2);
  }
}
