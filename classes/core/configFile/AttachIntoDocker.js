
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
    AttachIntoDocker: "/etc/mysql/conf.d"
  }
*/
class AttachIntoDocker extends BaseConfigFile {

  constructor(pluginName, config, runtimeConfiguration) {
    super(pluginName, config, runtimeConfiguration);
    this.AttachIntoDocker = config.AttachIntoDocker;
  }

  storeFileAndExportEnvVar() {
    return '';
  }

  /* docker */
  mountToDocker() {
    return `-v "\$(pwd)/localrun/${this.TmpFolder}:${this.AttachIntoDocker}"`;
  }

}

module.exports = AttachIntoDocker;
