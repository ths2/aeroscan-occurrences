import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { App } from './app';
import { Occurrence } from './occurrences.model';
import { OccurrencesService } from './occurrences.service';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let service: OccurrencesService;

  const openOccurrence: Occurrence = {
    _id: 'occ-open',
    siteId: 'site-1',
    droneId: 'drone-1',
    type: 'intrusion',
    severity: 4,
    status: 'open',
    detectedAt: '2026-09-26T12:00:00.000Z',
    priority: 12,
    count: 2,
  };

  const acknowledgedOccurrence: Occurrence = {
    ...openOccurrence,
    _id: 'occ-ack',
    status: 'acknowledged',
    priority: 9,
  };

  const resolvedOccurrence: Occurrence = {
    ...openOccurrence,
    _id: 'occ-resolved',
    status: 'resolved',
    priority: 6,
  };

  beforeEach(async () => {
    service = {
      getOccurrences: vi.fn(() => of([openOccurrence, acknowledgedOccurrence, resolvedOccurrence])),
      updateOccurrenceStatus: vi.fn(() => of(openOccurrence)),
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

  it('should render the acknowledge button only for open occurrences', () => {
    service.getOccurrences = vi.fn(() => of([openOccurrence]));
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .map((button) => button.textContent?.trim());

    expect(buttons).toContain('Reconhecer');
    expect(buttons).not.toContain('Resolver');
  });

  it('should render the resolve button only for acknowledged occurrences and never for resolved ones', () => {
    service.getOccurrences = vi.fn(() => of([acknowledgedOccurrence, resolvedOccurrence]));
    fixture.detectChanges();

    const allButtons = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .map((button) => button.textContent?.trim());

    expect(allButtons).toContain('Resolver');
    expect(allButtons.filter((label) => label === 'Resolver')).toHaveLength(1);
    expect(allButtons).not.toContain('Reconhecer');
  });

  it('should call PATCH with acknowledged when the recognize action is clicked', () => {
    service.getOccurrences = vi.fn(() => of([openOccurrence]));
    fixture.detectChanges();
    const recognizeButton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((button) => button.textContent?.trim() === 'Reconhecer');

    recognizeButton?.click();
    fixture.detectChanges();

    expect(service.updateOccurrenceStatus).toHaveBeenCalledWith('occ-open', 'acknowledged', undefined);
  });

  it('should send resolved status and note when a resolution is confirmed', () => {
    service.getOccurrences = vi.fn(() => of([acknowledgedOccurrence]));
    fixture.detectChanges();

    const resolveButton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((button) => button.textContent?.trim() === 'Resolver');
    resolveButton?.click();
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = '  Avaria corrigida  ';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const confirmButton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((button) => button.textContent?.trim() === 'Confirmar resolução');
    confirmButton?.click();
    fixture.detectChanges();

    expect(service.updateOccurrenceStatus).toHaveBeenCalledWith('occ-ack', 'resolved', 'Avaria corrigida');
  });

  it('should not send a resolution when the note is empty or whitespace only', () => {
    service.getOccurrences = vi.fn(() => of([acknowledgedOccurrence]));
    fixture.detectChanges();

    const resolveButton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((button) => button.textContent?.trim() === 'Resolver');
    resolveButton?.click();
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = '   ';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const confirmButton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((button) => button.textContent?.trim() === 'Confirmar resolução');
    confirmButton?.click();
    fixture.detectChanges();

    expect(service.updateOccurrenceStatus).not.toHaveBeenCalledWith('occ-ack', 'resolved', '   ');
  });

  it('should refresh the list after a successful status update', () => {
    service.getOccurrences = vi.fn(() => of([openOccurrence]));
    const updatedOccurrence: Occurrence = { ...openOccurrence, status: 'acknowledged' };
    service.updateOccurrenceStatus = vi.fn(() => of(updatedOccurrence)) as any;
    fixture.detectChanges();

    const recognizeButton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((button) => button.textContent?.trim() === 'Reconhecer');
    recognizeButton?.click();
    fixture.detectChanges();

    expect(service.getOccurrences).toHaveBeenCalledTimes(2);
  });

  it('should show an API error message when status update fails', () => {
    service.getOccurrences = vi.fn(() => of([openOccurrence]));
    service.updateOccurrenceStatus = vi.fn(() => throwError(() => new Error('API unavailable'))) as any;
    fixture.detectChanges();

    const recognizeButton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((button) => button.textContent?.trim() === 'Reconhecer');
    recognizeButton?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Não foi possível atualizar o status da ocorrência.');
  });

  it('should prevent duplicate status updates while one is in progress', () => {
    service.getOccurrences = vi.fn(() => of([openOccurrence]));
    service.updateOccurrenceStatus = vi.fn(
      () =>
        new Observable((subscriber) => {
          // keep the action in progress until the test explicitly completes the async workflow
          return () => subscriber.complete();
        }),
    ) as any;
    fixture.detectChanges();

    const recognizeButton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((button) => button.textContent?.trim() === 'Reconhecer');
    recognizeButton?.click();
    recognizeButton?.click();
    fixture.detectChanges();

    expect(service.updateOccurrenceStatus).toHaveBeenCalledTimes(1);
  });
});
