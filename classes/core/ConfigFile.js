
const AttachAsEnvVar = require('./configFile/AttachAsEnvVar');
const AttachIntoDocker = require('./configFile/AttachIntoDocker');

module.exports = (pluginName, config, runtimeConfiguration) => {
  if (config.AttachAsEnvVar) {
    return new AttachAsEnvVar(pluginName, config, runtimeConfiguration);
  }
  else if (config.AttachIntoDocker) {
    return new AttachIntoDocker(pluginName, config, runtimeConfiguration);
  }
  else {
    throw Error(`Undefined type for ${pluginName} : ${JSON.stringify(config)}`);
  }
};

