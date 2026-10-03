/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as http from "../http.js";
import type * as judge_checker from "../judge/checker.js";
import type * as judge_harness from "../judge/harness.js";
import type * as judge_judge from "../judge/judge.js";
import type * as judge_languages_index from "../judge/languages/index.js";
import type * as judge_languages_javascript from "../judge/languages/javascript.js";
import type * as judge_languages_python from "../judge/languages/python.js";
import type * as judge_languages_types from "../judge/languages/types.js";
import type * as judge_types from "../judge/types.js";
import type * as judge_values from "../judge/values.js";
import type * as judge_vercelRunner from "../judge/vercelRunner.js";
import type * as judging from "../judging.js";
import type * as lib_functions from "../lib/functions.js";
import type * as lib_xp from "../lib/xp.js";
import type * as problems from "../problems.js";
import type * as schemas_problems from "../schemas/problems.js";
import type * as schemas_progression from "../schemas/progression.js";
import type * as schemas_submissions from "../schemas/submissions.js";
import type * as schemas_users from "../schemas/users.js";
import type * as submissions from "../submissions.js";
import type * as user from "../user.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  "judge/checker": typeof judge_checker;
  "judge/harness": typeof judge_harness;
  "judge/judge": typeof judge_judge;
  "judge/languages/index": typeof judge_languages_index;
  "judge/languages/javascript": typeof judge_languages_javascript;
  "judge/languages/python": typeof judge_languages_python;
  "judge/languages/types": typeof judge_languages_types;
  "judge/types": typeof judge_types;
  "judge/values": typeof judge_values;
  "judge/vercelRunner": typeof judge_vercelRunner;
  judging: typeof judging;
  "lib/functions": typeof lib_functions;
  "lib/xp": typeof lib_xp;
  problems: typeof problems;
  "schemas/problems": typeof schemas_problems;
  "schemas/progression": typeof schemas_progression;
  "schemas/submissions": typeof schemas_submissions;
  "schemas/users": typeof schemas_users;
  submissions: typeof submissions;
  user: typeof user;
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
