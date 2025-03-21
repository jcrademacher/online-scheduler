import { useContext, createContext, useState, ReactNode, useRef, useCallback } from 'react';
import { SchedulerRef } from '../../components/scheduler/index.js';
import { createTime } from '../../utils/time.js';
import { useNavigate } from 'react-router-dom';
import { ToastType } from '../notifications.js';
import { emitToast } from '../notifications.js';


interface FileStateInterface {
    saveSchedule: () => Promise<void>
    saveScheduleAndClose: () => Promise<void>
    saving: boolean
    savedAt: moment.Moment | undefined
    saveRef: React.Ref<SchedulerRef>
}

const FileStateContext = createContext<FileStateInterface>({
    saveSchedule: async () => {},
    saveScheduleAndClose: async () => {},
    saving: false,
    savedAt: undefined,
    saveRef: null
})

export function FileContextProvider({children}: {children: ReactNode}) {
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<moment.Moment | undefined>(undefined);

    const navigate = useNavigate();

    const schedulerRef = useRef<SchedulerRef>(null);

    const handleSave = useCallback(async () => {
        // console.log("updated handleSave");
        if (schedulerRef.current) {
            setSaving(true);
            await schedulerRef.current.save();
            setSaving(false);
            setSavedAt(createTime());
        }
        else {
            emitToast("No scheduler ref found", ToastType.Error);
        }
    }, [schedulerRef]);

    const handleSaveAndClose = async () => {
        await handleSave();
        setSavedAt(undefined);
        navigate("/");
    };

    return (
        <FileStateContext.Provider value={{
            saveSchedule: handleSave,
            saveScheduleAndClose: handleSaveAndClose,
            saving: saving,
            savedAt: savedAt,
            saveRef: schedulerRef
        }}>
            {children}
        </FileStateContext.Provider>
    )
}

export const useFileContext = () => {
    return useContext(FileStateContext);
}