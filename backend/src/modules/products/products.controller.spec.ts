import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

// These tests drive the real HTTP layer (via supertest) so the route-param
// pipes actually run — a plain controller-method unit test would bypass them.
// The service is mocked, so no database is touched.
describe('ProductsController id validation', () => {
  let app: INestApplication<App>;
  const findById = jest.fn();

  beforeEach(async () => {
    findById.mockReset();
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: { findById } },
        { provide: CloudinaryService, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects a non-UUID id with 400 before reaching the service/DB', async () => {
    await request(app.getHttpServer()).get('/api/products/nope').expect(400);

    // The whole point of the fix: a malformed id must never reach the query
    // layer (which would throw a TypeORM QueryFailedError → 500 + Sentry noise).
    expect(findById).not.toHaveBeenCalled();
  });

  it('passes a well-formed UUID through to the service', async () => {
    const id = '11111111-1111-1111-1111-111111111111';
    findById.mockResolvedValue({ id, name: 'Test', images: [] });

    await request(app.getHttpServer()).get(`/api/products/${id}`).expect(200);

    expect(findById).toHaveBeenCalledWith(id);
  });
});
