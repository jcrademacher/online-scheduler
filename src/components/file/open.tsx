import { useState } from "react";

import { Schedule } from "../../api/apiSchedule";
import moment from "moment";
import { Col, Button, Spinner } from "react-bootstrap";

import '../../styles/fileopen.scss';
import { useSchedulesQuery } from "../../queries";

import { useNavigate } from "react-router-dom";


interface ScheduleListElementProps {
    schedule: Schedule,
    handleSelect: () => void,
    selected: boolean
}

function ScheduleListElement({ schedule, handleSelect, selected }: ScheduleListElementProps) {
    // function capitalize(str: string | undefined) {
    //     return str ? str.charAt(0).toUpperCase() + str.slice(1) : 'None';
    // }

    let startDate = moment(schedule.startDates[0]);
    let endDate = moment(schedule.endDates[schedule.endDates.length - 1]);

    let formatStr = 'MMM D, YYYY [at] h:mm a';
    let updatedAt = moment(schedule.updatedAt);

    let formatStrCampDates = `MMM D [- ${endDate.format('MMM D')}], YYYY`;

    return (
        <div onClick={handleSelect} className={`list-element row-grid ${selected ? "selected" : ""}`}>
            <Col>{schedule.name}</Col>
            <Col>{startDate.format(formatStrCampDates)}</Col>
            <Col>{updatedAt.format(formatStr)}</Col>
        </div>
    )
}

interface FileOpenModalProps {
    handleCancel: () => void
}

import Placeholder from 'react-bootstrap/Placeholder';
import { navigateToSchedule } from "../../utils/router";

export function FileOpenModal({ handleCancel }: FileOpenModalProps) {

    const query = useSchedulesQuery();

    const [opening, setOpening] = useState(false);
    const [selectedId, setSelectedId] = useState("");

    const navigate = useNavigate();

    const handleOpen = () => {
        setOpening(true);
        
        handleCancel();
        navigateToSchedule(navigate, selectedId);
    }

    let schContent;

    if (query.isLoading || query.isFetching)
        schContent = (
            <Placeholder animation="glow">
                <Placeholder xs={12} />
                <Placeholder xs={12} />
            </Placeholder>
        );
    else if (query.isError) schContent = (<div>Error: {query.error.message}</div>);
    else if (query.isSuccess) {
        schContent = (
            <>
                <div id='open'>
                    <div className="row-grid header">
                        <Col>
                            Name
                        </Col>
                        <Col>
                            Camp Dates
                        </Col>
                        <Col>
                            Last Modified
                        </Col>
                        {/* <Col className='final' /> */}
                    </div>
                    <div className='row-grid add-element'>
                        {/* <ActivityAddElement
                            handleSave={mutation.mutate}
                            saving={mutation.isPending && !editId}
                        /> */}
                    </div>
                    {query.data.map((el) => {
                        return (
                            <ScheduleListElement
                                key={el.id}
                                schedule={el}
                                handleSelect={() => setSelectedId(el.id)}
                                selected={selectedId === el.id}
                            />
                        );
                    })}
                </div>
            </>
        );
    }

    return (<>
        {schContent}
        <div className="modal-footer-div">
            <Button onClick={handleCancel} variant="light">
                Cancel
            </Button>
            <Button variant="primary" onClick={handleOpen} disabled={opening || selectedId === ""}>
                {opening ?
                    <Spinner as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        style={{ marginRight: "5px" }}
                    /> : <></>
                }
                Open
            </Button>
        </div>
    </>)
}