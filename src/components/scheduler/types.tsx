import { LocalLegActivity, LocalGlobalActivity } from "../../api/apiActivity";

// export type LocalActivity = {
//     scheduleId: string,
//     startTime: moment.Moment,
//     shadow: boolean,
//     leg: number[],
//     supportName: string,
//     activityPrototypeId: string
// };

// export type LocalActivityMap = {
//     [id: string]: LocalActivity[]
// }

export function isLocalLegActivity(act: LocalLegActivity | LocalGlobalActivity): act is LocalLegActivity {
    return 'activityPrototypeId' in act;
}

export function isLocalGlobalActivity(act: LocalLegActivity | LocalGlobalActivity): act is LocalGlobalActivity {
    return 'scheduleId' in act;
}

export type TimeMap<T> = {
    [time: string]: T
}

// export type LocalActivityMap = {
//     [id: string]: TimeMap<LocalActivity>
// }


export type LocalIDMap<T> = {
    [id: string]: TimeMap<T>;
};

export type ScheduleObject = {
    acts: LocalIDMap<LocalLegActivity>,
    globalActs: TimeMap<LocalGlobalActivity>
}

export enum ScheduleObjectTypes {
    LegActivity = 'LegActivity',
    GlobalActivity = "GlobalActivity"
}

// export type ScheduleObject = {
//     type: ScheduleObjectTypes,
//     value: LocalActivity | GlobalActivity
// }

export enum GlobalActivityDragStatus {
    NONE = "none",
    MOUSEDOWN = "mousedown",
    DRAGGING = "dragging"
}

export type GlobalActivityState = {
    status: GlobalActivityDragStatus,
    originCell?: [id: string, time: moment.Moment], // [element prototype ID, time]
    currentCell?: [id: string, time: moment.Moment]
}

export type LocalActivity = LocalLegActivity | LocalGlobalActivity;
export type LegSchedule = LocalActivity[];