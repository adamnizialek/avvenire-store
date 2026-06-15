import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

function makeDto(images: unknown) {
  return plainToInstance(CreateProductDto, {
    name: 'Tee',
    description: 'A tee',
    price: 10,
    category: 'clothing',
    inventory: [{ size: 'M', quantity: 1 }],
    images,
  });
}

describe('CreateProductDto images', () => {
  it('accepts an array of { url, alt } objects', async () => {
    const dto = makeDto([{ url: 'http://x/a.jpg', alt: 'A red tee' }]);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('coerces a legacy string element into a { url } object', async () => {
    const dto = makeDto(['http://x/a.jpg']);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.images?.[0]).toMatchObject({ url: 'http://x/a.jpg' });
  });

  it('rejects an image object with no url', async () => {
    const dto = makeDto([{ alt: 'orphan' }]);
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });

  it('rejects alt text longer than 250 characters', async () => {
    const dto = makeDto([{ url: 'http://x/a.jpg', alt: 'x'.repeat(251) }]);
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });
});
