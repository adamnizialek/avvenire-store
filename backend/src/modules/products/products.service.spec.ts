import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';

describe('ProductsService image normalization', () => {
  let service: ProductsService;
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (p) => p),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: repo },
      ],
    }).compile();
    service = moduleRef.get(ProductsService);
  });

  it('normalizes legacy string images to objects on findAll', async () => {
    repo.find.mockResolvedValue([
      { id: 'p1', images: ['http://x/a.jpg', 'http://x/b.jpg'] },
    ]);
    const [product] = await service.findAll();
    expect(product.images).toEqual([
      { url: 'http://x/a.jpg', alt: '' },
      { url: 'http://x/b.jpg', alt: '' },
    ]);
  });

  it('preserves alt text and defaults a missing alt on findById', async () => {
    repo.findOne.mockResolvedValue({
      id: 'p1',
      images: [
        { url: 'http://x/a.jpg', alt: 'A red tee' },
        { url: 'http://x/b.jpg' },
      ],
    });
    const product = await service.findById('p1');
    expect(product.images).toEqual([
      { url: 'http://x/a.jpg', alt: 'A red tee' },
      { url: 'http://x/b.jpg', alt: '' },
    ]);
  });

  it('normalizes images on create before saving', async () => {
    const saved = await service.create({
      name: 'Tee',
      description: 'd',
      price: 10,
      category: 'clothing',
      inventory: [{ size: 'M', quantity: 1 }],
      images: [{ url: 'http://x/a.jpg', alt: 'A' }],
    } as never);
    expect(repo.save).toHaveBeenCalled();
    expect(saved.images).toEqual([{ url: 'http://x/a.jpg', alt: 'A' }]);
  });
});
