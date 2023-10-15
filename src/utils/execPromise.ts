import { exec } from 'child_process'

/**
 * Executes a shell command and return it as a Promise.
 * @param command {string}
 * @return {Promise<string>}
 */
export const execPromise = (command: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    exec(command, { shell: '/bin/bash' }, (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.warn(error)
      }

      if (stderr) {
        return reject(stderr)
      }

      resolve(stdout)
    })
  })
}
