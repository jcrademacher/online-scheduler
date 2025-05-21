import '../styles/navbar.scss';
import { UseAuthenticator } from '@aws-amplify/ui-react';
import { Button, Dropdown } from 'react-bootstrap';
import { useAllActivitiesQuery, useScheduleQuery, useActivityPrototypesQuery } from '../queries';
import { exportScheduleAsXLSX } from './file/exporter';
import { useNavigate } from 'react-router-dom';

interface NavBarProps {
    signOut: UseAuthenticator["signOut"] | undefined;
    handleFileNew: () => void;
    handleFileOpen: () => void;
}

type DropdownOptions = {
    name?: string,
    action?: () => void,
    disabled?: boolean
}

interface DropdownProps {
    title: string;
    items: DropdownOptions[];
}

function NavDropdown({ title, items }: DropdownProps) {
    return (
        <Dropdown className='nav-item'>
            <Dropdown.Toggle size="sm" id="dropdown-basic">
                {title}
            </Dropdown.Toggle>

            <Dropdown.Menu>
                {items.map(({ name, disabled, action },i) => {
                    if (!name && !action && !disabled) {
                        return <Dropdown.Divider key={i}/>
                    }
                    else {
                        return <Dropdown.Item disabled={disabled} onClick={action} key={name}>{name}</Dropdown.Item>
                    }
                }
                )}
            </Dropdown.Menu>
        </Dropdown>
    );
}

import { useScheduleIDMatch } from '../utils/router';
import { useFileContext } from './file/context-provider';
import { ToastType } from './notifications';
import { emitToast } from './notifications';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleQuestion } from '@fortawesome/free-solid-svg-icons';
import { ScheduleObject } from './scheduler/types';

function NavBar({ signOut, handleFileNew, handleFileOpen }: NavBarProps) {

    const match = useScheduleIDMatch();
    

    const scheduleId = match?.params.scheduleId;

    const actProtoQuery = useActivityPrototypesQuery(scheduleId);
    const schQuery = useScheduleQuery(scheduleId);
    const actsQuery = useAllActivitiesQuery(scheduleId, actProtoQuery.data);

    const fileContext = useFileContext();

    const navigate = useNavigate(); 

    const exportAction = async () => {
        const newSchData: ScheduleObject = await fileContext.saveSchedule();
    
        if (schQuery.data && actProtoQuery.data) {
            // console.log(actsQuery.data)
            exportScheduleAsXLSX(actProtoQuery.data, newSchData, schQuery.data);
        }
        else {
            emitToast("Schedule or prototype queries unexpectedly were not available", ToastType.Error);
        }
    }

    const fileItems: DropdownOptions[] = [
        { name: "New...", action: handleFileNew, disabled: match !== null },
        { name: "Open...", action: handleFileOpen, disabled: match !== null },
        {},
        { 
            name: "Save", 
            action: async () => { 
                await fileContext.saveSchedule(); 
                emitToast("Changes saved", ToastType.Success);
            }, disabled: match === null },
        {
            name: "Save & Close",
            action: async () => {
                await fileContext.saveScheduleAndClose();
            }, disabled: match === null
        },
        {},
        {   
            name: "Export...", 
            action: exportAction, 
            disabled: match === null 
        }
    ];
    

    return (
        <div id="nav">
            <span>
                <b>RYLA Scheduler</b>
            </span>
            <NavDropdown title="File" items={fileItems} />
            <div className="right-nav">
                <Button onClick={() => { navigate("/help") }}>
                    <FontAwesomeIcon icon={faCircleQuestion}/>
                </Button>
                <button id="signout-button" onClick={() => { if (signOut) signOut() }}>Sign Out</button>
            </div>
        </div>
    )
}

export default NavBar;
