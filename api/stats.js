// 통계 화면용. Vercel 환경변수 STATS_KEY와 같은 비밀번호를 넣어야 볼 수 있어요.
const { configured, pipeline, kstDate } = require("../lib/redis");

const METRICS = ["visit", "mobile", "pdf", "print", "png", "pages", "custom", "gray"];
const toObj = flat => { const o = {}; for (let i = 0; i < (flat || []).length; i += 2) o[flat[i]] = Number(flat[i + 1]) || 0; return o; };

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const key = process.env.STATS_KEY;
  if (!key) return res.status(503).json({ error: "no_key" });
  if (String(req.query.key || "") !== key) return res.status(401).json({ error: "bad_key" });
  if (!configured) return res.status(503).json({ error: "no_db" });

  const days = Math.min(90, Math.max(7, parseInt(req.query.days, 10) || 30));
  const dates = Array.from({ length: days }, (_, i) => kstDate(days - 1 - i));
  const cmds = [];
  dates.forEach(d => METRICS.forEach(m => cmds.push(["GET", `d:${d}:${m}`])));
  cmds.push(["HGETALL", "words"], ["HGETALL", "places"], ["HGETALL", "batchim"]);
  try {
    const out = await pipeline(cmds);
    const daily = dates.map((date, i) => {
      const row = { date };
      METRICS.forEach((m, j) => { row[m] = Number(out[i * METRICS.length + j]) || 0; });
      return row;
    });
    const n = dates.length * METRICS.length;
    res.status(200).json({ days, daily, words: toObj(out[n]), places: toObj(out[n + 1]), batchim: toObj(out[n + 2]) });
  } catch (err) {
    res.status(502).json({ error: "db_error" });
  }
};
