#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Restore Jira E2E Docker volumes from snapshot files
 *
 * This restores tar.gz archives into Docker volumes, providing a
 * pre-configured Jira instance without needing to run setup.
 *
 * Usage:
 *   yarn e2e:snapshot:restore [--input-dir <dir>] [--force]
 *
 * Options:
 *   --input-dir  Directory containing snapshot files (default: e2e/snapshots)
 *   --force      Overwrite existing volumes without prompting
 *
 * Prerequisites:
 *   - Docker must be running
 *   - Containers should be stopped
 */
const node_child_process_1 = require("node:child_process");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const readline = __importStar(require("node:readline"));
/** Default configuration for snapshot restore */
const defaultConfig = {
    // Go up two levels: dist/scripts/ -> dist/ -> e2e/, then into snapshots/
    inputDir: path.join(__dirname, '..', '..', 'snapshots'),
    force: false,
    composeProject: 'docker',
};
/**
 * Constructs the full Docker volume name with project prefix
 * @param projectName - Docker Compose project name
 * @param volumeName - Base volume name without prefix
 * @returns Full volume name in format `{projectName}_{volumeName}`
 */
function getVolumeFullName(projectName, volumeName) {
    return `${projectName}_${volumeName}`;
}
/**
 * Checks if Docker is available on the system
 * @returns True if Docker CLI is accessible, false otherwise
 */
function checkDocker() {
    try {
        (0, node_child_process_1.execSync)('docker --version', { stdio: 'pipe' });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Checks if a Docker volume exists
 * @param volumeName - Name of the Docker volume to check
 * @returns True if the volume exists, false otherwise
 */
function volumeExists(volumeName) {
    try {
        const result = (0, node_child_process_1.spawnSync)('docker', ['volume', 'inspect', volumeName], {
            stdio: 'pipe',
        });
        return result.status === 0;
    }
    catch {
        return false;
    }
}
/**
 * Removes a Docker volume
 * @param volumeName - Name of the Docker volume to remove
 * @returns True if removal succeeded, false otherwise
 */
function removeVolume(volumeName) {
    try {
        (0, node_child_process_1.execSync)(`docker volume rm ${volumeName}`, { stdio: 'pipe' });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Creates a new Docker volume
 * @param volumeName - Name of the Docker volume to create
 * @returns True if creation succeeded, false otherwise
 */
function createVolume(volumeName) {
    try {
        (0, node_child_process_1.execSync)(`docker volume create ${volumeName}`, { stdio: 'pipe' });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Stops all Docker Compose containers for the E2E environment
 *
 * Uses the docker-compose.yml in the e2e/docker directory.
 * Silently handles the case where containers are not running.
 */
function stopContainers() {
    console.log('Stopping containers...');
    // Go up two levels: dist/scripts/ -> dist/ -> e2e/, then into docker/
    const composeDir = path.join(__dirname, '..', '..', 'docker');
    try {
        (0, node_child_process_1.execSync)('docker compose stop', {
            cwd: composeDir,
            stdio: 'pipe',
        });
        console.log('Containers stopped');
    }
    catch {
        console.log('Note: Containers may not be running');
    }
}
/**
 * Removes Docker Compose containers while preserving volumes
 *
 * Uses the docker-compose.yml in the e2e/docker directory.
 * Errors are silently ignored as containers may not exist.
 */
function removeContainers() {
    console.log('Removing containers (keeping volumes)...');
    // Go up two levels: dist/scripts/ -> dist/ -> e2e/, then into docker/
    const composeDir = path.join(__dirname, '..', '..', 'docker');
    try {
        (0, node_child_process_1.execSync)('docker compose rm -f', {
            cwd: composeDir,
            stdio: 'pipe',
        });
    }
    catch {
        // Ignore errors
    }
}
/**
 * Restores a Docker volume from a snapshot tar.gz archive
 *
 * Uses an Alpine container to extract the archive contents into the volume.
 * Clears existing volume contents before restoration.
 *
 * @param volumeName - Name of the Docker volume to restore into
 * @param snapshotPath - Absolute path to the snapshot tar.gz file
 * @returns True if restoration succeeded, false otherwise
 */
function restoreVolume(volumeName, snapshotPath) {
    console.log(`Restoring volume ${volumeName} from ${path.basename(snapshotPath)}...`);
    try {
        // Use alpine container to untar the snapshot into the volume
        const cmd = [
            'docker',
            'run',
            '--rm',
            '-v',
            `${volumeName}:/data`,
            '-v',
            `${path.dirname(snapshotPath)}:/backup:ro`,
            'alpine',
            'sh',
            '-c',
            `"rm -rf /data/* /data/..?* /data/.[!.]* 2>/dev/null; tar xzf /backup/${path.basename(snapshotPath)} -C /data"`,
        ];
        (0, node_child_process_1.execSync)(cmd.join(' '), { stdio: 'inherit' });
        console.log(`  Restored successfully`);
        return true;
    }
    catch (error) {
        console.error(`  Failed to restore volume: ${error}`);
        return false;
    }
}
/**
 * Prompts the user for confirmation via stdin
 *
 * @param message - The confirmation message to display
 * @returns Promise resolving to true if user enters 'y' or 'Y', false otherwise
 */
async function confirm(message) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(`${message} (y/N): `, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y');
        });
    });
}
/**
 * Main entry point for the snapshot restore script
 *
 * Parses command-line arguments, validates prerequisites, and orchestrates
 * the restoration of Docker volumes from snapshot archives.
 *
 * @throws Exits process with code 1 if Docker is unavailable, snapshots are
 *         missing, or restoration fails
 */
async function main() {
    console.log('=== Jira E2E Snapshot Restore ===\n');
    // Parse arguments
    const args = process.argv.slice(2);
    const inputDirIndex = args.indexOf('--input-dir');
    const config = { ...defaultConfig };
    if (inputDirIndex !== -1 && args[inputDirIndex + 1]) {
        config.inputDir = path.resolve(args[inputDirIndex + 1]);
    }
    if (args.includes('--force')) {
        config.force = true;
    }
    // Check Docker
    if (!checkDocker()) {
        console.error('Error: Docker is not available');
        process.exit(1);
    }
    // Check snapshot directory exists
    if (!fs.existsSync(config.inputDir)) {
        console.error(`Error: Snapshot directory not found: ${config.inputDir}`);
        console.log('\nTo create a snapshot:');
        console.log('  1. Run: yarn e2e:all');
        console.log('  2. Run: yarn e2e:snapshot:save');
        process.exit(1);
    }
    // Load metadata
    const metadataPath = path.join(config.inputDir, 'snapshot-metadata.json');
    if (!fs.existsSync(metadataPath)) {
        console.error('Error: snapshot-metadata.json not found');
        console.log('The snapshot directory may be incomplete');
        process.exit(1);
    }
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    console.log(`Snapshot created: ${metadata.createdAt}`);
    console.log(`Jira version: ${metadata.jiraVersion}`);
    if (metadata.notes) {
        console.log(`Notes: ${metadata.notes}`);
    }
    console.log('');
    // Verify all snapshot files exist
    for (const volume of metadata.volumes) {
        const snapshotPath = path.join(config.inputDir, volume.file);
        if (!fs.existsSync(snapshotPath)) {
            console.error(`Error: Missing snapshot file: ${volume.file}`);
            process.exit(1);
        }
        const stats = fs.statSync(snapshotPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`Found: ${volume.file} (${sizeMB} MB)`);
    }
    console.log('');
    // Stop and remove containers
    stopContainers();
    removeContainers();
    // Check for existing volumes
    const existingVolumes = [];
    for (const volume of metadata.volumes) {
        const fullName = getVolumeFullName(config.composeProject, volume.name);
        if (volumeExists(fullName)) {
            existingVolumes.push(fullName);
        }
    }
    if (existingVolumes.length > 0 && !config.force) {
        console.log('Warning: The following volumes already exist:');
        for (const vol of existingVolumes) {
            console.log(`  - ${vol}`);
        }
        console.log('');
        const proceed = await confirm('Do you want to overwrite them?');
        if (!proceed) {
            console.log('Restore cancelled');
            process.exit(0);
        }
    }
    // Remove and recreate volumes
    for (const volume of metadata.volumes) {
        const fullName = getVolumeFullName(config.composeProject, volume.name);
        if (volumeExists(fullName)) {
            console.log(`Removing existing volume: ${fullName}`);
            if (!removeVolume(fullName)) {
                console.error(`Error: Could not remove volume ${fullName}`);
                console.log('Make sure containers are stopped: yarn e2e:down');
                process.exit(1);
            }
        }
        console.log(`Creating volume: ${fullName}`);
        if (!createVolume(fullName)) {
            console.error(`Error: Could not create volume ${fullName}`);
            process.exit(1);
        }
    }
    // Restore each volume
    let allSuccess = true;
    for (const volume of metadata.volumes) {
        const fullName = getVolumeFullName(config.composeProject, volume.name);
        const snapshotPath = path.join(config.inputDir, volume.file);
        const success = restoreVolume(fullName, snapshotPath);
        if (!success) {
            allSuccess = false;
        }
    }
    if (allSuccess) {
        console.log('\n=== Snapshot restored successfully! ===');
        console.log('\nNext steps:');
        console.log('  1. Start Jira: yarn e2e:up');
        console.log('  2. Wait for ready: yarn e2e:wait');
        console.log('  3. Run tests: yarn e2e:test');
        console.log('\nOr run all at once: yarn e2e:up && yarn e2e:wait && yarn e2e:test');
    }
    else {
        console.error('\n=== Snapshot restore failed ===');
        process.exit(1);
    }
}
main().catch((error) => {
    console.error('Snapshot restore failed:', error);
    process.exit(1);
});
