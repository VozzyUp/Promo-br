// Cron de 5 campos (min hora dia mês dia-da-semana) avaliado no horário de Brasília. Aceita *, listas, faixas e passos.
const TZ = "America/Sao_Paulo";

function parseField(field: string, min: number, max: number): Set<number> | null {
  const out = new Set<number>();
  for (const part of field.split(",")) {
    const [range, stepRaw] = part.split("/");
    const step = stepRaw === undefined ? 1 : Number(stepRaw);
    if (!Number.isInteger(step) || step < 1) return null;
    let lo = min, hi = max;
    if (range !== "*") {
      const [a, b] = range.split("-");
      lo = Number(a);
      hi = b === undefined ? (stepRaw === undefined ? lo : max) : Number(b);
    }
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < min || hi > max || lo > hi) return null;
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return out;
}

export function isValidCron(expr: string): boolean {
  const f = expr.trim().split(/\s+/);
  if (f.length !== 5) return false;
  const ranges: [number, number][] = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];
  return f.every((x, i) => parseField(x, ranges[i][0], ranges[i][1]) !== null);
}

const DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function spParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hour12: false, minute: "numeric", hour: "numeric", day: "numeric", month: "numeric", weekday: "short",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { minute: Number(get("minute")), hour: Number(get("hour")) % 24, day: Number(get("day")), month: Number(get("month")), dow: DOW[get("weekday")] };
}

export function cronMatches(expr: string, date: Date): boolean {
  if (!isValidCron(expr)) return false;
  const [mi, ho, da, mo, dw] = expr.trim().split(/\s+/);
  const p = spParts(date);
  const dows = parseField(dw, 0, 7)!;
  if (dows.has(7)) dows.add(0);
  return parseField(mi, 0, 59)!.has(p.minute) && parseField(ho, 0, 23)!.has(p.hour) &&
    parseField(da, 1, 31)!.has(p.day) && parseField(mo, 1, 12)!.has(p.month) && dows.has(p.dow);
}