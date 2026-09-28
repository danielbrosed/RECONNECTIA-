# Platform code

A selection of files from the Reconnect.iA platform, published as they run in production. The comments are in Spanish because that is the team's working language. The rest of the application stays private: it is a live system with personal and employment data, and I don't want its whole attack surface in a public repository.

The pure modules in `lib/` and their tests run on their own:

```bash
cd platform
npm install
npm test        # node --test with the tsx loader: 5 suites, 35 tests
```

The React components, the Prisma schema and the modules that talk to the database are here to be read. They import parts of the app that are not published, so they will not compile from this folder.

## Data model

[`prisma/schema.prisma`](prisma/schema.prisma) is the full schema: 59 models covering users and the four profile types, courses and enrolments, jobs and applications, the course deliveries with their trainer matching, the SkillPoints and TimePoints economy, assessments, the multi-tenant bridge and the audit log. Most models carry a comment explaining why they look the way they do, for example why a trainer's bank details live in their own table or why some references have no foreign key.

## Security and access

| File | What it shows |
|---|---|
| [`lib/session-version.ts`](lib/session-version.ts), [`lib/session-version-server.ts`](lib/session-version-server.ts) | Sessions you can revoke. The JWT carries a per-user version that is compared on every request behind a 10-second cache. Bumping it (password change, admin reset, key rotation) ends every other session at once and issues the user's own session again. The logic is split from the I/O so it can be tested without a database. |
| [`lib/verify-email.ts`](lib/verify-email.ts), [`lib/tokens.ts`](lib/tokens.ts) | One-time links tied to a purpose. Verification, invitation and reset tokens share a table, so a prefix inside the token decides which screen can use it. Side effects are injected, and the tests check the order they run in. |
| [`lib/net.ts`](lib/net.ts) | A client IP that cannot be spoofed: the value N hops from the right of `X-Forwarded-For`, where N is the number of trusted proxies, with a warning at boot when it is not configured. |
| [`lib/rate-limit.ts`](lib/rate-limit.ts) | A fixed-window limiter with lazy expiry that fails open, behind a signature a shared store can implement later. |
| [`lib/entidad/validacion.ts`](lib/entidad/validacion.ts) | A validation workflow whose state is derived from timestamps instead of a stored flag, so the two can never disagree. |
| [`scripts/_guard-db.mjs`](scripts/_guard-db.mjs) | The guard every script goes through to pick its database. Production needs an explicit flag and variables with other names. The top of the file explains why it exists. |

## Matching and domain logic

| File | What it shows |
|---|---|
| [`lib/matching.ts`](lib/matching.ts) | Job and candidate affinity: the share of required skills the candidate has, 50 when the offer asks for none. |
| [`lib/formacion-affinity.ts`](lib/formacion-affinity.ts), [`lib/geo.ts`](lib/geo.ts) | Trainer and delivery affinity: a services match multiplied by a distance factor that depends on the delivery mode, tuned with a real example from the operator. |
| [`lib/labor.ts`](lib/labor.ts), [`lib/servicios.ts`](lib/servicios.ts), [`lib/schedule.ts`](lib/schedule.ts), [`lib/fechas-es.ts`](lib/fechas-es.ts) | The closed lists behind the employment profile, the service catalogue, schedule helpers and Spanish date formatting. |

## Interface

| File | What it shows |
|---|---|
| [`app/(app)/formador/formaciones/FormacionSwipeDeck.tsx`](app/(app)/formador/formaciones/FormacionSwipeDeck.tsx), [`FormacionCard.tsx`](app/(app)/formador/formaciones/FormacionCard.tsx) | The trainer's swipe deck: drag or buttons, optimistic updates with `useTransition`, a warning when a delivery is far away. |
| [`app/(app)/formador/AgendaCalendar.tsx`](app/(app)/formador/AgendaCalendar.tsx), [`AgendaEventModal.tsx`](app/(app)/formador/AgendaEventModal.tsx) | A month calendar written from scratch, with the event editor. |
| [`app/(app)/empresa/candidatos/TalentCard.tsx`](app/(app)/empresa/candidatos/TalentCard.tsx), [`LockedTalentCard.tsx`](app/(app)/empresa/candidatos/LockedTalentCard.tsx) | Talent search cards, open and locked, with the unlock flow. |
| [`app/(app)/AppNav.tsx`](app/(app)/AppNav.tsx) | The contextual top navigation, driven by one table of areas and tabs per role. |
| [`app/(app)/_shared/ServiciosPicker.tsx`](app/(app)/_shared/ServiciosPicker.tsx), [`ProvinciaCiudad.tsx`](app/(app)/_shared/ProvinciaCiudad.tsx), [`app/(app)/empresa/_ui/KPI.tsx`](app/(app)/empresa/_ui/KPI.tsx) | Shared form controls and the KPI tile. |
| [`app/globals.css`](app/globals.css) | The design tokens: ivory and ink colours, fonts, letter spacing and easing curves. |
| [`lib/emails/layout.ts`](lib/emails/layout.ts), [`lib/emails/entidad-validacion.ts`](lib/emails/entidad-validacion.ts) | The branded email layout and one of the templates built on it. |

## Tooling

| File | What it shows |
|---|---|
| [`scripts/run-tests.mjs`](scripts/run-tests.mjs) | A test launcher with no dependencies that works on the Node version production builds with. |
| [`instrumentation.ts`](instrumentation.ts) | Checks that run when the server boots. |

## Tests

```
lib/entidad/validacion.test.ts   derived validation state
lib/net.test.ts                  trusted hops, spoofing attempts, limiter keys
lib/rate-limit.test.ts           windows, expiry, failing open
lib/session-version.test.ts      version comparison, cache, expulsion
lib/verify-email.test.ts         token purposes, expiry, order of side effects
```
