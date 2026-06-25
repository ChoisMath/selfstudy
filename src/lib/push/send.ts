import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export function isExpiredSubscriptionError(statusCode: number): boolean {
  return statusCode === 404 || statusCode === 410;
}

export type PushPayload = { title: string; body: string; url: string };

export async function sendToTeacher(
  teacherId: number,
  payload: PushPayload
): Promise<number> {
  ensureConfigured();
  const subs = await prisma.pushSubscription.findMany({ where: { teacherId } });
  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 0;
      if (isExpiredSubscriptionError(statusCode)) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
      } else {
        console.error(
          `push send failed (teacher ${teacherId}, sub ${sub.id}):`,
          err
        );
      }
    }
  }
  return sent;
}
