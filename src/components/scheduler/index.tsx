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
import { useActivityPrototypesQuery, useScheduleQuery, useAllActivitiesQuery } from '../../queries';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useScheduleIDMatch } from '../../utils/router';
import { createTime } from '../../utils/time';
import { SchedulerRef } from '../file/context-provider.js';


import { emitToast, ToastType } from '../notifications';

// let tmoment: (m: string) => moment.Moment = (m: string) => moment(`2024-01-01 ${m}`);

interface SchedulerProps {
    view: View,
    dayView: number,
    analysis: AnalysisResult | null,
}

export const Scheduler = forwardRef<SchedulerRef, SchedulerProps>((props,ref) => {
    const match = useScheduleIDMatch();
    const scheduleId = match?.params.scheduleId as string;

    let { dayView, analysis } = props;

    // queries
    const actProtoQuery = useActivityPrototypesQuery(scheduleId);
    const schQuery = useScheduleQuery(scheduleId);
    const actsQuery = useAllActivitiesQuery(scheduleId, actProtoQuery.data);

    const schedule: Schedule | null = schQuery.data ? schQuery.data : null;

    // const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

    // context
    // const fileContext = useFileContext();

    
    const activityPrototypes = actProtoQuery.data ? actProtoQuery.data : {};

    let { state, set, undo, redo, canRedo, canUndo } = useHistoryState<ScheduleObject>({
        acts: {},
        globalActs: {}
    });

    // const [deletedActIDs, setDeletedActIDs] = useState<string[]>([]);
    // const [deletedGactIDs, setDeletedGactIDs] = useState<string[]>([]);

    const localSch = state;
    const setLocalSch = set;

    const queryClient = useQueryClient();

    useEffect(() => {
        if (actsQuery.data) {
            setLocalSch({
                globalActs: { ...localSch.globalActs, ...actsQuery.data.globalActs },
                acts: { ...localSch.acts, ...actsQuery.data.acts }
            });
            console.log("Local sch set: ", actsQuery.data);
        }
    }, [actsQuery.data]);


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

    const [gactState, setGactState] = useState<GlobalActivityState>({
        status: GlobalActivityDragStatus.NONE
    });

    let thisDayStart = createTime(schedule?.startDates[dayView - 1]);
    let thisDayEnd = createTime(schedule?.endDates[dayView - 1]);

    const saveSchMutation = useMutation({
        mutationKey: ['saveSchedule', scheduleId],
        mutationFn: async () => saveActivities(actsQuery.data?.acts, actsQuery.data?.globalActs, localSch.acts, localSch.globalActs),
        onSuccess: () => {
            console.log("Success, invalidating");
            queryClient.invalidateQueries({ queryKey: ["allActivities", scheduleId] });
            
        },
        onError: (error) => {
            emitToast(`Error saving schedule: ${error.message}`, ToastType.Error);
        },
        onMutate: () => {
            console.log("Saving...");
        }
    });

    useImperativeHandle(ref, () => {
        return {
            save: async () => {
                const data = await saveSchMutation.mutateAsync();
                console.log("Returned from imperative handle:", data);
                return data;
            }
        };
    });

    const handleMoveActivity = (newId: string, newTime: moment.Moment, oldAct: LocalLegActivity) => {
        let newActs = localSch.acts[newId] ? { ...localSch.acts[newId] } : {};
        let oldId = oldAct.activityPrototypeId;
        let oldActs = { ...localSch.acts[oldId] };

        let newActProto = activityPrototypes[newId];
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

            let oldActProto = activityPrototypes[oldAct.activityPrototypeId];
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

        let canCreate = checkGlobalActivityCreate(newTime, oldAct.duration, thisDayEnd, activityPrototypes, localSch.acts, newGacts);

        if (canCreate) {
            addActivity(newAct, newGacts);

            setLocalSch({ ...localSch, globalActs: newGacts });
        }
    }

    const handleCreateActivity = (id: string, time: moment.Moment) => {
        var newAct: LocalLegActivity;

        // console.log(existingAct);
        let actProto = activityPrototypes[id];

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
            let canCreate = checkGlobalActivityCreate(startTime, duration, thisDayEnd, activityPrototypes, localSch.acts, localSch.globalActs);

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
                        span={Object.keys(activityPrototypes).length}
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

        let keylist = Object.keys(activityPrototypes);
        

        for (let i = 0; i < keylist.length; ++i) {
            let el = activityPrototypes[keylist[i]];

            const errors = analysis?.protoLocations[el.id]?.errorMessages || [];
            const warnings = analysis?.protoLocations[el.id]?.warningMessages || [];
            const info = analysis?.protoLocations[el.id]?.infoMessages || [];

            // console.log(el.name, errors.length);

            let gridColumn = `${i + 1 + 1} / span 1`;

            retval.push(
                <OverlayTrigger
                placement="bottom"
                overlay={
                    <Tooltip style={{position: "fixed"}}>
                        <div className="activity-analysis-tooltip">
                            {errors.map((error, i) => (
                                <div className="error" key={i}>{error}</div>
                            ))}
                            {warnings.map((warning, i) => (
                                <div className="warning" key={i}>{warning}</div>
                            ))}
                            {info.map((info, i) => (
                                <div key={i}>{info}</div>
                            ))}
                        </div>
                    </Tooltip>
                }
                    trigger={["hover", "focus"]}
                    show={errors.length > 0 || warnings.length > 0 || info.length > 0 ? undefined : false}
                >
                    <div 
                        className={`header ${el.type} ${errors.length > 0 ? "error" : ""} ${warnings.length > 0 ? "warning" : ""}`}
                        key={el.id} 
                        style={{ gridRow: '1 / span 1', gridColumn: gridColumn }}
                    >
                        {el.name}
                    </div>
                </OverlayTrigger>
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
                        errors={analysis?.locations[el.id]?.[timeKey]?.errorMessages || []}
                        warnings={analysis?.locations[el.id]?.[timeKey]?.warningMessages || []}
                        info={analysis?.locations[el.id]?.[timeKey]?.infoMessages || []}
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
            gridTemplateColumns: `60px repeat(${Object.keys(activityPrototypes).length}, 1fr)`,
            gridTemplateRows: `40px repeat(${thisDayEnd.diff(thisDayStart, 'hours', true) * 2}, 1fr)`
        };

        return (
            <DndProvider backend={HTML5Backend}>
                <div id='scheduler' style={containerStyle} onMouseUp={() => setGactState({ status: GlobalActivityDragStatus.NONE })}>
                    <div className='header' />
                    {renderTimes()}
                    {renderProtoHeaders()}
                    {renderGlobalActivities()}
                    {actsQuery.isLoading ?
                        <LoadingActivitiesView rows={thisDayEnd.diff(thisDayStart, 'hours', true) * 2} cols={Object.keys(activityPrototypes).length} /> :
                        Object.values(activityPrototypes).map(renderColumn)
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

import { OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { timeFormatLocal } from '../../utils/time';
import { AnalysisResult } from '../../analyzer/index.js';

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