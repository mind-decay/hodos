import { createApp } from './server.js';

const port = Number(process.env.PORT ?? 3000);
createApp().listen(port, () => {
  process.stdout.write(`api fixture listening on http://localhost:${port}\n`);
});
