const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

function detectHost(url) {
  if (!url) return 'other';
  if (url.includes('github.com')) return 'github';
  if (url.includes('gitlab.com')) return 'gitlab';
  return 'other';
}

async function getGitInfo(dir) {
  const info = {
    hasGit: fs.existsSync(path.join(dir, '.git')),
    remotes: [],
    uncommitted: false,
    uncommittedCount: 0,
    error: null,
  };
  if (!info.hasGit) return info;

  try {
    const { stdout } = await execAsync('git remote -v', { cwd: dir, timeout: 5000 });
    const seen = new Map();
    stdout.split('\n').forEach((line) => {
      const m = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
      if (m && !seen.has(m[1])) seen.set(m[1], m[2]);
    });
    info.remotes = Array.from(seen.entries()).map(([name, url]) => ({
      name,
      url,
      host: detectHost(url),
    }));
  } catch (err) {
    info.error = `remote check failed: ${err.message}`;
  }

  try {
    const { stdout } = await execAsync('git status --porcelain', { cwd: dir, timeout: 5000 });
    const lines = stdout.split('\n').filter(Boolean);
    info.uncommittedCount = lines.length;
    info.uncommitted = lines.length > 0;
  } catch (err) {
    info.error = `${info.error ? info.error + '; ' : ''}status check failed: ${err.message}`;
  }

  return info;
}

async function scanProjects(rootDir) {
  const entries = fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const results = await Promise.all(
    entries.map(async (name) => {
      const dir = path.join(rootDir, name);
      const gitInfo = await getGitInfo(dir);
      return { name, dir, ...gitInfo };
    })
  );

  return results;
}

module.exports = { scanProjects };
