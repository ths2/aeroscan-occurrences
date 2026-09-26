import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { App } from './app';
import { Occurrence } from './occurrences.model';
import { OccurrencesService } from './occurrences.service';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let service: OccurrencesService;

  const sampleOccurrence: Occurrence = {
    _id: 'occ-1',
    siteId: 'site-1',
    droneId: 'drone-1',
    type: 'intrusion',
    severity: 4,
    status: 'open',
    detectedAt: '2026-09-26T12:00:00.000Z',
    priority: 12,
    count: 2,
  };

  beforeEach(async () => {
    service = {
      getOccurrences: vi.fn(() => of([sampleOccurrence])),
    } as unknown as OccurrencesService;

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: OccurrencesService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
  });

  it('should create the app', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the occurrence centre heading', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Central de ocorrências');
  });

  it('should load occurrences on init using the API', () => {
    fixture.detectChanges();

    expect(service.getOccurrences).toHaveBeenCalledWith('all', undefined);
    expect(fixture.nativeElement.textContent).toContain('site-1');
  });

  it('should send the selected status as a query param when filtering', () => {
    fixture.detectChanges();
    fixture.componentInstance.onFilterChange('acknowledged');

    expect(service.getOccurrences).toHaveBeenCalledWith('acknowledged', undefined);
  });

  it('should show the empty-state when the API returns no occurrences', () => {
    service.getOccurrences = vi.fn(() => of([]));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Nenhuma ocorrência encontrada para o filtro selecionado.');
  });

  it('should show the error state and clear the loading state when the API fails', () => {
    service.getOccurrences = vi.fn(() => throwError(() => new Error('API unavailable')));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Não foi possível carregar as ocorrências no momento.');
    expect(compiled.textContent).not.toContain('Carregando ocorrências...');
  });
});
