import { ChartSong } from "./ChartSong"
import type { ChartSync } from "./ChartSync"
import type { ChartEvent } from "./ChartEvent"
import type { ChartNote } from "./ChartNote"
import type { ChartStar } from "./ChartStar"

export type ChartTrackData = ChartEvent | ChartNote | ChartStar
export type ChartTrack<T> = { [position: number]: T[] }
export type ChartTracks = { [name: string]: ChartTrack<ChartTrackData> }

export class Chart {
    Song: ChartSong = new ChartSong()
    SyncTrack: ChartTrack<ChartSync> = {}
    Events: ChartTrack<ChartEvent> = {}

    tracks: ChartTracks = {}

    pushTrackData<T>(track: ChartTrack<T>, time: number, data: T) {
        const elt = track[time]
        if (elt) elt.push(data)
        else track[time] = [data]
    }
}