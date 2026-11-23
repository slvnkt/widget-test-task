// Publish dist/ to the gh-pages branch (GitHub Pages source) as a normal commit on top of its history.
import { execSync } from 'node:child_process'
import { cpSync, existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs'

const sh = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' })
const remote = execSync('git remote get-url origin').toString().trim()
const dir = '.deploy'

rmSync(dir, { recursive: true, force: true })
const hasBranch = execSync(`git ls-remote --heads ${remote} gh-pages`).toString().trim() !== ''
if (hasBranch) sh(`git clone -q --depth 1 --branch gh-pages --single-branch ${remote} ${dir}`)
else {
  sh(`git init -q -b gh-pages ${dir}`)
  sh(`git remote add origin ${remote}`, dir)
}
for (const f of readdirSync(dir)) if (f !== '.git') rmSync(`${dir}/${f}`, { recursive: true, force: true })
cpSync('dist', dir, { recursive: true })
writeFileSync(`${dir}/.nojekyll`, '')
sh('git add -A', dir)
if (existsSync(dir)) {
  try {
    sh('git -c user.name=deploy -c user.email=deploy@users.noreply.github.com commit -q -m "deploy"', dir)
  } catch {
    console.log('Nothing to deploy')
  }
}
sh('git push -q origin gh-pages', dir)
rmSync(dir, { recursive: true, force: true })
