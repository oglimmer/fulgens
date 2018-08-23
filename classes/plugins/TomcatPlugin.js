
const cleanupBuilder = require('../phase/cleanup');
const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');
const sourceTypeBuilder = require('../core/SourceType');

const BasePlugin = require('./BasePlugin');
const JavaPlugin = require('./JavaPlugin');

class TomcatPlugin extends BasePlugin {

  static instance() {
    return new TomcatPlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    
    runtimeConfiguration.addDependency(JavaPlugin.instance());

    optionsBuilder.addDetails('t', [
      'tomcat:local:/usr/lib/tomcat #reuse tomcat installation from /usr/lib/tomcat, does not start/stop this tomcat',
      'tomcat:download:[7|8|9] #download tomcat version x and run this build within it, would respect -j',
      'tomcat:docker:[7|8|9] #start docker image \\`tomcat:X\\` and run this build within it'
    ]);

    runtimeConfiguration.setTail('apache catalina');

    const { BeforeStart, AfterStart, Deploy, Lib } = userConfig.software[softwareComponentName];
    const { Artifact } = userConfig.software[Deploy];

    sourceTypeBuilder.add(this, {
      componentName: softwareComponentName,
      defaultType: 'download', 
      availableTypes: [
        { typeName: 'download', defaultVersion: '9', code: downloadCode },
        { typeName: 'docker', defaultVersion: '9' },
        { typeName: 'local', defaultVersion: '' }
      ]
    });

    cleanupBuilder.add({
      componentName: 'Tomcat',
      sourceTypes: [{
        name: 'download',
        stopCode: './localrun/apache-tomcat-$TOMCAT_VERSION/bin/shutdown.sh'
      }, {
        name: 'docker',
        stopCode: 'docker rm -f $dockerContainerID' + softwareComponentName
      }]
    });
    
    dependencycheckBuilder.add('curl --version 1>/dev/null');
    
    this.getsourceBuilder.add(getSource);
    
    this.poststartBuilder.add(`
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
    f_deploy() {
      cp ${Artifact} $targetPath
    }
    f_deploy
    `);

    const configFiles = runtimeConfiguration.getConfigFiles(Deploy);

    if (Lib) {
      this.prestartBuilder.add('if [ "$TYPE_SOURCE_TOMCAT" == "download" ]; then\n' 
        + Lib.map(lib => userConfig.software[lib].Artifact)
        .map(lib => lib.replace('$$TMP$$', 'localrun'))
        .map(lib => `  cp ${lib} localrun/apache-tomcat-$TOMCAT_VERSION/lib/`).join('\n')
      + '\nfi');
      this.prestartBuilder.add(`
dockerFixRef=()
if [ "$TYPE_SOURCE_TOMCAT" == "docker" ]; then
` 
        + Lib.map(lib => userConfig.software[lib].Artifact)
        .map(lib => lib.replace('$$TMP$$', 'localrun'))
        .map(lib => `  dockerFixRef+=("-v $(pwd)/${lib}:/usr/local/tomcat/lib/$(basename ${lib})")`).join('\n')
      + '\nfi');
    }

    this.startBuilder.add(startDownload(configFiles));
    this.startBuilder.add(startDocker(configFiles, softwareComponentName));
    this.startBuilder.add(startLocal(configFiles));

    if (BeforeStart) {
      this.prestartBuilder.add(BeforeStart.map(e => e.replace('$$SELF_DIR$$', 'localrun/apache-tomcat-$TOMCAT_VERSION')));
    }
    if (AfterStart) {
      this.poststartBuilder.add(AfterStart.map(e => e.replace('$$SELF_DIR$$', 'localrun/apache-tomcat-$TOMCAT_VERSION')));
    }

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
    dockerContainerID${softwareComponentName}=$(docker run --rm -d $dockerCouchRef \${dockerFixRef[@]} -p 8080:8080 ${configFiles.map(f => f.makeDockerEnvVar()).join('\n')} -v "$(pwd)/localrun/webapps":/usr/local/tomcat/webapps tomcat:$TYPE_SOURCE_TOMCAT_VERSION)
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