
const nunjucks = require('nunjucks');

const functionsBuilder = require('../phase/functions');
const prepareBuilder = require('../phase/prepare');
const optionsBuilder = require('../phase/options');
const cleanupBuilder = require('../phase/cleanup');
const sourceTypeBuilder = require('../core/SourceType');
const dependencycheckBuilder = require('../phase/dependencycheck');


const BasePlugin = require('./BasePlugin');

var prepare = `
if [ "$(uname)" == "Darwin" ]; then 
  if [ -n "$JAVA_VERSION" ]; then
    export JAVA_HOME=$(/usr/libexec/java_home -v $JAVA_VERSION)
  fi
fi
`;

var functionBodyCheckJDKVersion = `
  # returns the JDK version.
  # 8 for 1.8.0_nn, 9 for 9-ea etc, and "no_java" for undetected
  # from https://stackoverflow.com/questions/7334754/correct-way-to-check-java-version-from-bash-script
  local result
  local java_cmd
  if [[ -n $(type -p java) ]]
  then
    java_cmd=java
  elif [[ (-n "$JAVA_HOME") && (-x "$JAVA_HOME/bin/java") ]]
  then
    java_cmd="$JAVA_HOME/bin/java"
  fi
  local IFS=$'\\n'
  # remove \\r for Cygwin
  local lines=$("$java_cmd" -Xms32M -Xmx32M -version 2>&1 | tr '\\r' '\\n')
  if [[ -z $java_cmd ]]
  then
    result=no_java
  else
    for line in $lines; do
      if [[ (-z $result) && ($line = *"version \\""*) ]]
      then
        local ver=$(echo $line | sed -e 's/.*version "\\(.*\\)"\\(.*\\)/\\1/; 1q')
        # on macOS, sed doesn't support '?'
        if [[ $ver = "1."* ]]
        then
          result=$(echo $ver | sed -e 's/1\\.\\([0-9]*\\)\\(.*\\)/\\1/; 1q')
        else
          result=$(echo $ver | sed -e 's/\\([0-9]*\\)\\(.*\\)/\\1/; 1q')
        fi
      fi
    done
  fi
  echo "$result"
`;

var onceOnlyDone = false;

class JavaPlugin extends BasePlugin {

  static instance() {
    return new JavaPlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);

    if(!onceOnlyDone) {
      if (userConfig.config.JavaVersions && userConfig.config.JavaVersions.length === 1) {
        prepareBuilder.add(`if [ "$(uname)" == "Darwin" ]; then export JAVA_HOME=$(/usr/libexec/java_home -v ${userConfig.config.JavaVersions[0]}); fi`);
      } else {
        optionsBuilder.add('j', 'version', 'JAVA_VERSION',
          `macOS only: set/overwrite JAVA_HOME to a specific version, needs to be in format for /usr/libexec/java_home`, 
          [ 'version #can use any locally installed JDK, see /usr/libexec/java_home -V' ]);
        prepareBuilder.add(prepare);
      }

      functionsBuilder.add('jdk_version', functionBodyCheckJDKVersion);
      dependencycheckBuilder.add('java -version 2>/dev/null');
      onceOnlyDone = true;
    }

    if (userConfig.software[softwareComponentName]) {

      const { Name: systemName } = userConfig.config;
      const { Start, ExposedPort, EnvVars = [], DockerImage = 'openjdk' } = userConfig.software[softwareComponentName];
      const { Artifact } = userConfig.software[Start];
      const ArtifactRpld = Artifact.replace('$$TMP$$', 'localrun');

      optionsBuilder.addDetails('t', [
        `${softwareComponentName}:local #start a local java program`,
        `${softwareComponentName}:docker:[11-jre] #start the java program inside docker image ${DockerImage}:11-jre (default)`
      ]);

      sourceTypeBuilder.add(this, {
        componentName: softwareComponentName,
        defaultType: 'local', 
        availableTypes: [
          { typeName: 'local', defaultVersion: '' },
          { typeName: 'docker', defaultVersion: '11-jre' }
        ]
      });

      const pid = `javaPID${softwareComponentName}`;
      const dcId = `dockerContainerID${softwareComponentName}`;

      cleanupBuilder.add({
        pluginName: 'java',
        componentName: softwareComponentName,
        sourceTypes: [{
          name: 'local',
          stopCode: 'kill $' + pid
        }, {
          name: 'docker',
          stopCode: 'docker rm -f $' + dcId
        }]
      });

      const configFiles = runtimeConfiguration.getConfigFiles(Start);
      const typeSourceVarName = `TYPE_SOURCE_${softwareComponentName.toUpperCase()}`;
      const pidFile = `.${softwareComponentName}Pid`;

      this.build = () => nunjucks.render('classes/plugins/JavaPlugin.tmpl', {
        ...this.nunjucksObj(),
        typeSourceVarName,
        ArtifactRpld,
        pidFile,
        softwareComponentName,
        systemName,
        ExposedPort,
        dcId,
        pid,
        DockerImage,
        writeDockerConnectionLogic: configFiles.map(f => f.writeDockerConnectionLogic()).join('\n'),
        mountToDocker: configFiles.map(f => f.mountToDocker('/home/node/exec_env/server')).join('\n'),
        AllEnvVarsDocker: EnvVars.map(p => `-e ${p}`).join(' '),
        AllEnvVarsShell: EnvVars.join(' ')
      });

    } else {
      this.build = () => {};
    }
  }
}

module.exports = JavaPlugin;
