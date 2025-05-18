import { Slide, toast, ToastOptions } from 'react-toastify';

export enum ToastType {
    Info = "Info",
    Success = "Success",
    Error = "Error",
    Warning = "Warning"
}

const defaultOptions: ToastOptions = {
    position: "top-center",
    autoClose: 3000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: false,
    progress: undefined,
    theme: "light",
    transition: Slide
};

export function emitToast(message: string, type: ToastType) {
    switch (type) {
        case ToastType.Info:
            toast.info(`${type}: ${message}`, defaultOptions);
            break;
        case ToastType.Success:
            toast.success(`${type}: ${message}`, defaultOptions);
            break;
        case ToastType.Error:
            toast.error(`${type}: ${message}`, defaultOptions);
            break;
        case ToastType.Warning:
            toast.warn(`${type}: ${message}`, defaultOptions);
            break;
    }
}