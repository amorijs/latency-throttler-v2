import { Rcon } from 'rcon-client'
import { timeProfiler } from '../../../utils'
import { getPlayerList } from './getPlayerList'
import { createPlayfabsToPings } from './createPlayfabsToPings'
import { PlayerInfo } from '../types'
import { getPlayfabsToIps } from './getPlayfabsToIps'

/**
 * Parses Mordhau.log for player ips, and returns an array of dictionaries { ip, playfab, ping }
 * @param {object} rcon - rcon object
 * @returns [{ 'playfab': 'kj251jk512', ip: '111.111.111.11', ping: 50 }]
 */
export const getPlayerInfoList = async (rcon: Rcon): Promise<PlayerInfo[]> => {
  const playerList: string = await timeProfiler('Rcon player list', () => {
    return getPlayerList(rcon)
  })

  const playfabsToPings = createPlayfabsToPings(playerList)
  const entries = Object.entries(playfabsToPings)
  const playfabsToIps = await timeProfiler('Getting IPs', getPlayfabsToIps)

  const promises = entries.map(async ([playfab, ping]) => {
    const ip = playfabsToIps[playfab]

    if (!ip || !ip.length) {
      logError(`Did not have IP for  playfab ${playfab}`)
      return { ip: null, playfab, ping }
    }

    return { ip, playfab, ping }
  })

  const playerInfoList = await Promise.all(promises)
  return playerInfoList.filter((playerInfo) => !!playerInfo) as unknown as PlayerInfo[]
}
