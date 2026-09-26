import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OccurrencesService } from './occurrences.service';

describe('OccurrencesService', () => {
  let service: OccurrencesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(OccurrencesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should call the backend endpoint with no extra filters', () => {
    service.getOccurrences().subscribe();

    const req = httpMock.expectOne('http://localhost:3000/occurrences');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush([]);
  });

  it('should include status and siteId query params when provided', () => {
    service.getOccurrences('open', 'site-1').subscribe();

    const req = httpMock.expectOne((request) => request.url === 'http://localhost:3000/occurrences');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('status')).toBe('open');
    expect(req.request.params.get('siteId')).toBe('site-1');
    req.flush([]);
  });
});
