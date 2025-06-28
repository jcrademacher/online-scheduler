import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./styles/index.scss";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import { BrowserRouter } from 'react-router-dom'

Amplify.configure(outputs);

import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { emitToast, ToastType } from "./components/notifications.tsx";


const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            networkMode: 'online', // or 'offlineFirst' or 'always'
            gcTime: 1000 * 60 * 60, // 24 hours
        },
    },
    queryCache: new QueryCache({
        onError: (error) =>
            emitToast(`Something went wrong: ${error.message}`, ToastType.Error),

    })
});

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
            <ReactQueryDevtools position='right' initialIsOpen={false} />
        </QueryClientProvider>
    </React.StrictMode>
);
