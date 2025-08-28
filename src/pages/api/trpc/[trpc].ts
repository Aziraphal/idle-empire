import { createNextApiHandler } from "@trpc/server/adapters/next";
import { appRouter } from "@/server/api/root";
import { createContext } from "@/server/trpc/context";
import { startGovernorCron } from "@/server/governor-cron";

// Start Governor AI automation when server starts
if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "development") {
  startGovernorCron();
}

export default createNextApiHandler({
  router: appRouter,
  createContext,
  onError:
    process.env.NODE_ENV === "development"
      ? ({ path, error }) => {
          console.error(`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`);
        }
      : undefined,
});