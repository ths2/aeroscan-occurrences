import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { Occurrence, OccurrenceStatus, OccurrenceStatusFilter } from './occurrences.model';
import { OccurrencesService } from './occurrences.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly occurrencesService = inject(OccurrencesService);
  private readonly datePipe = inject(DatePipe);

  readonly filters: Array<{ label: string; value: OccurrenceStatusFilter }> = [
    { label: 'Todos', value: 'all' },
    { label: 'Abertas', value: 'open' },
    { label: 'Reconhecidas', value: 'acknowledged' },
    { label: 'Resolvidas', value: 'resolved' },
  ];

  readonly selectedStatus = signal<OccurrenceStatusFilter>('all');
  readonly occurrences = signal<Occurrence[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly actionErrors = signal<Record<string, string>>({});
  readonly pendingStatusUpdate = signal<Record<string, boolean>>({});
  readonly resolutionDrafts = signal<Record<string, string>>({});
  readonly resolutionFormOpen = signal<string | null>(null);
  readonly filteredOccurrences = computed(() => this.occurrences());

  ngOnInit(): void {
    this.loadOccurrences();
  }

  loadOccurrences(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.occurrencesService
      .getOccurrences(this.selectedStatus(), undefined)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (items) => {
          this.occurrences.set(items);
        },
        error: () => {
          this.errorMessage.set('Não foi possível carregar as ocorrências no momento.');
        },
      });
  }

  onFilterChange(status: OccurrenceStatusFilter): void {
    this.selectedStatus.set(status);
    this.loadOccurrences();
  }

  canRecognize(status: OccurrenceStatus): boolean {
    return status === 'open';
  }

  canResolve(status: OccurrenceStatus): boolean {
    return status === 'acknowledged';
  }

  isActionInProgress(id: string): boolean {
    return this.pendingStatusUpdate()[id] ?? false;
  }

  isResolutionFormOpen(id: string): boolean {
    return this.resolutionFormOpen() === id;
  }

  openResolutionForm(id: string): void {
    this.resolutionFormOpen.set(id);
    this.actionErrors.update((current) => ({ ...current, [id]: '' }));
  }

  updateResolutionDraft(id: string, value: string): void {
    this.resolutionDrafts.update((current) => ({ ...current, [id]: value }));

    if (this.actionErrors()[id]) {
      this.actionErrors.update((current) => ({ ...current, [id]: '' }));
    }
  }

  submitResolution(id: string): void {
    const note = (this.resolutionDrafts()[id] ?? '').trim();

    if (note.length === 0) {
      this.actionErrors.update((current) => ({
        ...current,
        [id]: 'A nota de resolução é obrigatória e não pode conter somente espaços.',
      }));
      return;
    }

    this.updateStatus(id, 'resolved', note);
  }

  updateStatus(id: string, nextStatus: OccurrenceStatus, note?: string): void {
    if (this.pendingStatusUpdate()[id]) {
      return;
    }

    this.pendingStatusUpdate.update((current) => ({ ...current, [id]: true }));
    this.actionErrors.update((current) => ({ ...current, [id]: '' }));

    this.occurrencesService
      .updateOccurrenceStatus(id, nextStatus, note)
      .pipe(
        finalize(() => {
          this.pendingStatusUpdate.update((current) => {
            const next = { ...current };
            delete next[id];
            return next;
          });
        }),
      )
      .subscribe({
        next: () => {
          this.resolutionFormOpen.set(null);
          this.loadOccurrences();
        },
        error: () => {
          this.actionErrors.update((current) => ({
            ...current,
            [id]: 'Não foi possível atualizar o status da ocorrência.',
          }));
        },
      });
  }

  formatDate(value: string): string {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return this.datePipe.transform(parsed, 'dd/MM/yyyy HH:mm:ss') ?? value;
  }

  severityClass(value: number): string {
    if (value >= 4) {
      return 'severity-high';
    }

    if (value === 3) {
      return 'severity-medium';
    }

    return 'severity-low';
  }
}
