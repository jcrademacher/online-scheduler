import '../styles/navbar.scss';
import { UseAuthenticator } from '@aws-amplify/ui-react';
import { Dropdown } from 'react-bootstrap';
import { useAllActivitiesQuery, useScheduleQuery, useActivityPrototypesQuery } from '../queries';
import { exportScheduleAsXLSX } from './file/exporter';

interface NavBarProps {
    signOut: UseAuthenticator["signOut"] | undefined;
    handleFileNew: () => void;
    handleFileOpen: () => void;
    handleSave: () => Promise<void>
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

import { useNavigate } from 'react-router-dom';
import { useScheduleIDMatch } from '../utils/router';
import { useFileContext } from './file/context-provider';

function NavBar({ signOut, handleFileNew, handleFileOpen, handleSave }: NavBarProps) {

    const match = useScheduleIDMatch();
    const navigate = useNavigate();

    const scheduleId = match?.params.scheduleId;

    const actProtoQuery = useActivityPrototypesQuery(scheduleId);
    const schQuery = useScheduleQuery(scheduleId);
    const actsQuery = useAllActivitiesQuery(scheduleId, actProtoQuery.data);

    const fileContext = useFileContext();

    const exportAction = async () => {
        await handleSave();
    
        if (actsQuery.data && schQuery.data && actProtoQuery.data) {
            exportScheduleAsXLSX(actProtoQuery.data, actsQuery.data, schQuery.data);
        }
    }

    const fileItems: DropdownOptions[] = [
        { name: "New...", action: handleFileNew, disabled: match !== null },
        { name: "Open...", action: handleFileOpen, disabled: match !== null },
        {},
        { name: "Save", action: () => { handleSave() }, disabled: match === null },
        {
            name: "Save & Close",
            action: async () => {
                await handleSave();
                fileContext.setSavedAt(undefined);
                navigate("/");
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
            <button id="signout-button" onClick={() => { if (signOut) signOut() }}>Sign Out</button>
            <span>
                <b>RYLA Scheduler</b>
            </span>
            <NavDropdown title="File" items={fileItems} />
            {/* <NavDropdown title="View" items={viewItems}/> */}
        </div>
    )
}

export default NavBar;
