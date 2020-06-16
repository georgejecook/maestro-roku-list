import * as path from 'path';
import * as fs from 'fs-extra';
import { series } from "gulp";
import { RooibosProcessor, createProcessorConfig } from 'rooibos-cli';
import { BurpConfig, BurpProcessor } from "burp-brightscript";
import { inspect } from 'util';
import { ProgramBuilder, BsConfig } from 'brighterscript';

const exec = require('child_process').exec;
const tmpBuildDir = '/tmp/buildTmp';
const gulp = require('gulp');
const gulpClean = require('gulp-clean');
const outDir = './build';
const rokuDeploy = require('roku-deploy');
const util = require('util');
const sleep = util.promisify(setTimeout);

let args = {
  host: process.env.ROKU_HOST || '192.168.16.3',
  username: process.env.ROKU_USER || 'rokudev',
  password: process.env.ROKU_PASSWORD || 'aaaa',
  rootDir: './build',
  files: ['**/*'],
  outDir: './out',
  retainStagingFolder: true
};

export function clean() {
  console.log('Doing a clean at ' + outDir);
  return gulp.src(['out', outDir, tmpBuildDir], { allowEmpty: true }).pipe(gulpClean({ force: true }));
}

export function createDirectories() {
  return gulp.src('*.*', { read: false })
    .pipe(gulp.dest('./build'))
    .pipe(gulp.dest('./out'));
}

export async function deploy(cb) {
  await rokuDeploy.publish(args);
}

async function copyFiles() {
  let oldPath = path.resolve(process.cwd());

  try {
    fs.mkdirSync(tmpBuildDir);
    let sourcePaths = ['src'];
    let sourcePathText = sourcePaths.map((p) => {
      p = path.resolve(p);
      p = p.endsWith('/') ? p : p + '/';
      return p;
    }).join(' ');

    await exec(`rsync -az ${sourcePathText} ${tmpBuildDir}`);
    console.log(`files copied to ${tmpBuildDir} dir is now ${process.cwd()}`);
  } catch (err) {
    console.error(err);
  }
  process.chdir(oldPath);
}

export async function compile(cb) {
  // copy all sources to tmp folder
  // so we can add the line numbers to them prior to transpiling
  await copyFiles();
  await sleep(100);
  await applyBurpPreprocessing();
  let builder = new ProgramBuilder();
  await builder.run({
    stagingFolderPath: outDir,
    createPackage: false,
    "rootDir": tmpBuildDir,
    "autoImportComponentScript": true,
  });
}

async function prepareTests(cb) {

  let testFiles = [];

  if (process.env.TEST_FILES_PATTERN) {
    console.log('using overridden test files');
    testFiles = JSON.parse(process.env.TEST_FILES_PATTERN);
  } else {
    testFiles = [
      '**/tests/**/*.brs',
      '!**/rooibosDist.brs',
      '!**/rooibosFunctionMap.brs',
      '!**/TestsScene.brs'
    ];
  }

  const isCodeCoverageBuild = false;

  let config = createProcessorConfig({
    projectPath: outDir,
    sourceFilePattern: [
      '**/*.brs',
      '**/*.xml',
      '!**/tests/**/*.*',
      '!**/tests',
      '!**/rLog',
      '!**/rLog/**/*.*',
      '!**/rLogComponents',
      '!**/rLogComponents/**/*.*',
      '!**/rooibosDist.brs',
      '!**/rooibosFunctionMap.brs',
      '!**/TestsScene.brs',
      '!**/ThreadUtils.brs'
    ],
    showFailuresOnly: true,
    testsFilePattern: testFiles,
    isRecordingCodeCoverage: isCodeCoverageBuild
  });
  let processor = new RooibosProcessor(config);
  processor.processFiles();

  cb();
}
export async function applyBurpPreprocessing() {
  const currentPath = process.cwd();
  let replacements = null;
  if (process.env.buildType === 'prod') {
    replacements = [{
      regex: '(^\\s*(m\\.)*(registerLogger)\\((\\s*"))',
      replacement: '\'$1'
    },
    {
      regex: '(^\\s*(m\\.)*(logMethod|logInfo|logError|logVerbose|logDebug|logWarn)\\()',
      replacement: '\'$1'
    },

    ];
  } else {
    replacements = [
      {
        regex: '(^\\s*(m\\.)*(logInfo|logError|logVerbose|logDebug|logWarn|logMethod)\\((\\s*"))',
        replacement: '$1#FullPath# '
      }
    ];
  }

  // add crash resilience to tests
  if (process.env.buildType === 'test') {
    replacements.push({
      regex: '(^(\\s*)m\\.assert)',
      replacement: '  if not m.currentResult.isFail then $1'
    });
  }
  console.log('using replacements' + inspect(replacements));
  let config: BurpConfig = {
    sourcePath: tmpBuildDir,
    filePattern: ['**/*.bs','**/*.brs'],
    replacements: replacements
  };

  console.log('applying burp processing')
  const processor = new BurpProcessor(config);
  await processor.processFiles();
  console.log(`Finished applying burp processing. Resetting path to ${currentPath}`);
  process.chdir(currentPath);
}


exports.build = series(clean, createDirectories, compile);
exports.prePublish = series(exports.build)
exports.prePublishTests = series(exports.build, prepareTests);
