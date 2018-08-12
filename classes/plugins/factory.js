
const MvnPlugin = require('./MvnPlugin');
const TomcatPlugin = require('./TomcatPlugin');
const JavaPlugin = require('./JavaPlugin');


module.exports = name => {
    switch (name) {
    case 'mvn':
      return MvnPlugin.instance();
    case 'tomcat':
      return TomcatPlugin.instance();
    case 'java':
      return JavaPlugin.instance();
  }
}
