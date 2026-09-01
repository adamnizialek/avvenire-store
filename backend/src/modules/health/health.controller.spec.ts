import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports ok when the database ping succeeds', async () => {
    const query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const dataSource = { query } as unknown as DataSource;

    const result = await new HealthController(dataSource).check();

    expect(query).toHaveBeenCalledWith('SELECT 1');
    expect(result).toEqual({ status: 'ok', info: { database: 'up' } });
  });

  it('throws 503 when the database ping fails', async () => {
    const dataSource = {
      query: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    } as unknown as DataSource;

    await expect(
      new HealthController(dataSource).check(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
