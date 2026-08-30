import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Audit/idempotency record for Stripe webhook deliveries. One row per
 * Stripe event.id; inserted in the same transaction as the state change it
 * triggered, so a duplicate or replayed delivery is skipped exactly when
 * the original's effects committed.
 */
@Entity('processed_stripe_events')
export class ProcessedStripeEvent {
  /** Stripe event id (evt_...). */
  @PrimaryColumn('varchar')
  id: string;

  @Column('varchar')
  type: string;

  @CreateDateColumn()
  processedAt: Date;
}
