import moment from "moment-timezone";
import { Schedule } from "../api/apiSchedule";

export const TIMEZONE = 'America/New_York';

let startDate = moment.tz("2024-06-23 06:00:00.000", TIMEZONE);
export const startTimeOptions: moment.Moment[] = [];

for (let i = 0; i < 6; i++) {
    // console.log(initDate.toLocaletimeString());
    startTimeOptions.push(startDate.clone());
    startDate.add(30, 'minutes');
}

let endDate = moment.tz("2024-06-27 21:00:00.000", TIMEZONE);
export const endTimeOptions: moment.Moment[] = [];

for (let i = 0; i < 6; i++) {
    // console.log(initDate.toLocaletimeString());
    endTimeOptions.push(endDate.clone());
    endDate.add(30, 'minutes');
}

export const timeFormatKey = (time: moment.Moment) => time.toISOString();
export const timeFormatLocal = (time: moment.Moment) => time.clone().tz(TIMEZONE).format("h:mm A");
export const timeDateDummy = (time?: string) => moment.tz(`${time} 2024-06-23`, TIMEZONE);

export function createTime(t?: string | undefined) {
    return t ? moment.tz(t,TIMEZONE) : moment();
}

export function getTimeSlots(schedule: Schedule, dayIndex: number) {
    let numDays = schedule.startDates.length;

    if(dayIndex < 0 || dayIndex >= numDays) {
        throw new Error("Day out of range");
    }

    let startTime = createTime(schedule.startDates[dayIndex]);
    let endTime = createTime(schedule.endDates[dayIndex]);

    let cur = startTime.clone();
    let retval: moment.Moment[] = []

    while(cur.diff(endTime) < 0) {
        retval.push(cur.clone())
        cur.add(30, 'minutes');
    }

    return retval
}

export function getSlotDiff(t1: moment.Moment, t2: moment.Moment) {
    return t1.diff(t2, 'hours', true) * 2;
}

export function getTotalScheduleSlotCount(schedule: Schedule) {
    let count = 0;
    for(let i=0; i<schedule.startDates.length; i++) {
        count += createTime(schedule.endDates[i]).diff(createTime(schedule.startDates[i]), 'hours', true) * 2;
    }
    return count;
}

export function dayOfCamp(time: moment.Moment, schedule: Schedule) {
    return time.diff(createTime(schedule.startDates[0]), 'days') + 1;
}

