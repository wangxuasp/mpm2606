import fs from 'fs'
import { execSync } from 'child_process'

const root = process.argv[2]
const inter = `${root}/.understand-anything/intermediate`
const assembled = JSON.parse(fs.readFileSync(`${inter}/assembled-graph.json`, 'utf8'))
const layers = JSON.parse(fs.readFileSync(`${inter}/layers.json`, 'utf8'))
const tour = JSON.parse(fs.readFileSync(`${inter}/tour.json`, 'utf8'))
const scan = JSON.parse(fs.readFileSync(`${inter}/scan-result.json`, 'utf8'))
const commit = execSync(`git -C "${root}" rev-parse HEAD`, { encoding: 'utf8' }).trim()

const graph = {
  version: '1.0.0',
  project: {
    name: scan.name,
    languages: scan.languages,
    frameworks: scan.frameworks,
    description: scan.description,
    analyzedAt: new Date().toISOString(),
    gitCommitHash: commit,
  },
  nodes: assembled.nodes || assembled,
  edges: assembled.edges || [],
  layers,
  tour,
}

if (assembled.nodes) {
  graph.nodes = assembled.nodes
  graph.edges = assembled.edges
}

fs.writeFileSync(`${inter}/assembled-graph.json`, JSON.stringify(graph, null, 2))
console.log('Assembled:', graph.nodes.length, 'nodes', graph.edges.length, 'edges')
