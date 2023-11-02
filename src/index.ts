import { formatISO9075, sub } from 'date-fns'
import dotenv from 'dotenv'
import { Throttler } from './modules/throttler/throttler'
import { deleteAllRules } from './modules/throttler/utils'

dotenv.config()

const getCurrentDateInPST = () => {
  return sub(new Date(), { hours: 7 })
}

/* eslint-disable */
// @ts-ignore
global.logInfo = (...args) => {
  console.log(`[${formatISO9075(getCurrentDateInPST())}] [INFO] `, ...args)
}

// @ts-ignore
global.logError = (...args) => {
  console.error(`[${formatISO9075(getCurrentDateInPST())}] [ERROR] `, ...args)
}
/* eslint-enable */

process.on('uncaughtException', (err, origin) => {
  logInfo('UNCAUGHT EXCEPTION:', { err, origin })
})

process.on('unhandledRejection', (reason, promise) => {
  logInfo('UNHANDLED REJECTION', { reason, promise })
})

const programStart = async () => {
  let throttler = new Throttler()
  await throttler.start()

  setInterval(async () => {
    logInfo('Checking throttler rcon connection...')
    if (throttler.isRconConnected()) {
      logInfo('Throttler rcon connected')
      return
    }

    try {
      logInfo(`Throttler #${throttler.id} disconnected.`)
      throttler.stop()
    } catch (err) {
      logError(`
          Could not stop throttler #${throttler.id}
          Error: ${JSON.stringify(err ?? {})}
        `)
      process.exit(1)
    }

    logInfo('Creating new throttler...')
    throttler = new Throttler()
    await throttler.start()
  }, 15000)

  // let rconChatHandler = null
}

programStart()
