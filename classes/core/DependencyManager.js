

/**
 * Manages dependencies for NPM and APT. Older versions of Debian/Ubuntu don't have Node or NPM in
 * their default repository. Also binaries like phantomjs are not available on Debian 8.11
 *
 * Currently handles: Node/npm and phantomjs
 */
class DependencyManager {

  deleteItem(array, name) {
    const ind = array.findIndex(e => e == name);
    if (ind > -1) {
      array.splice(ind, 1);
    }
  }
  replaceItem(array, name, withName) {
    const ind = array.findIndex(e => e == name);
    if (ind > -1) {
      array.splice(ind, 1, withName);
    }
  }
  hasNode(array) {
    return array.findIndex(e => e == 'nodejs') > -1 || array.findIndex(e => e == 'npm') > -1;
  }

  constructor() {
    this.aptPackages = [];
    this.npmPackages = [];
    this.aptPackages.fix = v => {
      const clone = this.aptPackages.slice(0);
      if (v == '8.11') {
        this.deleteItem(clone, 'phantomjs');
      }
      if (v == '8.11' || v == '9.5') {
        this.replaceItem(clone, 'npm', 'nodejs');
      }
      return clone;
    }
  }

  addAptBuild(packageNames) {
    if (Array.isArray(packageNames)) {
      packageNames.forEach(e => this.aptPackages.push(e));
    } else {
      this.aptPackages.push(packageNames);
    }
  }
  
  addNpmBuild(packageNames) {
    if (Array.isArray(packageNames)) {
      packageNames.forEach(e => this.npmPackages.push(e));
    } else {
      this.npmPackages.push(packageNames);
    }
  }

  getAptBuild() {
    if (this.aptPackages.length == 0) {
      return ';';
    }
    const apt811 = this.aptPackages.fix('8.11');
    var buffer811 = ';';
    if (apt811.length > 0) {
      buffer811 = (this.hasNode(apt811) ? 'curl -sL https://deb.nodesource.com/setup_6.x | bash -;' : '')
        + ` apt-get  -qy install ${apt811.join(' ')};`
    }
    const apt95 = this.aptPackages.fix('9.5');
    var buffer95 = ';';
    if (apt95.length > 0) {
      buffer95 = (this.hasNode(apt95) ? 'curl -sL https://deb.nodesource.com/setup_6.x | bash -;' : '')
        + ` apt-get  -qy install ${apt95.join(' ')};`
    }
    return `
      if [ "\\$(cat /etc/debian_version)" = "8.11" ]; then \\\\
         ${buffer811} \\\\
      elif [ "\\$(cat /etc/debian_version)" = "9.5" ]; then \\\\
        ${buffer95} \\\\
      else apt-get -qy install ${this.aptPackages.join(' ')}; fi \\\\
    `;
  }

  getNpmBuild() {
    if (this.npmPackages.length == 0) {
      return ';';
    }
    return 'npm install -g ' + this.npmPackages.join(' ');
  }

  hasAnyBuildDep() {
    return this.aptPackages.length > 0 || this.npmPackages > 0;
  }

}

module.exports = new DependencyManager();
