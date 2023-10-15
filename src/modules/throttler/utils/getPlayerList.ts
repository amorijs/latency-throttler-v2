import { Rcon } from 'rcon-client'

/**
 * Function that gets the playerlist from the rcon object. Return the playerlist
 */
export const getPlayerList = async (rcon: Rcon): Promise<string> => {
  return rcon.send('playerlist')
}
