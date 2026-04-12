declare module "send-push-notification" {
  interface PushOverOptions {
    title?: string;
    message: string;
    sound?: string;
    timestamp?: number;
    html?: 0 | 1;
  }

  export function sendPushOverNotification(options: PushOverOptions): Promise<void>;
}
