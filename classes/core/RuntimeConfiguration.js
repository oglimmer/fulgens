
const ConfigFile = require('./ConfigFile');

class RuntimeConfiguration {

  constructor(userConfig) {
    this.userConfig = userConfig;
    this.plugins = [];
    this.dependencies = {};
    this.configFiles = [];
  }

  addPlugin(plugin, name) {
    plugin.register(name, this.userConfig, this);
    this.plugins.push({
      plugin,
      name
    });
  }

  addDependency(plugin) {
    this.dependencies[plugin.constructor.name] = plugin;
  }

  processPlugins() {
    this.plugins.forEach(e => e.plugin.exec(e.name, this.userConfig, this))
    Object.entries(this.dependencies).forEach(e => e[1].exec('dependency', this.userConfig, this))
  }

  addConfigFile(pluginName, name, content, AttachAsEnvVar) {
    this.configFiles.push(new ConfigFile(pluginName, name, content, AttachAsEnvVar));
  }

  getConfigFiles(pluginName) {
    return this.configFiles.filter(f => f.pluginName === pluginName);
  }
}

module.exports = RuntimeConfiguration;
