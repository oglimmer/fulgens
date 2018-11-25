
const BaseConfigFile = require('./BaseConfigFile');

/* 
  - works only with docker (must be ignored for local, currently unsupported for download)
  - creates tmp dir
  - writes static(!) config files into tmp dir
  - mounts tmp dir into docker container

  config is like: {
    Name: "my.cnf",
    Content: [
      { Line: "[mysqld]" },
      { Line: "collation-server = utf8_unicode_ci" },
      { Line: "init-connect='SET NAMES utf8'" },
      { Line: "character-set-server = utf8" }
    ],
    Connections: [{
      Source: "lucene",
      Regexp: "_fti=",
      Line: "_fti={couch_httpd_proxy, handle_proxy_req, <<\\\"http://$$VALUE$$:5985\\\">>}"
    }],
    AttachIntoDockerAsFile: "/etc/mysql/conf.d"
  }
*/
class AttachIntoDockerAsFile extends BaseConfigFile {

  constructor(pluginName, config, runtimeConfiguration) {
    super(pluginName, config, runtimeConfiguration);
    this.AttachIntoDockerAsFile = config.AttachIntoDockerAsFile;
  }

  storeFileAndExportEnvVar() {
    return '';
  }

  /* docker */
  mountToDocker() {
    return `-v "\$(pwd)/localrun/${this.TmpFolder}/${this.Name}:${this.AttachIntoDockerAsFile}"`;
  }

}

module.exports = AttachIntoDockerAsFile;
