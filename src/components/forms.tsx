import moment from 'moment';
import { TIMEZONE, timeFormatKey } from '../utils/time';

export type ScheduleSettings = {
    startDate?: string,
    endDate?: string,
    startTime?: string,
    endTime?: string,
    name?: string,
    numLegs?: number
}

export function convertFormToDates(data: ScheduleSettings) {
    let dayStart = moment.tz(`${data.startTime} ${data.startDate}`, "hh:mm AA YYYY-MM-DD",TIMEZONE);
    let dayEnd = moment.tz(`${data.endTime} ${data.startDate}`, "hh:mm AA YYYY-MM-DD", TIMEZONE);
    let campEnd = moment.tz(`${data.endTime} ${data.endDate}`, "hh:mm AA YYYY-MM-DD",TIMEZONE);

    dayEnd.add(30,'minutes');

    // console.log("Day start", dayStart);
    // console.log("Day end", dayEnd);
    // console.log("Camp end", campEnd)

    let numDays = campEnd.diff(dayStart, 'days') + 1;
    let startDates = [];
    let endDates = [];

    for(let i=0; i<numDays; ++i) {

        startDates.push(timeFormatKey(dayStart));
        endDates.push(timeFormatKey(dayEnd));

        dayStart.add(1, 'days');
        dayEnd.add(1, 'days');
    }

    console.log(startDates);
    console.log(endDates);

    return {
        startDates,
        endDates
    };
}

