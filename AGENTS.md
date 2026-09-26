# AeroScan Occurrences - Engineering Guidelines

## Project

Technical challenge: occurrence center for drone security alerts.

## Stack

- Backend: Node.js + TypeScript + NestJS
- Database: MongoDB + Mongoose
- Frontend: Angular 22
- Tests: use the testing stack already provided by the official NestJS starter
- MongoDB runs through Docker Compose

## Repository

- `backend/` - NestJS API
- `frontend/` - Angular application
- `frontend-dist/` - final compiled frontend
- `docker-compose.yml` - MongoDB

Do not introduce Nx, npm workspaces, Redis, Kafka, authentication,
microservices, Kubernetes or additional infrastructure unless explicitly requested.

## Occurrence domain

Occurrence fields:

- siteId
- droneId
- type
- severity
- detectedAt
- status
- count
- note

Allowed occurrence types:

- intrusion
- perimeter_breach
- low_battery
- signal_loss

Severity:

- integer from 1 to 5

Status:

- open
- acknowledged
- resolved

New occurrences start with:

- status = open
- count = 1

## API

The challenge exposes exactly these business endpoints:

### POST /occurrences

Input:

- siteId
- droneId
- type
- severity
- detectedAt

Grouping rule:

If an `open` occurrence exists with the same `siteId` and `type`
within the previous 10 minutes:

- do not create another occurrence
- increment `count`
- increment existing severity by 1
- severity must never exceed 5

Otherwise create a new occurrence.

### GET /occurrences

Optional query parameters:

- status
- siteId

Priority is calculated as:

severity * type weight

Weights:

- intrusion = 3
- perimeter_breach = 2
- low_battery = 1
- signal_loss = 1

Ordering:

1. priority descending
2. detectedAt descending

Priority should be computed rather than persisted unless there is a
clear technical reason to do otherwise.

### PATCH /occurrences/:id/status

Allowed transitions:

open -> acknowledged
acknowledged -> resolved

Skipping states is forbidden.

Resolving an acknowledged occurrence requires a non-empty `note`.

Invalid state transitions must return HTTP 409.

## Engineering rules

- Keep the implementation simple.
- Do not overengineer.
- Controllers should handle HTTP concerns.
- Business rules belong in services/domain logic.
- Database access should not contain unrelated business logic.
- Validate external input.
- Prefer explicit types.
- Avoid `any`.
- Keep functions small and readable.
- Do not add dependencies without a concrete reason.
- Do not implement features outside the challenge.
- Do not modify unrelated files.
- Preserve the existing project architecture.

## Testing

Business rules are more important than coverage percentage.

Tests should especially cover:

- creation of a new occurrence
- grouping inside the 10-minute window
- no grouping outside the window
- grouping only open occurrences
- grouping requires same siteId and type
- count increment
- severity increment
- severity cap at 5
- priority calculation
- priority ordering
- detectedAt tie-breaking
- filters
- valid status transitions
- invalid transitions returning 409
- resolution note requirement

## AI workflow

Work incrementally.

For every task:

1. inspect the existing implementation
2. explain the intended change briefly
3. modify only what is required
4. add or update relevant tests
5. run appropriate tests
6. run lint
7. run build
8. report what changed and any assumptions

Do not implement future phases unless explicitly requested.

## README maintenance

The root `README.md` is part of the deliverable and must evolve together
with the implementation.

After completing each task, review the root `README.md` and update it only
when the task introduces information that belongs there.

Update when applicable:

- setup or execution instructions
- environment variables
- architecture or project structure
- implemented API behavior
- technical decisions
- explicit assumptions
- testing instructions
- AI usage examples
- relevant corrections made after AI review

Rules:

- Never invent decisions, assumptions, results or AI interactions.
- Document only what actually happened in the project.
- Do not rewrite unrelated README sections.
- Keep documentation concise and aligned with the current implementation.
- Do not document planned behavior as if it were already implemented.
- Preserve the distinction between challenge requirements and project assumptions.
- If a task does not require a README change, explicitly report:
  "README: no update required."
- README changes must be included in the final task summary.

## AI usage documentation

When an AI-generated implementation or technical decision is reviewed and
meaningfully corrected by the developer, consider whether it is a useful
real example for the `Como usei IA` section of the root README.

Only record meaningful examples.

Do not record trivial formatting changes or manufacture examples just to
populate the section.