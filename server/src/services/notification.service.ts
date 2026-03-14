import { logger } from "@/core/logger";
import { sendPushOverNotification } from "send-push-notification";

export interface NotificationOptions {
  title: string;
  message: string;
  sound?: string;
  timestamp?: number;
  html?: 0 | 1;
}

/**
 * Notification Service for sending push notifications
 */
export class NotificationService {
  private isEnabled: boolean;

  constructor() {
    // Check if required environment variables are set
    this.isEnabled = !!(process.env.PUSHOVER_USER_KEY && process.env.PUSHOVER_API_TOKEN);

    if (!this.isEnabled) {
      logger.warn("Push notification credentials not found, notifications will be disabled");
    }
  }

  /**
   * Send server startup notification
   */
  async sendServerStartupNotification(port: number, environment: string): Promise<void> {
    if (!this.isEnabled) {
      logger.debug("Push notifications disabled, skipping startup notification");
      return;
    }

    const message = `<b>Environment:</b><br/>${environment}<br/><b>Port:</b><br/>${port}<br/><b>Time:</b><br/>${new Date().toISOString()}`;

    await this.sendNotification({
      title: "Groot API Started",
      message: message,
      sound: "pushover",
      html: 1,
    });
  }

  /**
   * Send generic notification
   */
  async sendNotification(options: NotificationOptions): Promise<void> {
    if (!this.isEnabled) {
      logger.debug("Push notifications disabled, skipping notification");
      return;
    }

    try {
      await sendPushOverNotification({
        title: options.title,
        message: options.message,
        sound: options.sound || "pushover",
        timestamp: options.timestamp,
        html: options.html || 0,
      });

      logger.info({ title: options.title }, "Push notification sent successfully");
    } catch (error) {
      logger.error({ error, title: options.title }, "Failed to send push notification");
      // Don't throw error - notification failures shouldn't break the main flow
    }
  }

  /**
   * Check if notification service is available
   */
  isAvailable(): boolean {
    return this.isEnabled;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
