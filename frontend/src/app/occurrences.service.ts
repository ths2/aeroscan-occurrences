import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Occurrence, OccurrenceStatus, OccurrenceStatusFilter, UpdateOccurrenceStatusRequest } from './occurrences.model';

@Injectable({ providedIn: 'root' })
export class OccurrencesService {
  private readonly http = inject(HttpClient);

  getOccurrences(status?: OccurrenceStatusFilter, siteId?: string): Observable<Occurrence[]> {
    let params = new HttpParams();

    if (status && status !== 'all') {
      params = params.set('status', status);
    }

    if (siteId && siteId.trim().length > 0) {
      params = params.set('siteId', siteId.trim());
    }

    return this.http.get<Occurrence[]>('http://localhost:3000/occurrences', { params });
  }

  updateOccurrenceStatus(id: string, status: OccurrenceStatus, note?: string): Observable<Occurrence> {
    const payload: UpdateOccurrenceStatusRequest = { status };

    if (status === 'resolved') {
      const trimmedNote = note?.trim() ?? '';

      if (trimmedNote.length > 0) {
        payload.note = trimmedNote;
      }
    }

    return this.http.patch<Occurrence>(`http://localhost:3000/occurrences/${id}/status`, payload);
  }
}
