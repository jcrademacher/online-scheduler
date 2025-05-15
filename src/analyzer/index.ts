import { LocalLegActivity, LocalGlobalActivity } from "../api/apiActivity"
import { isLocalGlobalActivity, isLocalLegActivity, TimeMap } from "../components/scheduler/types"
import { LocalIDMap, LocalActivity, LegSchedule } from "../components/scheduler/types"
import { createTime, dayOfCamp, getTotalScheduleSlotCount, timeFormatKey, timeFormatLocal } from "../utils/time"
import { ActivityPrototypeMap } from "../api/apiActivityPrototype"
import { Schedule } from "../api/apiSchedule"
import moment from "moment";
import { EMPTY_HOURS_THRESHOLD, TRAVEL_TIME_WARNING_THRESHOLD, ZONE_OPTIONS } from "./defines"
import { Zone } from "./defines"

export type Analysis = {
    warningMessages: string[],
    errorMessages: string[],
    infoMessages: string[]
}

export type MappedAnalysis = LocalIDMap<Analysis>;

export type AnalysisResult = {
    locations: MappedAnalysis,
    protoLocations: { [id: string]: Analysis },
    infoMessages: string[],
    warningMessages: string[],
    errorMessages: string[]
}

function analysisFactory(acts: LocalIDMap<LocalLegActivity>, protos: ActivityPrototypeMap ): AnalysisResult {
    // Create empty analysis object to serve as template
    const emptyAnalysis: Analysis = {
        errorMessages: [],
        warningMessages: [], 
        infoMessages: []
    };

    // Initialize protoLocations by mapping each prototype ID to a fresh copy of emptyAnalysis
    const protoLocations = Object.fromEntries(
        Object.entries(protos).map(([key, _]) => [
            key, 
            {
                errorMessages: [...emptyAnalysis.errorMessages],
                warningMessages: [...emptyAnalysis.warningMessages],
                infoMessages: [...emptyAnalysis.infoMessages]
            }
        ])
    );

    return {
        locations: Object.fromEntries(
            Object.entries(acts).map(([key, _]) => [key, {} as TimeMap<Analysis>])
        ),
        protoLocations: protoLocations,
        infoMessages: [],
        warningMessages: [],
        errorMessages: []
    }
}

export async function analyzeSchedule(schedule: Schedule, acts: LocalIDMap<LocalLegActivity>, gacts: TimeMap<LocalGlobalActivity>, protos: ActivityPrototypeMap): Promise<AnalysisResult> {
    
    // const actProtoQuery = useActivityPrototypesQuery(scheduleId);
    // const schQuery = useScheduleQuery(scheduleId);
    // const actsQuery = useAllActivitiesQuery(scheduleId, actProtoQuery.data);

    var analysisResult = analysisFactory(acts, protos);
    const legSchedules = extractLegSchedules(schedule, acts, gacts);

    analyzeRepetition(schedule, acts, protos, analysisResult);
    analysisResult.infoMessages.push("Analyzed repetitions");

    analyzeOverlap(schedule, acts, protos, analysisResult);
    analysisResult.infoMessages.push("Analyzed overlaps");

    analyzeTravelTime(legSchedules, protos, analysisResult);
    analysisResult.infoMessages.push("Analyzed travel time");

    analyzeDays(schedule, legSchedules, protos, analysisResult);
    analysisResult.infoMessages.push("Analyzed preferred days");

    analyzeDensity(schedule, legSchedules, protos, analysisResult);
    analysisResult.infoMessages.push("Analyzed unused time");

    return analysisResult;
}



function extractLegSchedules(schedule: Schedule, acts: LocalIDMap<LocalLegActivity>, gacts: TimeMap<LocalGlobalActivity>): LegSchedule[] {
    const legSchedules = [];
    
    for(let legNumber = 1; legNumber <= schedule.numLegs; legNumber++) {
        // Create an array to store all activities
        let allActivities: (LocalLegActivity | LocalGlobalActivity)[] = [];
        
        // First, collect all regular activities for this leg
        for (const protoId in acts) {
            const protoActs = acts[protoId];
            for (const timeKey in protoActs) {
                const activity = protoActs[timeKey];
                // Only include activities that this leg is part of
                if (activity.leg.includes(legNumber)) {
                    allActivities.push(activity);
                }
            }
        }

        // Then, collect all global activities and convert them to LocalLegActivity format
        for (const timeKey in gacts) {
            const gact = gacts[timeKey];        
            allActivities.push(gact);
        }

        // Sort all activities by start time
        allActivities.sort((a, b) => 
            createTime(a.startTime).diff(createTime(b.startTime))
        );

        legSchedules.push(allActivities);
    }

    return legSchedules;
}

function pushProtoResult(
    analysisResult: AnalysisResult,
    protoId: string,
    message: string,
    type: "warning" | "error" | "info"
) : void {
    const typeKey = type === "warning" ? "warningMessages" : type === "error" ? "errorMessages" : "infoMessages";

    analysisResult.protoLocations[protoId][typeKey].push(message);
    analysisResult[typeKey].push(message);
}

// effectively dedupes the individual locations into the parent location message list
function pushActivityResult(
    analysisResult: AnalysisResult, 
    a: LocalLegActivity | LocalGlobalActivity, 
    message: string,
    type: "warning" | "error" | "info",
    dedupe: boolean = true
) : void {

    const typeKey = type === "warning" ? "warningMessages" : type === "error" ? "errorMessages" : "infoMessages";

    if(isLocalLegActivity(a)) {
        analysisResult.locations[a.activityPrototypeId][a.startTime][typeKey].push(message);

        if(dedupe && analysisResult[typeKey].includes(message)) {
            return;
        }

        analysisResult[typeKey].push(message);
    }
    else {
        console.error("pushActivityResult: a is not a LocalLegActivity");
    }
}

function pushDoubleActivityResult(
    analysisResult: AnalysisResult, 
    a: LocalLegActivity | LocalGlobalActivity, 
    b: LocalLegActivity | LocalGlobalActivity, 
    aStartTime: string, 
    bStartTime: string,
    type: "warning" | "error" | "info",
    aMessage: string,
    bMessage: string = aMessage
) : void {

    const typeKey = type === "warning" ? "warningMessages" : type === "error" ? "errorMessages" : "infoMessages";

    if(isLocalLegActivity(a) && isLocalLegActivity(b)) {
        analysisResult.locations[a.activityPrototypeId][aStartTime][typeKey].push(aMessage);
        analysisResult.locations[b.activityPrototypeId][bStartTime][typeKey].push(bMessage);
        analysisResult[typeKey].push(aMessage);
    }
    else {
        console.error("pushDoubleActivityResult: a or b is not a LocalLegActivity");
    }
}


function analyzeDays(schedule: Schedule, legSchedules: LegSchedule[], protos: ActivityPrototypeMap, analysisResult: AnalysisResult): void {
    for(let leg = 1; leg <= legSchedules.length; leg++) {
        const legSchedule = legSchedules[leg-1];

        for(let i = 0; i < legSchedule.length - 1; i++) {
            const current: LocalActivity = legSchedule[i];
            const currentDay = dayOfCamp(createTime(current.startTime), schedule);

            if(isLocalLegActivity(current)) {
                const proto = protos[current.activityPrototypeId];
                const preferredDays = proto.preferredDays;

                if(preferredDays && !preferredDays.includes(currentDay)) {
                    pushActivityResult(analysisResult, current, `${proto.name} is preferred on days ${preferredDays.join(",")} but is scheduled on day ${currentDay}`, "warning");
                }
            }
        }
    }
}

function analyzeDensity(schedule: Schedule, legSchedules: LegSchedule[], protos: ActivityPrototypeMap, analysisResult: AnalysisResult): void {

    const totalSlots = getTotalScheduleSlotCount(schedule);


    console.log("analyzeDensity", totalSlots);
    for(let leg = 1; leg <= legSchedules.length; leg++) {
        const legSchedule = legSchedules[leg-1];
        // console.log("legSchedule", legSchedule);

        const numFilledSlots = legSchedule.reduce((acc, act) => {
            if(isLocalLegActivity(act)) {
                return acc + protos[act.activityPrototypeId].duration * 2;
            }
            else if (isLocalGlobalActivity(act)) {
                return acc + act.duration * 2;
            }
            return acc;
        }, 0);

        // console.log(`Leg ${leg} numFilledSlots`, numFilledSlots);
        const emptyHours = (totalSlots - numFilledSlots) / 2;
        const emptyThreshold = schedule.startDates.length / 2;

        if(emptyHours > emptyThreshold) {
            analysisResult.warningMessages.push(`Leg ${leg} has ${emptyHours} hours of unscheduled time over camp.`);
        }
    }
}

function analyzeTravelTime(legSchedules: LegSchedule[], protos: ActivityPrototypeMap, analysisResult: AnalysisResult): void {

    for(let leg = 1; leg <= legSchedules.length; leg++) {
        // console.log(legSchedule);
        let travelSum = 0;
        let legSchedule = legSchedules[leg-1];

        for(let i = 0; i < legSchedule.length - 1; i++) {
            const current: LocalLegActivity | LocalGlobalActivity = legSchedule[i];
            const next: LocalLegActivity | LocalGlobalActivity = legSchedule[i+1];

            var currentZone : Zone | undefined | null;
            var nextZone : Zone | undefined | null;

            var currentName : string | undefined | null;
            var nextName : string | undefined | null;

            var currentEndTime : moment.Moment = createTime(current.startTime);
            var nextStartTime : moment.Moment = createTime(next.startTime);
            
            if(isLocalLegActivity(current)) {
                currentZone = protos[current.activityPrototypeId].zone;
                currentName = protos[current.activityPrototypeId].name;
                currentEndTime.add(protos[current.activityPrototypeId].duration, 'hours');
            }
            else {
                currentZone = ZONE_OPTIONS.central;
                currentName = current.name;
                currentEndTime.add(current.duration, 'hours');
            }

            if(isLocalLegActivity(next)) {
                nextZone = protos[next.activityPrototypeId].zone;
                nextName = protos[next.activityPrototypeId].name;
            }
            else {
                nextZone = ZONE_OPTIONS.central;
                nextName = next.name;
            }

            if(currentZone && nextZone) {
                const travelTimeMinutes = Math.sqrt(Math.pow(currentZone.xtime - nextZone.xtime, 2) + Math.pow(currentZone.ytime - nextZone.ytime, 2));  
                const availableTimeMinutes = nextStartTime.diff(currentEndTime, 'minutes');

                travelSum += travelTimeMinutes;

                if(availableTimeMinutes < 0) {
                    // analysisResult.infoMessages.push(`Ignoring travel time for leg ${leg} between ${currentName} and ${nextName} because it is negative (fix overlap error first)`);
                }
                else if(travelTimeMinutes - availableTimeMinutes > TRAVEL_TIME_WARNING_THRESHOLD) {
                    pushDoubleActivityResult(analysisResult, 
                        current, next, current.startTime, next.startTime, 
                        "warning", 
                        `Travel time may not be sufficient for leg ${leg} between ${currentName} and ${nextName}`
                    );
                }
            }
            else {
                analysisResult.infoMessages.push(`Current zone or next zone is not defined for ${currentName} or ${nextName}`);
            }
        }

        if(legSchedule.length > 1) {
            const averageTravelTime = Math.round(travelSum / (legSchedule.length - 1));
            analysisResult.infoMessages.push(`Average walking time in between activities for leg ${leg} is ${averageTravelTime} minutes`);
        }
    }
}
// function analyzeRequirement(acts: LocalIDMap<LocalLegActivity>, protos: ActivityPrototypeMap, analysisResult: AnalysisResult): void {
//     var locations = analysisResult.locations;

//     for(let protoId in acts) {
//         const thisActs = acts[protoId];

//         for(let time in thisActs) {
//             const activity = thisActs[time];
            
//             activity.leg.forEach(leg => {
//                 if(activity.leg.includes(leg)) {
//                     locations[proto][time].errors.push(`Leg ${leg} is already scheduled at this time`);
//                     analysisResult.totalErrors++;
//                 }
//             });
//         }
//     }
// }

function analyzeOverlap(schedule: Schedule, acts: LocalIDMap<LocalLegActivity>, protos: ActivityPrototypeMap, analysisResult: AnalysisResult): void {
    var locations = analysisResult.locations;

    let dayStarts: moment.Moment[] = schedule.startDates.map(createTime);
    let dayEnds: moment.Moment[] = schedule.endDates.map(createTime);

    // loop through each day
    for(let day = 0; day < dayStarts.length; day++) {
        var time = dayStarts[day].clone();
        var thisDayEnd = dayEnds[day].clone();

        var activeLegs: number[] = Array(schedule.numLegs).fill(0);
        var oldActivities: LocalLegActivity[] = Array(schedule.numLegs).fill(undefined);

        // loop through each time slot
        while(time.diff(thisDayEnd) < 0) {
            const timeKey = timeFormatKey(time);

            const timeMessage = timeFormatLocal(time);
            const dayMessage = dayOfCamp(time, schedule);

            // loop through each activity prototype
            for(let protoId in protos) {
                const proto = protos[protoId];
                const thisActs = acts[protoId];
                
                const activity = thisActs?.[timeKey];
                
                if(activity) {
                    activity.leg.forEach(leg => {
                        if(activeLegs[leg-1] > 0) {
                            const oldTime = createTime(oldActivities[leg-1].startTime);
                            const oldTimeMessage = timeFormatLocal(oldTime);
                            const oldDayMessage = dayOfCamp(oldTime, schedule);

                            pushDoubleActivityResult(analysisResult, 
                                activity, 
                                oldActivities[leg-1], 
                                timeKey, 
                                oldActivities[leg-1].startTime, 
                                "error", 
                                `Leg ${leg} is already scheduled at ${oldTimeMessage} on day ${oldDayMessage}`,
                                `Leg ${leg} is already scheduled at ${timeMessage} on day ${dayMessage}`
                            );
                        }

                        activeLegs[leg-1] = proto.duration * 2;
                        oldActivities[leg-1] = activity;
                    });
                }
            }

            // console.log(timeKey, activeLegs);

            activeLegs = activeLegs.map(val => val - 1);
            time.add(30, 'minutes');
        }
    }
    
}

function analyzeRepetition(schedule: Schedule, acts: LocalIDMap<LocalLegActivity>, protos: ActivityPrototypeMap, analysisResult: AnalysisResult): void {
    var locations = analysisResult.locations;

    // Iterate through each activity prototype
    for (const protoId in acts) {
        const thisActs = acts[protoId];
        const protoName = protos[protoId].name;

        // locations[protoId] = {};

        var legActivityCounts: Record<number, LocalLegActivity[]> = {};
        for(let leg = 1; leg <= schedule.numLegs; leg++) {
            legActivityCounts[leg] = [];
        }

        // Count occurrences for each leg within this prototype
        for (const time in thisActs) {
            const activity = thisActs[time];

            locations[protoId][time] = {
                errorMessages: [],
                warningMessages: [],
                infoMessages: []
            };
            
            // Check each leg in the activity
            activity.leg.forEach(legNumber => {
                legActivityCounts[legNumber].push(activity);
            });
        }

        // console.log(legActivityCounts);
        // console.log(locations);

        // Check for legs that appear multiple times
        for (const legNumber in legActivityCounts) {
            const count = legActivityCounts[legNumber].length;
            if(count == 0 && protos[protoId].isRequired) {
                pushProtoResult(analysisResult, protoId, `Leg ${legNumber} missing from ${protoName} (required)`, "error");
            }

        }

        for (const legNumber in legActivityCounts) {
            const count = legActivityCounts[legNumber].length;
            if (count != 1) {
                // console.log(legActivityCounts[legNumber]);
                for(const activity of legActivityCounts[legNumber]) {
                    pushActivityResult(analysisResult, activity, `Leg ${legNumber} has done ${protoName} ${count} times`, "error", true);
                }
            }  
        }
    }
}