import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OccurrenceStatus, OccurrenceType } from './occurrence.schema.js';
import { OccurrencesService } from './occurrences.service.js';

const buildDto = (overrides: Partial<Record<string, unknown>> = {}) => ({
  siteId: 'site-1',
  droneId: 'drone-1',
  type: OccurrenceType.INTRUSION,
  severity: 3,
  detectedAt: '2026-01-01T12:00:00.000Z',
  ...overrides,
});

describe('OccurrencesService', () => {
  let occurrenceModel: {
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };

  let service: OccurrencesService;

  const mockFindOneQuery = (result: unknown) => {
    const query = { sort: vi.fn().mockResolvedValue(result) };
    occurrenceModel.findOne.mockReturnValue(query);
    return query;
  };

  beforeEach(() => {
    occurrenceModel = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn(),
    };

    service = new OccurrencesService(occurrenceModel as never);
  });

  it('creates a new occurrence normally', async () => {
    const dto = buildDto();
    const created = { ...dto, status: OccurrenceStatus.OPEN, count: 1, _id: 'new-id' };

    mockFindOneQuery(null);
    occurrenceModel.create.mockResolvedValue(created);

    await expect(service.createOccurrence(dto)).resolves.toEqual(created);
    expect(occurrenceModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: dto.siteId,
        droneId: dto.droneId,
        type: dto.type,
        severity: dto.severity,
        status: OccurrenceStatus.OPEN,
        count: 1,
      }),
    );
  });

  it('groups within 10 minutes', async () => {
    const existing = {
      _id: 'existing-id',
      siteId: 'site-1',
      droneId: 'drone-2',
      type: OccurrenceType.INTRUSION,
      status: OccurrenceStatus.OPEN,
      count: 1,
      severity: 2,
      detectedAt: new Date('2026-01-01T11:59:00.000Z'),
      save: vi.fn().mockResolvedValue({}),
    };

    mockFindOneQuery(existing);

    const result = await service.createOccurrence(buildDto({ detectedAt: '2026-01-01T12:00:00.000Z' }));

    expect(result.count).toBe(2);
    expect(result.severity).toBe(3);
    expect(result.detectedAt).toEqual(new Date('2026-01-01T12:00:00.000Z'));
    expect(result._id).toBe('existing-id');
    expect(existing.save).toHaveBeenCalledTimes(1);
  });

  it('groups when the earlier occurrence is exactly 10 minutes old', async () => {
    const existing = {
      _id: 'existing-id',
      siteId: 'site-1',
      droneId: 'drone-2',
      type: OccurrenceType.INTRUSION,
      status: OccurrenceStatus.OPEN,
      count: 1,
      severity: 2,
      detectedAt: new Date('2026-01-01T11:50:00.000Z'),
      save: vi.fn().mockResolvedValue({ count: 2, severity: 3 }),
    };

    mockFindOneQuery(existing);

    const result = await service.createOccurrence(buildDto({ detectedAt: '2026-01-01T12:00:00.000Z' }));

    expect(result.count).toBe(2);
    expect(result.severity).toBe(3);
  });

  it('does not group outside the 10-minute window', async () => {
    const dto = buildDto({ detectedAt: '2026-01-01T12:00:00.000Z' });
    const created = { ...dto, status: OccurrenceStatus.OPEN, count: 1, _id: 'new-id' };

    mockFindOneQuery(null);
    occurrenceModel.create.mockResolvedValue(created);

    await service.createOccurrence(dto);

    expect(occurrenceModel.create).toHaveBeenCalledTimes(1);
  });

  it('does not group when siteId differs', async () => {
    const dto = buildDto({ siteId: 'site-2' });
    const created = { ...dto, status: OccurrenceStatus.OPEN, count: 1, _id: 'new-id' };

    mockFindOneQuery(null);
    occurrenceModel.create.mockResolvedValue(created);

    await service.createOccurrence(dto);

    expect(occurrenceModel.create).toHaveBeenCalledTimes(1);
  });

  it('does not group when type differs', async () => {
    const dto = buildDto({ type: OccurrenceType.LOW_BATTERY });
    const created = { ...dto, status: OccurrenceStatus.OPEN, count: 1, _id: 'new-id' };

    mockFindOneQuery(null);
    occurrenceModel.create.mockResolvedValue(created);

    await service.createOccurrence(dto);

    expect(occurrenceModel.create).toHaveBeenCalledTimes(1);
  });

  it('does not group when occurrence is not open', async () => {
    const dto = buildDto();
    const created = { ...dto, status: OccurrenceStatus.OPEN, count: 1, _id: 'new-id' };

    mockFindOneQuery(null);
    occurrenceModel.create.mockResolvedValue(created);

    await service.createOccurrence(dto);

    expect(occurrenceModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: dto.siteId,
        type: dto.type,
        status: OccurrenceStatus.OPEN,
      }),
    );
    expect(occurrenceModel.create).toHaveBeenCalledTimes(1);
  });

  it('increments count when grouping', async () => {
    const existing = {
      _id: 'existing-id',
      siteId: 'site-1',
      droneId: 'drone-2',
      type: OccurrenceType.INTRUSION,
      status: OccurrenceStatus.OPEN,
      count: 2,
      severity: 2,
      detectedAt: new Date('2026-01-01T11:59:00.000Z'),
      save: vi.fn().mockResolvedValue({ count: 3, severity: 3 }),
    };

    mockFindOneQuery(existing);

    const result = await service.createOccurrence(buildDto({ detectedAt: '2026-01-01T12:00:00.000Z' }));

    expect(result.count).toBe(3);
    expect(existing.save).toHaveBeenCalledTimes(1);
  });

  it('increments severity when grouping', async () => {
    const existing = {
      _id: 'existing-id',
      siteId: 'site-1',
      droneId: 'drone-2',
      type: OccurrenceType.INTRUSION,
      status: OccurrenceStatus.OPEN,
      count: 1,
      severity: 2,
      detectedAt: new Date('2026-01-01T11:59:00.000Z'),
      save: vi.fn().mockResolvedValue({ count: 2, severity: 3 }),
    };

    mockFindOneQuery(existing);

    const result = await service.createOccurrence(buildDto({ detectedAt: '2026-01-01T12:00:00.000Z' }));

    expect(result.severity).toBe(3);
  });

  it('caps severity at 5', async () => {
    const existing = {
      _id: 'existing-id',
      siteId: 'site-1',
      droneId: 'drone-2',
      type: OccurrenceType.INTRUSION,
      status: OccurrenceStatus.OPEN,
      count: 1,
      severity: 5,
      detectedAt: new Date('2026-01-01T11:59:00.000Z'),
      save: vi.fn().mockResolvedValue({ count: 2, severity: 5 }),
    };

    mockFindOneQuery(existing);

    const result = await service.createOccurrence(buildDto({ severity: 2, detectedAt: '2026-01-01T12:00:00.000Z' }));

    expect(result.severity).toBe(5);
  });

  it('updates detectedAt to the newest alert when grouping', async () => {
    const existing = {
      _id: 'existing-id',
      siteId: 'site-1',
      droneId: 'drone-2',
      type: OccurrenceType.INTRUSION,
      status: OccurrenceStatus.OPEN,
      count: 1,
      severity: 2,
      detectedAt: new Date('2026-01-01T11:59:00.000Z'),
      save: vi.fn().mockResolvedValue({ detectedAt: new Date('2026-01-01T12:00:00.000Z') }),
    };

    mockFindOneQuery(existing);

    const result = await service.createOccurrence(buildDto({ detectedAt: '2026-01-01T12:00:00.000Z' }));

    expect(result.detectedAt).toEqual(new Date('2026-01-01T12:00:00.000Z'));
  });

  it('returns all occurrences without filters', async () => {
    const docs = [
      {
        _id: '1',
        siteId: 'site-a',
        type: OccurrenceType.INTRUSION,
        severity: 2,
        detectedAt: new Date('2026-01-01T11:00:00.000Z'),
        status: OccurrenceStatus.OPEN,
        toObject: () => ({
          _id: '1',
          siteId: 'site-a',
          type: OccurrenceType.INTRUSION,
          severity: 2,
          detectedAt: new Date('2026-01-01T11:00:00.000Z'),
          status: OccurrenceStatus.OPEN,
        }),
      },
      {
        _id: '2',
        siteId: 'site-b',
        type: OccurrenceType.LOW_BATTERY,
        severity: 5,
        detectedAt: new Date('2026-01-01T12:00:00.000Z'),
        status: OccurrenceStatus.RESOLVED,
        toObject: () => ({
          _id: '2',
          siteId: 'site-b',
          type: OccurrenceType.LOW_BATTERY,
          severity: 5,
          detectedAt: new Date('2026-01-01T12:00:00.000Z'),
          status: OccurrenceStatus.RESOLVED,
        }),
      },
    ];

    occurrenceModel.find.mockReturnValue({ exec: vi.fn().mockResolvedValue(docs) });

    const result = await service.findOccurrences();

    expect(result).toHaveLength(2);
    expect(result[0].priority).toBe(6);
    expect(result[1].priority).toBe(5);
    expect(occurrenceModel.find).toHaveBeenCalledWith({});
  });

  it('filters by status', async () => {
    const docs = [{
      _id: '1',
      siteId: 'site-a',
      type: OccurrenceType.INTRUSION,
      severity: 2,
      detectedAt: new Date('2026-01-01T12:00:00.000Z'),
      status: OccurrenceStatus.OPEN,
      toObject: () => ({
        _id: '1',
        siteId: 'site-a',
        type: OccurrenceType.INTRUSION,
        severity: 2,
        detectedAt: new Date('2026-01-01T12:00:00.000Z'),
        status: OccurrenceStatus.OPEN,
      }),
    }];

    occurrenceModel.find.mockReturnValue({ exec: vi.fn().mockResolvedValue(docs) });

    await service.findOccurrences({ status: OccurrenceStatus.OPEN });

    expect(occurrenceModel.find).toHaveBeenCalledWith({ status: OccurrenceStatus.OPEN });
  });

  it('filters by siteId', async () => {
    const docs = [{
      _id: '1',
      siteId: 'site-1',
      type: OccurrenceType.PERIMETER_BREACH,
      severity: 3,
      detectedAt: new Date('2026-01-01T12:00:00.000Z'),
      status: OccurrenceStatus.OPEN,
      toObject: () => ({
        _id: '1',
        siteId: 'site-1',
        type: OccurrenceType.PERIMETER_BREACH,
        severity: 3,
        detectedAt: new Date('2026-01-01T12:00:00.000Z'),
        status: OccurrenceStatus.OPEN,
      }),
    }];

    occurrenceModel.find.mockReturnValue({ exec: vi.fn().mockResolvedValue(docs) });

    await service.findOccurrences({ siteId: 'site-1' });

    expect(occurrenceModel.find).toHaveBeenCalledWith({ siteId: 'site-1' });
  });

  it('combines filters by status and siteId', async () => {
    const docs = [{
      _id: '1',
      siteId: 'site-1',
      type: OccurrenceType.INTRUSION,
      severity: 2,
      detectedAt: new Date('2026-01-01T12:00:00.000Z'),
      status: OccurrenceStatus.OPEN,
      toObject: () => ({
        _id: '1',
        siteId: 'site-1',
        type: OccurrenceType.INTRUSION,
        severity: 2,
        detectedAt: new Date('2026-01-01T12:00:00.000Z'),
        status: OccurrenceStatus.OPEN,
      }),
    }];

    occurrenceModel.find.mockReturnValue({ exec: vi.fn().mockResolvedValue(docs) });

    await service.findOccurrences({ status: OccurrenceStatus.OPEN, siteId: 'site-1' });

    expect(occurrenceModel.find).toHaveBeenCalledWith({ status: OccurrenceStatus.OPEN, siteId: 'site-1' });
  });

  it('calculates the four type weights', async () => {
    const docs = [
      {
        _id: '1',
        siteId: 'site-a',
        type: OccurrenceType.INTRUSION,
        severity: 2,
        detectedAt: new Date('2026-01-01T11:00:00.000Z'),
        status: OccurrenceStatus.OPEN,
        toObject: () => ({
          _id: '1',
          siteId: 'site-a',
          type: OccurrenceType.INTRUSION,
          severity: 2,
          detectedAt: new Date('2026-01-01T11:00:00.000Z'),
          status: OccurrenceStatus.OPEN,
        }),
      },
      {
        _id: '2',
        siteId: 'site-a',
        type: OccurrenceType.PERIMETER_BREACH,
        severity: 2,
        detectedAt: new Date('2026-01-01T10:00:00.000Z'),
        status: OccurrenceStatus.OPEN,
        toObject: () => ({
          _id: '2',
          siteId: 'site-a',
          type: OccurrenceType.PERIMETER_BREACH,
          severity: 2,
          detectedAt: new Date('2026-01-01T10:00:00.000Z'),
          status: OccurrenceStatus.OPEN,
        }),
      },
      {
        _id: '3',
        siteId: 'site-a',
        type: OccurrenceType.LOW_BATTERY,
        severity: 2,
        detectedAt: new Date('2026-01-01T09:00:00.000Z'),
        status: OccurrenceStatus.OPEN,
        toObject: () => ({
          _id: '3',
          siteId: 'site-a',
          type: OccurrenceType.LOW_BATTERY,
          severity: 2,
          detectedAt: new Date('2026-01-01T09:00:00.000Z'),
          status: OccurrenceStatus.OPEN,
        }),
      },
      {
        _id: '4',
        siteId: 'site-a',
        type: OccurrenceType.SIGNAL_LOSS,
        severity: 2,
        detectedAt: new Date('2026-01-01T08:00:00.000Z'),
        status: OccurrenceStatus.OPEN,
        toObject: () => ({
          _id: '4',
          siteId: 'site-a',
          type: OccurrenceType.SIGNAL_LOSS,
          severity: 2,
          detectedAt: new Date('2026-01-01T08:00:00.000Z'),
          status: OccurrenceStatus.OPEN,
        }),
      },
    ];

    occurrenceModel.find.mockReturnValue({ exec: vi.fn().mockResolvedValue(docs) });

    const result = await service.findOccurrences();

    expect(result.map((item) => item.priority)).toEqual([6, 4, 2, 2]);
  });

  it('orders by priority descending', async () => {
    const docs = [
      {
        _id: '1',
        siteId: 'site-a',
        type: OccurrenceType.LOW_BATTERY,
        severity: 1,
        detectedAt: new Date('2026-01-01T09:00:00.000Z'),
        status: OccurrenceStatus.OPEN,
        toObject: () => ({
          _id: '1',
          siteId: 'site-a',
          type: OccurrenceType.LOW_BATTERY,
          severity: 1,
          detectedAt: new Date('2026-01-01T09:00:00.000Z'),
          status: OccurrenceStatus.OPEN,
        }),
      },
      {
        _id: '2',
        siteId: 'site-a',
        type: OccurrenceType.INTRUSION,
        severity: 3,
        detectedAt: new Date('2026-01-01T10:00:00.000Z'),
        status: OccurrenceStatus.OPEN,
        toObject: () => ({
          _id: '2',
          siteId: 'site-a',
          type: OccurrenceType.INTRUSION,
          severity: 3,
          detectedAt: new Date('2026-01-01T10:00:00.000Z'),
          status: OccurrenceStatus.OPEN,
        }),
      },
    ];

    occurrenceModel.find.mockReturnValue({ exec: vi.fn().mockResolvedValue(docs) });

    const result = await service.findOccurrences();

    expect(result[0]._id).toBe('2');
    expect(result[1]._id).toBe('1');
  });

  it('breaks priority ties by detectedAt descending', async () => {
    const docs = [
      {
        _id: 'older',
        siteId: 'site-a',
        type: OccurrenceType.LOW_BATTERY,
        severity: 2,
        detectedAt: new Date('2026-01-01T09:00:00.000Z'),
        status: OccurrenceStatus.OPEN,
        toObject: () => ({
          _id: 'older',
          siteId: 'site-a',
          type: OccurrenceType.LOW_BATTERY,
          severity: 2,
          detectedAt: new Date('2026-01-01T09:00:00.000Z'),
          status: OccurrenceStatus.OPEN,
        }),
      },
      {
        _id: 'newer',
        siteId: 'site-a',
        type: OccurrenceType.LOW_BATTERY,
        severity: 2,
        detectedAt: new Date('2026-01-01T12:00:00.000Z'),
        status: OccurrenceStatus.OPEN,
        toObject: () => ({
          _id: 'newer',
          siteId: 'site-a',
          type: OccurrenceType.LOW_BATTERY,
          severity: 2,
          detectedAt: new Date('2026-01-01T12:00:00.000Z'),
          status: OccurrenceStatus.OPEN,
        }),
      },
    ];

    occurrenceModel.find.mockReturnValue({ exec: vi.fn().mockResolvedValue(docs) });

    const result = await service.findOccurrences();

    expect(result[0]._id).toBe('newer');
    expect(result[1]._id).toBe('older');
  });
});
