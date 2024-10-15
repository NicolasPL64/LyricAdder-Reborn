import { readFile } from "@tauri-apps/plugin-fs"
import { Chart } from "./Chart"
import { ChartIO } from "."

import midi from "midi-file"

export class MidiChart {
  static silent: boolean = false

  static async load(path: string): Promise<Chart> {
    const fileContent = await readFile(path)
    const bufferContent = Buffer.from(fileContent)
    const chart = MidiChart.parse(bufferContent)
    return chart
  }

  static parse(content: Buffer): Chart {
    const obj = MidiChart.midiToObject(content)
    const chart: Chart = new Chart()

    const tracksNameTranslate: { [name: string]: string } = {
      "PART GUITAR": "Single",
      "PART BASS": "DoubleBass",
      "PART DRUMS": "Drums",
      "PART VOCALS": "",
    }
    const difficulties = ["Easy", "Medium", "Hard", "Expert"]

    const approx = ChartIO.moonscraper_style ? Math.floor : Math.round

    chart.Song.Offset = 0
    chart.Song.Resolution = obj.header.ticksPerBeat
    chart.Song.Player2 = "bass"
    chart.Song.Difficulty = 0
    chart.Song.PreviewStart = 0
    chart.Song.PreviewEnd = 0
    chart.Song.Genre = "rock"
    chart.Song.MediaType = "cd"
    chart.SyncTrack = { "0": [] }

    for (const obj_track of obj.tracks) {
      let time = 0
      let trackName = ""
      const lastNote: { [name: string]: number } = {}
      const lastTimedNote: { [name: string]: number } = {}
      const openNote: { [name: string]: boolean } = {}
      const tappingNote: { [name: string]: boolean } = {}
      for (const difficulty of difficulties) {
        lastNote[difficulty] = -2000
        lastTimedNote[difficulty] = -2000
        openNote[difficulty] = false
        tappingNote[difficulty] = false
      }
      for (let index = 0; index < obj_track.length; index++) {
        const elt = obj_track[index]
        time += elt.deltaTime

        if (elt.type == "setTempo")
          chart.pushTrackData(chart.SyncTrack, time, {
            type: "B",
            value: approx(60000000000 / elt.microsecondsPerBeat),
          })
        else if (elt.type == "timeSignature")
          chart.pushTrackData(chart.SyncTrack, time, { type: "TS", value: elt.numerator })
        else if (elt.type == "trackName") trackName = elt.text
        else if (elt.type == "text") {
          if (trackName == "EVENTS") {
            const sectionName = elt.text.match(/\[(.*)\]/)
            if (sectionName && sectionName[1])
              chart.pushTrackData(chart.Events, time, { type: "E", name: sectionName[1] })
            else chart.pushTrackData(chart.Events, time, { type: "E", name: elt.text })
          }
        } else if (elt.type == "noteOn") {
          if (trackName) {
            for (let i = 0; i < difficulties.length; i++) {
              const difficulty = difficulties[i]
              const chartTrackName = difficulty + tracksNameTranslate[trackName]
              let track = chart.tracks[chartTrackName]
              if (!track) track = chart.tracks[chartTrackName] = {}
              const octaveNote = 60 + i * 12

              if (
                (elt.noteNumber >= octaveNote && elt.noteNumber <= octaveNote + 5) ||
                elt.noteNumber == 116
              ) {
                let duration = 0
                for (let i = index + 1; i < obj_track.length; i++) {
                  const offelt = obj_track[i]
                  duration += offelt.deltaTime
                  if (offelt.noteNumber == elt.noteNumber && offelt.type == "noteOff") break
                }
                const lastTrackNote = lastNote[difficulty]
                const lastTimedTrackNote = lastTimedNote[difficulty]
                const sinceLast = time - lastTimedTrackNote
                if (duration <= chart.Song.Resolution / 3 || elt.noteNumber == octaveNote + 5)
                  duration = 0
                if (elt.noteNumber == 116)
                  chart.pushTrackData(track, time, { type: "S", value: 2, duration: duration })
                else if (
                  elt.noteNumber < octaveNote + 5 ||
                  sinceLast > chart.Song.Resolution / 3 + 2
                ) {
                  if (openNote[chartTrackName])
                    chart.pushTrackData(track, time, { type: "N", touch: 7, duration: duration })
                  else {
                    if (tappingNote[chartTrackName] && lastNote[chartTrackName] != time)
                      chart.pushTrackData(track, time, { type: "N", touch: 6, duration: 0 })
                    chart.pushTrackData(track, time, {
                      type: "N",
                      touch: elt.noteNumber - octaveNote,
                      duration: duration,
                    })
                  }

                  if (time > lastTrackNote) {
                    lastTimedNote[chartTrackName] = lastNote[chartTrackName]
                    lastNote[chartTrackName] = time
                  }
                }
              }
            }
          }
        } else if (elt.type == "sysEx" && Buffer.isBuffer(elt.data)) {
          const data = elt.data as Buffer
          if (data.readUInt32LE(0) != 0x5350 || data.readUInt8(7) != 247) {
            if (!MidiChart.silent) console.warn("Unknown sysEx event at " + time + ": ", data)
          } else {
            for (let i = 0; i < difficulties.length; i++) {
              const difficulty = difficulties[i]
              const chartTrackName = difficulty + tracksNameTranslate[trackName]

              if (data.readUInt8(5) == 4) {
                // tapping notes ?
                if (data.readUInt8(4) & i)
                  // expert ?
                  tappingNote[chartTrackName] = data.readUInt8(6) == 1
              } else if (data.readUInt8(5) == 1) {
                // open notes ?
                if (data.readUInt8(4) & i)
                  // expert ?
                  openNote[chartTrackName] = data.readUInt8(6) == 1
              }
            }
          }
        } else if (elt.type == "lyrics") {
          chart.pushTrackData(chart.Events, time, { type: "E", name: "lyric " + elt.text })
        } else if (
          elt.type == "sequencerSpecific" ||
          elt.type == "controller" ||
          elt.type == "programChange" ||
          elt.type == "channelPrefix"
        ) {
          // skip
        } else if (elt.type != "endOfTrack" && elt.type != "noteOff") {
          if (!MidiChart.silent) console.warn("Unknown midi elt", elt)
        }
      }
    }

    if (chart.SyncTrack[0].findIndex((elt) => elt.type == "TS") == -1)
      chart.SyncTrack[0].unshift({ type: "TS", value: 4 })
    if (chart.SyncTrack[0].findIndex((elt) => elt.type == "B") == -1)
      chart.SyncTrack[0].push({ type: "B", value: 120000 })

    for (const chartTrackName in chart.tracks) {
      for (const t in chart.tracks[chartTrackName]) {
        if (chart.tracks[chartTrackName][t].length > 1) {
          chart.tracks[chartTrackName][t] = chart.tracks[chartTrackName][t].sort((a, b) => {
            const typea = a.type == "N" ? 0 : 1
            const typeb = b.type == "N" ? 0 : 1
            return typea - typeb
          })
        }
      }
    }

    for (const t in chart.Events) {
      if (chart.Events[t].length > 1) {
        chart.Events[t] = chart.Events[t].sort((a, b) => b.name.localeCompare(a.name))
      }
    }

    return chart
  }

  private static midiToObject(content: Buffer): any {
    const midiobj = midi.parseMidi(content)

    return midiobj
  }
}
