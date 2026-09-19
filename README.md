# Velozity Client Project Dashboard

Full-stack internal project dashboard with API-enforced role access, durable activity, live Socket.io updates, notifications, and a scheduled overdue-task job.

## Architecture

- **React + TypeScript + Vite** supplies the typed dashboard client.
- **Express + TypeScript** keeps authentication and authorization middleware explicit.
- **PostgreSQL + Prisma** models Users, Clients, Projects, Tasks, Activities, Notifications, and RefreshTokens with foreign keys. Indexes target project/task status, assignee/due date, overdue scans, activity feeds, and unread notifications.
- **Socket.io** is used for authenticated rooms, reconnect behavior, and named events. Admins receive global activity; PMs join only their owned-project rooms; developers join only rooms with an assigned task. The database-backed `/api/activity` endpoint retrieves the last 20 role-scoped events after a reconnect.
- **node-cron** runs hourly for the idempotent overdue update. A durable queue is the recommended production evolution for multiple API instances.

## Security

Access JWTs are short-lived. Refresh JWTs are stored only in an `HttpOnly`, `SameSite=Lax` cookie and their bcrypt hashes are persisted in the database. Every protected endpoint checks the role and resource ownership: PMs can act only on projects they own, and developers only on their assigned tasks. Zod validates API input; errors consistently use `{ error: { code, message } }`.

## Run locally

1. Copy `.env.example` to `.env` and replace both JWT secrets.
2. Start PostgreSQL with `docker compose up -d`.
3. Run `npm install`.
4. Run `npm run prisma -w api -- generate && npm run prisma -w api -- migrate dev --name init`.
5. Run `npm run seed`, then `npm run dev`.
6. Visit `http://localhost:5173`.

The seeded password is `Demo123!`. Try `admin@velozity.dev`, `maya@velozity.dev`, `ravi@velozity.dev`, or `dev1@velozity.dev`.

The seed creates 1 admin, 2 PMs, 4 developers, 3 projects, 15 mixed-status tasks, pre-existing activities, and two overdue tasks.

## Deployment

Deploy `apps/web` to Vercel with `VITE_API_URL` pointing at the API. Deploy `apps/api` to a persistent Node service such as Render, Railway, or Fly.io with managed Postgres, `CLIENT_ORIGIN`, and secure environment secrets. Vercel serverless functions cannot sustain Socket.io connections, so its configuration is intended for REST-only experimentation; the real-time API needs a persistent host.

## Explanation (188 words)

The hardest problem was delivering a real-time feed without making the browser responsible for access control. Broadcasting all status changes and hiding rows in React would leak project details, especially to developers. This implementation authenticates the Socket.io connection using the same access token as the API, then derives authorized rooms from database relationships. Project managers join rooms only for projects they own, developers join only rooms where they have an assigned task, and admins additionally join the global activity room. The HTTP layer repeats the same ownership checks before it permits a task mutation, so a modified client request cannot grant a developer or PM more access.

Each status change is inserted as an Activity row before it is emitted. That makes the real-time event an optimization rather than the sole source of truth. On login or reconnect, the UI fetches the most recent 20 activity rows through a role-scoped endpoint, satisfying missed-event catchup from the database instead of from process memory. Overdue detection similarly runs in a scheduled database update, rather than being derived only while a page is open.

With more time, I would add Redis-backed Socket.io rooms and BullMQ jobs so presence, events, and scheduling remain correct across multiple API replicas.
