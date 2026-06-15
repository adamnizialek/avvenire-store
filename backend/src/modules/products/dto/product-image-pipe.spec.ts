import 'reflect-metadata';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { CreateProductDto } from './create-product.dto';
import { UpdateProductDto } from './update-product.dto';

// Mirror the EXACT production pipe from main.ts. The earlier DTO spec used a
// bare plainToInstance(), which does NOT enable implicit conversion and so never
// exercised the path that silently dropped images in production.
const pipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

const baseCreate = {
  name: 'Tee',
  description: 'A tee',
  price: 10,
  category: 'clothing',
  inventory: [{ size: 'M', quantity: 1 }],
};

async function transformCreate(images: unknown) {
  const out = (await pipe.transform(
    JSON.parse(JSON.stringify({ ...baseCreate, images })),
    { type: 'body', metatype: CreateProductDto },
  )) as CreateProductDto;
  return out.images;
}

async function transformUpdate(images: unknown) {
  const out = (await pipe.transform(JSON.parse(JSON.stringify({ images })), {
    type: 'body',
    metatype: UpdateProductDto,
  })) as UpdateProductDto;
  return out.images;
}

describe('product images survive the production ValidationPipe', () => {
  it('keeps a single { url, alt } object intact (create)', async () => {
    expect(
      await transformCreate([{ url: '/uploads/a.jpg', alt: 'hi' }]),
    ).toEqual([{ url: '/uploads/a.jpg', alt: 'hi' }]);
  });

  it('keeps an object with url but no alt (create)', async () => {
    expect(await transformCreate([{ url: '/uploads/a.jpg' }])).toMatchObject([
      { url: '/uploads/a.jpg' },
    ]);
  });

  it('keeps multiple objects in order (create)', async () => {
    expect(
      await transformCreate([
        { url: '/uploads/a.jpg', alt: 'a' },
        { url: '/uploads/b.jpg', alt: 'b' },
      ]),
    ).toEqual([
      { url: '/uploads/a.jpg', alt: 'a' },
      { url: '/uploads/b.jpg', alt: 'b' },
    ]);
  });

  it('coerces a legacy bare string element into { url } (create)', async () => {
    expect(await transformCreate(['/uploads/legacy.jpg'])).toMatchObject([
      { url: '/uploads/legacy.jpg' },
    ]);
  });

  it('keeps a { url, alt } object intact through the update pipe', async () => {
    expect(
      await transformUpdate([{ url: '/uploads/a.jpg', alt: 'hi' }]),
    ).toEqual([{ url: '/uploads/a.jpg', alt: 'hi' }]);
  });

  it('still rejects an image object with no url', async () => {
    await expect(transformCreate([{ alt: 'orphan' }])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('still rejects alt text longer than 250 characters', async () => {
    await expect(
      transformCreate([{ url: '/uploads/a.jpg', alt: 'x'.repeat(251) }]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
