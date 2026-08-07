/**
 * Runs Prisma seed in both local (ts-node) and production (compiled JS) images.
 * Coolify/prod Docker images prune devDependencies, so ts-node is unavailable there.
 */
const { existsSync } = require('fs')
const { spawnSync } = require('child_process')
const path = require('path')

const compiled = path.join(__dirname, '../dist/prisma/seed.js')
const source = path.join(__dirname, 'seed.ts')

let result
if (existsSync(compiled)) {
  result = spawnSync(process.execPath, [compiled], {
    stdio: 'inherit',
    env: process.env,
  })
} else {
  let tsNodeBin
  try {
    tsNodeBin = require.resolve('ts-node/dist/bin.js')
  } catch {
    console.error(
      'Seed failed: neither dist/prisma/seed.js nor ts-node is available.\n' +
        'Run `npx tsc -p tsconfig.seed.json` in the api image, or install devDependencies for local seeding.',
    )
    process.exit(1)
  }
  result = spawnSync(
    process.execPath,
    [tsNodeBin, '--transpile-only', source],
    { stdio: 'inherit', env: process.env },
  )
}

process.exit(result.status ?? 1)
