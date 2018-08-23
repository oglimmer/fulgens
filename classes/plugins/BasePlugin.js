
const Preparecomp = require('../phase/Preparecomp');
const Getsource = require('../phase/Getsource');
const Prebuild = require('../phase/Prebuild');
const Build = require('../phase/Build');
const Postbuild = require('../phase/Postbuild');
const Prestart = require('../phase/Prestart');
const Start = require('../phase/Start');
const Poststart = require('../phase/Poststart');
const Leavecomp = require('../phase/Leavecomp');

const Strings = require('../core/Strings');

class BasePlugin {

  register(softwareComponentName, userConfig, runtimeConfiguration) {
    this.preparecompBuilder = new Preparecomp();
    this.getsourceBuilder = new Getsource();
    this.prebuildBuilder = new Prebuild();
    this.buildBuilder = new Build();
    this.postbuildBuilder = new Postbuild();
    this.prestartBuilder = new Prestart();
    this.startBuilder = new Start();
    this.poststartBuilder = new Poststart();
    this.leavecompBuilder = new Leavecomp();

    this.preparecompBuilder.init(userConfig, runtimeConfiguration);
    this.getsourceBuilder.init(userConfig, runtimeConfiguration);
    this.prebuildBuilder.init(userConfig, runtimeConfiguration);
    this.buildBuilder.init(userConfig, runtimeConfiguration);
    this.postbuildBuilder.init(userConfig, runtimeConfiguration);
    this.prestartBuilder.init(userConfig, runtimeConfiguration);
    this.startBuilder.init(userConfig, runtimeConfiguration);
    this.poststartBuilder.init(userConfig, runtimeConfiguration);
    this.leavecompBuilder.init(userConfig, runtimeConfiguration);

    if (softwareComponentName) {
      Object.entries(userConfig.software[softwareComponentName]).filter(e => /^[a-z]/.test(e[0])).forEach(e => {
        runtimeConfiguration.addConfigFile(softwareComponentName, e[1]);
      });
    }
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
  }

  build() {
    return Strings.headerPlugin(this) + this.preparecompBuilder.build() + this.getsourceBuilder.build() 
      + this.prebuildBuilder.build() + this.buildBuilder.build() + this.postbuildBuilder.build() 
      + this.prestartBuilder.build() + this.startBuilder.build() + this.poststartBuilder.build()
      + this.leavecompBuilder.build();
  }

}

module.exports = BasePlugin;
