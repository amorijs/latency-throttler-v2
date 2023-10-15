import { formatISO9075, sub } from 'date-fns'
import dotenv from 'dotenv'
import { Throttler } from './modules/throttler/throttler'

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
  const throttler = new Throttler()
  await throttler.start()
  logInfo('Throttler started!')
}

programStart()
