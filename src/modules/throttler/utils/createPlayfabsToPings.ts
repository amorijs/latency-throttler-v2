// import { PlayfabsToPings } from '../types'

import { PlayfabsToPings } from '../types'

/**
 * Function that takes a playerlist, returns a dictionary of playfabs to pings
 * ie:
 *  {
 *    '5EEE922A2A11': 44
 *  }
 */
export const createPlayfabsToPings = (playerList: string): PlayfabsToPings => {
  if (playerList.includes('There are currently no players present')) {
    return {}
  }

  const playerLines = playerList.trim().split('\n')

  const playfabsToPings: PlayfabsToPings = {}

  playerLines.forEach((playerLine) => {
    const splitItems = playerLine.split(',')
    const playfab = splitItems[0]
    const ping = splitItems[2]

    if (ping === undefined) {
      // Player is a bot
      return
    }

    const pingAsNum = Number.parseInt(ping.trim().split(' ')[0], 10)
    playfabsToPings[playfab] = pingAsNum
  })

  return playfabsToPings
}
