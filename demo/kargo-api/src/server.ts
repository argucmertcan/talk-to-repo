import { createApp } from "./app";
import { config } from "./config";
import { logger } from "./utils/logger";
import { startJobs } from "./jobs";

const app = createApp();
app.listen(config.port, () => logger.info(`kargo-api :${config.port}`));
startJobs();
