import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { useState } from 'react';
import Form from 'react-bootstrap/Form';
import { useForm, SubmitHandler } from "react-hook-form"
import '../../styles/settings.scss';
import { mutateSchedule } from '../../api/apiSchedule';
import { useScheduleIDMatch } from '../../utils/router';
import { useScheduleQuery } from '../../queries';
import { createTime, timeFormatLocal } from '../../utils/time';
import { SpinnerButton } from '../../utils/button';
import { useMutation } from '@tanstack/react-query';
import { ActivityManager } from './activity-manager';

enum SettingsView {
    GENERAL,
    MANAGER,
    SUPPORT
}



import { emitToast, ToastType } from '../notifications';
import { ScheduleSettings, convertFormToDates } from '../forms';

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
}

export default function Settings({ show = false, handleClose }: SettingsProps) {
    const [settingsView, setSettingsView] = useState<SettingsView>(SettingsView.GENERAL);

    function renderView() {
        switch (settingsView) {
            case SettingsView.GENERAL:
                return <GeneralSettings />
            case SettingsView.MANAGER:
                return <ActivityManager />
            case SettingsView.SUPPORT:
                return <SupportSettings />
        }
    }

    return (
        <Modal id='settings-modal' show={show} size="lg" centered onHide={() => handleClose()}>
            <Modal.Header closeButton>
                <Modal.Title>Settings</Modal.Title>
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