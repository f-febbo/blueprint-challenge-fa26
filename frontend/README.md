# LibraryConnect frontend

React and TypeScript app for the library catalog and checkout history.

Use Node.js 22 and start the backend before submitting forms.

```bash
npm ci
npm run dev
```

Open http://localhost:5173. The API defaults to http://localhost:8000.
To change it, set `VITE_API_BASE_URL` when starting or building the frontend:

```bash
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

```bash
npm test
npm run lint
npm run build
```

The production output is in `dist/`. See the root README for PostgreSQL and Docker setup.
