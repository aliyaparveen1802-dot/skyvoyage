import 'dotenv/config';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

const server = app.listen(port, () => {
  console.log(`SkyVoyage API listening on http://localhost:${port}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});
