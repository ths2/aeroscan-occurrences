import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { Occurrence, OccurrenceStatusFilter } from './occurrences.model';
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
