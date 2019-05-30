
const nunjucks = require('nunjucks');

const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');
const sourceTypeBuilder = require('../core/SourceType');
const Strings = require('../core/Strings');
const CEnvVars = require('../core/CEnvVars');

const BasePlugin = require('./BasePlugin');

const DependencyManager = require('../core/DependencyManager');

class NpmPlugin extends BasePlugin {

  static instance() {
    return new NpmPlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);
    
    const { DockerImage = 'node' } = userConfig.software[softwareComponentName];

    const defaultVersion = ((userConfig.versions || {})[softwareComponentName] || {}).Docker || 'latest';

    dependencycheckBuilder.add('npm --version 1>/dev/null');

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

    const { Npm, BeforeBuild = [], AfterBuild = [], EnvVars = [] } = userConfig.software[softwareComponentName];
    const Command = Npm && Npm.Command ? Npm.Command.replace('$$TMP$$', 'localrun') : 'run build';
    const AllEnvVars = [...EnvVars, ...dependencyManager.getEnvVars()];
    const typeSourceVarName = `TYPE_SOURCE_${softwareComponentName.toUpperCase()}`;

    const envVars = new CEnvVars(softwareComponentName, EnvVars);

    const rpl = obj => (Array.isArray(obj)?obj:[obj]).map(e => e.replace('$$TMP$$', 'localrun')).join('\n');

    this.build = () => nunjucks.render('classes/plugins/NpmPlugin.tmpl', {
      ...this.nunjucksObj(),
      softwareComponentName,
      typeSourceVarName,
      Command,
      DockerImage,
      dependencyManager,
      BeforeBuild: rpl(BeforeBuild),
      AfterBuild: rpl(AfterBuild),
      AllEnvVarsDocker: envVars.toDocker(),
      AllEnvVarsShell: envVars.toShellExport()
    });
  }

}

module.exports = NpmPlugin;
