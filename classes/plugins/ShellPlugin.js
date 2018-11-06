
const nunjucks = require('nunjucks');

const functionsBuilder = require('../phase/functions');
const prepareBuilder = require('../phase/prepare');
const optionsBuilder = require('../phase/options');
const cleanupBuilder = require('../phase/cleanup');
const sourceTypeBuilder = require('../core/SourceType');
const dependencycheckBuilder = require('../phase/dependencycheck');


const BasePlugin = require('./BasePlugin');

class ShellPlugin extends BasePlugin {

  static instance() {
    return new ShellPlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);

    const { Start, ExposedPort, DockerImage = 'ubuntu', EnvVars = [] } = userConfig.software[softwareComponentName];
    const StartRpld = Start.replace('$$TMP$$', 'localrun');

    optionsBuilder.addDetails('t', [
      `${softwareComponentName}:local #start a local shell script`,
      `${softwareComponentName}:docker:[latest] #start the shell script inside docker image ${DockerImage}:X`
    ]);

    sourceTypeBuilder.add(this, {
      componentName: softwareComponentName,
      defaultType: 'local', 
      availableTypes: [
        { typeName: 'local', defaultVersion: '' },
        { typeName: 'docker', defaultVersion: 'latest' }
      ]
    });

    const pid = `shellPID${softwareComponentName}`;
    const dcId = `dockerContainerID${softwareComponentName}`;

    cleanupBuilder.add({
      pluginName: 'shell',
      componentName: softwareComponentName,
      sourceTypes: [{
        name: 'local',
        stopCode: 'echo exit|nc localhost 9998'
      }, {
        name: 'docker',
        stopCode: 'docker rm -f $' + dcId
      }]
    });

    const configFiles = runtimeConfiguration.getConfigFiles(softwareComponentName);
    const typeSourceVarName = `TYPE_SOURCE_${softwareComponentName.toUpperCase()}`;
    const pidFile = `.${softwareComponentName}Pid`;

    this.build = () => nunjucks.render('classes/plugins/ShellPlugin.tmpl', {
      ...this.nunjucksObj(),
      typeSourceVarName,
      softwareComponentName,
      pidFile,
      StartRpld,
      ExposedPort,
      dcId,
      pid,
      DockerImage,
      writeDockerConnectionLogic: configFiles.map(f => f.writeDockerConnectionLogic('dockerJavaExtRef')).join('\n'),
      mountToDocker: configFiles.map(f => f.mountToDocker('/home/node/exec_env/server')).join('\n'),
      AllEnvVarsDocker: EnvVars.map(l => l.replace('$$TMP$$', 'localrun')).map(p => `-e ${p}`).join(' '),
      AllEnvVarsShell: EnvVars.map(l => l.replace('$$TMP$$', 'localrun')).map(p => `export ${p}`).join('\n')
    });

  }

}

module.exports = ShellPlugin;
