#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const nunjucks = require('nunjucks');

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

const RuntimeConfiguration = require('./classes/core/RuntimeConfiguration')

var displayFilename;
var systemFilename;
if (process.argv[0].endsWith('node') || process.argv[0].endsWith('nodejs')) {
  displayFilename = process.argv[2];
} else {
  displayFilename = process.argv[1];
}
if (!displayFilename) {
  displayFilename = "./Fulgensfile";
  if (!fs.existsSync(path.resolve(displayFilename))) {
    displayFilename = "./Fulgensfile.js";
  }
} else {
  
}
systemFilename = path.resolve(displayFilename);

if (!fs.existsSync(systemFilename)) {
  console.error(`File ${displayFilename} not found!`);
  process.exit(1);
}

const userConfig = require(systemFilename);

if (!userConfig || Object.entries(userConfig).length === 0) {
  console.error('config empty!');
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
  Vagrant.add(userConfig);
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

console.log(nunjucks.render('fulgens.tmpl', {
  functions: functions.build(),
  cleanup: cleanup.build(),
  options: options.build() ,
  dependencycheck: dependencycheck.build(),
  clean: clean.build(),
  globalvariables: globalvariables.build(),
  prepare: prepare.build() ,
  rtConfig: rtConfig.buildPlugins(),
  wait: wait.build()
}));
