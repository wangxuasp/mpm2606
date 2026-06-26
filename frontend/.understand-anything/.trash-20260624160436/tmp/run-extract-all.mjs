import fs from 'fs'
import { execSync } from 'child_process'
import path from 'path'

const root = process.argv[2]
const skillDir = process.argv[3]
const batches = JSON.parse(
  fs.readFileSync(path.join(root, '.understand-anything/intermediate/batches.json'), 'utf8'),
)

for (const b of batches.batches) {
  const inPath = path.join(root, `.understand-anything/tmp/ua-file-analyzer-input-${b.batchIndex}.json`)
  const outPath = path.join(root, `.understand-anything/tmp/ua-file-extract-results-${b.batchIndex}.json`)
  fs.writeFileSync(
    inPath,
    JSON.stringify({ projectRoot: root, batchFiles: b.files, batchImportData: b.batchImportData }),
  )
  try {
    execSync(`node "${path.join(skillDir, 'extract-structure.mjs')}" "${inPath}" "${outPath}"`, {
      stdio: 'pipe',
    })
    console.log(`Batch ${b.batchIndex} extracted ${b.files.length} files`)
  } catch (e) {
    console.error(`Batch ${b.batchIndex} FAILED`, e.stderr?.toString() || e.message)
    process.exitCode = 1
  }
}
