
const nunjucks = require('nunjucks');

const cleanupBuilder = require('../phase/cleanup');
const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');
const sourceTypeBuilder = require('../core/SourceType');

const BasePlugin = require('./BasePlugin');

class MysqlPlugin extends BasePlugin {

  static instance() {
    return new MysqlPlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);

    const { Mysql } = userConfig.software[softwareComponentName];

    dependencycheckBuilder.add('docker --version 1>/dev/null');
    dependencycheckBuilder.add('mysql --version 1>/dev/null');
 
    optionsBuilder.addDetails('t', [
      `${softwareComponentName}:local #reuse a local, running MySQL installation, does not start/stop this MySQL`,
      `${softwareComponentName}:docker:[5|8] #start docker image mysql:X`
    ]);

    sourceTypeBuilder.add(this, {
      componentName: softwareComponentName,
      defaultType: 'docker', 
      availableTypes: [
        { typeName: 'docker', defaultVersion: '5' },
        { typeName: 'local', defaultVersion: '' }
      ]
    });
 
    cleanupBuilder.add({
      pluginName: 'mysql',
      componentName: softwareComponentName,
      sourceTypes: [{
        name: 'docker',
        stopCode: 'docker rm -f $dockerContainerID' + softwareComponentName
      }]
    });
    
    const configFiles = runtimeConfiguration.getConfigFiles(softwareComponentName);
    const typeSourceVarName = `TYPE_SOURCE_${softwareComponentName.toUpperCase()}`;
    const pidFile = `.${softwareComponentName}Pid`;

    this.build = () => nunjucks.render('classes/plugins/MysqlPlugin.tmpl', {
      ...this.nunjucksObj(),
      typeSourceVarName,
      softwareComponentName,
      configFiles,
      Mysql: Mysql ? Mysql : {},
      writeDockerConnectionLogic: configFiles.map(f => f.writeDockerConnectionLogic('dockerMysqlExtRef')).join('\n'),
      makeDockerVolume: configFiles.map(f => f.makeDockerVolume()).join('\n')
    });

  }

}

module.exports = MysqlPlugin;
