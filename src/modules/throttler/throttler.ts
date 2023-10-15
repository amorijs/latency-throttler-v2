/* eslint-disable no-plusplus */

import { Rcon } from 'rcon-client/lib/rcon'
import { getRcon, timeProfiler } from '../../utils'
import { Queue, addOrChangeRule, deleteAllRules, deleteRule, getPlayerInfoList } from './utils'
import { TrafficRuleUpdate } from './types'

const { MIN_PING, MAX_DELAY_ADDED, POLL_RATE, TRAFFIC_RULE_UPDATE_RATE }: any = process.env

interface IThrottler {
  start: () => void
  isRconConnected: () => boolean
}

let idTicker = 1

export class Throttler implements IThrottler {
  id: number = idTicker++

  isRunning: boolean = false

  rcon: Rcon | null = null

  playfabsToIps: { [playfab: string]: string } = {}

  playfabsToLastDelay: { [playfab: string]: number } = {}

  ipsThrottled: Set<string> = new Set()

  getTrafficRulesInterval?: ReturnType<typeof setInterval>

  executeTrafficRulesInterval?: ReturnType<typeof setInterval>

  trafficRuleQueue: Queue<TrafficRuleUpdate> = new Queue()

  minPing: number = MIN_PING ? Number.parseInt(`${MIN_PING}`, 10) : 48

  maxDelayAdded: number = MAX_DELAY_ADDED ? Number.parseInt(`${MAX_DELAY_ADDED}`, 10) : 50

  pollRate: number = POLL_RATE ? Number.parseInt(`${POLL_RATE}`, 10) : 6000

  trafficRuleUpdateRate = TRAFFIC_RULE_UPDATE_RATE
    ? Number.parseInt(`${TRAFFIC_RULE_UPDATE_RATE}`, 10)
    : 1000

  report() {
    logInfo(
      'info',
      `
      **** THROTTLER #${this.id} REPORT ****
        id: ${this.id}
        ****
        rcon status: ${this.isRconConnected() ? 'connected' : 'not connected'}
        ****
        playfabsToLastDelay: ${JSON.stringify(this.playfabsToLastDelay)}
        ****
        playFabsToIps: ${JSON.stringify(this.playfabsToIps)}
        ****
        ipsThrottled: ${JSON.stringify(this.ipsThrottled)}
        ****
        trafficRuleQueue: ${JSON.stringify(this.trafficRuleQueue.queue)}
        ****
        minPing: ${JSON.stringify(this.minPing)}
        ****
        maxDelayAdded: ${JSON.stringify(this.maxDelayAdded)}
        ****
        pollRate: ${JSON.stringify(this.pollRate)}
      ****************************************
    `
    )
  }

  clearAllIntervals() {
    if (this.getTrafficRulesInterval) {
      clearInterval(this.getTrafficRulesInterval)
      this.getTrafficRulesInterval = undefined
    }

    if (this.executeTrafficRulesInterval) {
      clearInterval(this.executeTrafficRulesInterval)
      this.executeTrafficRulesInterval = undefined
    }
  }

  log(type: 'info' | 'error', ...args: any[]) {
    const prefix = `[Throttler #${this.id}] `

    if (type === 'info') {
      logInfo(prefix, ...args)
    } else if (type === 'error') {
      logError(prefix, ...args)
    } else {
      logError(prefix, `Unknown log type: ${type}`)
    }
  }

  isRconConnected() {
    return !!this.rcon?.authenticated && !this?.rcon?.socket?.closed
  }

  async start() {
    if (this.isRunning) {
      return this.log('error', 'Attempted throttler start while already running')
    }

    this.isRunning = true
    this.rcon = await getRcon()

    if (!this.isRconConnected()) {
      this.isRunning = false
      throw new Error('RCON not connected')
    }

    this.clearAllIntervals()

    this.getTrafficRulesInterval = setInterval(async () => {
      await timeProfiler('Getting traffic rules and updating queue', async () => {
        // Create trafficRuleUpdates
        const playerInfoList = await getPlayerInfoList(this.rcon!)

        // For each ip, check if their ping is under minimum. If so, create a traffic rule
        const delayPromises = playerInfoList.map(
          async (playerInfo): Promise<TrafficRuleUpdate | undefined> => {
            const currentDelay = this.playfabsToLastDelay[playerInfo.playfab] ?? 0
            const delayToAdd =
              playerInfo.ping > 0
                ? Math.min(
                    Math.max(this.minPing - playerInfo.ping, -this.maxDelayAdded),
                    this.maxDelayAdded
                  )
                : 0
            const newDelay = Math.max(Math.min(currentDelay + delayToAdd, this.minPing), 0)

            this.playfabsToLastDelay[playerInfo.playfab] = newDelay
            this.playfabsToIps[playerInfo.playfab] = playerInfo.ip

            if (newDelay > 0 && currentDelay !== newDelay) {
              return { playerInfo, delay: newDelay }
            }
          }
        )

        const trafficRuleUpdates = await Promise.all(delayPromises).then(
          (arr) => arr.filter((item) => !!item) as TrafficRuleUpdate[]
        )

        trafficRuleUpdates.forEach((trafficRuleUpdate) => {
          const indexOfItemInQueue = this.trafficRuleQueue.findItemIndex((queueItem) => {
            return queueItem.playerInfo.ip === trafficRuleUpdate.playerInfo.ip
          })

          if (indexOfItemInQueue === -1) {
            this.trafficRuleQueue.enqueue(trafficRuleUpdate)
          } else {
            this.trafficRuleQueue.updateIndex(indexOfItemInQueue, trafficRuleUpdate)
          }
        })

        playerInfoList.forEach(({ ip, ping, playfab }) => {})

        this.report()
      })
    }, this.pollRate)

    this.executeTrafficRulesInterval = setInterval(async () => {
      const trafficRuleUpdate = this.trafficRuleQueue.dequeue()

      if (!trafficRuleUpdate) {
        return
      }

      const {
        playerInfo: { ip }
      } = trafficRuleUpdate

      if (trafficRuleUpdate.delay > 0) {
        await addOrChangeRule(ip, trafficRuleUpdate.delay)
        this.ipsThrottled.add(ip)
      } else if (this.ipsThrottled.has(ip)) {
        await deleteRule(ip)
        this.ipsThrottled.delete(ip)
      }
    }, this.trafficRuleUpdateRate)
  }

  async stop(deleteRules: boolean) {
    this.clearAllIntervals()

    await this.rcon?.socket?.removeAllListeners()
    await this.rcon?.socket?.destroy()

    if (deleteRules) {
      await deleteAllRules()
    }

    this.isRunning = false
  }
}
