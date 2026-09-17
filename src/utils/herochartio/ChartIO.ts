import { readTextFile, exists } from "@tauri-apps/plugin-fs"
import { extname } from "@tauri-apps/api/path"

import type { ChartSync } from "./ChartSync"
import type { ChartEvent } from "./ChartEvent"
import { Chart, type ChartTrackData } from "./Chart"
import { MidiChart } from "./MidiChart"
import type { ChartOptions } from "./ChartOptions"

export class ChartIO {
    static moonscraper_style: boolean = true

    static async load(path: string, options?: ChartOptions): Promise<Chart> {
        const ext = "." + (await extname(path)).toLowerCase()

        MidiChart.silent = !!options && options.silent

        if (ext == ".mid") return MidiChart.load(path)
        else if (ext == ".chart") return ChartIO.parse(await readTextFile(path), options)
        else if (await exists(path + ".chart")) return this.load(path + ".chart")
        else if (await exists(path + ".mid")) return this.load(path + ".mid")

        throw new Error(`Could not find suitable chart for "${path}"`)
    }

    static parse(content: string, options?: ChartOptions): Chart {
        const obj = ChartIO.chartToObject(content, options)
        const chart: Chart = new Chart()

        if (obj.Song.Name != undefined) chart.Song.Name = obj.Song.Name[0]
        if (obj.Song.Artist != undefined) chart.Song.Artist = obj.Song.Artist[0]
        if (obj.Song.ArtistText != undefined) chart.Song.ArtistText = obj.Song.ArtistText[0]
        if (obj.Song.Charter != undefined) chart.Song.Charter = obj.Song.Charter[0]
        if (obj.Song.CountOff != undefined) chart.Song.CountOff = obj.Song.CountOff[0]
        if (obj.Song.Album != undefined) chart.Song.Album = obj.Song.Album[0]
        if (obj.Song.Year != undefined) chart.Song.Year = obj.Song.Year[0]
        if (obj.Song.Offset != undefined) chart.Song.Offset = obj.Song.Offset[0]
        if (obj.Song.Resolution != undefined) chart.Song.Resolution = obj.Song.Resolution[0]
        if (obj.Song.Player2 != undefined) chart.Song.Player2 = obj.Song.Player2[0]
        if (obj.Song.Difficulty != undefined) chart.Song.Difficulty = obj.Song.Difficulty[0]
        if (obj.Song.PreviewStart != undefined) chart.Song.PreviewStart = obj.Song.PreviewStart[0]
        if (obj.Song.PreviewEnd != undefined) chart.Song.PreviewEnd = obj.Song.PreviewEnd[0]
        if (obj.Song.Genre != undefined) chart.Song.Genre = obj.Song.Genre[0]
        if (obj.Song.GuitarVol != undefined) chart.Song.GuitarVol = obj.Song.GuitarVol[0]
        if (obj.Song.BandVol != undefined) chart.Song.BandVol = obj.Song.BandVol[0]
        if (obj.Song.HoPo != undefined) chart.Song.HoPo = obj.Song.HoPo[0]
        if (obj.Song.Singer != undefined) chart.Song.Singer = obj.Song.Singer[0]
        if (obj.Song.OriginalArtist != undefined)
            chart.Song.OriginalArtist = obj.Song.OriginalArtist[0].toLowerCase() == "true"
        if (obj.Song.MediaType != undefined) chart.Song.MediaType = obj.Song.MediaType[0]
        if (obj.Song.MusicStream != undefined) chart.Song.MusicStream = obj.Song.MusicStream[0]
        if (obj.Song.GuitarStream != undefined) chart.Song.GuitarStream = obj.Song.GuitarStream[0]
        if (obj.Song.BassStream != undefined) chart.Song.BassStream = obj.Song.BassStream[0]
        if (obj.Song.RhythmStream != undefined) chart.Song.RhythmStream = obj.Song.RhythmStream[0]
        if (obj.Song.DrumStream != undefined) chart.Song.DrumStream = obj.Song.DrumStream[0]
        if (obj.Song.VocalStream != undefined) chart.Song.VocalStream = obj.Song.VocalStream[0]

        for (const ts in obj.SyncTrack) {
            chart.SyncTrack[parseInt(ts)] = obj.SyncTrack[ts].map((o: any) => {
                return {
                    type: o[0],
                    value: o[1],
                }
            }) as ChartSync[]
        }

        for (const ts in obj.Events) {
            chart.Events[parseInt(ts)] = obj.Events[ts].map((o: any) => {
                return {
                    type: o[0],
                    name: o[1],
                }
            }) as ChartEvent[]
        }

        for (const instrument of ["Single", "DoubleBass", "Drums"]) {
            for (const trackName of [
                "Expert" + instrument,
                "Hard" + instrument,
                "Medium" + instrument,
                "Easy" + instrument,
            ]) {
                if (!obj[trackName]) continue
                for (const ts in obj[trackName]) {
                    if (!chart.tracks[trackName]) chart.tracks[trackName] = {}
                    chart.tracks[trackName][parseInt(ts)] = obj[trackName][ts].map((o: any) => {
                        if (o[0] == "N") {
                            return {
                                type: "N",
                                touch: o[1],
                                duration: o[2],
                            }
                        } else if (o[0] == "E") {
                            return {
                                type: "E",
                                name: o[1],
                            }
                        } else if (o[0] == "S") {
                            return {
                                type: "S",
                                value: o[1],
                                duration: o[2],
                            }
                        }
                    }) as ChartTrackData[]
                }
            }
        }

        return chart
    }

    private static chartToObject(content: string, options?: ChartOptions): any {
        let str = content.replace(/\r/g, "").trimStart()
        str = str.replace(/\[(.*)\]\n/g, '"$1":\n')
        str = str.replace(/{\n/g, "[\n")
        str = str.replace(/}\n/g, "],\n")
        str = str.substr(0, str.length - 2)
        str = str.replace(/(\s+)(.*?) = (.*?)\n/g, (substr, ...args) => {
            if (args[2][0] != '"' && args[2].indexOf(" ") != -1) {
                const subargs = args[2].match(/".*"|[^ ]+/g)
                for (let i = 0; i < subargs.length; i++) {
                    if (subargs[i][0] != '"' && subargs[i].search(/[^0-9]/) != -1)
                        subargs[i] = `"${subargs[i].replace(/\\/g, "\\\\")}"`
                    else subargs[i] = subargs[i].replace(/\\/g, "\\\\")
                }
                args[2] = `[${subargs.join(", ")}]`
            } else if (args[2][0] != '"' && args[2].search(/[^0-9]/) != -1)
                args[2] = `"${args[2].replace(/\\/g, "\\\\")}"`
            else args[2] = args[2].replace(/\\/g, "\\\\")
            return `${args[0]}["${args[1]}", ${args[2]}],\n`
        })
        str = str.replace(/,\s*\n\s*]/gm, "\n]")
        str = `{${str}}`

        //console.log(str.substr(0, 340));
        let json
        try {
            json = JSON.parse(str)
        } catch (e: any) {
            const match = e.message.match(/at position ([0-9]+)/)
            if (match) {
                if (!options || !options.silent)
                    console.log(
                        "near `" +
                            str.substr(match[1] - 40, 40) +
                            " <--- ERROR " +
                            str.substr(match[1], 40) +
                            "`"
                    )
            }
            throw e
        }

        const charobj: any = {}
        for (const k in json) {
            charobj[k] = {}
            for (const prop of json[k]) {
                if (charobj[k][prop[0]] != undefined) charobj[k][prop[0]].push(prop[1])
                else charobj[k][prop[0]] = [prop[1]]
            }
        }

        return charobj
    }
}
