import ExcelJS from 'exceljs';
import { AllActivities } from '../../api/apiActivity';
import { Schedule } from '../../api/apiSchedule';
import { ActivityPrototype, ActivityPrototypeMap } from '../../api/apiActivityPrototype';
import { createTime, getSlotDiff, getTimeSlots, timeFormatKey, timeFormatLocal } from '../../utils/time';
import colors from '../../styles/colors.module.scss';

export async function exportScheduleAsXLSX(protos: ActivityPrototypeMap, activities: AllActivities, schedule: Schedule) {
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();

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
            { header: 'Time', width: 15 }, // Time column
            ...sortedPrototypes.map(prototype => ({
                header: prototype.name,
                width: 20
            }))
        ];



        // Style headers
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            if (colNumber === 1) {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: colors.time } // Light gray
                };
            } else {
                const prototype = sortedPrototypes[colNumber - 2];
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: prototype.type === 'element' ? colors.program : colors.element } // Light orange or light green
                };
            }
            cell.alignment = { horizontal: 'center' };
        });

        // first add time labels and global activities
        for(let i=0; i < timeSlots.length; ++i) {
            let time = timeSlots[i];
            let timeKey = timeFormatKey(time);
            const row = i + 2;
            // Add time label
            const timeCell = worksheet.getCell(row, 1);
            timeCell.value = timeFormatLocal(time);
            timeCell.alignment = { horizontal: 'center' };
            timeCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: colors.time } // Light gray
            };

            if (timeKey in activities.globalActs) {
                let globalActivity = activities.globalActs[timeKey];
                let slotdur = globalActivity.duration*2;

                // Merge cells across all columns except time
                worksheet.mergeCells(row, 2, row + slotdur - 1, sortedPrototypes.length + 1);
                // console.log("merging", row, 2, row + slotdur - 1, sortedPrototypes.length + 1);
                
                const cell = worksheet.getCell(row, 2);
                cell.value = globalActivity.name;
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF0000FF' } // Blue
                };
                cell.font = { color: { argb: 'FFFFFFFF' } }; // White text
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
                cell.value = `${act.leg} ${timeFormatLocal(startTime)}`;
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFD3D3D3' } // Gray
                };          
            }
        }
    }

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
