const appUrl = process.env.APP_URL;
const cronSecret = process.env.CRON_SECRET;

if (!appUrl || !cronSecret) {
  console.error("APP_URL, CRON_SECRET 환경변수가 필요합니다.");
  process.exit(1);
}

const res = await fetch(`${appUrl}/api/cron/supervisor-reminders`, {
  method: "POST",
  headers: { Authorization: `Bearer ${cronSecret}` },
});

const text = await res.text();
console.log(`status=${res.status} body=${text}`);

if (!res.ok) {
  process.exit(1);
}
