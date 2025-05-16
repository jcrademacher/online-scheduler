import type { Schema } from "../../amplify/data/resource.ts";

export type Zone = Schema["Zone"]["type"];

export const ZONE_OPTIONS: { [key: string]: Zone } = {
    ridge: { xtime: 10, ytime: 0, name: "ridge" },
    waterfront: { xtime: -10, ytime: 0, name: "waterfront" },
    central: { xtime: 0, ytime: 0, name: "central" }
};

export const TRAVEL_TIME_WARNING_THRESHOLD = 15;
export const TRAVEL_TIME_ERROR_THRESHOLD = 25;

export const EMPTY_HOURS_THRESHOLD = 2;