/**
 * Acciones de suscripción Web Push compartidas (ajustes + soft prompts).
 */

import {
  isPushSupported,
  serializePushSubscription,
  subscribeUserToPush,
  unsubscribeUserFromPush
} from "@/lib/notifications/client-push";

export async function enablePushOnThisDevice(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error("Este navegador no admite notificaciones push.");
  }

  if (typeof Notification !== "undefined" && Notification.permission === "denied") {
    throw new Error(
      "Las notificaciones están bloqueadas en este navegador. Actívalas en los ajustes del sistema."
    );
  }

  const vapidRes = await fetch("/api/notifications/push/vapid", { cache: "no-store" });
  const vapid = (await vapidRes.json()) as { configured?: boolean; publicKey?: string | null };
  if (!vapid.configured || !vapid.publicKey) {
    throw new Error("Las notificaciones push no están configuradas en el servidor.");
  }

  const subscription = await subscribeUserToPush(vapid.publicKey);
  const serialized = serializePushSubscription(subscription);

  const response = await fetch("/api/notifications/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...serialized,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined
    })
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "No pudimos activar las notificaciones.");
  }
}

export async function disablePushOnThisDevice(): Promise<void> {
  let endpoint: string | undefined;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    endpoint = subscription?.endpoint;
    await unsubscribeUserFromPush();
  } catch {
    // seguir desactivando en servidor
  }

  const response = await fetch("/api/notifications/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint })
  });

  if (!response.ok) {
    await fetch("/api/notifications/push/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false })
    });
  }
}
