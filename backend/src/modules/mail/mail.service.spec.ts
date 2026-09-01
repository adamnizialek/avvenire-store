import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

function makeConfig(values: Record<string, string | undefined>) {
  return {
    get: jest.fn(
      (key: string, defaultValue?: string) => values[key] ?? defaultValue,
    ),
  } as unknown as ConfigService;
}

describe('MailService without RESEND_API_KEY', () => {
  it('constructs without throwing so the app can boot', () => {
    expect(() => new MailService(makeConfig({}))).not.toThrow();
  });

  it('rejects sendPasswordReset with a clear not-configured error', async () => {
    const service = new MailService(makeConfig({}));

    await expect(
      service.sendPasswordReset('user@example.com', 'https://x/reset'),
    ).rejects.toThrow(/mail is not configured/i);
  });
});

describe('MailService with RESEND_API_KEY', () => {
  it('sends the reset email through Resend', async () => {
    const service = new MailService(
      makeConfig({ RESEND_API_KEY: 're_test_key' }),
    );
    const send = jest
      .fn<Promise<{ error: null }>, [{ to: string; html: string }]>()
      .mockResolvedValue({ error: null });
    (service as unknown as { resend: unknown }).resend = {
      emails: { send },
    };

    await service.sendPasswordReset('user@example.com', 'https://x/reset');

    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0][0];
    expect(payload.to).toBe('user@example.com');
    expect(payload.html).toContain('https://x/reset');
  });
});
