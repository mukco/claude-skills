#!/usr/bin/env node
// Real-data screenshots of the Family Hub TV page, for design review.
//
//   node tv-shots.mjs --ui <family-hub-tv>/ui --out /tmp/review/after \
//        [--tv raspberrypi.local] [--wait 4000] \
//        [--steps "home:;tabs:ArrowUp;tv:ArrowRight"] [--measure "#tabs,.focus"]
//
// Serves --ui locally at 1920x1080 and forwards GETs (/api/*, /hub/*) to the
// TV daemon through an SSH tunnel this script opens and closes itself. POSTs
// are answered 204 and never reach the TV; ROM and emulator downloads are
// refused. Each step presses its keys (comma-separated, puppeteer names) and
// saves <out>-<step>.png, printing the step's measured boxes as JSON.
// For BEFORE shots, point --ui at a `git worktree` of the base commit.
import http from "node:http"
import { spawn } from "node:child_process"
import { readFile, mkdir } from "node:fs/promises"
import { dirname, extname, join } from "node:path"
import { createRequire } from "node:module"
import net from "node:net"

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) =>
  v.startsWith("--") ? [...a, [v.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? "1" : all[i + 1]]] : a, []))
if (args.help || !args.ui || !args.out) {
  console.log(readFileHead()); process.exit(args.help ? 0 : 2)
}
function readFileHead() {
  return `usage: node tv-shots.mjs --ui DIR --out PREFIX [--tv HOST] [--wait MS] [--steps "name:Key,Key;..."] [--measure "sel,sel"]`
}
const require = createRequire(process.env.PUPPETEER_FROM || "/home/mukco/Documents/code/family-hub/web/package.json")
const puppeteer = require("puppeteer-core")
const TV = args.tv || "raspberrypi.local"
const STEPS = (args.steps || "home:").split(";").filter(Boolean).map((s) => {
  const [name, keys = ""] = s.split(":"); return { name, keys: keys.split(",").filter(Boolean) }
})
const MEASURE = (args.measure || "#tabs").split(",").filter(Boolean)
const freePort = () => new Promise((r) => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)) }) })

const tunnelPort = await freePort(), webPort = await freePort()
const tunnel = spawn("ssh", ["-o", "BatchMode=yes", "-o", "ExitOnForwardFailure=yes", "-N",
  "-L", `${tunnelPort}:127.0.0.1:8348`, `mukco@${TV}`], { stdio: "ignore" })
const cleanup = () => { try { tunnel.kill() } catch {} }
process.on("exit", cleanup)
for (let i = 0; i < 50; i++) {
  const ok = await new Promise((r) => http.get({ host: "127.0.0.1", port: tunnelPort, path: "/api/status", timeout: 500 },
    (res) => { res.resume(); r(true) }).on("error", () => r(false)))
  if (ok) break
  if (i === 49) { console.error(`no TV daemon through the tunnel to ${TV}`); process.exit(1) }
  await new Promise((r) => setTimeout(r, 200))
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2", ".ttf": "font/ttf" }
const server = http.createServer(async (req, res) => {
  const path = req.url.split("?")[0]
  if (req.method !== "GET") { res.writeHead(204); return res.end() }
  if (path.startsWith("/api/") || path.startsWith("/hub/")) {
    if (/rom|emulator|\.zip|\.wasm/i.test(path)) { res.writeHead(404); return res.end() }
    const up = http.get({ host: "127.0.0.1", port: tunnelPort, path: req.url, headers: { accept: req.headers.accept || "*/*" } },
      (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res) })
    up.on("error", () => { res.writeHead(502); res.end() })
    return
  }
  try {
    const file = join(args.ui, path === "/" ? "index.html" : path)
    const body = await readFile(file)
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" }); res.end(body)
  } catch { res.writeHead(404); res.end() }
})
await new Promise((r) => server.listen(webPort, "127.0.0.1", r))

await mkdir(dirname(args.out), { recursive: true })
const browser = await puppeteer.launch({ headless: true, protocolTimeout: 20000, executablePath: process.env.CHROMIUM || "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-gpu"], defaultViewport: { width: 1920, height: 1080 } })
const page = await browser.newPage()
const errors = []
page.on("pageerror", (e) => errors.push(e.message))
page.on("dialog", (d) => d.dismiss())
await page.goto(`http://127.0.0.1:${webPort}/`, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {})
await new Promise((r) => setTimeout(r, Number(args.wait || 4000)))
for (const step of STEPS) {
  for (const k of step.keys) { await page.keyboard.press(k); await new Promise((r) => setTimeout(r, 250)) }
  await new Promise((r) => setTimeout(r, 800))
  const boxes = await page.evaluate((sels) => Object.fromEntries(sels.map((s) => {
    const n = document.querySelector(s); if (!n) return [s, null]
    const b = n.getBoundingClientRect(); return [s, { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }]
  })), MEASURE)
  const curtain = await page.evaluate(() => document.getElementById("curtain")?.classList.contains("on") ?? null)
  const file = `${args.out}-${step.name}.png`
  await page.screenshot({ path: file })
  console.log(JSON.stringify({ step: step.name, file, curtain, boxes }))
}
console.log(JSON.stringify({ pageErrors: errors }))
await browser.close(); server.close(); cleanup(); process.exit(0)
