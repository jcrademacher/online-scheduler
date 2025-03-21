import { View } from '../../pages/scheduling-page'
import '../../styles/scheduler.scss'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import moment from 'moment';
import { checkActivityCreate, checkGlobalActivityCreate, ScheduledGlobalActivity } from './activities';

import { ActivityPrototype } from '../../api/apiActivityPrototype';

import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
// import { Activity } from '../../api/apiActivity';
// console.log(getTimes());

// const times = range(700,2030,30);
import colors from '../../styles/colors.module.scss';
import { ScheduledActivity, Workarea, addActivity, removeActivity, updateActivity } from './activities';

import {
    GlobalActivityDragStatus,
    GlobalActivityState,
    ScheduleObject
} from './types';

import { useHistoryState } from '@uidotdev/usehooks';
import { Schedule } from '../../api/apiSchedule';
import { LocalLegActivity, LocalGlobalActivity, saveActivities } from '../../api/apiActivity';
import { useActivityPrototypesQuery, useActivitiesQuery, useScheduleQuery, useGlobalActivitiesQuery, useAllActivitiesQuery } from '../../queries';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useScheduleIDMatch } from '../../utils/router';
import { createTime } from '../../utils/time';

import { emitToast, ToastType } from '../notifications';

// let tmoment: (m: string) => moment.Moment = (m: string) => moment(`2024-01-01 ${m}`);

interface SchedulerProps {
    view: View,
    dayView: number
}

export interface SchedulerRef {
    save: () => Promise<void>;
}

export const Scheduler = forwardRef<SchedulerRef, SchedulerProps>((props,ref) => {
    const match = useScheduleIDMatch();
    const scheduleId = match?.params.scheduleId as string;

    let { dayView } = props;

    // queries
    const actProtoQuery = useActivityPrototypesQuery(scheduleId);
    const schQuery = useScheduleQuery(scheduleId);
    const actsQuery = useAllActivitiesQuery(scheduleId, actProtoQuery.data);

    const schedule: Schedule | null = schQuery.data ? schQuery.data : null;

    // context
    // const fileContext = useFileContext();

    const activities = actProtoQuery.data ? actProtoQuery.data : {};

    let { state, set, undo, redo, canRedo, canUndo } = useHistoryState<ScheduleObject>({
        acts: {},
        globalActs: {}
    });

    // const [deletedActIDs, setDeletedActIDs] = useState<string[]>([]);
    // const [deletedGactIDs, setDeletedGactIDs] = useState<string[]>([]);

    const localSch = state;
    const setLocalSch = set;

    const queryClient = useQueryClient();

    const [syncState, setSyncState] = useState(false);

    useEffect(() => {
        if (actsQuery.data) {
            console.log("Setting local sch in effect");
            // console.log(actsQuery.data);
            
            // setLocalSch({
            //     globalActs: { ...localSch.globalActs, ...actsQuery.data.globalActs },
            //     acts: { ...localSch.acts, ...actsQuery.data.acts }
            // });

            setLocalSch({
                globalActs: actsQuery.data.globalActs,
                acts: actsQuery.data.acts
            });
        }
    }, [actsQuery.data, syncState]);

    const handleUndo = (evt: KeyboardEvent) => {
        evt.stopImmediatePropagation();
        if ((evt.key === 'Z' || evt.key === 'z') && (evt.ctrlKey || evt.metaKey) && !evt.shiftKey ) {
            if(canUndo)
                undo();
            else
                emitToast("Cannot undo after save", ToastType.Warning);
            // console.log("undo");
        }
        else if ((evt.key === 'Z' || evt.key === 'z') && (evt.ctrlKey || evt.metaKey) && evt.shiftKey) {
            if(canRedo)
                redo();
            else
                emitToast("Cannot redo after save", ToastType.Warning);
        }
    }

    useEffect(() => {
        window.addEventListener('keydown', handleUndo);

        return () => {
            window.removeEventListener('keydown', handleUndo);
        }
    }, [undo, redo]);


    // const [localSchActs, setLocalSchActs] = useState<LocalActivityMap>({});

    const [gactState, setGactState] = useState<GlobalActivityState>({
        status: GlobalActivityDragStatus.NONE
    });
    // const [thisDayStart, setThisDayStart] = useState<moment.Moment>(initDate);

    let thisDayStart = createTime(schedule?.startDates[dayView - 1]);
    let thisDayEnd = createTime(schedule?.endDates[dayView - 1]);
    // console.log(thisDayStart);

    // const testGactStart = times[4].clone();
    // testGactStart.add(1,"day");
    // console.log(testGactStart.toString());

    const saveSchMutation = useMutation({
        mutationKey: ['saveSchedule', scheduleId],
        mutationFn: async () => saveActivities(actsQuery.data?.acts, actsQuery.data?.globalActs, localSch.acts, localSch.globalActs),
        onSuccess: (data) => {
            console.log("Success");
            // fileContext.setSaving(false);
            // clear();
            // queryClient.invalidateQueries();
            queryClient.setQueryData(['allActivities', scheduleId], { acts: data.acts, globalActs: data.gacts });
            // setLocalSch({
            //     globalActs: data.gacts,
            //     acts: data.acts
            // });

            emitToast("Changes saved", ToastType.Success);
        },
        onError: (error) => {
            // fileContext.setSaving(false);
            // setSyncState((s) => !s);
            emitToast(`Error saving schedule: ${error.message}`, ToastType.Error);
        },
        onMutate: () => {
            // fileContext.setSaving(true);
            // console.log(state);
            console.log("Saving...");
        }
    });

    useImperativeHandle(ref, () => {
        return {
            save: async () => {
                await saveSchMutation.mutateAsync();
            }
        };
    });

    const handleMoveActivity = (newId: string, newTime: moment.Moment, oldAct: LocalLegActivity) => {
        let newActs = localSch.acts[newId] ? { ...localSch.acts[newId] } : {};
        let oldId = oldAct.activityPrototypeId;
        let oldActs = { ...localSch.acts[oldId] };

        let newActProto = activities[newId];
        let sameProto = newId === oldAct.activityPrototypeId;

        if (sameProto) {
            removeActivity(oldAct, newActs);
        }
        let canCreate = checkActivityCreate(newTime, newActProto.duration, thisDayEnd, newActs, localSch.globalActs);

        if (canCreate) {
            // Create a completely new activity object with all properties copied
            let newAct: LocalLegActivity = {
                startTime: newTime.toISOString(),
                shadow: oldAct.shadow,
                leg: [...oldAct.leg], // Deep copy the leg array
                activityPrototypeId: newId,
                id: oldAct.id // Preserve the original ID if it exists
            };

            let oldActProto = activities[oldAct.activityPrototypeId];
            let gsdiff = oldActProto.groupSize - newActProto.groupSize;

            if (gsdiff > 0) {
                newAct.leg = newAct.leg.slice(0, newActProto.groupSize);
            }
            else {
                newAct.leg = newAct.leg.slice(0, oldActProto.groupSize);
            }

            addActivity(newAct, newActs);

            let newSch;

            if (sameProto) {
                removeActivity(oldAct, newActs);
                newSch = { ...localSch, acts: { ...localSch.acts, [newId]: { ...newActs } }};
            }
            else {
                removeActivity(oldAct, oldActs);
                newSch = { ...localSch, acts: { ...localSch.acts, [oldId]: oldActs, [newId]: {...newActs }} };
            }

            // console.log("newSch", newSch);
            setLocalSch(newSch);
        }
    }

    const handleMoveGlobalActivity = (newTime: moment.Moment, oldAct: LocalGlobalActivity) => {
        let newAct: LocalGlobalActivity = { ...oldAct, startTime: newTime.toISOString() };
        // let oldIndex = curGacts.findIndex((el) => isEqual(el, oldAct));

        let newGacts = { ...localSch.globalActs };
        removeActivity(oldAct, newGacts);

        let canCreate = checkGlobalActivityCreate(newTime, oldAct.duration, thisDayEnd, activities, localSch.acts, newGacts);

        if (canCreate) {
            addActivity(newAct, newGacts);

            setLocalSch({ ...localSch, globalActs: newGacts });
        }
    }

    const handleCreateActivity = (id: string, time: moment.Moment) => {
        var newAct: LocalLegActivity;

        // console.log(existingAct);
        let actProto = activities[id];

        newAct = {
            startTime: time.toISOString(),
            shadow: false,
            leg: [0],
            activityPrototypeId: id
        };

        let acts = localSch.acts[id];
        acts = acts ? { ...acts } : {};

        let canCreate = checkActivityCreate(time, actProto.duration, thisDayEnd, acts, localSch.globalActs);
        // console.log(canCreate);

        if (canCreate) {
            // acts.splice(insertAt, 0, newAct);
            addActivity(newAct, acts);
            setLocalSch({ ...localSch, acts: { ...localSch.acts, [id]: acts } });
        }
    }

    const handleCreateGlobalActivity = () => {
        let startTime = gactState.originCell ? gactState.originCell[1] : undefined;
        let endTime = gactState.currentCell ? gactState.currentCell[1] : undefined;

        if (startTime && endTime && endTime.diff(startTime) >= 0) {
            let duration = endTime.diff(startTime, "hours", true) + 0.5;

            let newAct: LocalGlobalActivity = {
                startTime: startTime.toISOString(),
                duration: duration,
                name: "",
                scheduleId: scheduleId,
                color: colors.globalAct
            };

            // console.log(newAct);
            let canCreate = checkGlobalActivityCreate(startTime, duration, thisDayEnd, activities, localSch.acts, localSch.globalActs);

            if (canCreate) {
                // console.log(insertAt);
                let newGacts = { ...localSch.globalActs };
                addActivity(newAct, newGacts);

                setLocalSch({ ...localSch, globalActs: newGacts });
            }
        }
    }

    const handleSaveGlobalActivity = (newGact: LocalGlobalActivity) => {
        const gacts = { ...localSch.globalActs };
        // newGacts[newGact.startTime] = newGact;
        updateActivity(newGact, gacts);
        // console.log(newGact);
        setLocalSch({ ...localSch, globalActs: gacts });
    }

    const handleDeleteGlobalActivity = (newGact: LocalGlobalActivity) => {
        const gacts = { ...localSch.globalActs };
        removeActivity(newGact, gacts)
        setLocalSch({ ...localSch, globalActs: gacts });

        // if (newGact.id) {
        //     setDeletedGactIDs([...deletedGactIDs, newGact.id]);
        // }
    }

    const handleSaveActivity = (newAct: LocalLegActivity) => {
        let id = newAct.activityPrototypeId;
        let acts = { ...localSch.acts[id] };

        updateActivity(newAct, acts);
        setLocalSch({ ...localSch, acts: { ...localSch.acts, [id]: acts } });
        // acts[index] = newAct;
        // setLocalSchActs({ ...localSchActs, [id]: acts });
    }

    const handleDeleteActivity = (newAct: LocalLegActivity) => {
        let id = newAct.activityPrototypeId;
        let acts = { ...localSch.acts[id] };

        removeActivity(newAct, acts);
        setLocalSch({ ...localSch, acts: { ...localSch.acts, [id]: acts } });

        // if (newAct.id) {
        //     setDeletedActIDs([...deletedActIDs, newAct.id]);
        // }
    }

    const renderGlobalActivities: () => JSX.Element[] = () => {
        let retval = [];
        for (let key in localSch.globalActs) {
            let gact = localSch.globalActs[key];
            let startTime = createTime(gact.startTime)
            let timeIndex = startTime.diff(thisDayStart, 'hours', true) * 2;

            if (startTime.isSame(thisDayStart, 'date')) {
                retval.push(
                    <ScheduledGlobalActivity
                        key={startTime.toISOString()}
                        activeAct={gact}
                        timeIndex={timeIndex}
                        span={Object.keys(activities).length}
                        handleDelete={handleDeleteGlobalActivity}
                        handleSave={handleSaveGlobalActivity}
                    />
                );
            }
        }

        return retval;
    };


    const renderTimes: () => JSX.Element[] = () => {
        let time = thisDayStart.clone();

        let retval = [];

        while (time.diff(thisDayEnd) < 0) {
            retval.push(<div className="time" key={time.toISOString()}>{timeFormatLocal(time)}</div>);
            time.add(30, 'minutes');
        }

        return retval;
    };

    const renderProtoHeaders: () => JSX.Element[] = () => {
        let retval = [];

        let keylist = Object.keys(activities);

        for (let i = 0; i < keylist.length; ++i) {
            let el = activities[keylist[i]];

            let gridColumn = `${i + 1 + 1} / span 1`;

            retval.push(
                <div className={`header ${el.type}`} key={el.id} style={{ gridRow: '1 / span 1', gridColumn: gridColumn }}>
                    {el.name}
                </div>
            );
        }

        return retval;
    }

    const renderColumn: (el: ActivityPrototype) => JSX.Element[] = (el) => {

        let thisActs = localSch.acts[el.id]; //?.filter((a) => a.startTime.isSame(thisDayStart, 'day'));
        // console.log(thisActsTimes);
        let retval = [];
        // let i = 0;
        let time = thisDayStart.clone();
        // let acti = thisActs?.findIndex((a) => a.startTime.isSame(thisDayStart, 'day'));
        // let gacti = localGlobalActs.findIndex((ga) => ga.startTime.isSame(thisDayStart, 'day'));

        while (time.diff(thisDayEnd) < 0) {
            // console.log(i);
            let timeIndex = time.diff(thisDayStart, 'hours', true) * 2;
            let timeKey = time.toISOString();

            let gact = localSch.globalActs[timeKey];
            let gactStartTime = createTime(gact?.startTime);

            if (gact?.startTime && gactStartTime.isSame(time)) {
                // console.log(i);
                // i = i + gact.duration * 2;
                time.add(gact.duration, 'hours');

                // console.log("continued");
                continue;
            }

            let act = thisActs ? thisActs[timeKey] : undefined;
            let actTime = createTime(act?.startTime);

            let schEl;

            if (act?.startTime && actTime.isSame(time)) {
                // console.log(i);
                schEl = (
                    <ScheduledActivity
                        activeAct={thisActs[timeKey]}
                        timeIndex={timeIndex}
                        duration={el.duration}
                        groupSize={el.groupSize}
                        handleDelete={handleDeleteActivity}
                        handleSave={handleSaveActivity}
                        key={timeIndex}
                    />
                );
                // i = i + el.duration * 2;
                time.add(el.duration, 'hours');
            }
            else {
                schEl = (
                    <Workarea
                        key={timeIndex}
                        id={el.id}
                        time={time.clone()}
                        handleMoveActivity={handleMoveActivity}
                        handleMoveGlobalActivity={handleMoveGlobalActivity}
                        handleCreate={handleCreateActivity}
                        handleCreateGlobalActivity={handleCreateGlobalActivity}
                        state={gactState}
                        setState={setGactState}
                    />
                );
                // ++i;
                time.add(30, 'minutes');
            }

            retval.push(schEl);
        }

        return retval;
    }

    if (actProtoQuery.isLoading) {
        return <div>Loading...</div>
    }
    else if (actProtoQuery.isError) {
        return <div>Error</div>
    }
    else if (actProtoQuery.isSuccess) {
        const containerStyle = {
            gridTemplateColumns: `repeat(${Object.keys(activities).length + 1}, minmax(50px,1fr))`,
            gridTemplateRows: `40px repeat(${thisDayEnd.diff(thisDayStart, 'hours', true) * 2}, minmax(10px,1fr))`
        };

        return (
            <DndProvider backend={HTML5Backend}>
                <div id='scheduler' style={containerStyle} onMouseUp={() => setGactState({ status: GlobalActivityDragStatus.NONE })}>
                    <div className='header' />
                    {renderTimes()}
                    {renderProtoHeaders()}
                    {renderGlobalActivities()}
                    {actsQuery.isLoading ?
                        <LoadingActivitiesView rows={thisDayEnd.diff(thisDayStart, 'hours', true) * 2} cols={Object.keys(activities).length} /> :
                        Object.values(activities).map(renderColumn)
                    }
                </div>
            </DndProvider>
        )
    }
});


interface LoadingActivitiesViewProps {
    rows: number,
    cols: number
}

import { Spinner } from 'react-bootstrap';
import { timeFormatLocal } from '../../utils/time';
import { useFileContext } from '../file/context-provider';

function LoadingActivitiesView({ rows, cols }: LoadingActivitiesViewProps) {
    // let retval: JSX.Element[] = [];

    // for (let r = 0; r < rows; ++r) {
    //     for (let c = 0; c < cols; ++c) {
    //         retval.push(
    //             <Placeholder className='loading-cell' key={`${r}-${c}`} as='div' animation="glow">
    //                 <Placeholder as='div' size='sm' />
    //             </Placeholder>
    //         );
    //     }
    // }

    return (
        <div className='loading-cell' style={{ gridRow: `2 / span ${rows}`, gridColumn: `2 / span ${cols}` }}>
            <Spinner
                as="div"
                animation="border"
                role="status"
            />
        </div>
    )
}