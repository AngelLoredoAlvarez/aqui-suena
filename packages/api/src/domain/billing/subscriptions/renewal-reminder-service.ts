import {
  dueReminders,
  type ReminderLogRepository,
  type ReminderPreferences,
  type ReminderType,
} from "@aqui-suena/api/domain/billing/subscriptions/reminders";
import type { SubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/subscription-notifier";
import type { SubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscriptions";
import {
  DEFAULT_EMAIL_LOCALE,
  type EmailLocale,
} from "@aqui-suena/api/domain/email/email-template";

const DEFAULT_PREFERENCES: ReminderPreferences = { renewalRemindersEnabled: true };

export interface RenewalReminderServiceDependencies {
  readonly subscriptionRepo: SubscriptionRepository;
  readonly reminderLog: ReminderLogRepository;
  readonly notifier: SubscriptionNotifier;
}

export interface ProcessSubscriptionOptions {
  readonly now: Date;
  readonly recipientEmail: string;
  readonly locale?: EmailLocale;
  readonly preferences?: ReminderPreferences;
}

export class RenewalReminderService {
  private readonly subscriptionRepo: SubscriptionRepository;
  private readonly reminderLog: ReminderLogRepository;
  private readonly notifier: SubscriptionNotifier;

  constructor(dependencies: RenewalReminderServiceDependencies) {
    this.subscriptionRepo = dependencies.subscriptionRepo;
    this.reminderLog = dependencies.reminderLog;
    this.notifier = dependencies.notifier;
  }

  async processSubscription(
    subscriptionId: string,
    options: ProcessSubscriptionOptions,
  ): Promise<ReminderType[]> {
    const {
      now,
      recipientEmail,
      locale = DEFAULT_EMAIL_LOCALE,
      preferences = DEFAULT_PREFERENCES,
    } = options;

    const subscription = await this.subscriptionRepo.getById(subscriptionId);

    if (subscription === null) {
      return [];
    }

    const renewalDate = subscription.endsAt;

    if (renewalDate === null) {
      return [];
    }

    const sent = await this.reminderLog.sentTypes(subscriptionId);

    const due = dueReminders(subscription, now, sent, preferences);

    const sentThisRun: ReminderType[] = [];

    for (const type of due) {
      await this.notifier.renewalUpcoming(
        { email: recipientEmail, locale },
        { daysBefore: type === "renewal_7d" ? 7 : 1, renewalDate },
      );

      await this.reminderLog.record(subscriptionId, type, now);

      sentThisRun.push(type);
    }

    return sentThisRun;
  }
}
