import { delimiter } from 'node:path'
import { expect, it } from 'vitest'
import { desktopNodeEnvironment } from '../src/node-environment.ts'

it('keeps private Desktop launchers out of the Host environment inherited by PTC', () => {
  const environment = { PATH: '/user/bin', HOME: '/user' }
  expect(desktopNodeEnvironment('/desktop/electron', undefined, environment)).toEqual({
    ...environment, ELECTRON_RUN_AS_NODE: '1',
  })
  expect(environment).toEqual({ PATH: '/user/bin', HOME: '/user' })
})

it('provides private launchers only to package installation processes', () => {
  expect(desktopNodeEnvironment('/desktop/electron', '/desktop/bin', { PATH: '/user/bin' })).toEqual({
    ELECTRON_RUN_AS_NODE: '1',
    DSH_DESKTOP_NODE_EXECUTABLE: '/desktop/electron',
    PATH: `/desktop/bin${delimiter}/user/bin`,
  })
})

it('drops a caller module path so the bundled runtime resolves only its own modules', () => {
  const environment = { PATH: '/user/bin', NODE_PATH: '/workspace/node_modules/.pnpm/node_modules' }
  expect(desktopNodeEnvironment('/desktop/electron', '/desktop/bin', environment)).toEqual({
    ELECTRON_RUN_AS_NODE: '1',
    DSH_DESKTOP_NODE_EXECUTABLE: '/desktop/electron',
    PATH: `/desktop/bin${delimiter}/user/bin`,
  })
  expect(environment.NODE_PATH).toBe('/workspace/node_modules/.pnpm/node_modules')
})
