// Next awaits register before accepting requests in this single-process service.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startFileLifecycle } = await import('./src/lib/files');
    await startFileLifecycle();
  }
}
