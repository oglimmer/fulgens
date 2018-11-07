
const BaseConfigFile = require('./BaseConfigFile');

/* 
  - works only with docker (must be ignored for local, currently unsupported for download)
  - creates tmp dir
  - writes static(!) config files into tmp dir
  - mounts tmp dir into docker container

  config is like: {
    Name: "my.cnf",
    Content: [
      "[mysqld]",
      "collation-server = utf8_unicode_ci",
      "init-connect='SET NAMES utf8'",
      "character-set-server = utf8"
    ],
    Connections: [{
      Source: "lucene",
      Var: "_fti",
      Content: "{couch_httpd_proxy, handle_proxy_req, <<\\\"http://$$VALUE$$:5985\\\">>}"
    }],
    AttachIntoDocker: "/etc/mysql/conf.d"
  }
*/
class AttachIntoDocker extends BaseConfigFile {

  constructor(pluginName, config, runtimeConfiguration) {
    super(pluginName, config, runtimeConfiguration);
    this.AttachIntoDocker = config.AttachIntoDocker;
  }

  /* docker */
  mountToDocker() {
    return `-v "\$(pwd)/localrun/${this.TmpFolder}:${this.AttachIntoDocker}"`;
  }

}

module.exports = AttachIntoDocker;
