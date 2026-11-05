// Upstash Redis(무료) REST로 숫자만 저장해요. 저장소가 연결 안 돼 있으면 조용히 아무것도 안 해요.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const configured = Boolean(URL_ && TOKEN);

async function pipeline(cmds) {
  if (!configured || !cmds.length) return [];
  const r = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).map(x => x.result);
}

// 한국 시간 기준 날짜 (YYYY-MM-DD), daysAgo일 전
function kstDate(daysAgo = 0) {
  return new Date(Date.now() + 9 * 3600e3 - daysAgo * 86400e3).toISOString().slice(0, 10);
}

module.exports = { configured, pipeline, kstDate };
