/* eslint-disable no-plusplus */

import { Rcon } from 'rcon-client'
import { getRcon } from '../../utils'
import { parseBuffer } from './helpers'
import { Throttler } from '../Throttler/Throttler'

const authorizedPlayfabs = new Set([
  '59BB3CF55044CB94',
  '8770BD43A33505C0',
  '63E09396DD2B969F',
  'AA6380B4A04CCA37'
])

let idTicker: number = 1

export class ChatController {
  id: number = idTicker++

  isRunning: boolean = false

  rcon: Rcon | null = null

  onSetMinPing: ((minPing: number) => any) | null = null

  isRconConnected() {
    return !!this.rcon?.authenticated && !this?.rcon?.socket?.closed
  }

  async handleOnData(buffer: Buffer) {
    if (!this.onSetMinPing) {
      this.rcon?.send('say Throttler not initialized...')
      return logError('onSetMinPing not initialized')
    }
    const parsed = parseBuffer(buffer)

    logInfo('Parsed chat message:', parsed)

    const [unformattedPlayfab, name, userMessage] = parsed.split(',').map((val) => val.trim())

    if (userMessage.includes('logged in') && userMessage.includes('Login:')) {
      logInfo('Sending', userMessage)
      return this.rcon?.send(`say ${userMessage}`)
    }

    const formattedPlayfab = unformattedPlayfab.split(' ')[1]

    // G6Login: 2023.11.02-05.23.13: foke logged in

    // Step 1 - check if command is valid
    if (!userMessage?.startsWith('.throttle ')) {
      return logInfo(`Skipping message "${userMessage}"`)
    }

    // Step 2 - check if user is authorized
    if (!authorizedPlayfabs.has(formattedPlayfab)) {
      return logError(`Player ${name}(${formattedPlayfab}) is unauthorized`)
    }

    logInfo(`Player ${name}(${formattedPlayfab}) is authorized!`)

    // Step 3 - check if user provided a valid number
    const [_, minPing] = userMessage.split(' ')
    const minPingAsNum = Number.parseInt(minPing, 10)

    if (Number.isNaN(minPingAsNum)) {
      const message = `say Invalid min ping provided: ${minPing}`
      this.rcon?.send(message)
      return logError(message)
    }

    this.onSetMinPing?.(minPingAsNum)
  }

  async start() {
    try {
      this.rcon = await getRcon()
      await this.rcon.send('info').then(logInfo)
      await this.rcon.send('listen chat')
      await this.rcon.send('listen login')
      this.rcon?.socket?.on('data', (buffer) => this.handleOnData(buffer))
      this.isRunning = true
    } catch (err) {
      logError('RCON Chat - Error in start function', err)
    }
  }

  async stop() {
    this.rcon?.socket?.removeAllListeners()
    this.rcon?.socket?.destroy()
    this.isRunning = false
  }
}
