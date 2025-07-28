// services/discord/commands/roles/admin/resetDB.mjs

import fs from 'fs';
import {exec} from 'child_process';

/**
 * Deletes the bot database and restarts the process.
 * Usage: !resetdb
 */
export default async function (message) {
    const dbPath = './eclipse.db';

    try {
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        } else {
            return message.reply('⚠️ No database file found to delete.');
        }

        await message.reply('🧼 Database deleted. Restarting bot...');

        // Gracefully kill and restart the process using `npm start`
        exec('npm restart', (err, stdout, stderr) => {
            if (err) {
                console.error('Failed to restart:', err);
            } else {
                console.log('Bot restarting...');
            }
        });

        // Optionally exit this process after short delay
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    } catch (err) {
        console.error('💥 Error in resetDB:', err);
        message.reply('❌ Failed to reset the database.');
    }
}
