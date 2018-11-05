
const nunjucks = require('nunjucks');

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
      `${softwareComponentName}:local #reuse a local, running Redis installation, does not start/stop this Redis`,
      `${softwareComponentName}:docker:[3|4] #start docker image redis:X`]);

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

    this.nunjucksRender = () => nunjucks.render('classes/plugins/RedisPlugin.tmpl', {
      ...this.nunjucksObj(),
      typeSourceVarName,
      softwareComponentName,
      pidFile,
      dcId,
      writeDockerConnectionLogic: configFiles.map(f => f.writeDockerConnectionLogic('dockerRedisdbExtRef')).join('\n'),
      makeDockerVolume: configFiles.map(f => f.makeDockerVolume()).join('\n')
    });

  }

}

module.exports = RedisPlugin;




