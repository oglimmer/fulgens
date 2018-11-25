
const createConfigFile = require('./ConfigFile');
const optionsBuilder = require('../phase/options');

class RuntimeConfiguration {

  constructor(userConfig, projectBasePath) {
    this.userConfig = userConfig;
    this.plugins = [];
    this.configFiles = [];
    this.projectBasePath = projectBasePath;
    this.accessUrl = '';
  }

  addPlugin(plugin, name) {
    plugin.register(name, this.userConfig, this);
    this.plugins.push({
      plugin,
      name
    });
  }

  processPlugins() {
    this.plugins.forEach(e => e.plugin.exec(e.name, this.userConfig, this));
  }

  buildPlugins() {
    return this.plugins.map(e => e.plugin.build()).join('\n');
  }

  addConfigFile(pluginName, config) {
    this.configFiles.push(createConfigFile(pluginName, config, this));
  }

  getConfigFiles(pluginName) {
    return this.configFiles.filter(f => f.pluginName === pluginName);
  }

  setTail(tailCmdSource, accessUrl) {
    optionsBuilder.add('f', '', 'TAIL', `tail the ${tailCmdSource} log at the end`);
    this.accessUrl = accessUrl;
  }
}

module.exports = RuntimeConfiguration;
