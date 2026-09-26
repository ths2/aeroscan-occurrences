import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OccurrenceType } from './occurrence.schema.js';
import { OccurrencesController } from './occurrences.controller.js';
import { OccurrencesService } from './occurrences.service.js';

describe('OccurrencesController', () => {
  let app: INestApplication;
  let occurrencesService: {
    createOccurrence: ReturnType<typeof vi.fn>;
    updateOccurrenceStatus: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    occurrencesService = {
      createOccurrence: vi.fn(),
      updateOccurrenceStatus: vi.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [OccurrencesController],
      providers: [{ provide: OccurrencesService, useValue: occurrencesService }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 400 when the payload is invalid', async () => {
    await request(app.getHttpServer())
      .post('/occurrences')
      .send({
        siteId: '',
        droneId: 'drone-1',
        type: 'invalid-type',
        severity: 0,
        detectedAt: 'not-a-date',
      })
      .expect(400);

    expect(occurrencesService.createOccurrence).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid status in GET /occurrences', async () => {
    await request(app.getHttpServer())
      .get('/occurrences')
      .query({ status: 'invalid-status' })
      .expect(400);
  });

  it('passes valid payload to the service', async () => {
    occurrencesService.createOccurrence.mockResolvedValue({
      siteId: 'site-1',
      droneId: 'drone-1',
      type: OccurrenceType.INTRUSION,
      severity: 3,
      detectedAt: '2026-01-01T12:00:00.000Z',
      status: 'open',
      count: 1,
    });

    await request(app.getHttpServer())
      .post('/occurrences')
      .send({
        siteId: 'site-1',
        droneId: 'drone-1',
        type: OccurrenceType.INTRUSION,
        severity: 3,
        detectedAt: '2026-01-01T12:00:00.000Z',
      })
      .expect(201);

    expect(occurrencesService.createOccurrence).toHaveBeenCalledTimes(1);
  });

  it('accepts a valid status transition and calls the service', async () => {
    occurrencesService.updateOccurrenceStatus.mockResolvedValue({
      _id: 'occ-1',
      status: 'acknowledged',
      note: '',
    });

    await request(app.getHttpServer())
      .patch('/occurrences/occ-1/status')
      .send({ status: 'acknowledged' })
      .expect(200);

    expect(occurrencesService.updateOccurrenceStatus).toHaveBeenCalledWith('occ-1', 'acknowledged', undefined);
  });

  it('returns 400 for invalid status values in PATCH /occurrences/:id/status', async () => {
    await request(app.getHttpServer())
      .patch('/occurrences/occ-1/status')
      .send({ status: 'blocked' })
      .expect(400);
  });
});
