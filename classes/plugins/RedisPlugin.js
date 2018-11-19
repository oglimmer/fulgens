
const nunjucks = require('nunjucks');

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

    const { Name: systemName } = userConfig.config;
    const { EnvVars = [], DockerImage = 'redis', ExposedPort = '6379' } = userConfig.software[softwareComponentName];

    dependencycheckBuilder.add('docker --version 1>/dev/null');
    
    optionsBuilder.addDetails('t', [
      `${softwareComponentName}:local #reuse a local, running Redis installation, does not start/stop this Redis`,
      `${softwareComponentName}:docker:[3|4] #start docker image ${DockerImage}:X`]);

    const configFiles = runtimeConfiguration.getConfigFiles(softwareComponentName);

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

    const typeSourceVarName = `TYPE_SOURCE_${softwareComponentName.toUpperCase()}`;
    const pidFile = `.${softwareComponentName}Pid`;
    const dcId = `dockerContainerID${softwareComponentName}`;

    this.build = () => nunjucks.render('classes/plugins/RedisPlugin.tmpl', {
      ...this.nunjucksObj(),
      typeSourceVarName,
      softwareComponentName,
      systemName,
      pidFile,
      dcId,
      DockerImage,
      ExposedPort,
      AllEnvVarsDocker: EnvVars.map(p => `-e ${p}`).join(' '),
      writeDockerConnectionLogic: configFiles.map(f => f.writeDockerConnectionLogic()).join('\n'),
      mountToDocker: configFiles.map(f => f.mountToDocker()).join('\n')
    });

  }

}

module.exports = RedisPlugin;




