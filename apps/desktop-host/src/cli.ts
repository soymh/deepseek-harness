/** Public dsh commands using the immutable runtime carried by the Desktop installation. */

import { basename, delimiter, dirname, join, resolve } from 'node:path'
import { runCli } from '@deepseek-ai/dsh/lib/bin.js'
import { installOfficeEngineResolution, runtimeArchivePath } from './office-engine.ts'

/**
 * Run the ordinary CLI with Desktop's bundled package manager and reserved-profile plugin access.
 * @param runtimeDir - Prepared or ASAR-contained production DSH package tree.
 * @param supportDir - Physical Desktop runtime directory containing the primary-runtime payload and Node launchers.
 * @returns Completion of the selected CLI command; profile plugins own their process lifetime.
 */
export async function runDesktopCli(runtimeDir: string, supportDir: string): Promise<void> {
  installOfficeEngineResolution(runtimeDir)
  await runCli({
    manageDesktopProfile: true,
    packageManager: {
      command: process.execPath,
      args: ['--expose-internals', join(supportDir, 'primary-runtime', 'dependencies', 'pnpm', 'bin', 'pnpm.mjs')],
      env: {
        ELECTRON_RUN_AS_NODE: '1',
        DSH_DESKTOP_NODE_EXECUTABLE: process.execPath,
        PATH: `${join(supportDir, 'bin')}${delimiter}${process.env.PATH ?? ''}`,
      },
    },
  })
}

if (import.meta.main) {
  if (process.platform === 'win32') {
    const { installWindowsCliSignals } = await import('./windows-cli-signals.ts')
    await installWindowsCliSignals()
  }
  const runtimeDir = resolve(import.meta.dirname, '../../../..')
  // Prepared trees sit beside `runtime`; packaged trees nest the application in `app.asar` or an `app` directory.
  const applicationDirectory = runtimeArchivePath(runtimeDir)
    ?? (basename(dirname(runtimeDir)) === 'app' ? dirname(runtimeDir) : undefined)
  const supportDir = applicationDirectory === undefined
    ? join(dirname(runtimeDir), 'runtime')
    : join(dirname(applicationDirectory), 'runtime')
  await runDesktopCli(runtimeDir, supportDir)
}
