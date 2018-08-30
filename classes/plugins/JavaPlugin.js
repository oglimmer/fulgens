
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

      const { Start, ExposedPort, EnvVars = [] } = userConfig.software[softwareComponentName];
      const { Artifact } = userConfig.software[Start];
      const ArtifactRpld = Artifact.replace('$$TMP$$', 'localrun');

      sourceTypeBuilder.add(this, {
        componentName: softwareComponentName,
        defaultType: 'local', 
        availableTypes: [
          { typeName: 'local', defaultVersion: '' },
          { typeName: 'docker', defaultVersion: '10-jre' }
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

      const configFiles = runtimeConfiguration.getConfigFiles(softwareComponentName);
      const typeSourceVarName = `TYPE_SOURCE_${softwareComponentName.toUpperCase()}`;
      const pidFile = `.${softwareComponentName}Pid`;

      this.startBuilder.add(`
      if [ "$${typeSourceVarName}" == "local" ]; then
        OPWD="$(pwd)"
        cd "$(dirname "${ArtifactRpld}")"
        if [ ! -f "$BASE_PWD/${pidFile}" ]; then
          if [ "$VERBOSE" == "YES" ]; then echo "nohup "./$(basename "${ArtifactRpld}")" 1>>"$BASE_PWD/localrun/${softwareComponentName}.log" 2>>"$BASE_PWD/localrun/${softwareComponentName}.log" &"; fi
          nohup "./$(basename "${ArtifactRpld}")" 1>>"$BASE_PWD/localrun/${softwareComponentName}.log" 2>>"$BASE_PWD/localrun/${softwareComponentName}.log" &
          ${pid}=$!
          echo "$${pid}">"$BASE_PWD/${pidFile}"
        else 
          ${pid}=$(<"$BASE_PWD/${pidFile}")
        fi
        cd "$OPWD"
      fi
      if [ "$${typeSourceVarName}" == "docker" ]; then
        #if [ -f "$BASE_PWD/${pidFile}" ] && [ "$(<"$BASE_PWD/${pidFile}")" == "download" ]; then
        #  echo "node running but started from different source type"
        #  exit 1
        #fi
        if [ ! -f "$BASE_PWD/${pidFile}" ]; then
          ${configFiles.map(f => f.storeFileForDocker('dockerJavaExtRef')).join('\n')}
          if [ -n "$VERBOSE" ]; then echo ".."; fi
          ${dcId}=$(docker run --rm -d $dockerJavaExtRef -p ${ExposedPort}:${ExposedPort} \\
              ${configFiles.map(f => f.mountToDocker('/home/node/exec_env/server')).join('\n')}  \\
              ${EnvVars.map(p => `-e ${p}`).join(' ')} \\
              -v "$(pwd)":/home/node/exec_env -w /home/node/exec_env openjdk:$${typeSourceVarName}_VERSION /bin/bash -c ./${ArtifactRpld})
          echo "$${dcId}">"$BASE_PWD/${pidFile}"
        else
          ${dcId}=$(<"$BASE_PWD/${pidFile}")
        fi
      fi
      `);
    }
  }
}

module.exports = JavaPlugin;
