import '../styles/home.scss';
import 'react-toastify/dist/ReactToastify.css';
import Button from 'react-bootstrap/Button';
import { faCircleInfo, faCircleXmark, faGear, faTriangleExclamation, faWandMagicSparkles, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import { Scheduler } from '../components/scheduler';
import Settings from '../components/settings';
import moment from 'moment';
import { AnalysisResult, analyzeSchedule } from '../analyzer';
import { AnalysisPane } from './analysis-pane';

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
    setShowSettings: (show: boolean) => void,
    showAnalysisPane: boolean,
    setShowAnalysisPane: (show: boolean) => void
}

function StatusBar({ startDates, dayView, setDayView, setShowSettings, showAnalysisPane, setShowAnalysisPane }: StatusBarProps) {
    let startDate = startDates[0];

    // const match = useScheduleIDMatch();
    // const scheduleId = match?.params.scheduleId as string;

    // const actProtoQuery = useActivityPrototypesQuery(scheduleId);
    // const actsQuery = useAllActivitiesQuery(scheduleId, actProtoQuery.data);

    const fileContext = useFileContext();
    let { saving, savedAt } = fileContext;

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
                    <span id='last-saved'>Last saved:&nbsp;{renderSave()}</span>

                </div>
                <div id='action-btns'>
                    <Button
                        variant={showAnalysisPane ? 'primary' : 'light'}
                        onClick={() => setShowAnalysisPane(!showAnalysisPane)}
                    >
                        <FontAwesomeIcon style={{ marginRight: "5px" }} icon={faWandMagicSparkles} />
                        Analysis
                    </Button>
                    <Button
                        variant='light'
                        onClick={() => setShowSettings(true)}
                    >
                        <FontAwesomeIcon icon={faGear} style={{ marginRight: "5px" }}/>
                        Settings
                    </Button>
                    
                    {/* <Button variant="light" onClick={handleClearAnalysis}>
                        <FontAwesomeIcon style={{ marginRight: "5px" }} icon={faXmark} />
                        Clear
                    </Button>
                    <SpinnerButton loading={analysisLoading} variant="light" onClick={handleAnalyze}>
                        <FontAwesomeIcon style={{ marginRight: "5px" }} icon={faWrench} />
                        Analyze
                    </SpinnerButton> */}

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

import { useActivityPrototypesQuery, useScheduleQuery } from '../queries';
import { useScheduleIDMatch } from '../utils/router';
import { Spinner } from 'react-bootstrap';
import { useFileContext } from '../components/file/context-provider';
import { SpinnerButton } from '../utils/button';
import { emitToast } from '../components/notifications';
import { ToastType } from '../components/notifications';
import { Schedule } from '../api/apiSchedule';


interface ScheduleViewProps {
    // saveRef: React.Ref<SchedulerRef>
}



export default function ScheduleView({  }: ScheduleViewProps) {
    const [view, setView] = useState<View>(View.MASTER);
    const [dayView, setDayView] = useState<number>(1);
    const [showSettings, setShowSettings] = useState(false);
    const [showAnalysisPane, setShowAnalysisPane] = useState(true);

    const match = useScheduleIDMatch();
    const scheduleId = match?.params.scheduleId as string;

    const schQuery = useScheduleQuery(scheduleId);
    const schedule: Schedule | null = schQuery.data ?? null;
    
    const actProtoQuery = useActivityPrototypesQuery(scheduleId);

    const fileContext = useFileContext();

    let [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    let [analysisLoading, setAnalysisLoading] = useState(false);

    let handleAnalyze: () => Promise<void> = async () => {
        setAnalysisLoading(true);
        await new Promise(r => setTimeout(r, 1)); // idk why this is needed
        const data = await fileContext.saveSchedule();

        if (actProtoQuery.data && schedule) {
            const analysis = await analyzeSchedule(schedule, data.acts, data.globalActs, actProtoQuery.data);
            setAnalysis(analysis);

            emitToast("Analysis complete", ToastType.Success);
        }
        else {
            emitToast("Analysis failed because of missing data", ToastType.Error);
        }

        setAnalysisLoading(false);
    };

    if (schQuery.isLoading) return (<>Loading...</>);

    else if (schQuery.isError) return (<>Error loading schedule</>);

    else if (schQuery.isSuccess) {

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

                        startDates={schQuery.data.startDates.map((el) => moment(el))}
                        showAnalysisPane={showAnalysisPane}
                        setShowAnalysisPane={setShowAnalysisPane}
                    />
                    <div className="scheduler-container"> 
                        <Scheduler
                            view={view}
                            dayView={dayView}
                            ref={fileContext.saveRef}
                            analysis={analysis}
                        />
                        <AnalysisPane 
                            paneOpen={showAnalysisPane}
                            analysis={analysis} 
                            onClose={() => setShowAnalysisPane(false)} 
                            onRunAnalysis={() => { handleAnalyze() }}
                            analysisLoading={analysisLoading}
                            onClearAnalysis={() => { setAnalysis(null) }}
                        />
                    </div>
                </div>
            </div>)
    }
}