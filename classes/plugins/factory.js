
const MvnPlugin = require('./MvnPlugin');
const TomcatPlugin = require('./TomcatPlugin');
const JavaPlugin = require('./JavaPlugin');
const CouchdbPlugin = require('./CouchdbPlugin');
const MysqlPlugin = require('./MysqlPlugin');
const NodePlugin = require('./NodePlugin');
const RedisPlugin = require('./RedisPlugin');

module.exports = name => {
    switch (name) {
    case 'mvn':
      return MvnPlugin.instance();
    case 'tomcat':
      return TomcatPlugin.instance();
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
    default:
    throw Error(`Unknown Plugin ${name}`);
  }
}
