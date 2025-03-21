import '../styles/home.scss';
import 'react-toastify/dist/ReactToastify.css';
import Button from 'react-bootstrap/Button';
import { faCircleInfo, faCircleXmark, faGear, faTriangleExclamation, faWrench } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import { Scheduler, SchedulerRef } from '../components/scheduler';
import Settings from '../components/settings';
import moment from 'moment';
import { Analysis, analyzeSchedule } from '../analyzer';

export enum View {
    MASTER = "Master",
    LEG = "Leg",
    SUPPORT = "Support"
}

type StatusBarProps = {
    startDates: moment.Moment[],
    view: View,
    setView: (view: View) => void,
    dayView: number,
    setDayView: (day: number) => void,
    setShowSettings: (show: boolean) => void
}

function StatusBar({ startDates, dayView, setDayView, setShowSettings }: StatusBarProps) {
    let startDate = startDates[0];

    const match = useScheduleIDMatch();
    const scheduleId = match?.params.scheduleId as string;

    const fileContext = useFileContext();

    let { saving, savedAt } = fileContext;

    let [analysis, setAnalysis] = useState<Analysis | null>(null);

    let renderSave = () => {
        if (saving) {
            return (
                <Spinner
                    as="span"
                    animation="border"
                    role="status"
                    size='sm'
                />
            );
        }
        else if (savedAt) {
            return <span>{savedAt.format(" MMM Do [at] h:mm:ss a")}</span>;
        }
        else {
            return <span>never</span>;
        }
    };      

    let handleAnalyze = async () => {
        const analysis = await analyzeSchedule(scheduleId);
        setAnalysis(analysis);
    }

    return (
        <div id='status-bar'>
            <div id="view-control">
                <div id="view-subselect">
                    {startDates.map((date) => {
                        let diff = date.diff(startDate, 'days') + 1;

                        return (
                            <Button
                                variant={dayView === diff ? "primary" : "light"}
                                onClick={() => setDayView(diff)}
                                key={date.toISOString()}
                            >
                                {date.format('dddd')} (Day {diff})
                            </Button>
                        );
                    })}
                </div>
                <div id='info-bar'>
                    <div id="analysis-bar">
                        <FontAwesomeIcon className='analysis-count' color="green" icon={faCircleInfo} />
                        <span>{analysis ? analysis.info.length : 0}</span>
                        <FontAwesomeIcon className='analysis-count' color="#dbb402" icon={faTriangleExclamation} />
                        <span>{analysis ? analysis.warnings.length : 0}</span>
                        <FontAwesomeIcon className='analysis-count' color="red" icon={faCircleXmark} />
                        <span>{analysis ? analysis.errors.length : 0}</span>
                    </div>
                    <span id='last-saved'>Last saved:&nbsp;{renderSave()}</span>

                </div>
                <div id='action-btns'>
                    <Button
                        variant='light'
                        onClick={() => setShowSettings(true)}
                    >
                        <FontAwesomeIcon style={{ marginRight: "5px" }} icon={faGear} />
                        Settings
                    </Button>
                    <Button
                        variant='light'
                        onClick={handleAnalyze}
                    >
                        <FontAwesomeIcon style={{ marginRight: "5px" }} icon={faWrench} />
                        Analyze
                    </Button>

                </div>

                {/* <ButtonGroup id='view-control-buttons'>
                <Button
                    variant={view === View.MASTER ? 'primary' : 'light'}
                    onClick={() => setView(View.MASTER)}
                >{View.MASTER} View</Button>
                <Button
                    variant={view === View.LEG ? 'primary' : 'light'}
                    onClick={() => setView(View.LEG)}
                >{View.LEG} View</Button>
                <Button
                    variant={view === View.SUPPORT ? 'primary' : 'light'}
                    onClick={() => setView(View.SUPPORT)}
                >{View.SUPPORT} View</Button>
            </ButtonGroup> */}
            </div>

        </div >
    )
}

import { useScheduleQuery } from '../queries';
import { useScheduleIDMatch } from '../utils/router';
import { Spinner } from 'react-bootstrap';
import { useFileContext } from '../components/file/context-provider';


interface ScheduleViewProps {
    // saveRef: React.Ref<SchedulerRef>
}

export default function ScheduleView({  }: ScheduleViewProps) {
    const [view, setView] = useState<View>(View.MASTER);
    const [dayView, setDayView] = useState<number>(1);
    // const [activities, setActivities] = useState<Schema["ActivityPrototype"]["type"][]>([]);
    const [showSettings, setShowSettings] = useState(false);

    const match = useScheduleIDMatch();
    const scheduleId = match?.params.scheduleId as string;

    const query = useScheduleQuery(scheduleId);

    const { saveRef } = useFileContext();


    // useEffect(() => {
    //     console.log(query.status);
    //     if(query.status === "success") {
    //         emitToast("Opened schedule", ToastType.Success);
    //     }
    // }, [query.status]);

    if (query.isLoading) return (<>Loading...</>);

    else if (query.isError) return (<>Error loading schedule</>);

    else if (query.isSuccess) {

        return (
            <div id="home-page">
                <div id="content">
                    <Settings
                        show={showSettings}
                        handleClose={() => setShowSettings(false)}
                    />
                    {/* <div>
                        <Button className="btn-stick-left">New Schedule</Button>
                        <Button className="btn-stick-left" variant="light">Open Schedule</Button>
                        <Button
                            variant='light'
                            onClick={() => setShowSettings(true)}
                            className='btn-stick-right'
                        >
                            <FontAwesomeIcon style={{ marginRight: "5px" }} icon={faGear} />
                            Settings
                        </Button>
                        <Button className="btn-stick-right" variant="light">
                            <FontAwesomeIcon style={{ marginRight: "5px" }} icon={faFloppyDisk} />
                            Save
                        </Button>
                    </div>
                    <div className="separator" /> */}
                    <StatusBar
                        view={view}
                        setView={setView}
                        dayView={dayView}
                        setDayView={setDayView}
                        setShowSettings={setShowSettings}
                        startDates={query.data.startDates.map((el) => moment(el))}
                    />
                    <Scheduler
                        view={view}
                        dayView={dayView}
                        ref={saveRef}
                    />
                </div>
            </div>)
    }
}