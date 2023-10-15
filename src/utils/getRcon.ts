// eslint-disable-next-line
import { Rcon } from 'rcon-client'

/**
 * Function that connects to rcon and returns the rcon object
 */
export const getRcon = async (wait = 0): Promise<Rcon> => {
  if (wait > 0) {
    logInfo('Waiting...')
    await new Promise((resolve) => {
      setTimeout(resolve, wait)
    })
  }

  logInfo('Attempting connection to rcon...')

  const { RCON_HOST, RCON_PORT, RCON_PASSWORD } = process.env

  if (!RCON_HOST || !RCON_PORT || !RCON_PASSWORD) {
    throw new Error('Not all RCON environment variables have been set up')
  }

  const rconPromise = Rcon.connect({
    host: process.env.RCON_HOST!,
    port: Number.parseInt(process.env.RCON_PORT!, 10),
    password: process.env.RCON_PASSWORD!
  })

  const timeoutPromise = new Promise((resolve, reject) => {
    setTimeout(() => {
      reject()
    }, 5000)
  })

  try {
    const rcon: Rcon = (await Promise.race([rconPromise, timeoutPromise])) as any

    rcon.on('error', async (err) => {
      logError('RCON connection emmitted error event:', err)
      await rcon?.socket?.removeAllListeners?.()
      await rcon?.socket?.destroy?.()
    })

    rcon.on('end', async () => {
      logInfo('RCON connection emmitted end event')
      await rcon?.socket?.removeAllListeners?.()
      await rcon?.socket?.destroy?.()
    })

    logInfo('Connected to RCON')
    return rcon
  } catch (err) {
    logError('RCON connection timed out, retrying in 10 seconds...', err)
    return getRcon(10000)
  }
}
