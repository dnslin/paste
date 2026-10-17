import { cleanupFileShares } from './file-share'

const globalForCleanup = globalThis as unknown as {
  fileCleanupStarted?: Promise<void>
}

export function startFileCleanup(): Promise<void> {
  return globalForCleanup.fileCleanupStarted ??= start()
}

async function start() {
  let running = false
  async function run(scanOrphans: boolean) {
    if (running) return
    running = true
    try {
      const result = await cleanupFileShares({ scanOrphans })
      console.info('[file-cleanup]', result)
    } catch (error) {
      console.error(scanOrphans
        ? '[file-cleanup] Startup scan failed; expired-file cleanup will retry in five minutes. Restart to retry a failed directory scan.'
        : '[file-cleanup] Cleanup failed; will retry in five minutes', error)
    } finally {
      running = false
    }
  }

  // register() finishes before the server accepts uploads, so startup may scan orphans.
  await run(true)
  setInterval(() => { void run(false) }, 5 * 60_000).unref()
}
