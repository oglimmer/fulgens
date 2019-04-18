
const MvnPlugin = require('./MvnPlugin');
const TomcatPlugin = require('./TomcatPlugin');
const TomeePlugin = require('./TomeePlugin');
const JavaPlugin = require('./JavaPlugin');
const CouchdbPlugin = require('./CouchdbPlugin');
const MysqlPlugin = require('./MysqlPlugin');
const NodePlugin = require('./NodePlugin');
const RedisPlugin = require('./RedisPlugin');
const ShellPlugin = require('./ShellPlugin');

module.exports = name => {
    switch (name) {
    case 'mvn':
      return MvnPlugin.instance();
    case 'tomcat':
      return TomcatPlugin.instance();
    case 'tomee':
      return TomeePlugin.instance();
    case 'java':
      return JavaPlugin.instance();
    case 'couchdb':
      return CouchdbPlugin.instance();
    case 'mysql':
      return MysqlPlugin.instance();
    case 'node':
      return NodePlugin.instance();
    case 'redis':
      return RedisPlugin.instance();
    case 'shell':
      return ShellPlugin.instance();
    default:
    throw Error(`Unknown Plugin ${name}`);
  }
}
