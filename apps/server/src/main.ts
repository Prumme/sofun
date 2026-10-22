import { createApplication } from './bootstrap.js';
import { environmentSchema } from './config/config.js';
const config = environmentSchema.parse(process.env);
const app = await createApplication();
await app.listen(config.PORT, config.HOST);
