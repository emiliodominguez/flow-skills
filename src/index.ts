import { buildProgram } from "./cli.js";
import { log } from "./core/logger.js";

buildProgram()
	.parseAsync(process.argv)
	.catch((err: unknown) => {
		log.error(err instanceof Error ? err.message : String(err));
		process.exit(1);
	});
