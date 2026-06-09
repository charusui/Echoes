import { GoogleGenAI } from '@google/genai';
import type {
  ActiveInstrumentProfile,
  InstrumentProfile,
  AcousticProfile,
  InputMapping,
  InstrumentCategory,
  PipelineStatus,
} from '../types';
import { GEMINI_MODEL, FALLBACK_PROFILES } from '../constants';

// ─── Pipeline Controller ───────────────────────────────────────────────────────

type StatusCallback = (status: PipelineStatus) => void;

export async function initializeInstrumentPipeline(
  imageBase64: string,
  imageMimeType: string,
  client: GoogleGenAI,
  onStatus: StatusCallback,
): Promise<ActiveInstrumentProfile> {

  const updateStatus = (
    phase: PipelineStatus['phase'],
    label: string,
    detail: string,
    progress: number,
  ) => onStatus({ phase, label, detail, progress });

  // ── Phase 1: Vision + Cultural Research ───────────────────────────────────

  updateStatus('phase1-vision', '[ SCANNING INSTRUMENT ]', 'Identifying instrument via Gemini Vision...', 10);

  let isFallback = false;
  let instrument: InstrumentProfile;
  try {
    instrument = await runPhase1(client, imageBase64, imageMimeType);
    if (!instrument.name || instrument.name.toLowerCase().includes('n/a') || instrument.name.toLowerCase().includes('unknown') || instrument.name === 'NOT_AN_INSTRUMENT') {
      throw new Error("NOT_AN_INSTRUMENT");
    }
    updateStatus('phase1-vision', '[ SCANNING INSTRUMENT ]', `Identified: ${instrument.name}`, 25);
  } catch (err) {
    console.warn('[Pipeline] Phase 1 failed, using fallback:', err);
    updateStatus('phase1-vision', '[ SCANNING INSTRUMENT ]', 'Using fallback profile (Kulintang)', 25);
    const reason = err instanceof Error && err.message === 'NOT_AN_INSTRUMENT' ? 'not-instrument' : 'error';
    return { ...FALLBACK_PROFILES.percussion, imageBase64, imageMimeType, isFallback: true, fallbackReason: reason };
  }

  // ── Phases 2 + 3: Run in Parallel ────────────────────────────────────────

  updateStatus('phase2-acoustic', '[ EXTRACTING AUDIO TIMBRE ]', 'Modeling acoustic and control matrix...', 35);

  let acoustic: AcousticProfile;
  let inputMapping: InputMapping;

  try {
    [acoustic, inputMapping] = await Promise.all([
      runPhase2(client, instrument),
      runPhase3(client, instrument),
    ]);
    updateStatus('phase3-mapping', '[ MAPPING CONTROLS ]', 'Lane configuration ready', 65);
  } catch (err) {
    console.warn('[Pipeline] Phase 2/3 failed, using fallback:', err);
    const fallback = FALLBACK_PROFILES[instrument.category] ?? FALLBACK_PROFILES.percussion;
    acoustic = fallback.acoustic;
    inputMapping = fallback.inputMapping;
    isFallback = true;
    updateStatus('phase3-mapping', '[ MAPPING CONTROLS ]', 'Using fallback audio profile', 65);
  }

  // ── Phase 4: Cultural Guardrail ───────────────────────────────────────────

  updateStatus('phase4-guardrail', '[ DEPLOYING GUARDRAILS ]', 'Verifying cultural integrity...', 75);

  try {
    const corrected = await runPhase4(client, instrument, acoustic);
    acoustic = corrected;
    updateStatus('phase4-guardrail', '[ DEPLOYING GUARDRAILS ]', 'Scale integrity verified', 88);
  } catch (err) {
    console.warn('[Pipeline] Phase 4 failed, skipping correction:', err);
    updateStatus('phase4-guardrail', '[ DEPLOYING GUARDRAILS ]', 'Guardrail skipped — using as-is', 88);
  }

  // ── Phase 5: Fuse ─────────────────────────────────────────────────────────

  updateStatus('phase5-fuse', '[ SYNTHESIZING PROFILE ]', 'Fusing all data streams...', 95);

  const profile: ActiveInstrumentProfile = {
    instrument,
    acoustic,
    inputMapping,
    imageBase64,
    imageMimeType,
    isFallback,
  };

  updateStatus('complete', '[ INSTRUMENT READY ]', `${instrument.name} profile loaded!`, 100);

  return profile;
}

// ─── Phase 1: Instrument Identification ───────────────────────────────────────

async function runPhase1(
  client: GoogleGenAI,
  imageBase64: string,
  imageMimeType: string,
): Promise<InstrumentProfile> {
  const schema = {
    type: 'object',
    properties: {
      name:                 { type: 'string' },
      localName:            { type: 'string' },
      ethnoLinguisticGroup: { type: 'string' },
      hornbostelSachs:      { type: 'string' },
      culturalPurpose:      { type: 'string' },
      category:             { type: 'string', enum: ['string', 'percussion', 'wind'] },
      description:          { type: 'string' },
      region:               { type: 'string' },
    },
    required: ['name', 'localName', 'ethnoLinguisticGroup', 'hornbostelSachs',
               'culturalPurpose', 'category', 'description', 'region'],
  };

  const result = await callGeminiWithRetry(client, {
    contents: {
      parts: [
        {
          text: `You are an expert ethnomusicologist.
Analyze this image. Identify the exact musical instrument name. 

CRITICAL CONTEXT: This application specializes in traditional Philippine Visayan instruments. Look closely for visual cues that match:

**Western Visayas:**
- Tultugan: Massive bamboo drums struck with sticks. Look for large bamboo nodes/tubes.
- Buktot: A four-stringed native lute. CRITICAL VISUAL CUE: The body is crafted from a distinct, round dried coconut husk. The neck is a simple wooden stick attached to the husk. Has exactly 4 strings.
- Pasiyak: A unique bamboo whistle requiring water inside to produce a bird-like chirp. Small, tubular bamboo shape with a mouthpiece.
- Tulali: A ceremonial bamboo flute with exactly six finger holes. Long, slender bamboo tube.
- Tugo: A wooden drum played by hitting the base with the hands. Distinctive guitar-shaped body, but it is a drum (no strings, solid wooden top).
- Litguit: A wooden percussion instrument scraped with a stick. Often looks like a carved piece of wood with serrations or ridges for scraping.

**Central Visayas:**
- Cebuano Gitara: Handcrafted acoustic guitar. Look for the classic figure-eight guitar shape, round soundhole, and exactly 6 strings. Often has decorative inlays.
- Bandurria: A lead melody instrument. CRITICAL VISUAL CUE: Pear-shaped body with a flat back. It has exactly 14 strings, usually arranged in courses, and a short, wide neck.
- Laud: A string instrument tuned lower than the bandurria. CRITICAL VISUAL CUE: Teardrop-shaped body (often with f-holes instead of a round soundhole). Longer neck than the bandurria, usually 14 strings like the bandurria but visually distinct shape.
- Octavina: A Rondalla string instrument. CRITICAL VISUAL CUE: Shaped exactly like a small guitar (figure-eight body), but has 14 strings like a bandurria/laud.
- Bajo de Uñas: The giant acoustic bass. Very large, typical stand-up bass/contrabass shape (violin family shape, not guitar shape). Usually has 4 thick strings.

**Eastern Visayas:**
- Lantoy: A slender bamboo mouth or nose flute. Very thin bamboo tube, sometimes with subtle decorative carvings.
- Subing: A twangy, vibrating bamboo jaw harp. Small, slender, flat piece of bamboo with a carved vibrating tongue in the center. Look for the pointed/tapered end.
- Korlong: A rare two-stringed fiddle. Look for a small body, often made from bamboo or coconut, and exactly two strings, played with a distinct bow (often horsehair or abaca).

If the image matches or closely resembles one of these, identify it accurately as the Philippine instrument. Provide its ethno-linguistic group (e.g., Maguindanao, Kalinga, Maranao, Visayan), cultural purpose, and Hornbostel-Sachs classification.
If it is ANY other instrument from around the world (e.g. American drum kit, modern electric guitar, piano), identify it accurately and provide its general origin instead. 
Classify it strictly as one of: string, percussion, or wind.
If the image is NOT a musical instrument at all, you MUST set the name exactly to "NOT_AN_INSTRUMENT".
Return a clean JSON response.`,
        },
        {
          inlineData: { data: imageBase64, mimeType: imageMimeType },
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  return JSON.parse(result) as InstrumentProfile;
}

// ─── Phase 2: Acoustic Profile ────────────────────────────────────────────────

async function runPhase2(
  client: GoogleGenAI,
  instrument: InstrumentProfile,
): Promise<AcousticProfile> {
  const schema = {
    type: 'object',
    properties: {
      fundamentalFreqMin: { type: 'number' },
      fundamentalFreqMax:  { type: 'number' },
      timbre:              { type: 'string' },
      decayTime:           { type: 'number' },
      attackTime:          { type: 'number' },
      tuningSystem:        { type: 'string' },
      synthesisType:       { type: 'string', enum: ['string', 'fm-gong', 'flute', 'membrane-drum', 'brass', 'synth-lead'] },
      scaleNotes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            note:      { type: 'string' },
            frequency: { type: 'number' },
            lane:      { type: 'integer' },
          },
          required: ['note', 'frequency', 'lane'],
        },
      },
    },
    required: ['fundamentalFreqMin', 'fundamentalFreqMax', 'timbre', 'decayTime',
               'attackTime', 'tuningSystem', 'synthesisType', 'scaleNotes'],
  };

  const result = await callGeminiWithRetry(client, {
    contents: `Analyze the structural physics of the instrument "${instrument.name}" (${instrument.category}).
Determine its acoustic properties: fundamental frequency range (Hz), characteristic timbre description,
decay time in seconds, attack time in seconds, and tuning system.
Choose the MOST APPROPRIATE synthesisType from the allowed options:
- 'membrane-drum': for skin/membrane percussion like drum kits, bongos, cajons.
- 'fm-gong': for metallic or wooden struck percussion like gongs, xylophones, bells.
- 'string': for plucked, bowed, or hammered strings like guitar, kudyapi, piano.
- 'brass': for lip-buzzed horns like trumpets, tubas, trombones.
- 'flute': for breathy wind instruments like flutes, whistles.
- 'synth-lead': for modern electronic synthesizers or distorted electric guitars.

Also map out a diatonic or pentatonic scale suitable for this instrument. Provide 5-8 notes.

CRITICAL PHYSICAL MAPPING RULES:
- The 'lane' property represents the PHYSICAL SEPARATION of parts.
- For STRING instruments: 'lane' represents the physical string (0-indexed). A 2-string Kudyapi MUST only use lane 0 and 1. A 6-string guitar uses lanes 0 to 5. Assign multiple notes to the SAME lane if they are fretted on the same string.
- For PERCUSSION instruments: 'lane' represents the PHYSICAL DRUM or GONG. An Agong with exactly 2 gongs MUST only use lane 0 and 1. If a single gong produces 3 different tones (e.g., center, mid, edge), you MUST put them all in the SAME lane, but as different notes. A 8-gong Kulintang uses lanes 0 to 7.
- For WIND instruments: 'lane' represents the PHYSICAL FINGER HOLES. A 6-hole flute should have notes assigned to lanes 0 to 5.

Ensure the decayTime and attackTime are physically accurate for the instrument.
Return a JSON object.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  return JSON.parse(result) as AcousticProfile;
}

// ─── Phase 3: Input Mapper ────────────────────────────────────────────────────

async function runPhase3(
  client: GoogleGenAI,
  instrument: InstrumentProfile,
): Promise<InputMapping> {
  const keyboardMaps: Record<InstrumentCategory, string[]> = {
    string:     ['1', '2'],
    percussion: ['1', '2', '3', '4', '5', '6', '7', '8'],
    wind:       ['1', '2', '3', '4'],
  };

  const laneCountMap: Record<InstrumentCategory, number> = {
    string: 2, percussion: 8, wind: 4,
  };

  const cat = instrument.category as InstrumentCategory;
  const laneCount = laneCountMap[cat] ?? 8;
  const keys = keyboardMaps[cat] ?? keyboardMaps.percussion;

  const schema = {
    type: 'object',
    properties: {
      laneCount:   { type: 'integer' },
      orientation: { type: 'string', enum: ['vertical', 'horizontal'] },
      lanes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id:         { type: 'integer' },
            label:      { type: 'string' },
            frequency:  { type: 'number' },
            keyBinding: { type: 'string' },
          },
          required: ['id', 'label', 'frequency', 'keyBinding'],
        },
      },
    },
    required: ['laneCount', 'orientation', 'lanes'],
  };

  const result = await callGeminiWithRetry(client, {
    contents: `Map the physical parts of the Philippine instrument "${instrument.name}" (${instrument.category})
to a touchscreen/keyboard game control matrix.
laneCount: ${laneCount}
orientation: ${ cat === 'percussion' ? 'horizontal' : 'vertical' }
keyBindings to assign (one per lane, in order): ${keys.slice(0, laneCount).join(', ')}
For each lane, provide a short label and a representative frequency in Hz.
Return JSON only.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  return JSON.parse(result) as InputMapping;
}

// ─── Phase 4: Cultural Guardrail ──────────────────────────────────────────────

async function runPhase4(
  client: GoogleGenAI,
  instrument: InstrumentProfile,
  acoustic: AcousticProfile,
): Promise<AcousticProfile> {
  const schema = {
    type: 'object',
    properties: {
      fundamentalFreqMin: { type: 'number' },
      fundamentalFreqMax:  { type: 'number' },
      timbre:              { type: 'string' },
      decayTime:           { type: 'number' },
      attackTime:          { type: 'number' },
      tuningSystem:        { type: 'string' },
      synthesisType:       { type: 'string', enum: ['string', 'fm-gong', 'flute'] },
      scaleNotes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            note:      { type: 'string' },
            frequency: { type: 'number' },
            lane:      { type: 'integer' },
          },
          required: ['note', 'frequency', 'lane'],
        },
      },
    },
    required: ['fundamentalFreqMin', 'fundamentalFreqMax', 'timbre', 'decayTime',
               'attackTime', 'tuningSystem', 'synthesisType', 'scaleNotes'],
  };

  const result = await callGeminiWithRetry(client, {
    contents: `Cross-reference this acoustic profile for the Philippine instrument "${instrument.name}"
against authentic Philippine musical structures:
${JSON.stringify(acoustic, null, 2)}

Verify the scale notes match traditional modes (e.g., Binalig, Tidtu, Tagunggo for kulintang).
Correct any 12-tone Western contradictions to approximate indigenous microtonal intervals.
CRITICAL: You MUST preserve the exact same synthesisType, number of scale notes, and their 'lane' assignments from the provided profile. Only adjust the frequencies and note names.
Return the corrected JSON profile only.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  return JSON.parse(result) as AcousticProfile;
}

// ─── Gemini Call Wrapper with Retry ───────────────────────────────────────────

interface GeminiCallParams {
  contents: unknown;
  config?: Record<string, unknown>;
}

async function callGeminiWithRetry(
  client: GoogleGenAI,
  params: GeminiCallParams,
  maxRetries = 2,
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: params.contents as never,
        config: params.config as never,
      });

      // Primary accessor — works for standard responses
      let text = response.text;

      // Fallback: extract from candidates directly (handles thinking model edge cases)
      if (!text) {
        const parts = response.candidates?.[0]?.content?.parts;
        text = parts?.map((p: { text?: string }) => p.text ?? '').join('') || '';
      }

      if (!text) throw new Error('Empty response from Gemini');
      return text;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error('Gemini call failed after retries');
}
