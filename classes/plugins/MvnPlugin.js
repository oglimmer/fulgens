
const nunjucks = require('nunjucks');

const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');

const BasePlugin = require('./BasePlugin');

const dependencyManager = require('../core/DependencyManager');

const DEFAULT_DOCKER_VERSION = '3-jdk-10';

class MvnPlugin extends BasePlugin {

  static instance() {
    return new MvnPlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);
    // May provide:
    // const artifact = userConfig.software[softwareComponentName].Artifact;

    dependencycheckBuilder.add('mvn --version 1>/dev/null');

    optionsBuilder.add('b', 'local|docker:version', 'BUILD',
      `build locally (default) or within a maven image on docker, the default image is ${DEFAULT_DOCKER_VERSION}`,
      [ 'docker:[3-jdk-8|3-jdk-9|3-jdk-10] #do a docker based build, uses \\`maven:3-jdk-10\\` image',
        'local #do a local build, would respect -j']);

    const { Mvn, BeforeBuild = [], AfterBuild = [] } = userConfig.software[softwareComponentName];
    const Goal = Mvn && Mvn.Goal ? Mvn.Goal.replace('$$TMP$$', 'localrun') : 'package';
    const GoalIgnoreClean = Mvn && Mvn.GoalIgnoreClean ? true : false;

    if (Mvn && Mvn.BuildDependencies) {
      const bd = Mvn.BuildDependencies;
      dependencyManager.addAptBuild(bd.Apt);
      dependencyManager.addNpmBuild(bd.Npm);
    }

    const rpl = a => a.map(e => e.replace('$$TMP$$', 'localrun')).join('\n');

    this.nunjucksRender = () => nunjucks.render('classes/plugins/MvnPlugin.tmpl', {
      ...this.nunjucksObj(),
      GoalIgnoreClean: GoalIgnoreClean ? '' : '$MVN_CLEAN',
      Goal,
      DEFAULT_DOCKER_VERSION,
      dependencyManager,
      BeforeBuild: rpl(BeforeBuild),
      AfterBuild: rpl(AfterBuild)
    });
  }

}

module.exports = MvnPlugin;
