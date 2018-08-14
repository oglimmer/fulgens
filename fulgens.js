#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const head = require('./classes/phase/head');
const functions = require('./classes/phase/functions');
const cleanup = require('./classes/phase/cleanup');
const options = require('./classes/phase/options');
const dependencycheck = require('./classes/phase/dependencycheck');
const clean = require('./classes/phase/clean');
const prepare = require('./classes/phase/prepare');
const build = require('./classes/phase/build');
const getsource = require('./classes/phase/getsource');
const postbuild = require('./classes/phase/postbuild');
const prebuild = require('./classes/phase/prebuild');
const start = require('./classes/phase/start');
const poststart = require('./classes/phase/poststart');
const wait = require('./classes/phase/wait');
const globalvariables = require('./classes/phase/globalvariables');

const pluginFactory = require('./classes/plugins/factory');

const RuntimeConfiguration = require('./classes/core/RuntimeConfiguration')

var filename;
if (process.argv[0].endsWith('node') || process.argv[0].endsWith('nodejs')) {
  filename = process.argv[2];
} else {
  filename = process.argv[1];
}
if (!filename) {
  filename = "./Fulgensfile.js";
  if (!fs.existsSync(path.resolve(filename))) {
    filename = "./Fulgensfile";
  }
}
filename = path.resolve(filename);

const userConfig = require(filename);

if (!userConfig || Object.entries(userConfig).length === 0) {
  console.error('config empty!');
  process.exit(1);
}

const rtConfig = new RuntimeConfiguration(userConfig);

head.init(userConfig);
functions.init(userConfig);
cleanup.init(userConfig);
options.init(userConfig);
dependencycheck.init(userConfig);
clean.init(userConfig);
prepare.init(userConfig);
build.init(userConfig);
getsource.init(userConfig);
prebuild.init(userConfig);
postbuild.init(userConfig);
start.init(userConfig);
poststart.init(userConfig);
wait.init(userConfig);
globalvariables.init(userConfig);

Object.entries(userConfig.software).forEach(s => {
  const key = s[0];
  const obj = s[1];
  const plugin = pluginFactory(obj.Source);
  rtConfig.addPlugin(plugin, key);
});

rtConfig.processPlugins();

const output = head.build() + functions.build() + cleanup.build() + options.build() 
  + dependencycheck.build() + clean.build() + globalvariables.build() + prepare.build() + prebuild.build() + build.build()
  + postbuild.build() + getsource.build() + start.build() + poststart.build() + wait.build();
console.log(output);
