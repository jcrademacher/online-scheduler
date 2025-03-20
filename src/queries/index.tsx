import { useQuery } from "@tanstack/react-query";
import { getSchedule, getSchedules } from "../api/apiSchedule";
import { ActivityPrototypeMap, getActivityPrototypesMapped } from "../api/apiActivityPrototype";
import { getActivitiesMapped, getAllActivitiesMapped, getGlobalActivitiesMapped } from "../api/apiActivity"; 

export function useScheduleQuery(id: string | undefined) {
    return useQuery({
        queryKey: ["schedule", id],
        queryFn: async () => getSchedule(id as string),
        staleTime: 60*1000,
        enabled: !!id,
        refetchOnWindowFocus: false
    });
}

export function useActivityPrototypesQuery(id: string | undefined) {
    return useQuery({
        queryKey: ["activityPrototypes", id],
        queryFn: async () => getActivityPrototypesMapped(id as string),
        staleTime: 60*1000,
        refetchOnWindowFocus: false,
        enabled: !!id
    });
}

export function useSchedulesQuery() {
    return useQuery({
        queryKey: ['schedules'],
        queryFn: getSchedules,
        staleTime: 60*1000,
        refetchOnWindowFocus: false
    });
}

export function useActivitiesQuery(id: string | undefined, protos: ActivityPrototypeMap | undefined) {
    return useQuery({
        queryKey: ['activity', id],
        queryFn: async () => getActivitiesMapped(protos as ActivityPrototypeMap),
        enabled: !!protos && !!id,
        staleTime: 60*1000,
        refetchOnWindowFocus: false
    })
}

export function useGlobalActivitiesQuery(id: string | undefined, protos: ActivityPrototypeMap | undefined) {
    return useQuery({
        queryKey: ['globalActivity', id],
        queryFn: async () => getGlobalActivitiesMapped(id as string),
        enabled: !!protos && !!id,
        staleTime: 60*1000,
        refetchOnWindowFocus: false
    })
}

export function useAllActivitiesQuery(id: string | undefined, protos: ActivityPrototypeMap | undefined) {
    return useQuery({
        queryKey: ['allActivities', id],
        queryFn: async () => getAllActivitiesMapped(id as string,protos as ActivityPrototypeMap),
        enabled: !!protos && !!id,
        staleTime: 60*1000,
        refetchOnWindowFocus: false
    })
}