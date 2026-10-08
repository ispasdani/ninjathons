/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as badges from "../badges.js";
import type * as benchmark from "../benchmark.js";
import type * as challenges from "../challenges.js";
import type * as crons from "../crons.js";
import type * as daily from "../daily.js";
import type * as ghosts from "../ghosts.js";
import type * as groups from "../groups.js";
import type * as http from "../http.js";
import type * as judge_checker from "../judge/checker.js";
import type * as judge_harness from "../judge/harness.js";
import type * as judge_judge from "../judge/judge.js";
import type * as judge_languages_cpp from "../judge/languages/cpp.js";
import type * as judge_languages_csharp from "../judge/languages/csharp.js";
import type * as judge_languages_index from "../judge/languages/index.js";
import type * as judge_languages_java from "../judge/languages/java.js";
import type * as judge_languages_javascript from "../judge/languages/javascript.js";
import type * as judge_languages_limits from "../judge/languages/limits.js";
import type * as judge_languages_python from "../judge/languages/python.js";
import type * as judge_languages_rust from "../judge/languages/rust.js";
import type * as judge_languages_types from "../judge/languages/types.js";
import type * as judge_languages_typescript from "../judge/languages/typescript.js";
import type * as judge_types from "../judge/types.js";
import type * as judge_values from "../judge/values.js";
import type * as judge_vercelRunner from "../judge/vercelRunner.js";
import type * as judge_wire from "../judge/wire.js";
import type * as judging from "../judging.js";
import type * as leaderboards from "../leaderboards.js";
import type * as lib_badges from "../lib/badges.js";
import type * as lib_codes from "../lib/codes.js";
import type * as lib_countries from "../lib/countries.js";
import type * as lib_daily from "../lib/daily.js";
import type * as lib_days from "../lib/days.js";
import type * as lib_functions from "../lib/functions.js";
import type * as lib_ghosts from "../lib/ghosts.js";
import type * as lib_glicko2 from "../lib/glicko2.js";
import type * as lib_groups from "../lib/groups.js";
import type * as lib_leaderboards from "../lib/leaderboards.js";
import type * as lib_levels from "../lib/levels.js";
import type * as lib_matches from "../lib/matches.js";
import type * as lib_matchmaking from "../lib/matchmaking.js";
import type * as lib_openskill from "../lib/openskill.js";
import type * as lib_problems from "../lib/problems.js";
import type * as lib_ratings from "../lib/ratings.js";
import type * as lib_territory from "../lib/territory.js";
import type * as lib_territoryMap from "../lib/territoryMap.js";
import type * as lib_usernames from "../lib/usernames.js";
import type * as lib_weekly from "../lib/weekly.js";
import type * as lib_xp from "../lib/xp.js";
import type * as matches from "../matches.js";
import type * as problems from "../problems.js";
import type * as queue from "../queue.js";
import type * as ratings from "../ratings.js";
import type * as schemas_challenges from "../schemas/challenges.js";
import type * as schemas_groups from "../schemas/groups.js";
import type * as schemas_leaderboards from "../schemas/leaderboards.js";
import type * as schemas_matches from "../schemas/matches.js";
import type * as schemas_problems from "../schemas/problems.js";
import type * as schemas_progression from "../schemas/progression.js";
import type * as schemas_ratings from "../schemas/ratings.js";
import type * as schemas_submissions from "../schemas/submissions.js";
import type * as schemas_territory from "../schemas/territory.js";
import type * as schemas_users from "../schemas/users.js";
import type * as submissions from "../submissions.js";
import type * as territory from "../territory.js";
import type * as testDrives from "../testDrives.js";
import type * as testDrivesFill from "../testDrivesFill.js";
import type * as user from "../user.js";
import type * as weekly from "../weekly.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  badges: typeof badges;
  benchmark: typeof benchmark;
  challenges: typeof challenges;
  crons: typeof crons;
  daily: typeof daily;
  ghosts: typeof ghosts;
  groups: typeof groups;
  http: typeof http;
  "judge/checker": typeof judge_checker;
  "judge/harness": typeof judge_harness;
  "judge/judge": typeof judge_judge;
  "judge/languages/cpp": typeof judge_languages_cpp;
  "judge/languages/csharp": typeof judge_languages_csharp;
  "judge/languages/index": typeof judge_languages_index;
  "judge/languages/java": typeof judge_languages_java;
  "judge/languages/javascript": typeof judge_languages_javascript;
  "judge/languages/limits": typeof judge_languages_limits;
  "judge/languages/python": typeof judge_languages_python;
  "judge/languages/rust": typeof judge_languages_rust;
  "judge/languages/types": typeof judge_languages_types;
  "judge/languages/typescript": typeof judge_languages_typescript;
  "judge/types": typeof judge_types;
  "judge/values": typeof judge_values;
  "judge/vercelRunner": typeof judge_vercelRunner;
  "judge/wire": typeof judge_wire;
  judging: typeof judging;
  leaderboards: typeof leaderboards;
  "lib/badges": typeof lib_badges;
  "lib/codes": typeof lib_codes;
  "lib/countries": typeof lib_countries;
  "lib/daily": typeof lib_daily;
  "lib/days": typeof lib_days;
  "lib/functions": typeof lib_functions;
  "lib/ghosts": typeof lib_ghosts;
  "lib/glicko2": typeof lib_glicko2;
  "lib/groups": typeof lib_groups;
  "lib/leaderboards": typeof lib_leaderboards;
  "lib/levels": typeof lib_levels;
  "lib/matches": typeof lib_matches;
  "lib/matchmaking": typeof lib_matchmaking;
  "lib/openskill": typeof lib_openskill;
  "lib/problems": typeof lib_problems;
  "lib/ratings": typeof lib_ratings;
  "lib/territory": typeof lib_territory;
  "lib/territoryMap": typeof lib_territoryMap;
  "lib/usernames": typeof lib_usernames;
  "lib/weekly": typeof lib_weekly;
  "lib/xp": typeof lib_xp;
  matches: typeof matches;
  problems: typeof problems;
  queue: typeof queue;
  ratings: typeof ratings;
  "schemas/challenges": typeof schemas_challenges;
  "schemas/groups": typeof schemas_groups;
  "schemas/leaderboards": typeof schemas_leaderboards;
  "schemas/matches": typeof schemas_matches;
  "schemas/problems": typeof schemas_problems;
  "schemas/progression": typeof schemas_progression;
  "schemas/ratings": typeof schemas_ratings;
  "schemas/submissions": typeof schemas_submissions;
  "schemas/territory": typeof schemas_territory;
  "schemas/users": typeof schemas_users;
  submissions: typeof submissions;
  territory: typeof territory;
  testDrives: typeof testDrives;
  testDrivesFill: typeof testDrivesFill;
  user: typeof user;
  weekly: typeof weekly;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
