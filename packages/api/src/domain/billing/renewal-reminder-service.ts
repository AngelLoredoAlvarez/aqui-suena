import type { EmailSender } from "@aqui-suena/api/domain/billing/email";
import {
  dueReminders,
  type ReminderLogRepository,
  type ReminderPreferences,
  type ReminderType,
  reminderContent,
} from "@aqui-suena/api/domain/billing/reminders";
import type { SubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions";

export class RenewalReminderService {
  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly emailSender: EmailSender,
    private readonly reminderLog: ReminderLogRepository,
  ) {}

  async processSubscription(
    subscriptionId: string,
    now: Date,
    recipientEmail: string,
    preferences: ReminderPreferences = { renewalRemindersEnabled: true },
  ): Promise<ReminderType[]> {
    const subscription = await this.subscriptionRepo.getById(subscriptionId);

    if (subscription === null) {
      return [];
    }

    if (subscription.endsAt === null) {
      return [];
    }

    const sent = await this.reminderLog.sentTypes(subscriptionId);

    const due = dueReminders(subscription, now, sent, preferences);

    const sentThisRun: ReminderType[] = [];

    for (const type of due) {
      const content = reminderContent(type, subscription.endsAt);

      await this.emailSender.send({
        to: recipientEmail,
        subject: content.subject,
        html: content.html,
      });

      await this.reminderLog.record(subscriptionId, type, now);

      sentThisRun.push(type);
    }

    return sentThisRun;
  }
}
