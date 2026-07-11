/**
 * `send-push-notification` (Pushover) ships no type declarations.
 * Minimal ambient types for the surface used by the notification service.
 */
declare module "send-push-notification" {
  export interface PushOverNotificationPayload {
    title?: string;
    message?: string;
    sound?: string;
    timestamp?: number;
    html?: 0 | 1;
    [key: string]: unknown;
  }

  export const sendPushOverNotification: (payload: PushOverNotificationPayload) => Promise<unknown>;
}
