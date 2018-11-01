
const nunjucks = require('nunjucks');

const optionsBuilder = require('../phase/options');

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
    this.softwareComponentName = softwareComponentName;
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
    if (userConfig.software[softwareComponentName]) {
      const { Git, Param, Dir, BeforeStart, AfterStart } = userConfig.software[softwareComponentName];

      if (Param) {
        optionsBuilder.add(Param.Char, '', Param.VariableName, Param.Description);
        this.preparecompBuilder.add(`if [ "$${Param.VariableName}" == "YES" ]; then`);
      }

      if (Git) {
        this.getsourceBuilder.add(`
          if [ ! -d ".git" ]; then
            git clone "${Git}" .
          else
            git pull
          fi
        `);
      }

      if (BeforeStart) {
        this.prestartBuilder.add(BeforeStart.map(l => l.replace('$$TMP$$', 'localrun')));
      }
      if (AfterStart) {
        this.poststartBuilder.add(AfterStart.map(l => l.replace('$$TMP$$', 'localrun')));
      }

      if (Dir) {
        this.preparecompBuilder.add(`  mkdir -p ${Dir.replace('$$TMP$$', 'localrun')}`);
        this.preparecompBuilder.add(`
    OPWD="$(pwd)"
    cd "${Dir.replace('$$TMP$$', 'localrun')}"
          `);
        this.leavecompBuilder.add('  cd "$OPWD"');
      }

      if (Param) {
        // this must be the last addition to leavecompBuilder
        this.leavecompBuilder.add('fi');
      }
    }
  }

  nunjucksObj() {
    return {
      header: Strings.headerPlugin(this),
      preparecomp: this.preparecompBuilder.build(),
      getsource: this.getsourceBuilder.build(),
      prebuild: this.prebuildBuilder.build(),
      build: this.buildBuilder.build(),
      postbuild: this.postbuildBuilder.build(),
      prestart: this.prestartBuilder.build(),
      start: this.startBuilder.build(),
      poststart: this.poststartBuilder.build(),
      leavecomp: this.leavecompBuilder.build()
    }
  }

  build() {
    return nunjucks.render('classes/plugins/BasePlugin.tmpl', this.nunjucksObj());
  }

}

module.exports = BasePlugin;
