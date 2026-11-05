// 활동지 페이지에서 보내는 횟수 기록. 개인정보·직접 넣은 낱말은 받지 않아요.
const { configured, pipeline, kstDate } = require("../lib/redis");

const EVENTS = new Set(["visit", "pdf", "print", "png"]);
const HANGUL_WORD = /^[가-힣]{1,4}$/;
const PLACE = /^[가-힣 ]{1,10}$/;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  const e = String(b.e || "");
  if (!EVENTS.has(e)) return res.status(400).end();
  if (!configured) return res.status(204).end();

  const d = kstDate();
  const cmds = [["INCR", `d:${d}:${e}`]];
  if (e === "visit") {
    if (b.m) cmds.push(["INCR", `d:${d}:mobile`]);
  } else {
    const items = Array.isArray(b.items) ? b.items.slice(0, 40) : [];
    for (const it of items) {
      if (!it || typeof it.w !== "string" || !HANGUL_WORD.test(it.w)) continue;
      cmds.push(["HINCRBY", "words", it.w, 1]);
      if (typeof it.p === "string" && PLACE.test(it.p)) cmds.push(["HINCRBY", "places", it.p, 1]);
      cmds.push(["HINCRBY", "batchim", it.b ? "yes" : "no", 1]);
    }
    const pages = Math.min(50, Math.max(0, b.pages | 0));
    if (pages) cmds.push(["INCRBY", `d:${d}:pages`, pages]);
    const custom = Math.min(40, Math.max(0, b.custom | 0));
    if (custom) cmds.push(["INCRBY", `d:${d}:custom`, custom]);
    if (b.gray) cmds.push(["INCR", `d:${d}:gray`]);
  }
  try { await pipeline(cmds); } catch (err) { /* 기록 실패해도 사용자 화면엔 영향 없어요 */ }
  res.status(204).end();
};
