import fs from 'fs'
import { execSync } from 'child_process'

const root = 'C:/My Projects/Codes/mpm2606/frontend'
const commit = execSync(`git -C "${root}" rev-parse HEAD`, { encoding: 'utf8' }).trim()
const meta = {
  lastAnalyzedAt: new Date().toISOString(),
  gitCommitHash: commit,
  version: '1.0.0',
  analyzedFiles: 210,
}
fs.writeFileSync(`${root}/.understand-anything/meta.json`, JSON.stringify(meta, null, 2))
console.log('meta.json written')
