import { execPromise } from '../../../utils'

let cachedNetworkInterfaceId: string | null = null

export const getNetworkInterfaceId = async (): Promise<string> => {
  if (!process.env.CONTAINER_NAME) {
    throw new Error('Must specify CONTAINER_NAME as environment variable')
  }

  if (!cachedNetworkInterfaceId) {
    cachedNetworkInterfaceId = await execPromise(
      `containerId=$(docker ps --format "{{.ID}} | {{.Names}}" | grep ${process.env.CONTAINER_NAME} | awk '{ print $1 }') && interfaceId=$(docker exec -i "$containerId" cat /sys/class/net/eth0/iflink | sed 's/\\r$//') && ip ad | grep -E $interfaceId\\:.veth | awk '{ print $2 }' | awk -F@ '{ print $1 }'`
    ).then((output) => output.trim())

    setTimeout(() => {
      cachedNetworkInterfaceId = null
    }, 30000)
  }

  logInfo(`NETWORK INTERFACE ID:`, cachedNetworkInterfaceId)
  return cachedNetworkInterfaceId as string
}

export const addOrChangeRule = async (ip: string, amountOfDelayToAdd: number): Promise<void> => {
  const networkInterfaceId = await getNetworkInterfaceId()
  const command = `tcset ${networkInterfaceId} --src-network ${ip}/32 --delay ${amountOfDelayToAdd}ms --change`
  return execPromise(command)
}

export const deleteRule = async (ip: string): Promise<void> => {
  const networkInterfaceId = await getNetworkInterfaceId()
  const command = `tcdel ${networkInterfaceId} --src-network ${ip}/32`
  return execPromise(command).catch(() => {})
}

export const deleteAllRules = async (): Promise<void> => {
  try {
    const networkInterfaceId = await getNetworkInterfaceId()
  } catch (err) {
    logError('DELETE ALL RULES', { err })
  }
  const command = `tcdel ${networkInterfaceId} --all`
  return execPromise(command)
}
