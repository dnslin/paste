// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanupFileShares } from '../file-share'

vi.mock('../file-share', () => ({ cleanupFileShares: vi.fn() }))
const result = { removed: 0, failed: 0, orphansRemoved: 0, orphansFailed: 0 }

beforeEach(() => {
  vi.useFakeTimers()
  vi.resetModules()
  Reflect.deleteProperty(globalThis, 'fileCleanupStarted')
  vi.mocked(cleanupFileShares).mockReset().mockResolvedValue(result)
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); Reflect.deleteProperty(globalThis, 'fileCleanupStarted') })

describe('文件定时清理', () => {
  it('启动时盘点孤立文件，重复初始化只启动一次，周期任务只清理失效记录', async () => {
    const { startFileCleanup } = await import('../file-cleanup-job')
    await Promise.all([startFileCleanup(), startFileCleanup()])
    expect(cleanupFileShares).toHaveBeenCalledExactlyOnceWith({ scanOrphans: true })
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(cleanupFileShares).toHaveBeenLastCalledWith({ scanOrphans: false })
    expect(cleanupFileShares).toHaveBeenCalledTimes(2)
  })

  it('清理异常会记录错误，并在下一个周期重试', async () => {
    vi.mocked(cleanupFileShares).mockRejectedValueOnce(new Error('disk unavailable'))
    const { startFileCleanup } = await import('../file-cleanup-job')
    await startFileCleanup()
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('will retry'), expect.any(Error))
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(cleanupFileShares).toHaveBeenCalledTimes(2)
  })

  it('上一轮未完成时不叠加清理任务', async () => {
    const { startFileCleanup } = await import('../file-cleanup-job')
    await startFileCleanup()
    let resolve: (value: typeof result) => void = () => {}
    vi.mocked(cleanupFileShares).mockImplementationOnce(() => new Promise((done) => { resolve = done }))
    await vi.advanceTimersByTimeAsync(15 * 60_000)
    expect(cleanupFileShares).toHaveBeenCalledTimes(2)
    resolve(result)
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(cleanupFileShares).toHaveBeenCalledTimes(3)
  })
})
