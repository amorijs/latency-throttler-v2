export const timeProfiler = async (description: string, callback: () => void): Promise<any> => {
  const beforeCallback = Date.now()
  const output = await callback()
  logInfo(`${description} took approximately ${Date.now() - beforeCallback}ms`)
  return output
}
