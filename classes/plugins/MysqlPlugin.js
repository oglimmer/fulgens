
const nunjucks = require('nunjucks');

const cleanupBuilder = require('../phase/cleanup');
const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');
const sourceTypeBuilder = require('../core/SourceType');
const BaseConfigFile = require('../core/configFile/BaseConfigFile');
const Strings = require('../core/Strings');
const CEnvVars = require('../core/CEnvVars');

const BasePlugin = require('./BasePlugin');

class MysqlPlugin extends BasePlugin {

  static instance() {
    return new MysqlPlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);

    const { Name: systemName } = userConfig.config;
    const { Mysql, EnvVars = [], DockerImage = 'mysql', ExposedPort = '3306', DockerMemory } = userConfig.software[softwareComponentName];

    const defaultVersion = ((userConfig.versions || {})[softwareComponentName] || {}).Docker || 'latest';

    dependencycheckBuilder.add('docker --version 1>/dev/null');
    dependencycheckBuilder.add('mysql --version 1>/dev/null');
 
    optionsBuilder.addDetails(softwareComponentName, 'docker:' + defaultVersion, [
      `${softwareComponentName}:local #reuse a local, running MySQL installation, does not start/stop this MySQL`,
      `${softwareComponentName}:docker:[TAG] #start docker, default tag ${defaultVersion}, uses image ${Strings.dockerLink(DockerImage)}`
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

    const envVars = new CEnvVars(softwareComponentName, EnvVars);
    const mountToDocker = configFiles.map(f => f.mountToDocker(envVars)).join(' ');

    this.build = () => nunjucks.render('classes/plugins/MysqlPlugin.tmpl', {
      ...this.nunjucksObj(),
      typeSourceVarName,
      softwareComponentName,
      systemName,
      configFiles,
      DockerImage,
      DockerMemory,
      ExposedPort,
      pidFile,
      Mysql: Mysql ? Mysql : {},
      AllEnvVarsDocker: envVars.toDocker(),
      writeConfigFiles: configFiles.map(f => f.createFile()).join('\n'),
      writeDockerConnectionLogic: BaseConfigFile.writeDockerConnectionLogic(configFiles, envVars),
      mountToDocker
    });

  }

}

module.exports = MysqlPlugin;
