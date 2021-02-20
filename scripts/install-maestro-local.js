/**
 * Installs a local version of all the rokucommunity dependent packages into this project
 */

import * as fsExtra from 'fs-extra';
import * as path from 'path';
import * as childProcess from 'child_process';
import * as rimraf from 'rimraf';

//set the cwd to the root of this project
let thisProjectRootPath = path.join(__dirname, '..');
process.chdir(thisProjectRootPath);
let packageJson = JSON.parse(fsExtra.readFileSync('package.json').toString());

let packages = {
  'mc': 'maestro-roku-core',
  'mioc': 'maestro-roku-ioc',
  'log': 'roku-log',
  'mv': 'maestro-roku-view'
};

for (let packageName in packages) {
  console.log(`adding '${packageName}' to package.json`);
  packageJson.dependencies[packageName] = `/home/george/hope/open-source/maestro/${packages[packageName]}`;
  rimraf.sync(path.join('node_modules', packageName));
}

console.log('saving package.json changes');
fsExtra.writeFileSync('package.json', JSON.stringify(packageJson, null, 4));
fsExtra.rmSync('package-lock.json');
console.log('ropm install');
childProcess.execSync('ropm install', {
  stdio: 'inherit'
});
