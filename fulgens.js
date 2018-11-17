#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const nunjucks = require('nunjucks');
const minimist = require('minimist');
const { execFile } = require('child_process');

const functions = require('./classes/phase/functions');
const cleanup = require('./classes/phase/cleanup');
const options = require('./classes/phase/options');
const dependencycheck = require('./classes/phase/dependencycheck');
const clean = require('./classes/phase/clean');
const prepare = require('./classes/phase/prepare');
const wait = require('./classes/phase/wait');
const globalvariables = require('./classes/phase/globalvariables');
const Vagrant = require('./classes/core/Vagrant');

const pluginFactory = require('./classes/plugins/factory');

const RuntimeConfiguration = require('./classes/core/RuntimeConfiguration');
const pjson = require('./package.json');

var argv;
if (process.argv[0].endsWith('node') || process.argv[0].endsWith('nodejs')) {
  argv = minimist(process.argv.slice(2));
} else {
  argv = minimist(process.argv.slice(1));
}

if (argv._.length > 1) {
  console.error('More than one filename is not allowed!');
  process.exit(1);
}

const fulgensVersion = pjson.version;
if (argv.v) {
  console.log(`fulgens version ${fulgensVersion}`);
  process.exit(1); 
}
if (argv.h) {
  console.log(`usage: fulgens [-v] [-h] [-f] [-nf] [<Fulgensfile>]

Options:
  -v                       Display version information
  -h                       Display help information
  -s                       Skip formatting the generated output with shfmt (if found on path)

Fulgens looks for 'Fulgensfile' or 'Fulgensfile.js' in the current directory if <Fulgensfile> is not defined.

Save the generated bash script into a file or piped it into bash via \`fulgens | bash -s -- -h\` (uses -h on the generated script)

See https://www.npmjs.com/package/fulgens for more help and the definition of a Fulgensfile.`);
  process.exit(1); 
}

var displayFilename = argv._.length > 0 ? argv._[0] : '';
if (!displayFilename) {
  displayFilename = "./Fulgensfile";
  if (!fs.existsSync(path.resolve(displayFilename))) {
    displayFilename = "./Fulgensfile.js";
  }
}
const systemFilename = path.resolve(displayFilename);

if (!fs.existsSync(systemFilename)) {
  console.error(`File ${displayFilename} not found!`);
  process.exit(1);
}

const userConfig = require(systemFilename);

if (!userConfig || Object.entries(userConfig).length === 0) {
  console.error('config empty!');
  process.exit(1);
}

if (!userConfig.config.SchemaVersion || userConfig.config.SchemaVersion != '1.0.0') {
  console.error('Missing or wrong SchemaVersion!');
  process.exit(1);  
}

var env = nunjucks.configure(path.resolve(__dirname), { autoescape: false });
env.addFilter('map', (str, name) => str.map(e => e[name]));
env.addFilter('debug', (str) => { console.error(str); return str; });
env.addFilter('filterNotEmpty', (arr, name) => arr.filter(e => e[name]));

const rtConfig = new RuntimeConfiguration(userConfig, path.dirname(systemFilename));

functions.init(userConfig, rtConfig);
cleanup.init(userConfig, rtConfig);
options.init(userConfig, rtConfig);
dependencycheck.init(userConfig, rtConfig);
clean.init(userConfig, rtConfig);
prepare.init(userConfig, rtConfig);
wait.init(userConfig, rtConfig);
globalvariables.init(userConfig, rtConfig);

if (userConfig.config.Vagrant) {
  Vagrant.prepare(userConfig, rtConfig);
}
if (userConfig.config.Dependencycheck) {
  userConfig.config.Dependencycheck.forEach(c => dependencycheck.add(c));
}

Object.entries(userConfig.software).forEach(s => {
  const key = s[0];
  const obj = s[1];
  const plugin = pluginFactory(obj.Source);
  rtConfig.addPlugin(plugin, key);
});

rtConfig.processPlugins();

Vagrant.build();

const renderedOutput = nunjucks.render('fulgens.tmpl', {
  fulgensVersion,
  functions: functions.build(),
  cleanup: cleanup.build(),
  options: options.build() ,
  dependencycheck: dependencycheck.build(),
  clean: clean.build(),
  globalvariables: globalvariables.build(),
  prepare: prepare.build() ,
  plugins: rtConfig.buildPlugins(),
  wait: wait.build()
})

if (!argv.s) {
  const child = execFile('shfmt', (error, stdout, stderr) => {
    if (error) {
      console.log(renderedOutput);
    } else {
      if (stderr) {
        console.error(stderr);
      }
      console.log(stdout);
    }
  });
  if (child.stdin) {
    child.stdin.write(renderedOutput);
    child.stdin.end();
  }
} else {
  console.log(renderedOutput);
}
