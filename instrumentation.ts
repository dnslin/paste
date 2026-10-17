export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startFileCleanup } = await import('@/lib/file-cleanup-job')
    await startFileCleanup()
  }
}
