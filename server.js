const express = require('express');
const path = require('path');
const { scanProjects } = require('./lib/scan');

const app = express();
const PORT = process.env.PORT || 3000;
const PROJECTS_ROOT = path.resolve(__dirname, '..');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', async (req, res, next) => {
  try {
    const projects = await scanProjects(PROJECTS_ROOT);
    const summary = {
      total: projects.length,
      noGit: projects.filter((p) => !p.hasGit).length,
      gitNoRemote: projects.filter((p) => p.hasGit && p.remotes.length === 0).length,
      gitWithRemote: projects.filter((p) => p.hasGit && p.remotes.length > 0).length,
      uncommitted: projects.filter((p) => p.uncommitted).length,
    };
    res.render('index', { projects, root: PROJECTS_ROOT, summary });
  } catch (err) {
    next(err);
  }
});

app.get('/api/projects', async (req, res, next) => {
  try {
    const projects = await scanProjects(PROJECTS_ROOT);
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

app.listen(PORT, () => {
  console.log(`Projects Hub running at http://localhost:${PORT}`);
  console.log(`Scanning: ${PROJECTS_ROOT}`);
});
