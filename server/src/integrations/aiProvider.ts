import { z } from 'zod';
import type { AiRecommendation, AirportFacility, DataSource, FacilityCategory } from '../types.js';

export interface AdviceContext {
  airport: string;
  terminal: string;
  boardingAt: string;
  boardingLocal: string;
  gate: string | null;
  availableMinutes: number;
  bufferMinutes: number;
  usableMinutes: number;
  facilities: AirportFacility[];
}

export interface AdviceGeneration {
  recommendations: AiRecommendation[];
  safetyNote: string;
  source: DataSource;
  model: string;
}

const CATEGORY_VALUES = [
  'hotel',
  'lounge',
  'dining',
  'shopping',
  'wellness',
  'worship',
  'services',
  'medical',
  'transit',
] as const;

const replySchema = z.object({
  recommendations: z
    .array(
      z.object({
        id: z.string(),
        facilityId: z.string().optional(),
        title: z.string(),
        reason: z.string(),
        category: z.enum(CATEGORY_VALUES),
        minutesNeeded: z.number().nonnegative(),
        returnBufferMinutes: z.number().nonnegative(),
        priceLabel: z.string().optional(),
      }),
    )
    .max(4),
  safetyNote: z.string().min(1),
});

function priceLabel(facility: AirportFacility): string | undefined {
  if (facility.priceMin === undefined || facility.priceMin <= 0) return 'Free';
  return `From $${Math.round(facility.priceMin)}`;
}

function pickFacilities(ctx: AdviceContext, category: FacilityCategory): AirportFacility[] {
  return ctx.facilities.filter((facility) => facility.category === category && facility.openNow);
}

function timeReason(ctx: AdviceContext, minutesNeeded: number, activity: string): string {
  const left = ctx.usableMinutes - minutesNeeded;
  return `You have ${ctx.availableMinutes} min until boarding minus a ${ctx.bufferMinutes} min return buffer = ${ctx.usableMinutes} min usable. ${activity} takes about ${minutesNeeded} min, leaving ${left} min to head back.`;
}

function makeRec(
  id: string,
  title: string,
  category: AiRecommendation['category'],
  minutesNeeded: number,
  reason: string,
  extra?: { facilityId?: string; priceLabel?: string },
): AiRecommendation {
  return {
    id,
    ...(extra?.facilityId ? { facilityId: extra.facilityId } : {}),
    title,
    reason,
    category,
    minutesNeeded,
    returnBufferMinutes: 0,
    ...(extra?.priceLabel ? { priceLabel: extra.priceLabel } : {}),
  };
}

export function ruleBasedRecommendations(ctx: AdviceContext): { recommendations: AiRecommendation[]; safetyNote: string } {
  const usable = ctx.usableMinutes;
  const buffer = ctx.bufferMinutes;
  const candidates: AiRecommendation[] = [];

  const addFacility = (facility: AirportFacility | undefined, minutes: number, activity: string): void => {
    if (!facility) return;
    const minutesNeeded = Math.min(minutes, usable);
    if (minutesNeeded > usable || minutesNeeded <= 0) return;
    candidates.push(
      makeRec(`rec_${facility.id}`, facility.name, facility.category, minutesNeeded, timeReason(ctx, minutesNeeded, activity), {
        facilityId: facility.id,
        ...(priceLabel(facility) ? { priceLabel: priceLabel(facility) as string } : {}),
      }),
    );
  };

  const addTransit = (title: string, minutes: number, activity: string): void => {
    const minutesNeeded = Math.min(minutes, usable);
    if (minutesNeeded > usable || minutesNeeded <= 0) return;
    candidates.push(makeRec(`rec_transit_${candidates.length}`, title, 'transit', minutesNeeded, timeReason(ctx, minutesNeeded, activity)));
  };

  if (usable < 10) {
    addTransit('Quick coffee near your gate', 8, 'A coffee stop near the gate');
    addTransit('Seating area by your gate', 5, 'A short sit-down by the gate');
  } else if (usable <= 25) {
    const cafe = pickFacilities(ctx, 'dining')[0];
    if (cafe) addFacility(cafe, 18, 'A café stop with a snack');
    else addTransit('Nearby café for a snack', 18, 'A café stop with a snack');
  } else if (usable <= 50) {
    const shop = pickFacilities(ctx, 'shopping')[0];
    const food = pickFacilities(ctx, 'dining')[0];
    if (shop) addFacility(shop, 35, 'A short duty-free browse');
    else addTransit('Short duty-free browse', 35, 'A short duty-free browse');
    if (food) addFacility(food, 30, 'A relaxed bite');
    else addTransit('Sit-down meal near the terminal', 30, 'A relaxed bite');
  } else if (usable <= 90) {
    const lounge = pickFacilities(ctx, 'lounge')[0];
    const restaurant = pickFacilities(ctx, 'dining').find((f) => (f.priceMin ?? 0) >= 10) ?? pickFacilities(ctx, 'dining')[0];
    if (lounge) addFacility(lounge, 60, 'Time in an airport lounge');
    if (restaurant) addFacility(restaurant, 75, 'A sit-down restaurant visit');
    if (!lounge && !restaurant) addTransit('Relaxed walk through the terminal', 45, 'A terminal walk');
  } else {
    const hotel = pickFacilities(ctx, 'hotel')[0];
    const spa = pickFacilities(ctx, 'wellness')[0];
    const lounge = pickFacilities(ctx, 'lounge')[0];
    if (hotel) addFacility(hotel, 120, 'A rest in a transit hotel or sleeping pod');
    if (spa) addFacility(spa, 60, 'A spa treatment');
    if (lounge) addFacility(lounge, 90, 'Extended lounge time');
    if (!hotel && !spa && !lounge) addTransit('Long terminal exploration', 90, 'A long terminal walk');
  }

  const recommendations = candidates
    .filter((rec) => rec.minutesNeeded <= usable)
    .sort((a, b) => b.minutesNeeded - a.minutesNeeded)
    .slice(0, 4)
    .map((rec) => ({ ...rec, returnBufferMinutes: buffer }));

  const gateLabel = ctx.gate ? `gate ${ctx.gate}` : 'your gate';
  const safetyNote = `Plan to be back at ${gateLabel} by ${ctx.boardingLocal} — ${buffer} min buffer included.`;
  return { recommendations, safetyNote };
}

async function callOpenAi(key: string, ctx: AdviceContext): Promise<{ recommendations: AiRecommendation[]; safetyNote: string }> {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const facilities = ctx.facilities.slice(0, 30).map((facility) => ({
    id: facility.id,
    name: facility.name,
    category: facility.category,
    location: facility.location,
    openNow: facility.openNow,
    priceLabel: priceLabel(facility) ?? 'Free',
    walkMin: facility.walkMin ?? 10,
  }));
  const system =
    'You are a concise airport waiting-time advisor. Reply with ONLY a JSON object of the shape {"recommendations":[{"id":"...","facilityId":"...","title":"...","reason":"...","category":"hotel|lounge|dining|shopping|wellness|worship|services|medical|transit","minutesNeeded":0,"returnBufferMinutes":0,"priceLabel":"..."}],"safetyNote":"..."}. Rules: at most 4 recommendations; every recommendation must have minutesNeeded <= usableMinutes; every recommendation must have returnBufferMinutes equal to the given bufferMinutes; reasons must explain the time arithmetic; safetyNote must tell the traveller when to be back at the gate.';
  const user = JSON.stringify({
    airport: ctx.airport,
    terminal: ctx.terminal,
    gate: ctx.gate,
    boardingAt: ctx.boardingAt,
    boardingLocal: ctx.boardingLocal,
    availableMinutes: ctx.availableMinutes,
    bufferMinutes: ctx.bufferMinutes,
    usableMinutes: ctx.usableMinutes,
    facilities,
  });
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`OpenAI request failed with status ${response.status}`);
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned an empty reply');
  const cleaned = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const parsed = replySchema.safeParse(JSON.parse(cleaned));
  if (!parsed.success) throw new Error('OpenAI reply failed validation');
  const usable = ctx.usableMinutes;
  const recommendations = parsed.data.recommendations
    .filter((rec) => rec.minutesNeeded <= usable && rec.minutesNeeded > 0)
    .slice(0, 4)
    .map((rec) => ({
      id: rec.id,
      ...(rec.facilityId ? { facilityId: rec.facilityId } : {}),
      title: rec.title,
      reason: rec.reason,
      category: rec.category,
      minutesNeeded: Math.round(rec.minutesNeeded),
      returnBufferMinutes: ctx.bufferMinutes,
      ...(rec.priceLabel ? { priceLabel: rec.priceLabel } : {}),
    }));
  return { recommendations, safetyNote: parsed.data.safetyNote };
}

export async function generateAdvice(ctx: AdviceContext): Promise<AdviceGeneration> {
  const ruleBased = ruleBasedRecommendations(ctx);
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return { ...ruleBased, source: 'mock', model: 'rule-based-advisor' };
  }
  try {
    const ai = await callOpenAi(key, ctx);
    return { ...ai, source: 'live', model: process.env.OPENAI_MODEL || 'gpt-4o-mini' };
  } catch {
    return { ...ruleBased, source: 'mock', model: 'rule-based-advisor (OpenAI fallback)' };
  }
}
