
const cleanupBuilder = require('../phase/cleanup');
const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');
const sourceTypeBuilder = require('../core/SourceType');

const BasePlugin = require('./BasePlugin');

class MysqlPlugin extends BasePlugin {

  static instance() {
    return new MysqlPlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);

    const { Mysql } = userConfig.software[softwareComponentName];

    dependencycheckBuilder.add('docker --version 1>/dev/null');
    dependencycheckBuilder.add('mysql --version 1>/dev/null');
 
    optionsBuilder.addDetails('t', [
      'mysql:local #reuse a local, running MySQL installation, does not start/stop this MySQL',
      'mysql:docker:[5|8] #start docker image \\`mysql:X\\`'
    ]);

    sourceTypeBuilder.add(this, {
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

    this.poststartBuilder.addBegin(`
while ! mysql -uroot --protocol=tcp -e "select 1" 1>/dev/null 2>&1; do
  echo "waiting for mysql..."
  sleep 3
done`);
    
    var dockerPasswordParam = '';
    if (Mysql && Mysql.RootPassword) {
      this.poststartBuilder.addBegin(`export MYSQL_PWD="${Mysql.RootPassword}"`);
      dockerPasswordParam = `-e MYSQL_ROOT_PASSWORD="${Mysql.RootPassword}"`;
    } else {
      dockerPasswordParam = '-e MYSQL_ALLOW_EMPTY_PASSWORD=true';
    }

    if (Mysql.Schema) {
      // check if schema exists, otherwise create
      this.poststartBuilder.add(`mysql -uroot --protocol=tcp -NB -e "create database if not exists ${Mysql.Schema}"`);
      if (Mysql.Create) {
        // run sql script
        this.poststartBuilder.add(Mysql.Create.map(sql => `mysql -uroot --protocol=tcp ${Mysql.Schema} < ${sql}`).join('\n'));
      }
    }

    const configFiles = runtimeConfiguration.getConfigFiles(softwareComponentName);

    this.startBuilder.add(start(softwareComponentName, configFiles, dockerPasswordParam));

  }

}

module.exports = MysqlPlugin;

const start = (softwareComponentName, configFiles, dockerPasswordParam) => `
if [ "$TYPE_SOURCE_MYSQL" == "docker" ]; then
  # run in docker
  if [ ! -f ".mysql" ]; then
    ${configFiles.map(f => f.writeDockerConnectionLogic()).join('\n')}
    dockerContainerID${softwareComponentName}=$(docker run --rm -d -p 3306:3306 ${dockerPasswordParam} \\
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