
const functionsBuilder = require('../phase/functions');
const prepareBuilder = require('../phase/prepare');
const buildBuilder = require('../phase/build');
const cleanupBuilder = require('../phase/cleanup');
const dependencycheckBuilder = require('../phase/dependencycheck');

var prepare = `
if [ -n "$JAVA_VERSION" ]; then
  export JAVA_HOME=$(/usr/libexec/java_home -v $JAVA_VERSION)
fi
`;

var functions = `
# returns the JDK version.
# 8 for 1.8.0_nn, 9 for 9-ea etc, and "no_java" for undetected
# from https://stackoverflow.com/questions/7334754/correct-way-to-check-java-version-from-bash-script
jdk_version() {
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
}
`;

class JavaPlugin {

  static instance() {
    return instance;
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    functionsBuilder.add(functions);
    prepareBuilder.add(prepare);
    dependencycheckBuilder.add('java -version 2>/dev/null');
  }

}

const instance = new JavaPlugin();

module.exports = JavaPlugin;