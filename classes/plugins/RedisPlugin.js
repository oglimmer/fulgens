
const headBuilder = require('../phase/head');
const cleanupBuilder = require('../phase/cleanup');
const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');

const sourceTypeBuilder = require('../core/SourceType');

const BasePlugin = require('./BasePlugin');

class RedisPlugin extends BasePlugin {

  static instance() {
    return new RedisPlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);

    dependencycheckBuilder.add('docker --version 1>/dev/null');
    
    optionsBuilder.addDetails('t', [
      'redis:local #reuse a local, running Redis installation, does not start/stop this Redis',
      'redis:docker:[3|4] #start docker image \\`redis:X\\`']);

    const configFiles = runtimeConfiguration.getConfigFiles(softwareComponentName);

    this.startBuilder.add(start(softwareComponentName, configFiles));

    sourceTypeBuilder.add(this, {
      componentName: softwareComponentName,
      defaultType: 'docker', 
      availableTypes: [
        { typeName: 'docker', defaultVersion: '4' },
        { typeName: 'local', defaultVersion: '' }
      ]
    });

    cleanupBuilder.add({
      pluginName: 'redis',
      componentName: softwareComponentName,
      sourceTypes: [{
        name: 'docker',
        stopCode: 'docker rm -f $dockerContainerID' + softwareComponentName
      }]
    });

  }

}

module.exports = RedisPlugin;

const start = (softwareComponentName, configFiles) => {
  const typeSourceVarName = `TYPE_SOURCE_${softwareComponentName.toUpperCase()}`;
  const pidFile = `.${softwareComponentName}Pid`;
  const dcId = `dockerContainerID${softwareComponentName}`;
  return `
if [ "$${typeSourceVarName}" == "docker" ]; then
  # run in docker
  if [ ! -f "${pidFile}" ]; then
    ${configFiles.map(f => f.writeDockerConnectionLogic('dockerRedisdbExtRef')).join('\n')}
    if [ "$VERBOSE" == "YES" ]; then echo "docker run --rm -d -p 6379:6379 $dockerRedisdbExtRef ${configFiles.map(f => f.makeDockerVolume()).join('\n')} redis:$${typeSourceVarName}_VERSION"; fi
    ${dcId}=$(docker run --rm -d -p 6379:6379 $dockerRedisdbExtRef \\
      ${configFiles.map(f => f.makeDockerVolume()).join('\n')} redis:$${typeSourceVarName}_VERSION)
    echo "$${dcId}">${pidFile}
  else
    ${dcId}=$(<${pidFile})
  fi
fi
if [ "$${typeSourceVarName}" == "local" ]; then
  if [ -f "${pidFile}" ]; then
    echo "redis ${softwareComponentName} running but started from different source type"
    exit 1
  fi
fi
`
};