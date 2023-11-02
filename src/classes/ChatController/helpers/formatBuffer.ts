export const parseBuffer = (buffer: Buffer): string => {
  return buffer
    .toString()
    .split('')
    .reduce((acc, val) => {
      const charCode = val.charCodeAt(0)

      if (charCode >= 32 && charCode <= 126) {
        // eslint-disable-next-line
        acc += val
      }

      return acc
    }, '')
    .trim()
    .replace(/ *\([^)]*\) */, ' ')
}
