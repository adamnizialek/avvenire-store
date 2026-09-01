import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators/public.decorator';

export interface HealthReport {
  status: 'ok';
  info: { database: 'up' };
}

/**
 * GET /api/health — liveness + database connectivity for the uptime monitor.
 *
 * Public (no auth) and throttle-exempt so an external monitor can poll it
 * freely. A `SELECT 1` is included so the check fails (503) when Postgres is
 * unreachable, not just when the process is up — that's what the monitor and
 * its alert should react to.
 */
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Public()
  @SkipThrottle()
  @Get()
  async check(): Promise<HealthReport> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        info: { database: 'down' },
      });
    }
    return { status: 'ok', info: { database: 'up' } };
  }

  /**
   * GET /api/health/live — process liveness only, deliberately WITHOUT the
   * database ping. The keep-warm cron (.github/workflows/keep-warm.yml) hits
   * this every 10 minutes to stop Render's free instance from spinning down;
   * touching the DB here would also hold Neon's compute awake ~50% of the
   * time and burn most of its free CU-h budget on pings. Neon's own resume
   * is ~0.5s, so letting it suspend between real requests costs nothing
   * customers would notice.
   */
  @Public()
  @SkipThrottle()
  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
