
const nunjucks = require('nunjucks');

const cleanupBuilder = require('../phase/cleanup');
const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');
const sourceTypeBuilder = require('../core/SourceType');
const BaseConfigFile = require('../core/configFile/BaseConfigFile');
const Strings = require('../core/Strings');
const CEnvVars = require('../core/CEnvVars');

const BasePlugin = require('./BasePlugin');

class NodePlugin extends BasePlugin {

  static instance() {
    return new NodePlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);

    const { Name: systemName } = userConfig.config;
    const { Start, Node, EnvVars = [], ExposedPort = '3000', BeforeBuild = [], AfterBuild = [], DockerImage = 'node', DockerMemory } = userConfig.software[softwareComponentName];

    const defaultVersion = ((userConfig.versions || {})[softwareComponentName] || {}).Docker || 'latest';

    dependencycheckBuilder.add('node --version 1>/dev/null');
    dependencycheckBuilder.add('npm --version 1>/dev/null');

    optionsBuilder.addDetails(softwareComponentName, 'local', [
      `${softwareComponentName}:local #reuse a local node installation`,
      `${softwareComponentName}:docker:[TAG] #start docker, default tag ${defaultVersion}, uses image ${Strings.dockerLink(DockerImage)}`
    ]);

    runtimeConfiguration.setTail('nodejs', `http://localhost:${ExposedPort}`);

    sourceTypeBuilder.add(this, {
      componentName: softwareComponentName,
      defaultType: 'local', 
      availableTypes: [
        { typeName: 'docker', defaultVersion },
        { typeName: 'local', defaultVersion: '' }
      ]
    });
 
    cleanupBuilder.add({
      pluginName: 'node',
      componentName: softwareComponentName,
      sourceTypes: [{
        name: 'docker',
        stopCode: 'docker rm -f $dockerContainerID' + softwareComponentName
      }, {
        name: 'local',
        stopCode: `ps -p $processId${softwareComponentName} >/dev/null && kill $processId${softwareComponentName}`
      }]
    });

    const Build = Node && Node.Build ? Node.Build : 'npm i --save-prod';
    const configFiles = runtimeConfiguration.getConfigFiles(softwareComponentName);
    const NodeParam = Node ? Node.Param : '';
    const typeSourceVarName = `TYPE_SOURCE_${softwareComponentName.toUpperCase()}`;
    const pidFile = `.${softwareComponentName}Pid`;

    const envVars = new CEnvVars(softwareComponentName, EnvVars);
    const mountToDocker = configFiles.map(f => f.mountToDocker(envVars)).join(' ');

    this.build = () => nunjucks.render('classes/plugins/NodePlugin.tmpl', {
      ...this.nunjucksObj(),
      Build,
      typeSourceVarName,
      Start,
      NodeParam,
      ExposedPort,
      configFiles,
      softwareComponentName,
      systemName,
      pidFile,
      BeforeBuild,
      AfterBuild,
      DockerImage,
      DockerMemory,
      writeConfigFiles: configFiles.map(f => f.createFile()).join('\n'),
      writeDockerConnectionLogic: BaseConfigFile.writeDockerConnectionLogic(configFiles, envVars),
      mountToDocker,
      storeFileAndExportEnvVar: configFiles.map(f => f.storeFileAndExportEnvVar()).join('\n'),
      AllEnvVarsDocker: envVars.toDocker(),
      AllEnvVarsNode: envVars.toShell()
    });

  }

}

module.exports = NodePlugin;

