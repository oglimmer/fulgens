
const nunjucks = require('nunjucks');

const BufferedBuilder = require('../phase/BufferedBuilder');
const optionsBuilder = require('../phase/options');

const Strings = require('../core/Strings');

class BasePlugin {

  register(softwareComponentName, userConfig, runtimeConfiguration) {
    this.softwareComponentName = softwareComponentName;
    this.preparecompBuilder = new BufferedBuilder('Plugin-PrepareComp');
    this.getsourceBuilder = new BufferedBuilder('Plugin-GetSource');
    this.prestartBuilder = new BufferedBuilder('Plugin-PreStart');
    this.poststartBuilder = new BufferedBuilder('Plugin-PostStart');
    this.leavecompBuilder = new BufferedBuilder('Plugin-LeaveComp');

    this.preparecompBuilder.init(userConfig, runtimeConfiguration);
    this.getsourceBuilder.init(userConfig, runtimeConfiguration);
    this.prestartBuilder.init(userConfig, runtimeConfiguration);
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

      if (((userConfig.versions || {})[softwareComponentName] || {}).JavaLocal) {
        optionsBuilder.addDetails(softwareComponentName, 'local', [
          `${softwareComponentName}:local #On macOS: Java version overwritten to ${userConfig.versions[softwareComponentName].JavaLocal}`
        ]);
        this.prestartBuilder.add(`if [ "$(uname)" = "Darwin" ]; then
          ORIGINAL_JAVA_HOME="$JAVA_HOME"
          export JAVA_HOME=$(/usr/libexec/java_home -v ${userConfig.versions[softwareComponentName].JavaLocal})
        elif [ "$(jdk_version)" != "${Strings.normalizeJavaVersion(userConfig.versions[softwareComponentName].JavaLocal)}" ]; then
          echo "ERROR: the local Java version is different to the one defined in Fulgensfile.version for this component!"
          exit 1
        fi`);
        this.leavecompBuilder.add('if [ "$(uname)" == "Darwin" ]; then export JAVA_HOME="$ORIGINAL_JAVA_HOME"; fi');
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
      header: Strings.headerPlugin(this.constructor.name, this.softwareComponentName),
      preparecomp: this.preparecompBuilder.build(),
      getsource: this.getsourceBuilder.build(),
      prestart: this.prestartBuilder.build(),
      poststart: this.poststartBuilder.build(),
      leavecomp: this.leavecompBuilder.build()
    }
  }

  build() {
    throw `Method build for ${this.constructor.name} not implemented`;
  }

}

module.exports = BasePlugin;
