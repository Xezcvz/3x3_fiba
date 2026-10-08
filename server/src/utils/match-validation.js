const { z } = require('zod');

// Browser number inputs send numeric values as strings; coerce them at the API boundary.
const nullableCount = z.preprocess(
  (value) => (value === '' ? null : (typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value)),
  z.union([z.number().int().min(0).max(300), z.null()]).optional()
);

const nullableInputCount = z.preprocess(
  (value) => (value === '' ? null : value),
  z.union([
    z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0).max(300)),
    z.number().int().min(0).max(300),
    z.null(),
  ]).optional()
);

const scoreDetailsSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
}, z.object({
  onePtHome: nullableCount,
  onePtAway: nullableCount,
  twoPtHome: nullableCount,
  twoPtAway: nullableCount,
  foulsHome: nullableCount,
  foulsAway: nullableCount,
  winReason: z.enum(['21pts', '10min', 'overtime']).optional(),
}).strict().nullable());

const baseMatchSchema = z.object({
  homeTeamId: z.coerce.number().int().positive(),
  awayTeamId: z.coerce.number().int().positive(),
  category: z.enum(['รุ่น A', 'รุ่น B']),
  matchDate: z.string().min(1).max(64).refine((value) => !Number.isNaN(new Date(value).getTime()), 'วันและเวลาแข่งขันไม่ถูกต้อง'),
  venue: z.string().trim().min(1).max(120),
  status: z.enum(['upcoming', 'live', 'finished']),
  round: z.string().trim().min(1).max(120),
  homeScore: nullableInputCount,
  awayScore: nullableInputCount,
  quarterScores: scoreDetailsSchema.optional(),
}).strict();

function parseMatchInput(input, { partial = false } = {}) {
  const schema = partial ? baseMatchSchema.partial() : baseMatchSchema;
  const result = schema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0]?.message || 'ข้อมูลแมตช์ไม่ถูกต้อง',
    };
  }

  return { success: true, data: result.data };
}

function scoreFromDetails(details, side) {
  if (!details) return null;
  const onePoint = details[`onePt${side}`];
  const twoPoint = details[`twoPt${side}`];
  if (onePoint == null && twoPoint == null) return null;
  return (onePoint || 0) + ((twoPoint || 0) * 2);
}

function validateFinishedScore(status, homeScore, awayScore, details) {
  if (status === 'upcoming' && (homeScore != null || awayScore != null)) {
    return 'แมตช์ที่ยังไม่เริ่มต้องไม่มีคะแนน';
  }
  if (status === 'live' && (homeScore == null || awayScore == null)) {
    return 'แมตช์สดต้องมีคะแนนของทั้งสองทีม';
  }
  if (status !== 'finished') return null;
  if (homeScore == null || awayScore == null) return 'แมตช์ที่จบแล้วต้องมีคะแนนครบทั้งสองทีม';
  if (homeScore === awayScore) return 'แมตช์ 3×3 ที่จบแล้วต้องมีผู้ชนะ';

  if (details?.winReason === '21pts' && Math.max(homeScore, awayScore) < 21) {
    return 'เลือกจบเกมที่ 21 แต้ม แต่คะแนนผู้ชนะยังไม่ถึง 21';
  }
  if (details?.winReason === 'overtime' && Math.max(homeScore, awayScore) < 21 && Math.abs(homeScore - awayScore) < 2) {
    return 'คะแนนต่อเวลาต้องมีผลต่างอย่างน้อย 2 แต้ม';
  }
  return null;
}

module.exports = { parseMatchInput, scoreFromDetails, validateFinishedScore };
