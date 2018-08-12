#!/usr/bin/env node

const userConfig = require('./ggo');

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
const start = require('./classes/phase/start');
const wait = require('./classes/phase/wait');
const globalvariables = require('./classes/phase/globalvariables');

const pluginFactory = require('./classes/plugins/factory');

const RuntimeConfiguration = require('./classes/core/RuntimeConfiguration')

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
postbuild.init(userConfig);
start.init(userConfig);
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
  + dependencycheck.build() + clean.build() + globalvariables.build() + prepare.build() + build.build()
  + getsource.build() + postbuild.build() + start.build() + wait.build();
console.log(output);
