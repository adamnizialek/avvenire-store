import { ValueTransformer } from 'typeorm';

/**
 * Stores money as an exact Postgres `numeric` column while exposing it as a
 * JS number to the rest of the app. `numeric` is returned as a string by the
 * pg driver, so we parse it back on read. Avoids the precision loss of `real`.
 */
export const decimalTransformer: ValueTransformer = {
  to(value: number | null | undefined): number | null | undefined {
    return value;
  },
  from(value: string | null | undefined): number | null | undefined {
    if (value === null || value === undefined) return value;
    return Number(value);
  },
};
