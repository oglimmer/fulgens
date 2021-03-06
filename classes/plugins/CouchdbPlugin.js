
const nunjucks = require('nunjucks');

const cleanupBuilder = require('../phase/cleanup');
const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');
const BaseConfigFile = require('../core/configFile/BaseConfigFile');
const Strings = require('../core/Strings');
const CEnvVars = require('../core/CEnvVars');

const sourceTypeBuilder = require('../core/SourceType');

const BasePlugin = require('./BasePlugin');

class CouchdbPlugin extends BasePlugin {

  static instance() {
    return new CouchdbPlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);

    const { Name: systemName } = userConfig.config;
    const { CouchDB, EnvVars = [], DockerImage = 'couchdb', ExposedPort = '5984', DockerMemory } = userConfig.software[softwareComponentName];

    const defaultVersion = ((userConfig.versions || {})[softwareComponentName] || {}).Docker || 'latest';

    dependencycheckBuilder.add('docker --version 1>/dev/null');
    
    optionsBuilder.addDetails(softwareComponentName, 'docker:' + defaultVersion, [
      `${softwareComponentName}:local #reuse a local, running CouchDB installation, does not start/stop this CouchDB`,
      `${softwareComponentName}:docker:[TAG] #start docker, default tag ${defaultVersion}, uses image ${Strings.dockerLink(DockerImage)}`
    ]);

    const configFiles = runtimeConfiguration.getConfigFiles(softwareComponentName);

    sourceTypeBuilder.add(this, {
      componentName: softwareComponentName,
      defaultType: 'docker', 
      availableTypes: [
        { typeName: 'docker', defaultVersion },
        { typeName: 'local', defaultVersion: '' }
      ]
    });

    cleanupBuilder.add({
      pluginName: 'couchdb',
      componentName: softwareComponentName,
      sourceTypes: [{
        name: 'docker',
        stopCode: 'docker rm -f $dockerContainerID' + softwareComponentName
      }]
    });

    const typeSourceVarName = `TYPE_SOURCE_${softwareComponentName.toUpperCase()}`;
    const pidFile = `.${softwareComponentName}Pid`;
    const dcId = `dockerContainerID${softwareComponentName}`;

    const envVars = new CEnvVars(softwareComponentName, EnvVars);
    const mountToDocker = configFiles.map(f => f.mountToDocker(envVars)).join(' ');

    this.build = () => nunjucks.render('classes/plugins/CouchdbPlugin.tmpl', {
      ...this.nunjucksObj(),
      typeSourceVarName,
      pidFile,
      dcId,
      DockerImage,
      softwareComponentName,
      systemName,
      ExposedPort,
      DockerMemory,
      AllEnvVarsDocker: envVars.toDocker(),
      couchDBs: Array.isArray(CouchDB) ? CouchDB : (CouchDB ? [CouchDB] : []),
      writeConfigFiles: configFiles.map(f => f.createFile()).join('\n'),
      writeDockerConnectionLogic: BaseConfigFile.writeDockerConnectionLogic(configFiles, envVars),
      mountToDocker
    });
  }

}

module.exports = CouchdbPlugin;
