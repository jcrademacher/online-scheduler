import { useContext, createContext, useState, ReactNode, useRef } from 'react';
import { createTime } from '../../utils/time.js';
import { useNavigate } from 'react-router-dom';
import { ToastType } from '../notifications.js';
import { emitToast } from '../notifications.js';
import { ScheduleObject } from '../scheduler/types.js';


interface FileStateInterface {
    saveSchedule: () => Promise<ScheduleObject>
    saveScheduleAndClose: () => Promise<void>
    saving: boolean
    savedAt: moment.Moment | undefined
    saveRef: React.Ref<SchedulerRef>
}

const FileStateContext = createContext<FileStateInterface>({
    saveSchedule: async () => { return { acts: {}, globalActs: {}} },
    saveScheduleAndClose: async () => {},
    saving: false,
    savedAt: undefined,
    saveRef: null
})

export interface SchedulerRef {
    save: () => Promise<ScheduleObject>;
}

export function FileContextProvider({children}: {children: ReactNode}) {
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<moment.Moment | undefined>(undefined);

    const navigate = useNavigate();

    const schedulerRef = useRef<SchedulerRef>(null);

    const handleSave: () => Promise<ScheduleObject> = async () => {
        console.log("FileContextProvider handleSave called");
        var data = { acts: {}, globalActs: {} };
        if (schedulerRef.current) {
            setSaving(true);
            console.log("Calling schedulerRef.current.save()");
            data = await schedulerRef.current.save();
            console.log("Save completed with data:", data);
            setSaving(false);
            setSavedAt(createTime());
        }
        else {
            emitToast("No scheduler ref found", ToastType.Error);
        }

        return data; 
    };

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