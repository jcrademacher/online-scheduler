import ExcelJS from 'exceljs';
import { AllActivities } from '../../api/apiActivity';
import { Schedule } from '../../api/apiSchedule';
import { ActivityPrototype, ActivityPrototypeMap } from '../../api/apiActivityPrototype';
import { createTime, generateTimeSlots, getSlotDiff, getTimeSlots, timeFormatKey, timeFormatLocal, dayOfCamp } from '../../utils/time';
import colors from '../../styles/colors.module.scss';
import { extractLegSchedules } from '../../analyzer';
import { getTextColor } from '../../utils/color';
import { isLocalLegActivity } from '../scheduler/types';

const timeColor = colors.time.replace('#', '');
const programColor = colors.program.replace('#', '');
const elementColor = colors.element.replace('#', '');
const masterActivityColor = colors.masterActivity.replace('#', '');
const legActivityColor = colors.legActivity.replace('#', '');

const timeFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${timeColor}` } // Light gray
};

const centerAlignment: Partial<ExcelJS.Alignment> = {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true
};

const blackBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
};

// time formats are the same for both types of schedules
const timeHeader: Partial<ExcelJS.Column> = {
    width: 10
};

// Master Schedule formats
const mainHeader: Partial<ExcelJS.Column> = {
    width: 20
};

const masterScheduleProgramHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${programColor}` } 
};

const masterScheduleElementHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${elementColor}` } 
};

const masterScheduleActivityFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${masterActivityColor}` }
};

const legScheduleHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${timeColor}` } 
};

// leg schedule formats
const legScheduleActivityFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${legActivityColor}` } 
};

async function fillMasterSchedule(workbook: ExcelJS.Workbook, protos: ActivityPrototypeMap, activities: AllActivities, schedule: Schedule) {
    
    let numDays = schedule.startDates.length;

    // Sort activity prototypes alphabetically
    const sortFn = (a: ActivityPrototype, b: ActivityPrototype) => a.name.localeCompare(b.name);


    const sortedElms = Object.values(protos).filter((p) => p.type == 'element').sort(sortFn);
    const sortedPrgs = Object.values(protos).filter((p) => p.type == 'program').sort(sortFn);
    const sortedPrototypes = sortedElms.concat(sortedPrgs);

    // Process each day in the schedule
    for (let dayIndex = 0; dayIndex < numDays; dayIndex++) {
        const worksheet = workbook.addWorksheet(`Day ${dayIndex + 1}`);
        let thisDayStart = createTime(schedule.startDates[dayIndex]);

        let timeSlots = getTimeSlots(schedule, dayIndex);
        // console.log(timeSlots.map(timeFormatLocal));

        // Set up columns
        worksheet.columns = [
            { header: 'Time', ...timeHeader }, // Time column
            ...sortedPrototypes.map(prototype => ({
                header: prototype.name,
                ...mainHeader,
            }))
        ];

        // Style headers
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            if (colNumber === 1) {
                cell.fill = timeFill;
            } else {
                const prototype = sortedPrototypes[colNumber - 2];
                cell.fill = prototype.type === 'element' ? masterScheduleElementHeaderFill : masterScheduleProgramHeaderFill;
            }
            cell.alignment = centerAlignment;
            cell.border = blackBorder;
        });

        // first add time labels and global activities
        for(let i=0; i < timeSlots.length; ++i) {
            let time = timeSlots[i];
            let timeKey = timeFormatKey(time);
            const row = i + 2;
            // Add time label
            const timeCell = worksheet.getCell(row, 1);
            timeCell.value = timeFormatLocal(time);
            timeCell.alignment = centerAlignment;
            timeCell.fill = timeFill;
            timeCell.border = blackBorder;

            if (timeKey in activities.globalActs) {
                let globalActivity = activities.globalActs[timeKey];
                let slotdur = globalActivity.duration*2;

                // Merge cells across all columns except time
                worksheet.mergeCells(row, 2, row + slotdur - 1, sortedPrototypes.length + 1);
                // console.log("merging", row, 2, row + slotdur - 1, sortedPrototypes.length + 1);
                
                const cell = worksheet.getCell(row, 2);
                cell.value = globalActivity.name;
                cell.alignment = centerAlignment;
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: `FF${globalActivity.color.replace('#', '')}` }
                };
                cell.font = { color: { argb: `FF${getTextColor(globalActivity.color).replace("#",'')}` } }; // based on background color
                cell.border = blackBorder;
            } 
        }

        // then add activities
        for(let protoi=0; protoi<sortedPrototypes.length; ++protoi) {
            const col = protoi + 2;

            let proto = sortedPrototypes[protoi];
            let columnActs = proto.id in activities.acts ? Object.values(activities.acts[proto.id]) : [];
            columnActs = columnActs.filter((act) => createTime(act.startTime).isSame(thisDayStart, 'day'));

            // Add time slots and activities
            for(let actIndex = 0; actIndex < columnActs.length; ++actIndex) {
                let act = columnActs[actIndex];
                let startTime = createTime(act.startTime);

                if(startTime.diff(thisDayStart) < 0) {
                    continue;
                }

                const rowIndex = getSlotDiff(startTime, thisDayStart);
                const row = rowIndex + 2; // Account for header row
    
                let slotdur = proto.duration*2;

                worksheet.mergeCells(row, col, row + slotdur - 1, col);
                const cell = worksheet.getCell(row, col);
                cell.value = act.leg.join(" & ");
                cell.alignment = centerAlignment;
                cell.fill = masterScheduleActivityFill;
                cell.border = blackBorder;
            }
        }
    }
}

async function fillLegSchedules(workbook: ExcelJS.Workbook, protos: ActivityPrototypeMap, activities: AllActivities, schedule: Schedule) {
    const legSchedules = extractLegSchedules(schedule, activities.acts, activities.globalActs);

    const numDays = schedule.startDates.length;

    console.log(legSchedules);

    // const flattenedActivities: { [key: string]: LocalActivity } = {};
    
    // Object.values(activities.acts).forEach((actsInProtoObj) => 
    //     Object.values(actsInProtoObj).forEach((act) => flattenedActivities[act.startTime] = act));

    // console.log(flattenedActivities);

    const earliestStart = schedule.startDates.reduce((earliestTime, timeStr) => {
        const curTime = createTime(timeStr);
        return curTime.isBefore(earliestTime) ? curTime : earliestTime;
    }, createTime(schedule.startDates[0]));

    const latestEnd = schedule.endDates.reduce((latestTime, timeStr) => {
        const cur = createTime(timeStr);
        return cur.isAfter(latestTime) ? cur : latestTime;
    }, createTime(schedule.endDates[0]));

    // normalize to earliest start date (same day), but maintain time
    latestEnd.year(earliestStart.year()).month(earliestStart.month()).date(earliestStart.date());

    const timeSlots = generateTimeSlots(earliestStart, latestEnd);
    
    for(let legIndex = 0; legIndex < legSchedules.length; ++legIndex) {
        const legSchedule = legSchedules[legIndex];
        const legNumber = legIndex + 1;

        const worksheet = workbook.addWorksheet(`Leg ${legNumber}`);
        worksheet.columns = [{
            header: "Time",
            ...timeHeader
        }, ...Array(numDays).fill(null).map((_, dayIndex) => ({
            header: `Day ${dayIndex + 1}`,
            ...mainHeader
        }))];   


        // Style headers
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            if (colNumber === 1) {
                cell.fill = timeFill;
            } else {
                cell.fill = legScheduleHeaderFill;
            }
            cell.alignment = centerAlignment;
            cell.border = blackBorder;
        });
        // create time labels
        for(let i=0; i < timeSlots.length; ++i) {
            let time = timeSlots[i];
            const timeLocal = timeFormatLocal(time);
            const row = i + 2;
            // Add time label
            const timeCell = worksheet.getCell(row, 1);
            timeCell.value = timeLocal;
            timeCell.alignment = centerAlignment;
            timeCell.fill = timeFill;
            timeCell.border = blackBorder;
        }

        for(let actIndex = 0; actIndex < legSchedule.length; ++actIndex) {
            const act = legSchedule[actIndex];
            const time = createTime(act.startTime);

            const dayIndex = dayOfCamp(time, schedule)-1;
            let dayStart = earliestStart.clone();
            dayStart.add(dayIndex, 'day');
            
            const col = dayIndex + 2;
            const row = getSlotDiff(time, dayStart) + 2;
            
            let slotdur = 0;
            let name = "";
            let fill: ExcelJS.Fill | undefined = undefined;
            let font: Partial<ExcelJS.Font> = {};

            if(isLocalLegActivity(act)) {
                slotdur = protos[act.activityPrototypeId].duration*2;
                let otherLegs = act.leg.filter((l) => l !== legNumber);
                name = `${protos[act.activityPrototypeId].name}${otherLegs.length > 0 ? ` w/ LEG ${otherLegs.join(" & ")}` : ""}`;
                fill = legScheduleActivityFill;
            }
            else {
                slotdur = act.duration*2;
                name = act.name;
                fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: `FF${act.color.replace('#', '')}` }
                };
                font = { color: { argb: `FF${getTextColor(act.color).replace("#",'')}` } };
            }

            // Merge cells across all columns except time
            worksheet.mergeCells(row, col, row + slotdur - 1, col);
            const cell = worksheet.getCell(row, col);
            cell.value = name;
            cell.alignment = centerAlignment;
            cell.fill = fill;
            cell.font = font;
            cell.border = blackBorder;
            
        }
    }
}

export async function exportScheduleAsXLSX(protos: ActivityPrototypeMap, activities: AllActivities, schedule: Schedule) {
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();

    await fillMasterSchedule(workbook, protos, activities, schedule);
    await fillLegSchedules(workbook, protos, activities, schedule);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Create blob from buffer
    const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${schedule.name}.xlsx`;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}
