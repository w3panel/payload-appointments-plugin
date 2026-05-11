const quote = (file) => `"${file.replaceAll('"', '\\"')}"`

const format = (files) => (files.length > 0 ? [`oxfmt --write ${files.map(quote).join(' ')}`] : [])

export default {
  '*.{ts,tsx,js,jsx,mjs,cjs,mts,cts}': (files) => {
    if (files.length === 0) return []
    return [
      `oxlint --fix --tsconfig tsconfig.oxlint.json ${files.map(quote).join(' ')}`,
      ...format(files),
    ]
  },
  '*.{json,jsonc,md,css,scss}': format,
}
