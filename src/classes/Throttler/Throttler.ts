/* eslint-disable no-plusplus */
/* eslint-disable array-callback-return */

import { Rcon } from 'rcon-client/lib/rcon'
import { getRcon, timeProfiler } from '../../utils'
import { Queue, addOrChangeRule, deleteAllRules, deleteRule, getPlayerInfoList } from './helpers'
import { TrafficRule } from './types'

const { MIN_PING, MAX_DELAY_ADDED, POLL_RATE, TRAFFIC_RULE_UPDATE_RATE }: any = process.env

let idTicker = 1

export class Throttler {
  id: number = idTicker++

  isRunning: boolean = false

  rcon: Rcon | null = null

  playfabsToIps: { [playfab: string]: string } = {}

  playfabsToLastDelay: { [playfab: string]: number } = {}

  ipsThrottled: Set<string> = new Set()

  collectRulesInterval?: ReturnType<typeof setInterval>

  executeNextRuleInterval?: ReturnType<typeof setInterval>

  trafficRuleQueue: Queue<TrafficRule> = new Queue()

  minPing: number = MIN_PING ? Number.parseInt(`${MIN_PING}`, 10) : 48

  maxDelayAdded: number = MAX_DELAY_ADDED ? Number.parseInt(`${MAX_DELAY_ADDED}`, 10) : 50

  pollRate: number = POLL_RATE ? Number.parseInt(`${POLL_RATE}`, 10) : 6000

  trafficRuleUpdateRate: number = TRAFFIC_RULE_UPDATE_RATE
    ? Number.parseInt(`${TRAFFIC_RULE_UPDATE_RATE}`, 10)
    : 1000

  async createTrafficRules(): Promise<TrafficRule[]> {
    const playerInfoList = await getPlayerInfoList(this.rcon!)

    // For each ip, check if their ping is under minimum. If so, create a traffic rule
    const trafficRules = playerInfoList
      .map((playerInfo) => {
        // Special check if IP did not exist in Mordhau.log
        if (playerInfo.ip === null) {
          this.rcon?.send(
            `kick ${playerInfo.playfab} Player login invalid. Please reconnect via the server browser.`
          )
          return
        }

        this.playfabsToIps[playerInfo.playfab] = playerInfo.ip

        const currentDelay = this.playfabsToLastDelay[playerInfo.playfab] ?? 0
        const delayToAdd =
          playerInfo.ping > 0
            ? Math.min(
                Math.max(this.minPing - playerInfo.ping, -this.maxDelayAdded),
                this.maxDelayAdded
              )
            : 0
        const newDelay = Math.max(Math.min(currentDelay + delayToAdd, this.minPing), 0)

        if (currentDelay !== newDelay) {
          return { playerInfo, delay: newDelay }
        }
      })
      .filter((item) => !!item)

    return trafficRules as TrafficRule[]
  }

  isRconConnected() {
    return !!this.rcon?.authenticated && !this?.rcon?.socket?.closed
  }

  report() {
    logInfo(
      'info',
      `
      ********** THROTTLER #${this.id} REPORT **********
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
      *****************************************
    `
    )
  }

  setMinPing(minPing: number) {
    this.minPing = minPing
  }

  async collectRules() {
    const trafficRules = await this.createTrafficRules()

    trafficRules.forEach((trafficRule) => {
      const indexOfItemInQueue = this.trafficRuleQueue.findItemIndex((queueItem) => {
        return queueItem.playerInfo.ip === trafficRule.playerInfo.ip
      })

      if (indexOfItemInQueue === -1) {
        this.trafficRuleQueue.enqueue(trafficRule)
      } else {
        this.trafficRuleQueue.updateIndex(indexOfItemInQueue, trafficRule)
      }
    })

    this.report()
  }

  async executeNextRule() {
    const trafficRuleUpdate = this.trafficRuleQueue.dequeue()

    console.log({ trafficRuleUpdate })

    if (!trafficRuleUpdate) {
      return
    }

    const {
      playerInfo: { ip }
    } = trafficRuleUpdate

    if (trafficRuleUpdate.delay > 0) {
      await addOrChangeRule(ip, trafficRuleUpdate.delay)
      this.playfabsToLastDelay[trafficRuleUpdate.playerInfo.playfab] = trafficRuleUpdate.delay
      this.ipsThrottled.add(ip)
    } else if (this.ipsThrottled.has(ip)) {
      await deleteRule(ip)
      this.playfabsToLastDelay[trafficRuleUpdate.playerInfo.playfab] = 0
      this.ipsThrottled.delete(ip)
    }
  }

  async start() {
    if (this.isRunning) {
      return logError('Attempted throttler start while already running')
    }

    this.isRunning = true
    await deleteAllRules()
    this.rcon = await getRcon()

    if (!this.isRconConnected()) {
      this.isRunning = false
      throw new Error('RCON not connected')
    }

    /* This interval creates and enqueues traffic rules */
    const startCollectionInterval = async () => {
      console.log({ running22: this.isRunning })
      if (!this.isRunning) {
        return
      }

      await this.collectRules().catch(logError)
      setTimeout(() => startCollectionInterval(), this.pollRate)
    }

    /* This interval just executes the traffic rule at the top of the queue, if one exists */
    const startExecutionInterval = async () => {
      console.log('##########################')
      console.log('##########################')
      console.log('##########################')
      console.log('##########################')
      console.log('##########################')
      console.log({ running: this.isRunning })
      console.log('##########################')
      console.log('##########################')
      console.log('##########################')
      console.log('##########################')
      console.log('##########################')

      if (!this.isRunning) {
        return
      }

      console.log('before')
      await this.executeNextRule().catch(logError)
      console.log('after')
      setTimeout(() => startExecutionInterval(), this.trafficRuleUpdateRate)
    }

    startCollectionInterval()
    startExecutionInterval()

    logInfo('Throttler started!')
  }

  stop() {
    logInfo(`------------  Stopping throttler #${this.id}  -------------`)
    this.isRunning = false
    this.rcon?.socket?.removeAllListeners()
    this.rcon?.socket?.destroy()
    deleteAllRules().catch(logError)
  }
}
