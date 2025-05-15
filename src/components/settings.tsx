import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { useState } from 'react';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';
import { useForm, SubmitHandler } from "react-hook-form"
import '../styles/settings.scss';
import { Col, ButtonGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { mutateSchedule, Schedule } from '../api/apiSchedule';
import { useScheduleIDMatch } from '../utils/router';

import moment from 'moment';

import { createTime, timeFormatLocal } from '../utils/time';

import { ZONE_OPTIONS } from '../analyzer/defines';
import { ActivityPrototype, CreateActivityPrototype } from '../api/apiActivityPrototype';

enum SettingsView {
    GENERAL,
    MANAGER,
    SUPPORT
}

interface ActivityListElementProps {
    activity: ActivityPrototype,
    handleDelete: (id: string) => void,
    setEditId: (id: string) => void;
}

function ActivityListElement({ activity, setEditId, handleDelete }: ActivityListElementProps) {
    function capitalize(str: string | undefined) {
        return str ? str.charAt(0).toUpperCase() + str.slice(1) : 'None';
    }

    return (
        <div className="activity-list-element activity-row-grid">
            <Col>{activity.name}</Col>
            <Col>{activity.duration}</Col>
            <Col>{capitalize(activity.type?.toString())}</Col>
            <Col>{capitalize(activity.zone?.name.toString())}</Col>
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

function ActivityAddElement({ saving, handleSave, activeActivity }: ActivityAddElementProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm<CreateActivityPrototype>({ values: activeActivity });

    const match = useScheduleIDMatch();
    const scheduleId = match?.params.scheduleId as string;

    const onSubmit: SubmitHandler<CreateActivityPrototype> = async (data) => {
        handleSave({
            ...data, 
            zone: ZONE_OPTIONS[data.zone?.name as keyof typeof ZONE_OPTIONS],
            scheduleId: scheduleId
        });
        // console.log("submitting");
        // console.log(data);

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
                        <option key={zone.name} value={zone.name}>
                            {zone.name.charAt(0).toUpperCase() + zone.name.slice(1)}
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

import { Validate } from 'react-hook-form';
import { emitToast, ToastType } from './notifications';
import { ScheduleSettings, convertFormToDates } from './forms';

function GeneralSettings() {
    const match = useScheduleIDMatch();
    const scheduleId = match?.params.scheduleId as string;

    const schQuery = useScheduleQuery(scheduleId);

    const endTime = createTime(schQuery.data?.endDates[schQuery.data?.endDates.length-1]);
    endTime.subtract(30,'minutes');

    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<ScheduleSettings>({ values: {
        name: schQuery.data?.name ? schQuery.data.name : undefined,
        startDate: createTime(schQuery.data?.startDates[0]).format("YYYY-MM-DD"),
        endDate: createTime(schQuery.data?.endDates[schQuery.data?.endDates.length-1]).format("YYYY-MM-DD"),
        startTime: timeFormatLocal(createTime(schQuery.data?.startDates[0])),
        endTime: timeFormatLocal(endTime)
    } });


    const mutation = useMutation({
        mutationFn: mutateSchedule,
        onSuccess: async () => {
            setSaving(false);

            // console.log(id);
            schQuery.refetch();
            emitToast("Changes saved", ToastType.Success)
        },
        onError: (error) => {
            setSaving(false);

            emitToast(`Error updating schedule: ${error.message}`, ToastType.Error);
        },
        onMutate: async () => {
            setSaving(true);
        }
    });


    const [saving, setSaving] = useState(false);

    // const validateTimes: Validate<string | undefined, ScheduleSettings> = (_, formValues) => {
    //     let startTime = createTime(formValues.startTime);
    //     let endTime = createTime(formValues.endTime);

    //     // console.log("Start Time", startTime);
    //     // console.log("End Time", endTime);

    //     return startTime && endTime && startTime.diff(endTime) < 0;
    // }

    const validateDates: Validate<string | undefined, ScheduleSettings> = (_, formValues) => {
        let startDate = moment(formValues.startDate, "YYYY-MM-DD");
        let endDate = moment(formValues.endDate, "YYYY-MM-DD");

        // return startDate && endDate && (startDate.diff(endDate) < 0 && endDate.diff(startDate,'days') <= 7);
        return startDate.isValid() && endDate.isValid() && startDate.diff(endDate) < 0 && endDate.diff(startDate, 'days') <= 7;
    }

    const onSubmit: SubmitHandler<ScheduleSettings> = async (data) => {
        setSaving(true);

        const { startDates, endDates } = convertFormToDates(data);

        // console.log("Start Date", startDates);
        // console.log("End Date", endDates);

        mutation.mutate({
            name: data.name,
            startDates: startDates,
            endDates: endDates,
            id: scheduleId
        });
    }

    return (
        <div className="settings">
            <Form noValidate className="general-settings" onSubmit={handleSubmit(onSubmit)}>
                <Form.Group className="form-group">
                    <Form.Label>Name</Form.Label>
                    <Form.Control placeholder="Name the schedule..." {...register("name", { required: true })} isInvalid={!!errors.name} />
                    <Form.Control.Feedback type="invalid">
                        Please enter a name.
                    </Form.Control.Feedback>
                </Form.Group>
                {/* <Row>
                    <Col>
                        <Form.Group className="form-group">
                            <Form.Label>Start Date</Form.Label>
                            <Form.Control type="date" {...register("startDate", { validate: validateDates })} isInvalid={!!errors.startDate} />
                            <Form.Control.Feedback type="invalid">
                                Please select a date. Start date must be before end date.
                            </Form.Control.Feedback>
                        </Form.Group>
                    </Col>
                    <Col>
                        <Form.Group className="form-group">
                            <Form.Label>End Date</Form.Label>
                            <Form.Control type="date" {...register("endDate", { validate: validateDates })} isInvalid={!!errors.endDate} />
                            <Form.Control.Feedback type="invalid">
                                Please select a date. End date must be after start date by no more than 7 days.
                            </Form.Control.Feedback>
                        </Form.Group>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <Form.Group className="form-group">
                            <Form.Label>Start Time</Form.Label>
                            <Form.Select {...register("startTime")}
                                isInvalid={!!errors.startTime}

                            >
                                {startTimeOptions.map((el, _) => <option key={timeFormatKey(el)} value={timeFormatLocal(el)}>{timeFormatLocal(el)}</option>)}
                            </Form.Select>
                            <Form.Text>The time that the schedule should start from each day</Form.Text>
                            <Form.Control.Feedback type="invalid">
                                Start time should be before end time.
                            </Form.Control.Feedback>
                        </Form.Group>
                    </Col>
                    <Col>
                        <Form.Group className="form-group">
                            <Form.Label>End Time</Form.Label>
                            <Form.Select {...register("endTime", { required: true })} isInvalid={!!errors.startTime}>
                                {endTimeOptions.map((el, _) => <option key={timeFormatKey(el)} value={timeFormatLocal(el)}>{timeFormatLocal(el)}</option>)}
                            </Form.Select>
                            <Form.Text>The time that the schedule should end at each day</Form.Text>
                            <Form.Control.Feedback type="invalid">
                                End time should be after start time.
                            </Form.Control.Feedback>
                        </Form.Group>
                    </Col>
                </Row> */}
                <div className="modal-footer-div">
                    <Button variant="danger">
                        Delete Schedule
                    </Button>
                    <SpinnerButton loading={saving} variant="primary" type="submit">
                        Save Changes
                    </SpinnerButton>
                </div>
            </Form>
        </div>
    )
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mutateActivityPrototype, deleteActivityPrototype } from '../api/apiActivityPrototype';
import { range } from 'lodash';
import { useActivityPrototypesQuery, useScheduleQuery } from '../queries';
import { SpinnerButton } from '../utils/button';

// const emptyActivity: Activity = {} as Activity;

function ManagerSettings() {
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

function SupportSettings() {
    return (
        <div className='settings'>
            Support Settings
        </div>
    )
}

type SettingsProps = {
    show?: boolean
    handleClose: Function
    // handleSave: (data: Activity) => void,
    // handleDelete: (id: string) => void,
    // data: Activity,
    // saving: boolean,
    // deleting: boolean
}

export default function Settings({ show = false, handleClose }: SettingsProps) {
    const [settingsView, setSettingsView] = useState<SettingsView>(SettingsView.GENERAL);




    // console.log(errors);

    function renderView() {
        switch (settingsView) {
            case SettingsView.GENERAL:
                return <GeneralSettings />
            case SettingsView.MANAGER:
                return <ManagerSettings />
            case SettingsView.SUPPORT:
                return <SupportSettings />
        }
    }

    return (
        <Modal id='settings-modal' show={show} size="lg" centered onHide={() => handleClose()}>
            <Modal.Header closeButton>
                <Modal.Title>Settings</Modal.Title>
                {/* <Modal.Title>{data.id ? "Edit activity" : "Add activity"}</Modal.Title> */}
            </Modal.Header>
            <Modal.Body>
                <div id="settings">
                    <div id="sidebar">
                        <Button
                            variant={settingsView === SettingsView.GENERAL ? "primary" : 'light'}
                            onClick={() => setSettingsView(SettingsView.GENERAL)}
                        >
                            General
                        </Button>
                        <Button
                            variant={settingsView === SettingsView.MANAGER ? "primary" : 'light'}
                            onClick={() => setSettingsView(SettingsView.MANAGER)}
                        >
                            Activity Manager
                        </Button>
                        <Button
                            variant={settingsView === SettingsView.SUPPORT ? "primary" : 'light'}
                            onClick={() => setSettingsView(SettingsView.SUPPORT)}
                        >
                            Support
                        </Button>
                    </div>
                    <div id="content">
                        {renderView()}
                    </div>

                </div>
            </Modal.Body>
        </Modal>

    );
}