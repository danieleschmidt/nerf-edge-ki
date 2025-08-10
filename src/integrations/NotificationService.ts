/**
 * Notification service for system alerts and updates
 */

export class NotificationService {
  async sendNotification(_message: string): Promise<void> {
    console.log('Notification sent');
  }

  dispose(): void {
    console.log('NotificationService disposed');
  }
}