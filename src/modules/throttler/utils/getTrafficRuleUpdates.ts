import { Rcon } from 'rcon-client'
import { getPlayerInfoList } from './getPlayerInfoList'

/**
 * Creates/deletes traffic rules depending on logic for each player
 * @param {rcon} - rcon object
 */
export const getTrafficRuleUpdates = async (
  rcon: Rcon,
  currentDelays: { [playfab: string]: number }
) => {
  const playerInfoList = await getPlayerInfoList(rcon)

  // For each ip, check if their ping is under minimum. If so, create a traffic rule
  const delayPromises = playerInfoList.map(async (playerInfo) => {
    const currentDelay = cache_playfabToLastDelay[playerInfo.playfab] ?? 0
    const delayToAdd =
      playerInfo.ping > 0
        ? Math.min(Math.max(minPing - playerInfo.ping, -MAX_DELAY_ADDED), MAX_DELAY_ADDED)
        : 0
    const newDelay = Math.max(Math.min(currentDelay + delayToAdd, minPing), 0)

    cache_playfabToLastDelay[playerInfo.playfab] = newDelay

    if (newDelay > 0 && currentDelay !== newDelay) {
      return { playerInfo, delay: newDelay }
    }
  })

  const trafficRuleUpdates = await Promise.all(delayPromises)

  return trafficRuleUpdates.filter(function (trafficRuleUpdate) {
    return trafficRuleUpdate !== undefined
  })
}
