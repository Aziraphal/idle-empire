import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { empireRouter } from "./routers/empire";
import { constructionRouter } from "./routers/construction";
import { governorsRouter } from "./routers/governors";
import { explorationRouter } from "./routers/exploration";
import { eventsRouter } from "./routers/events";
import { combatRouter } from "./routers/combat";
import { technologiesRouter } from "./routers/technologies";
import { seasonsRouter } from "./routers/seasons";
import { alliancesRouter } from "./routers/alliances";
// import { rewardsRouter } from "./routers/rewards"; // Temporairement désactivé

export const appRouter = createTRPCRouter({
  auth: authRouter,
  empire: empireRouter,
  construction: constructionRouter,
  governors: governorsRouter,
  exploration: explorationRouter,
  events: eventsRouter,
  combat: combatRouter,
  technologies: technologiesRouter,
  seasons: seasonsRouter,
  alliances: alliancesRouter,
  // rewards: rewardsRouter, // Temporairement désactivé
});

export type AppRouter = typeof appRouter;