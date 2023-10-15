import { execPromise } from '../../../utils'
import { PlayfabsToIps } from '../types'

/**
 * Returns a dictionary of playfabs to ips
 * { AA6380B4A04CCA37: '184.98.28.14' }
 */
export const getPlayfabsToIps = async (): Promise<PlayfabsToIps> => {
  const findLogCommand = `install_path=$(docker inspect ${process.env.CONTAINER_NAME} | grep UpperDir | awk '{print $2}' | tr -d '",'); echo $install_path/home/steam/mordhau/Mordhau/Saved/Logs/Mordhau.log`
  const logLocationWithUnwantedCharacters = await execPromise(findLogCommand)
  const logLocation = logLocationWithUnwantedCharacters.replace('\n', '')

  const command = `grep -oE "RemoteAddr: [0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}.*MordhauOnlineSubsystem:.*$" ${logLocation} | tr ',:' ' ' | awk '{print $2,$17}'`
  const ipsAndPlayfabsString = await execPromise(command)
  const splitByLine: string[] = ipsAndPlayfabsString.split('\n')

  const output: PlayfabsToIps = {}

  splitByLine
    .filter((line) => typeof line === 'string' && line.trim().length > 0)
    .forEach((line) => {
      const [ip, playfab] = line
        .replace("'", '')
        .replace(/(\r\n|\n|\r)/gm, '')
        .split(' ')

      output[playfab] = ip
    })

  return output
}
