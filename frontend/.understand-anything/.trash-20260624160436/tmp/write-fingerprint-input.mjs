import fs from 'fs'
import { execSync } from 'child_process'

const root = 'C:/My Projects/Codes/mpm2606/frontend'
const scan = JSON.parse(fs.readFileSync(`${root}/.understand-anything/intermediate/scan-result.json`, 'utf8'))
const commit = execSync(`git -C "${root}" rev-parse HEAD`, { encoding: 'utf8' }).trim()
const input = {
  projectRoot: root,
  sourceFilePaths: scan.files.map((f) => f.path),
  gitCommitHash: commit,
}
const out = `${root}/.understand-anything/intermediate/fingerprint-input.json`
fs.writeFileSync(out, JSON.stringify(input, null, 2))
console.log('Wrote', out, 'files:', input.sourceFilePaths.length)
