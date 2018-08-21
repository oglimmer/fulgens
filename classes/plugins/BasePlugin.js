
class BasePlugin {

  register(softwareComponentName, userConfig, runtimeConfiguration) {
    Object.entries(userConfig.software[softwareComponentName]).filter(e => /^[a-z]/.test(e[0])).forEach(e => {
      runtimeConfiguration.addConfigFile(softwareComponentName, e[1]);
    });
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
  }

}

module.exports = BasePlugin;
