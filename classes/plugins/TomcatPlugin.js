
const headBuilder = require('../phase/head');
const functionsBuilder = require('../phase/functions');
const buildBuilder = require('../phase/build');
const cleanupBuilder = require('../phase/cleanup');
const prepareBuilder = require('../phase/prepare');
const dependencycheckBuilder = require('../phase/dependencycheck');
const getsourceBuilder = require('../phase/getsource');
const postbuildBuilder = require('../phase/postbuild');
const startBuilder = require('../phase/start');
const poststartBuilder = require('../phase/poststart');
const sourceTypeBuilder = require('../core/SourceType');

const JavaPlugin = require('./JavaPlugin');

class TomcatPlugin {

  static instance() {
    return new TomcatPlugin();
  }

  register(softwareComponentName, userConfig, runtimeConfiguration) {
    
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    
    runtimeConfiguration.addDependency(JavaPlugin.instance());

    const deploy = userConfig.software[softwareComponentName].Deploy;
    const artifact = userConfig.software[deploy].Artifact;

    sourceTypeBuilder.add(softwareComponentName, 'download', [
      { typeName: 'download', defaultVersion: '9', code: downloadCode },
      { typeName: 'docker', defaultVersion: '9' },
      { typeName: 'local', defaultVersion: '' }
    ]);

    cleanupBuilder.add('Tomcat', [{
        name: 'download',
        stopCode: './localrun/apache-tomcat-$TOMCAT_VERSION/bin/shutdown.sh'
      }, {
        name: 'docker',
        stopCode: 'docker rm -f $dockerContainerID' + softwareComponentName
      }]);
    
    dependencycheckBuilder.add('curl --version 1>/dev/null');
    
    getsourceBuilder.add(getSource);
    
    poststartBuilder.add(`
    if [ "$TYPE_SOURCE_TOMCAT" == "download" ]; then
      targetPath=localrun/apache-tomcat-$TOMCAT_VERSION/webapps/
    fi
    if [ "$TYPE_SOURCE_TOMCAT" == "docker" ]; then
      mkdir -p localrun/webapps
      targetPath=localrun/webapps/
    fi
    if [ "$TYPE_SOURCE_TOMCAT" == "local" ]; then
      targetPath=$TYPE_SOURCE_TOMCAT_PATH/webapps/
    fi
    cp ${artifact} $targetPath
    `);

    const configFiles = runtimeConfiguration.getConfigFiles(deploy);

    startBuilder.add(startDownload(configFiles));
    startBuilder.add(startDocker(configFiles, softwareComponentName));
    startBuilder.add(startLocal(configFiles));
  }

}

module.exports = TomcatPlugin;

const startDownload = (configFiles) => `
if [ "$TYPE_SOURCE_TOMCAT" == "download" ]; then
  # start tomcat
  if [ ! -f ".tomcat" ]; then
    ${configFiles.map(f => f.makeEnvVar()).join('\n')}
    ./localrun/apache-tomcat-$TOMCAT_VERSION/bin/startup.sh
    echo "download">.tomcat
  fi
  tailCmd="tail -f ./localrun/apache-tomcat-$TOMCAT_VERSION/logs/catalina.out"
fi
`;

const startDocker = (configFiles, softwareComponentName) => `
if [ "$TYPE_SOURCE_TOMCAT" == "docker" ]; then
  if [ -f .tomcat ] && [ "$(<.tomcat)" == "download" ]; then
    echo "Tomcat running but started from different source type"
    exit 1
  fi
  # run in docker
  if [ -z "$TYPE_SOURCE_TOMCAT_VERSION" ]; then
    TYPE_SOURCE_TOMCAT_VERSION=9
  fi
  if [ ! -f ".tomcat" ]; then
    ${configFiles.map(f => f.writeDockerConnectionLogic()).join('\n')}
    dockerContainerID${softwareComponentName}=$(docker run --rm -d $dockerCouchRef -p 8080:8080 ${configFiles.map(f => f.makeDockerEnvVar()).join('\n')} -v "$(pwd)/localrun/webapps":/usr/local/tomcat/webapps tomcat:$TYPE_SOURCE_TOMCAT_VERSION)
    echo "$dockerContainerID${softwareComponentName}">.tomcat
  else
    dockerContainerID${softwareComponentName}=$(<.tomcat)
  fi
  tailCmd="docker logs -f $dockerContainerID${softwareComponentName}"
fi
`;

const startLocal = () => `
if [ "$TYPE_SOURCE_TOMCAT" == "local" ]; then
  if [ -f .tomcat ]; then
    echo "Tomcat running but started from different source type"
    exit 1
  fi
  tailCmd="tail -f $TYPE_SOURCE_TOMCAT_PATH/logs/catalina.out"
fi
`;

const downloadCode = `# find latest tomcat version for $TYPE_SOURCE_TOMCAT_VERSION
  if [ "$(uname)" == "Linux" ]; then
    GREP_PERL_MODE="-P"
  fi
  TOMCAT_BASE_URL="http://mirror.vorboss.net/apache/tomcat"
  TOMCAT_VERSION_PRE=$(curl -s "$TOMCAT_BASE_URL/tomcat-$TYPE_SOURCE_TOMCAT_VERSION/"|grep -m1 -o $GREP_PERL_MODE "<a href=\\"v\\d*.\\d*.\\d*" || echo "__________9.0.10")
  TOMCAT_VERSION=\${TOMCAT_VERSION_PRE:10}
  TOMCAT_URL=$TOMCAT_BASE_URL/tomcat-$TYPE_SOURCE_TOMCAT_VERSION/v$TOMCAT_VERSION/bin/apache-tomcat-$TOMCAT_VERSION.tar.gz`;

const getSource = `
if [ "$TYPE_SOURCE_TOMCAT" == "download" ]; then
  if [ -f .tomcat ] && [ "$(<.tomcat)" != "download" ]; then
    echo "Tomcat running but started from different source type"
    exit 1
  fi
  # download tomcat
  if [ ! -f "/\${TMPDIR:-/tmp}/apache-tomcat-$TOMCAT_VERSION.tar" ]; then
    curl -s $TOMCAT_URL | gzip -d >/\${TMPDIR:-/tmp}/apache-tomcat-$TOMCAT_VERSION.tar
  fi
  # extract tomcat
  if [ ! -d "./apache-tomcat-$TOMCAT_VERSION" ]; then
    tar -xf /\${TMPDIR:-/tmp}/apache-tomcat-$TOMCAT_VERSION.tar -C ./localrun
  fi
fi
`;