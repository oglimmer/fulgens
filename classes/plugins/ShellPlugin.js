
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

    this.startBuilder.add(`
    if [ "$${typeSourceVarName}" == "local" ]; then
      if [ ! -f "${pidFile}" ]; then
        if [ "$VERBOSE" == "YES" ]; then echo "nohup ${StartRpld} 1>>localrun/${softwareComponentName}.log 2>>localrun/${softwareComponentName}.log &"; fi
        ${EnvVars.map(l => l.replace('$$TMP$$', 'localrun')).map(p => `export ${p}`).join('\n')} 
        nohup "${StartRpld}" 1>>"localrun/${softwareComponentName}.log" 2>>"localrun/${softwareComponentName}.log" &
        ${pid}=$!
        echo "$${pid}">"${pidFile}"
      else 
        ${pid}=$(<"${pidFile}")
      fi
    fi
    if [ "$${typeSourceVarName}" == "docker" ]; then
      #if [ -f "$BASE_PWD/${pidFile}" ] && [ "$(<"$BASE_PWD/${pidFile}")" == "download" ]; then
      #  echo "node running but started from different source type"
      #  exit 1
      #fi
      if [ ! -f "$BASE_PWD/${pidFile}" ]; then
        ${configFiles.map(f => f.storeFileForDocker('dockerJavaExtRef')).join('\n')}
        if [ -n "$VERBOSE" ]; then echo "docker run --rm -d $dockerJavaExtRef -p ${ExposedPort}:${ExposedPort} ${configFiles.map(f => f.mountToDocker('/home/node/exec_env/server')).join('\n')} ${EnvVars.map(l => l.replace('$$TMP$$', 'localrun')).map(p => `-e ${p}`).join(' ')} -v $(pwd):/home/node/exec_env -w /home/node/exec_env ${DockerImage}:$${typeSourceVarName}_VERSION /bin/bash -c ./${StartRpld}"; fi
        ${dcId}=$(docker run --rm -d $dockerJavaExtRef -p ${ExposedPort}:${ExposedPort} \\
            ${configFiles.map(f => f.mountToDocker('/home/node/exec_env/server')).join('\n')}  \\
            ${EnvVars.map(l => l.replace('$$TMP$$', 'localrun')).map(p => `-e ${p}`).join(' ')} \\
            -v "$(pwd)":/home/node/exec_env -w /home/node/exec_env ${DockerImage}:$${typeSourceVarName}_VERSION /bin/bash -c ./${StartRpld})
        echo "$${dcId}">"$BASE_PWD/${pidFile}"
      else
        ${dcId}=$(<"$BASE_PWD/${pidFile}")
      fi
    fi
    `);
  }
}

module.exports = ShellPlugin;
