import { formatISO9075, sub } from 'date-fns'
import dotenv from 'dotenv'
import { Throttler } from './classes/Throttler/Throttler'
import { ChatController } from './classes/ChatController/ChatController'
import { deleteAllRules } from './classes/Throttler/helpers'

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

const createChatController = (throttler: Throttler): ChatController => {
  const chatController = new ChatController()

  chatController.onSetMinPing = async (minPing: number) => {
    try {
      await deleteAllRules().catch(() => {})
      throttler.setMinPing(minPing)
      logInfo(`Set throttler #${throttler.id} min ping to ${minPing}`)
    } catch (err) {
      logError('Error while setting min ping', err)
    }
  }

  return chatController
}

const programStart = async () => {
  let throttler = new Throttler()
  let chatController = createChatController(throttler)

  await throttler.start()
  await chatController.start()

  setInterval(async () => {
    logInfo(`Checking throttler #${throttler!.id} status`)

    if (throttler.isRconConnected()) {
      return logInfo(`Throttler #${throttler.id} status ok`)
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

  setInterval(async () => {
    logInfo(`Checking chat controller #${chatController.id} status`)

    if (chatController.isRconConnected()) {
      return logInfo(`Chat controller #${chatController.id} status ok`)
    }

    try {
      logInfo(`Chat controller #${chatController.id} disconnected.`)
      chatController.stop()
    } catch (err) {
      logError(`
          Could not stop chat controller #${chatController.id}
          Error: ${JSON.stringify(err ?? {})}
        `)
      process.exit(1)
    }

    logInfo('Creating new chat controller...')
    chatController = createChatController(throttler)
    await chatController.start()
  }, 15000)
}

programStart()
