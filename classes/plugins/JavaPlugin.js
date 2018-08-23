
const functionsBuilder = require('../phase/functions');
const prepareBuilder = require('../phase/prepare');
const optionsBuilder = require('../phase/options');
const dependencycheckBuilder = require('../phase/dependencycheck');

const BasePlugin = require('./BasePlugin');

var prepare = `
if [ -n "$JAVA_VERSION" ]; then
  export JAVA_HOME=$(/usr/libexec/java_home -v $JAVA_VERSION)
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

class JavaPlugin extends BasePlugin {

  static instance() {
    return instance;
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    optionsBuilder.add('j', 'version', 'JAVA_VERSION',
      'set/overwrite java_home to a specific version, needs to be in format for java_home 1.8, 9, 10)', 
      [ 'version #can use any locally installed JDK, see /usr/libexec/java_home -V' ]);
    functionsBuilder.add('jdk_version', functionBodyCheckJDKVersion);
    prepareBuilder.add(prepare);
    dependencycheckBuilder.add('java -version 2>/dev/null');
  }

}

const instance = new JavaPlugin();

// fake class with only one fake static method
module.exports = {
  instance: () => JavaPlugin.instance()
};
