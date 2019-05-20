
const nunjucks = require('nunjucks');

const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');
const sourceTypeBuilder = require('../core/SourceType');
const Strings = require('../core/Strings');
const CEnvVars = require('../core/CEnvVars');

const BasePlugin = require('./BasePlugin');

const DependencyManager = require('../core/DependencyManager');

class MvnPlugin extends BasePlugin {

  static instance() {
    return new MvnPlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);
    
    const { JavaVersions, UseHomeM2 } = userConfig.config;
    const { DockerImage = 'maven' } = userConfig.software[softwareComponentName];

    const defaultVersion = ((userConfig.versions || {})[softwareComponentName] || {}).Docker || 'latest';

    dependencycheckBuilder.add('mvn --version 1>/dev/null');

    optionsBuilder.addDetails(softwareComponentName, 'local', [
      `${softwareComponentName}:local #build local and respect -j`,
      `${softwareComponentName}:docker:[TAG] #docker based build, default tag: ${defaultVersion}, uses image ${Strings.dockerLink(DockerImage)}`
    ]);

    sourceTypeBuilder.add(this, {
      componentName: softwareComponentName,
      defaultType: 'local', 
      availableTypes: [
        { typeName: 'local', defaultVersion: '' },
        { typeName: 'docker', defaultVersion }
      ]
    });

    const { BuildDependencies } = userConfig.config;

    const dependencyManager = new DependencyManager();
    if (BuildDependencies) {
      dependencyManager.addAptBuild(BuildDependencies.Apt);
      dependencyManager.addNpmBuild(BuildDependencies.Npm);
    }

    const { Mvn, BeforeBuild = [], AfterBuild = [], EnvVars = [] } = userConfig.software[softwareComponentName];
    const Goal = Mvn && Mvn.Goal ? Mvn.Goal.replace('$$TMP$$', 'localrun') : 'package';
    const GoalIgnoreClean = Mvn && Mvn.GoalIgnoreClean ? true : false;
    const AllEnvVars = [...EnvVars, ...dependencyManager.getEnvVars()];
    const typeSourceVarName = `TYPE_SOURCE_${softwareComponentName.toUpperCase()}`;

    const envVars = new CEnvVars(softwareComponentName, EnvVars);

    const rpl = obj => (Array.isArray(obj)?obj:[obj]).map(e => e.replace('$$TMP$$', 'localrun')).join('\n');

    this.build = () => nunjucks.render('classes/plugins/MvnPlugin.tmpl', {
      ...this.nunjucksObj(),
      GoalIgnoreClean: GoalIgnoreClean ? '' : '$MVN_CLEAN',
      softwareComponentName,
      typeSourceVarName,
      Goal,
      DockerImage,
      dependencyManager,
      m2Mapping: UseHomeM2 ? '"$HOME/.m2"' : '"$(pwd)/localrun/.m2"',
      BeforeBuild: rpl(BeforeBuild),
      AfterBuild: rpl(AfterBuild),
      AllEnvVarsDocker: envVars.toDocker(),
      AllEnvVarsShell: envVars.toShellExport()
    });
  }

}

module.exports = MvnPlugin;
