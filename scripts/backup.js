#!/usr/bin/env node

/**
 * Automated Backup Script for Nazarban AI Chatbot
 *
 * This script backs up all important JSON data files
 * Run manually or via cron job
 *
 * Usage:
 *   node scripts/backup.js
 *
 * Or add to crontab for daily backups:
 *   0 3 * * * cd /path/to/project && node scripts/backup.js
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// Configuration
const ROOT_DIR = path.join(__dirname, '..');
const BACKUP_DIR = path.join(ROOT_DIR, 'backups');
const MAX_BACKUPS = 7; // Keep last 7 backups

// Files to backup
const FILES_TO_BACKUP = [
    'prompts.json',
    'productsData.json',
    'faqsData.json',
    'blogPosts.json',
    'archivedPosts.json',
    'benchmarkData.json',
    'aboutVideo.json',
    'servicesVideos.json',
    'servicesContent.json',
    'aboutContent.json',
    'whitepaperContent.json',
    'contactSubmissions.json',
    'collectedEmails.json',
    'public/data/custom-articles.json'
];

/**
 * Format date for backup filename
 */
function getBackupTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}_${hour}-${minute}`;
}

/**
 * Create backup directory if it doesn't exist
 */
async function ensureBackupDir() {
    try {
        await fs.mkdir(BACKUP_DIR, { recursive: true });
        console.log('✅ Backup directory ready:', BACKUP_DIR);
    } catch (error) {
        console.error('❌ Failed to create backup directory:', error);
        throw error;
    }
}

/**
 * Backup a single file
 */
async function backupFile(filename, timestamp) {
    const sourcePath = path.join(ROOT_DIR, filename);
    const backupFilename = filename.replace(/\//g, '_'); // Replace slashes for nested files
    const backupPath = path.join(BACKUP_DIR, `${timestamp}_${backupFilename}`);

    try {
        // Check if source file exists
        if (!fsSync.existsSync(sourcePath)) {
            console.log(`⚠️  Skipping ${filename} (file doesn't exist)`);
            return null;
        }

        // Copy file
        await fs.copyFile(sourcePath, backupPath);
        console.log(`✅ Backed up: ${filename}`);
        return backupPath;
    } catch (error) {
        console.error(`❌ Failed to backup ${filename}:`, error.message);
        return null;
    }
}

/**
 * Remove old backups, keeping only the most recent ones
 */
async function cleanOldBackups() {
    try {
        const files = await fs.readdir(BACKUP_DIR);

        // Group files by their original filename
        const fileGroups = {};
        files.forEach(file => {
            // Extract original filename from backup (format: YYYY-MM-DD_HH-MM_originalname)
            const match = file.match(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}_(.+)$/);
            if (match) {
                const originalName = match[1];
                if (!fileGroups[originalName]) {
                    fileGroups[originalName] = [];
                }
                fileGroups[originalName].push(file);
            }
        });

        // For each file group, keep only the most recent backups
        for (const [originalName, backups] of Object.entries(fileGroups)) {
            if (backups.length > MAX_BACKUPS) {
                // Sort by filename (timestamp in filename ensures chronological order)
                backups.sort().reverse();

                // Delete old backups
                const toDelete = backups.slice(MAX_BACKUPS);
                for (const file of toDelete) {
                    const filePath = path.join(BACKUP_DIR, file);
                    await fs.unlink(filePath);
                    console.log(`🗑️  Deleted old backup: ${file}`);
                }
            }
        }

        console.log(`✅ Cleanup completed (keeping ${MAX_BACKUPS} backups per file)`);
    } catch (error) {
        console.error('❌ Failed to clean old backups:', error);
    }
}

/**
 * Main backup function
 */
async function runBackup() {
    const timestamp = getBackupTimestamp();

    console.log('\n📦 Starting backup process...');
    console.log(`⏰ Timestamp: ${timestamp}`);
    console.log(`📂 Backup location: ${BACKUP_DIR}\n`);

    try {
        // Ensure backup directory exists
        await ensureBackupDir();

        // Backup all files
        let successCount = 0;
        let skipCount = 0;
        let failCount = 0;

        for (const file of FILES_TO_BACKUP) {
            const result = await backupFile(file, timestamp);
            if (result) {
                successCount++;
            } else if (!fsSync.existsSync(path.join(ROOT_DIR, file))) {
                skipCount++;
            } else {
                failCount++;
            }
        }

        // Clean old backups
        console.log('\n🧹 Cleaning old backups...');
        await cleanOldBackups();

        // Summary
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Backup Summary');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✅ Successful: ${successCount}`);
        console.log(`⚠️  Skipped: ${skipCount}`);
        console.log(`❌ Failed: ${failCount}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        if (failCount > 0) {
            console.log('⚠️  Some backups failed. Please check the errors above.\n');
            process.exit(1);
        } else {
            console.log('✅ Backup completed successfully!\n');
            process.exit(0);
        }
    } catch (error) {
        console.error('\n❌ Backup process failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    runBackup();
}

module.exports = { runBackup };
