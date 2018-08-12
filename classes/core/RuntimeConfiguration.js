

class RuntimeConfiguration {

  constructor(userConfig) {
    this.userConfig = userConfig;
    this.plugins = [];
    this.dependencies = {};
  }

  addPlugin(plugin, name, config) {
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

}

module.exports = RuntimeConfiguration;
