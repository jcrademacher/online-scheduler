import { useActivityPrototypesQuery } from "../queries";
import { useScheduleQuery } from "../queries";
import { useAllActivitiesQuery } from "../queries";

export type Analysis = {
    warnings: string[],
    errors: string[],
    info: string[]
}

export async function analyzeSchedule(scheduleId: string): Promise<Analysis> {
    
    // const actProtoQuery = useActivityPrototypesQuery(scheduleId);
    // const schQuery = useScheduleQuery(scheduleId);
    // const actsQuery = useAllActivitiesQuery(scheduleId, actProtoQuery.data);

    return {
        warnings: ["This is a warning", "This is another warning"],
        errors: ["This is an error", "This is another error"],
        info: ["This is info", "This is another info"]
    }
}