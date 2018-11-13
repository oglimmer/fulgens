
const nunjucks = require('nunjucks');

const BufferedBuilder = require('../phase/BufferedBuilder');
const optionsBuilder = require('../phase/options');

const Strings = require('../core/Strings');

class BasePlugin {

  register(softwareComponentName, userConfig, runtimeConfiguration) {
    this.softwareComponentName = softwareComponentName;
    this.preparecompBuilder = new BufferedBuilder('Plugin-PrepareComp');
    this.getsourceBuilder = new BufferedBuilder('Plugin-GetSource');
    this.prebuildBuilder = new BufferedBuilder('Plugin-PreBuild');
    this.buildBuilder = new BufferedBuilder('Plugin-Build');
    this.postbuildBuilder = new BufferedBuilder('Plugin-PostBuild');
    this.prestartBuilder = new BufferedBuilder('Plugin-PreStart');
    this.startBuilder = new BufferedBuilder('Plugin-Start');
    this.poststartBuilder = new BufferedBuilder('Plugin-PostStart');
    this.leavecompBuilder = new BufferedBuilder('Plugin-LeaveComp');

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
        var gitUrl, gitBranch = '';
        if (Git.indexOf(' ') > -1) {
          gitUrl = Git.substring(0, Git.indexOf(' '));
          gitBranch = '-b ' + Git.substring(Git.indexOf(' ') + 1);
        } else {
          gitUrl = Git;
        }
        this.getsourceBuilder.add(`
          if [ ! -d ".git" ]; then
            git clone --single-branch ${gitBranch} "${gitUrl}" .
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

    this.build = () => {
      throw `Method build for ${this.constructor.name} not implemented`;
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
    throw `Method build for ${this.constructor.name} not implemented`;
  }

}

module.exports = BasePlugin;
