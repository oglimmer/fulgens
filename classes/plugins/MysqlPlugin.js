
const headBuilder = require('../phase/head');
const functionsBuilder = require('../phase/functions');
const buildBuilder = require('../phase/build');
const cleanupBuilder = require('../phase/cleanup');
const prepareBuilder = require('../phase/prepare');
const dependencycheckBuilder = require('../phase/dependencycheck');
const getsourceBuilder = require('../phase/getsource');
const postbuildBuilder = require('../phase/postbuild');
const prestartBuilder = require('../phase/prestart');
const startBuilder = require('../phase/start');
const poststartBuilder = require('../phase/poststart');
const sourceTypeBuilder = require('../core/SourceType');
const BasePlugin = require('./BasePlugin');

class MysqlPlugin extends BasePlugin {

  static instance() {
    return new MysqlPlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {

    const { Mysql, BeforeStart, AfterStart } = userConfig.software[softwareComponentName];

    dependencycheckBuilder.add('docker --version 1>/dev/null');
    dependencycheckBuilder.add('mysql --version 1>/dev/null');
 
    sourceTypeBuilder.add({
      componentName: softwareComponentName,
      defaultType: 'docker', 
      availableTypes: [
        { typeName: 'docker', defaultVersion: '5' },
        { typeName: 'local', defaultVersion: '' }
      ]
    });
 
    cleanupBuilder.add({
      componentName:'MySQL',
      sourceTypes: [{
        name: 'docker',
        stopCode: 'docker rm -f $dockerContainerID' + softwareComponentName
      }]
    });


    poststartBuilder.add(`
export MYSQL_PWD="${Mysql.RootPassword}"
while ! mysql -uroot -e "select 1" 1>/dev/null 2>&1; do
  echo "waiting for mysql..."
  sleep 3
done`);

    if (Mysql.Schema) {
      // check if schema exists, otherwise create
      if (Mysql.Create) {
        // run sql script
      }
    }

    const configFiles = runtimeConfiguration.getConfigFiles(softwareComponentName);

    if (BeforeStart) {
      prestartBuilder.add(BeforeStart);
    }
    startBuilder.add(start(softwareComponentName, configFiles, Mysql.RootPassword));
    if (AfterStart) {
      poststartBuilder.add(AfterStart);
    }

  }

}

module.exports = MysqlPlugin;

const start = (softwareComponentName, configFiles, RootPassword) => `
if [ "$TYPE_SOURCE_MYSQL" == "docker" ]; then
  # run in docker
  if [ ! -f ".mysql" ]; then
    ${configFiles.map(f => f.writeDockerConnectionLogic()).join('\n')}
    dockerContainerID${softwareComponentName}=$(docker run --rm -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD="${RootPassword}" \\
      ${configFiles.map(f => f.makeDockerVolume()).join('\n')} mysql:$TYPE_SOURCE_MYSQL_VERSION)
    echo "$dockerContainerID${softwareComponentName}">.mysql
  else
    dockerContainerID${softwareComponentName}=$(<.mysql)
  fi
fi
if [ "$TYPE_SOURCE_MYSQL" == "local" ]; then
  if [ -f .mysql ]; then
    echo "mysql running but started from different source type"
    exit 1
  fi
fi
`;