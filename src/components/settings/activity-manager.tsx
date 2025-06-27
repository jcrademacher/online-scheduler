import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';
import { useForm, SubmitHandler } from "react-hook-form"
import '../../styles/settings.scss';
import { Col, ButtonGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { Schedule } from '../../api/apiSchedule';
import { useScheduleIDMatch } from '../../utils/router';
import { emitToast, ToastType } from '../notifications';
import { range } from 'lodash';
import { useState } from 'react';

import moment from 'moment';

import { ZONE_OPTIONS } from '../../analyzer/defines';
import { ActivityPrototype, CreateActivityPrototype } from '../../api/apiActivityPrototype';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mutateActivityPrototype, deleteActivityPrototype } from '../../api/apiActivityPrototype';
import { useActivityPrototypesQuery, useScheduleQuery } from '../../queries';

export function ActivityManager() {
    const [editId, setEditId] = useState("");

    const match = useScheduleIDMatch();
    const scheduleId = match?.params.scheduleId as string;

    const query = useActivityPrototypesQuery(scheduleId);

    const actProtos = query.data ? Object.keys(query.data).map((k) => query.data[k]) : [];

    const mutation = useMutation({
        mutationFn: mutateActivityPrototype,
        onSuccess: async () => { 
            await query.refetch()
            setEditId("");

            emitToast("Activity saved", ToastType.Success);
        },
        onError: (error) => {
            setEditId("");

            emitToast(`Error saving prototype: ${error.message}`, ToastType.Error);
        }
    });

    const queryClient = useQueryClient();

    const deleteAct = useMutation({
        mutationFn: deleteActivityPrototype,
        onSuccess: async () => {
            await query.refetch()
            setEditId("");
            emitToast("Activity deleted", ToastType.Success);
        },
        onError: (error) => {
            setEditId("");

            emitToast(`Error deleting prototype: ${error.message}`, ToastType.Error);
        },
        onMutate: () => {
            queryClient.invalidateQueries({ queryKey: ["allActivities", scheduleId] });
        }
    });

    return (
        <div className='settings'>
            <div className="activity-row-grid header">
                <Col>
                    Name
                </Col>
                <Col>
                    Duration
                </Col>
                <Col>
                    Type
                </Col>
                <Col>
                    Zone
                </Col>
                <Col>
                    Required?
                </Col>
                <Col >
                    Group Size
                </Col>
                <Col>
                    Preferred Days
                </Col>
                <Col className='final' />
            </div>
            <div className='activity-row-grid activity-add-element'>
                <ActivityAddElement
                    handleSave={mutation.mutate}
                    saving={mutation.isPending && !editId}
                />
            </div>

            {query.isSuccess ? actProtos.map((act) => (
                act.id === editId ?
                    <div key={act.id} className='activity-row-grid activity-add-element'>
                        <ActivityAddElement
                            handleSave={mutation.mutate}
                            saving={mutation.isPending}
                            activeActivity={act}
                        />
                    </div> :
                    <ActivityListElement
                        handleDelete={deleteAct.mutate}
                        key={act.id}
                        activity={act}
                        setEditId={setEditId}
                    />
            )) : "Loading..."}

        </div>
    )
}

interface ActivityListElementProps {
    activity: ActivityPrototype,
    handleDelete: (id: string) => void,
    setEditId: (id: string) => void;
}

export function ActivityListElement({ activity, setEditId, handleDelete }: ActivityListElementProps) {
    function capitalize(str: string | undefined) {
        return str ? str.charAt(0).toUpperCase() + str.slice(1) : 'None';
    }

    return (
        <div className="activity-list-element activity-row-grid">
            <Col>{activity.name}</Col>
            <Col>{activity.duration}</Col>
            <Col>{capitalize(activity.type?.toString())}</Col>
            <Col>{capitalize(activity.zone?.name?.toString())}</Col>
            <Col>{activity.isRequired ? "Yes" : "No"}</Col>
            <Col>{activity.groupSize}</Col>
            <Col>{activity.preferredDays?.join(",")}</Col>
            <Col className='final edit-proto'>
                <ButtonGroup>
                    <Button onClick={() => setEditId(activity.id)} size="sm" variant="light">
                        <FontAwesomeIcon icon={faPenToSquare} />
                    </Button>
                    <Button onClick={() => {
                        if(window.confirm(`Are you sure you want to delete "${activity.name}"?`)) {
                            handleDelete(activity.id)
                        }
                    }} size="sm" variant="light">
                        <FontAwesomeIcon icon={faTrashCan} color="#dc3545"/>
                    </Button>
                </ButtonGroup>

            </Col>
        </div>
    )
}

interface ActivityAddElementProps {
    handleSave: (data: CreateActivityPrototype) => void,
    saving: boolean,
    activeActivity?: CreateActivityPrototype
}

export function ActivityAddElement({ saving, handleSave, activeActivity }: ActivityAddElementProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm<CreateActivityPrototype>({ values: activeActivity });

    const match = useScheduleIDMatch();
    const scheduleId = match?.params.scheduleId as string;

    const onSubmit: SubmitHandler<CreateActivityPrototype> = async (data) => {
        let newActivity = {
            ...data, 
            zone: ZONE_OPTIONS[data.zone?.name as keyof typeof ZONE_OPTIONS],
            scheduleId: scheduleId
        };

        if(activeActivity) {
            if(newActivity.duration !== activeActivity?.duration) {
                emitToast("Duration cannot be changed for an existing activity", ToastType.Warning);
            }

            handleSave({...newActivity, duration: activeActivity.duration });
        }
        else {
            handleSave(newActivity);
        }

        if(!activeActivity) reset();
    };

    const schQuery = useScheduleQuery(scheduleId);

    const schedule: Schedule | null = schQuery.data ? schQuery.data : null;

    const numDays = moment(schedule?.endDates[schedule?.endDates.length-1]).diff(moment(schedule?.startDates[0]), 'days')+1;

    // console.log(errors);

    return (
        <Form noValidate className="activity-form" onSubmit={handleSubmit(onSubmit)}>
            <Col>
                <Form.Control {...register("name", { required: true })}
                    isInvalid={!!errors.name}
                    type="text"
                    placeholder="Name"
                />
            </Col>
            <Col>
                <Form.Select defaultValue="" {...register("duration", { required: true })} isInvalid={!!errors.duration}>
                    <option disabled value="">select</option>
                    <option value={1}>1 hr</option>
                    <option value={1.5}>1.5 hrs</option>
                    <option value={2}>2 hrs</option>
                </Form.Select>
            </Col>
            <Col>
                <Form.Select defaultValue="" {...register("type", { required: true })} isInvalid={!!errors.type}>
                    <option disabled value="">select</option>
                    <option value="element">Element</option>
                    <option value="program">Program</option>
                </Form.Select>
            </Col>
            <Col >
                <Form.Select defaultValue="" {...register("zone.name", { required: true })} isInvalid={!!errors.zone}>
                    <option disabled value="">select</option>
                    {Object.values(ZONE_OPTIONS).map(zone => (
                        <option key={zone.name} value={zone.name as string}>
                            {zone.name ? zone.name.charAt(0).toUpperCase() + zone.name.slice(1) : "None"}
                        </option>
                    ))}
                </Form.Select>
            </Col>
            <Col>
                <Form.Check {...register("isRequired")} type="checkbox" label="Required?" />
            </Col>
            <Col >
                <Form.Select defaultValue="" {...register("groupSize", { required: true })} isInvalid={!!errors.groupSize}>
                    <option disabled value="">select</option>
                    <option value={1}>1 LEG</option>
                    <option value={2}>2 LEGs</option>
                </Form.Select>
            </Col>
            <Col>
                {
                    range(1, numDays + 1).map((day) => {
                        // const vals = getValues("preferredDays");
                        return (
                            <Form.Check
                                {...register("preferredDays", { validate: (value, _) => Array.isArray(value) && value?.length != 0 })}
                                isInvalid={!!errors.preferredDays}
                                inline
                                type="checkbox"
                                defaultChecked={activeActivity?.preferredDays?.includes(day)}
                                value={day}
                                label={day.toString()}
                                key={day}
                            />
                        );
                    }
                )
                }

            </Col>
            <Col className='final'>
                <Button disabled={saving} variant="primary" type="submit">
                    {saving ?
                        <Spinner as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            style={{ marginRight: "5px" }}
                        /> : <></>
                    }
                    {activeActivity ? "Save" : "Add"}
                </Button>
            </Col>

        </Form>
    )
}