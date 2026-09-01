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
}
