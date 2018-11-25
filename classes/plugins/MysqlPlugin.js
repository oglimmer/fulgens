
const nunjucks = require('nunjucks');

const cleanupBuilder = require('../phase/cleanup');
const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');
const sourceTypeBuilder = require('../core/SourceType');
const BaseConfigFile = require('../core/configFile/BaseConfigFile');

const BasePlugin = require('./BasePlugin');

class MysqlPlugin extends BasePlugin {

  static instance() {
    return new MysqlPlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);

    const { Name: systemName } = userConfig.config;
    const { Mysql, EnvVars = [], DockerImage = 'mysql', ExposedPort = '3306' } = userConfig.software[softwareComponentName];

    const defaultVersion = ((userConfig.versions || {})[softwareComponentName] || {}).Docker || 'latest';

    dependencycheckBuilder.add('docker --version 1>/dev/null');
    dependencycheckBuilder.add('mysql --version 1>/dev/null');
 
    optionsBuilder.addDetails(softwareComponentName, 'docker:' + defaultVersion, [
      `${softwareComponentName}:local #reuse a local, running MySQL installation, does not start/stop this MySQL`,
      `${softwareComponentName}:docker:[TAG] #start docker, default tag ${defaultVersion}, uses image http://hub.docker.com/_/${DockerImage}`
    ]);

    sourceTypeBuilder.add(this, {
      componentName: softwareComponentName,
      defaultType: 'docker', 
      availableTypes: [
        { typeName: 'docker', defaultVersion },
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
      systemName,
      configFiles,
      DockerImage,
      ExposedPort,
      pidFile,
      Mysql: Mysql ? Mysql : {},
      AllEnvVarsDocker: EnvVars.map(p => `-e ${p}`).join(' '),
      writeConfigFiles: configFiles.map(f => f.createFile()).join('\n'),
      writeDockerConnectionLogic: BaseConfigFile.writeDockerConnectionLogic(softwareComponentName, configFiles),
      mountToDocker: configFiles.map(f => f.mountToDocker()).join('\n')
    });

  }

}

module.exports = MysqlPlugin;
